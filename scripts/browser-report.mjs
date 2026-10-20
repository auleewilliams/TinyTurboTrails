import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const emptyTotals = () => ({ expected: 0, unexpected: 0, skipped: 0, flaky: 0 });

function enumerate(suites, parents = []) {
  return suites.flatMap(suite => {
    const titles = [...parents, suite.title];
    return [
      ...(suite.specs ?? []).flatMap(spec => spec.tests.map(test => ({
        id: spec.id,
        title: [...titles, spec.title].join(' > '),
        file: spec.file, line: spec.line, column: spec.column,
        project: test.projectName,
        outcome: test.status, expectedStatus: test.expectedStatus,
        annotations: test.annotations ?? [],
        attempts: test.results.map(result => ({
          status: result.status, durationMs: result.duration, retry: result.retry ?? 0,
        })),
        skipReasons: (test.annotations ?? [])
          .filter(annotation => annotation.type === 'skip' && annotation.description)
          .map(annotation => annotation.description),
      }))),
      ...enumerate(suite.suites ?? [], titles),
    ];
  });
}

export function summarizeBrowserReport(report, configuredReport) {
  const cases = enumerate(report.suites);
  const configuredCases = enumerate(configuredReport.suites);
  const identities = entries => {
    const keys = entries.map(entry => JSON.stringify([entry.id, entry.project]));
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate case identity');
    return keys.sort();
  };
  if (JSON.stringify(identities(cases)) !== JSON.stringify(identities(configuredCases))) {
    throw new Error('Emitted cases do not match configured case identities');
  }
  const totals = emptyTotals();
  const projects = {};
  for (const entry of cases) {
    if (!Object.hasOwn(totals, entry.outcome)) throw new Error(`Unknown outcome: ${entry.outcome}`);
    if (!entry.attempts.length) throw new Error(`Missing attempt: ${entry.title}`);
    for (const attempt of entry.attempts) {
      if (!Number.isFinite(attempt.durationMs) || attempt.durationMs < 0) {
        throw new Error(`Invalid attempt duration: ${entry.title}`);
      }
    }
    totals[entry.outcome]++;
    projects[entry.project] ??= emptyTotals();
    projects[entry.project][entry.outcome]++;
  }
  for (const [outcome, count] of Object.entries(totals)) {
    if (report.stats?.[outcome] !== count) throw new Error(`Aggregate mismatch: ${outcome}`);
  }
  return {
    metadata: report.config?.metadata ?? {},
    stats: report.stats,
    errors: report.errors ?? [],
    configured: configuredCases.length,
    enumerated: cases.length,
    totals, projects, cases,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [reportPath, configuredPath, outputPath] = process.argv.slice(2);
    if (process.argv.length !== 5) throw new Error('Usage: node scripts/browser-report.mjs REPORT CONFIGURED OUTPUT');
    const summary = summarizeBrowserReport(
      JSON.parse(readFileSync(reportPath, 'utf8')),
      JSON.parse(readFileSync(configuredPath, 'utf8')),
    );
    writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify({ configured: summary.configured, enumerated: summary.enumerated, totals: summary.totals, projects: summary.projects }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
