import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { summarizeBrowserReport } from './browser-report.mjs';

// Deliberately small synthetic reporter fixtures, not browser-run evidence.
const caseReport = (results = [{ status: 'passed', duration: 12 }]) => ({
  suites: [{ title: 'browser.spec.ts', suites: [{ title: 'nested suite', specs: [{
    id: 'case-1', title: 'case title', file: 'browser.spec.ts', line: 7, column: 1,
    tests: [{ projectName: 'firefox', expectedStatus: 'passed', status: 'expected', annotations: [], results }],
  }] }] }],
  stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0 },
  errors: [], config: { metadata: { sourceRevision: 'fixture' } },
});
const configured = () => caseReport([]);

test('enumerates nested per-engine cases with identity, outcome and timing', () => {
  const summary = summarizeBrowserReport(caseReport(), configured());
  assert.equal(summary.configured, 1);
  assert.equal(summary.enumerated, 1);
  assert.deepEqual(summary.totals, { expected: 1, unexpected: 0, skipped: 0, flaky: 0 });
  assert.deepEqual(summary.projects.firefox, summary.totals);
  assert.deepEqual(summary.cases[0], {
    id: 'case-1', title: 'browser.spec.ts > nested suite > case title',
    file: 'browser.spec.ts', line: 7, column: 1, project: 'firefox',
    outcome: 'expected', expectedStatus: 'passed', annotations: [],
    attempts: [{ status: 'passed', durationMs: 12, retry: 0 }], skipReasons: [],
  });
});

test('keeps failed attempts and named skips beside durations', () => {
  const report = caseReport([{ status: 'failed', duration: 90, retry: 0 }]);
  const first = report.suites[0].suites[0].specs[0].tests[0];
  first.status = 'unexpected';
  const skipped = structuredClone(report.suites[0].suites[0].specs[0]);
  skipped.id = 'case-2';
  skipped.tests[0] = {
    ...first, status: 'skipped', annotations: [{ type: 'skip', description: 'Fullscreen unavailable' }],
    results: [{ status: 'skipped', duration: 5 }],
  };
  report.suites[0].suites[0].specs.push(skipped);
  report.stats = { expected: 0, unexpected: 1, skipped: 1, flaky: 0 };
  const summary = summarizeBrowserReport(report, report);
  assert.equal(summary.totals.unexpected, 1);
  assert.equal(summary.cases[0].attempts[0].status, 'failed');
  assert.deepEqual(summary.cases[1].skipReasons, ['Fullscreen unavailable']);
  assert.equal(summary.cases[1].attempts[0].durationMs, 5);
});

test('rejects missing, duplicated or substituted configured identities', () => {
  const report = caseReport();
  assert.throws(() => summarizeBrowserReport(report, { suites: [] }), /configured/i);
  const duplicate = caseReport();
  duplicate.suites.push(...structuredClone(duplicate.suites));
  assert.throws(() => summarizeBrowserReport(duplicate, duplicate), /duplicate/i);
  const substitute = configured();
  substitute.suites[0].suites[0].specs[0].tests[0].projectName = 'webkit';
  assert.throws(() => summarizeBrowserReport(report, substitute), /configured/i);
});

test('rejects mismatched aggregate totals, invalid outcomes and absent attempts', () => {
  const report = caseReport();
  report.stats.expected = 2;
  assert.throws(() => summarizeBrowserReport(report, configured()), /aggregate/i);
  report.stats.expected = 1;
  report.suites[0].suites[0].specs[0].tests[0].status = 'unknown';
  assert.throws(() => summarizeBrowserReport(report, configured()), /outcome/i);
  assert.throws(() => summarizeBrowserReport(configured(), configured()), /attempt/i);
});

test('CLI writes a reconciled summary and fails closed on unreadable input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'browser-report-'));
  try {
    const report = join(dir, 'report.json');
    const list = join(dir, 'list.json');
    const output = join(dir, 'summary.json');
    writeFileSync(report, JSON.stringify(caseReport()));
    writeFileSync(list, JSON.stringify(configured()));
    const cli = (...args) => spawnSync(process.execPath, ['scripts/browser-report.mjs', ...args], { encoding: 'utf8' });
    const result = cli(report, list, output);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(output)).enumerated, 1);
    assert.equal(cli(report, list).status, 1);
    assert.equal(cli(join(dir, 'missing'), list, output).status, 1);
    writeFileSync(report, '{broken');
    assert.equal(cli(report, list, output).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
