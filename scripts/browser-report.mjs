import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readlinkSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
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

// Only these two report conventions are supported; never resolve an absolute
// report reference directly on the host or search for a matching basename.
function attachmentPath(reference) {
  const normalized = reference.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (parts.includes('..')) throw new Error('Lexical traversal is not allowed');
  const driveAbsolute = /^[a-z]:\//i.test(normalized);
  if (normalized.includes(':') && !driveAbsolute) throw new Error('Unsupported path format');
  let suffix;
  if (normalized.startsWith('/') || driveAbsolute) {
    const roots = parts.flatMap((part, index) => part === 'test-results' ? [index] : []);
    if (roots.length !== 1) throw new Error('Absolute path must have exactly one test-results root');
    suffix = parts.slice(roots[0] + 1);
  } else {
    suffix = parts[0] === 'test-results' ? parts.slice(1) : parts;
  }
  return suffix.filter(part => part && part !== '.');
}

function isContained(root, file) {
  const suffix = relative(root, file);
  return !isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith(`..${sep}`);
}

function checkAttachmentFile(root, parts) {
  let current = root;
  let links = 0;
  // Resolve one component at a time so even a dangling outside symlink is
  // rejected before inspecting its target. Internal symlinks remain supported.
  const pending = [...parts];
  while (pending.length) {
    const candidate = resolve(current, pending.shift());
    if (!isContained(root, candidate)) throw new Error('Path escapes artifact root');
    const info = lstatSync(candidate);
    if (info.isSymbolicLink()) {
      if (++links > 40) throw new Error('Symlink loop or excessive symlink depth');
      const target = resolve(dirname(candidate), readlinkSync(candidate));
      if (!isContained(root, target)) throw new Error('Symlink escapes artifact root');
      pending.unshift(...relative(root, target).split(sep).filter(Boolean));
      current = root;
    } else {
      current = candidate;
    }
  }
  if (!lstatSync(current).isFile()) throw new Error('Reference is not a regular file');
  // Opening proves readability; nonblocking/no-follow avoids following a final
  // replaced symlink or blocking on a special file. Artifacts must be quiescent.
  const fd = openSync(current, constants.O_RDONLY | constants.O_NONBLOCK | (constants.O_NOFOLLOW ?? 0));
  try {
    if (!fstatSync(fd).isFile()) throw new Error('Reference is not a regular file');
  } finally {
    closeSync(fd);
  }
}

function verifyAttachments(report, artifactRoot) {
  const root = realpathSync(artifactRoot);
  if (!statSync(root).isDirectory()) throw new Error('Artifact root must be a directory');
  const totals = { checked: 0, inline: 0, missing: 0, invalid: 0, diagnostics: [] };
  const diagnose = (kind, context, reference, reason) => {
    totals[kind]++;
    totals.diagnostics.push({ kind, ...context, reference, reason });
  };
  const object = (value, context, label) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return true;
    diagnose('invalid', context, value ?? null, `${label} must be an object`);
    return false;
  };
  const array = (value, context, label, optional = false) => {
    if (optional && value === undefined) return [];
    if (Array.isArray(value)) return value;
    diagnose('invalid', context, value ?? null, `${label} must be an array`);
    return [];
  };
  function walk(suites, parents = []) {
    for (const suite of suites) {
      const suiteContext = { title: parents.join(' > ') };
      if (!object(suite, suiteContext, 'Suite')) continue;
      const titles = [...parents, suite.title];
      suiteContext.title = titles.join(' > ');
      for (const spec of array(suite.specs, suiteContext, 'Suite specs', true)) {
        if (!object(spec, suiteContext, 'Spec')) continue;
        const caseContext = { caseId: spec.id, title: [...titles, spec.title].join(' > ') };
        for (const test of array(spec.tests, caseContext, 'Spec tests')) {
          if (!object(test, caseContext, 'Test')) continue;
          const testContext = { ...caseContext, project: test.projectName };
          for (const [attempt, result] of array(test.results, testContext, 'Test results').entries()) {
            const attemptContext = { ...testContext, attempt };
            if (!object(result, attemptContext, 'Result')) continue;
            attemptContext.retry = result.retry ?? 0;
            for (const [attachment, item] of array(result.attachments, attemptContext, 'Result attachments', true).entries()) {
              const context = { ...attemptContext, attachment };
              if (!object(item, context, 'Attachment')) continue;
              if (item.path === undefined || item.path === '') { totals.inline++; continue; }
              if (typeof item.path !== 'string' || !item.path.trim() || item.path.includes('\0')) {
                diagnose('invalid', context, item.path, 'Attachment path must be a nonblank string without NUL');
                continue;
              }
              try {
                checkAttachmentFile(root, attachmentPath(item.path));
                totals.checked++;
              } catch (error) {
                diagnose(error.code === 'ENOENT' ? 'missing' : 'invalid', context, item.path,
                  error.code === 'ENOENT' ? 'File does not exist' : error.message);
              }
            }
          }
        }
      }
      walk(array(suite.suites, suiteContext, 'Nested suites', true), titles);
    }
  }
  if (object(report, {}, 'Report')) walk(array(report.suites, {}, 'Report suites'));
  if (totals.missing || totals.invalid) {
    const error = new Error(`Attachment verification failed: ${JSON.stringify(totals)}`);
    error.attachmentVerification = totals;
    throw error;
  }
  return totals;
}

export function summarizeBrowserReport(report, configuredReport, options = {}) {
  const attachmentVerification = options.artifactRoot === undefined
    ? undefined : verifyAttachments(report, options.artifactRoot);
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
    ...(attachmentVerification ? { attachmentVerification } : {}),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [reportPath, configuredPath, outputPath, flag, artifactRoot] = process.argv.slice(2);
    if (process.argv.length !== 5 && !(process.argv.length === 7 && flag === '--artifact-root' && artifactRoot)) {
      throw new Error('Usage: node scripts/browser-report.mjs REPORT CONFIGURED OUTPUT [--artifact-root ROOT]');
    }
    const summary = summarizeBrowserReport(
      JSON.parse(readFileSync(reportPath, 'utf8')),
      JSON.parse(readFileSync(configuredPath, 'utf8')),
      { artifactRoot },
    );
    writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify({ configured: summary.configured, enumerated: summary.enumerated, totals: summary.totals, projects: summary.projects,
      ...(summary.attachmentVerification ? { attachmentVerification: summary.attachmentVerification } : {}) }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
