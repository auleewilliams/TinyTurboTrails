import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
    const cli = (...args) => {
      const result = spawnSync(process.execPath, ['scripts/browser-report.mjs', ...args], { encoding: 'utf8' });
      assert.ifError(result.error);
      return result;
    };
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

function attachmentFixture(t, attachments) {
  const dir = mkdtempSync(join(tmpdir(), 'browser-report-fixture-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, 'artifact');
  mkdirSync(root);
  const report = caseReport([{ status: 'passed', duration: 12, attachments }]);
  return { dir, root, report };
}

function verify(report, artifactRoot) {
  return summarizeBrowserReport(report, report, { artifactRoot }).attachmentVerification;
}

test('opt-in API checks artifact-relative files and counts inline fixture attachments', t => {
  const { root, report } = attachmentFixture(t, [
    { name: 'image', path: 'image.png' }, { name: 'body', body: 'fixture' },
  ]);
  writeFileSync(join(root, 'image.png'), 'synthetic image fixture');
  assert.deepEqual(verify(report, root), { checked: 1, inline: 1, missing: 0, invalid: 0, diagnostics: [] });
  assert.equal(Object.hasOwn(summarizeBrowserReport(report, report), 'attachmentVerification'), false);
});

test('opt-in API reports missing fixture paths with case, project and attempt context', t => {
  const { root, report } = attachmentFixture(t, [{ name: 'image', path: 'missing.png' }]);
  assert.throws(() => verify(report, root), error => {
    assert.match(error.message, /attachment verification failed/i);
    assert.deepEqual(error.attachmentVerification, {
      checked: 0, inline: 0, missing: 1, invalid: 0,
      diagnostics: [{ kind: 'missing', caseId: 'case-1', title: 'browser.spec.ts > nested suite > case title',
        project: 'firefox', attempt: 0, retry: 0, attachment: 0, reference: 'missing.png',
        reason: 'File does not exist' }],
    });
    return true;
  });
});

test('CLI opt-in writes verified fixture summaries and fails without writing on missing files', t => {
  const { dir, root, report } = attachmentFixture(t, [{ path: 'image.png' }]);
  const input = join(dir, 'report.json');
  const output = join(dir, 'summary.json');
  writeFileSync(input, JSON.stringify(report));
  writeFileSync(join(root, 'image.png'), 'fixture');
  const cli = (...args) => {
    const result = spawnSync(process.execPath, ['scripts/browser-report.mjs', input, input, output, ...args], { encoding: 'utf8' });
    assert.ifError(result.error);
    return result;
  };
  const success = cli('--artifact-root', root);
  assert.equal(success.status, 0, success.stderr);
  assert.equal(JSON.parse(success.stdout).attachmentVerification.checked, 1);
  assert.equal(JSON.parse(readFileSync(output)).attachmentVerification.checked, 1);
  rmSync(output);
  rmSync(join(root, 'image.png'));
  const missing = cli('--artifact-root', root);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /image.png/);
  assert.match(missing.stderr, /"missing":1/);
  assert.equal(existsSync(output), false);
  assert.equal(cli().status, 0, 'legacy CLI does not inspect attachment files');
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(output)), 'attachmentVerification'), false);
  assert.equal(cli('--unknown', root).status, 1);
  assert.equal(cli('--artifact-root').status, 1);
});

test('relocates exact test-results suffixes and normalizes fixture path separators', t => {
  const references = [
    'case/shot.png', 'test-results/case/shot.png', 'test-results\\case\\shot.png',
    '/home/runner/work/repo/repo/test-results/case/shot.png',
    'C:\\actions\\repo\\test-results\\case\\shot.png',
    '//server/share/repo/test-results/case/shot.png',
  ];
  const { root, report } = attachmentFixture(t, references.map(path => ({ path })));
  mkdirSync(join(root, 'case'));
  writeFileSync(join(root, 'case/shot.png'), 'fixture');
  assert.equal(verify(report, root).checked, references.length);
});

test('rejects lexical escapes, unrecognized absolute paths and ambiguous CI roots', t => {
  const { dir, root, report } = attachmentFixture(t, []);
  const outside = join(dir, 'outside.png');
  writeFileSync(outside, 'outside fixture must never be opened by a report reference');
  const references = [
    '../outside.png', 'case/../../outside.png', 'test-results/../outside.png',
    'case\\..\\shot.png', '/ci/test-results/../outside.png', outside,
    'C:\\outside.png', 'C:outside.png', '/ci/test-results/nested/test-results/shot.png',
    'file:///ci/test-results/shot.png', '//server/share/outside.png',
  ];
  report.suites[0].suites[0].specs[0].tests[0].results[0].attachments = references.map(path => ({ path }));
  assert.throws(() => verify(report, root), error => {
    assert.equal(error.attachmentVerification.invalid, references.length);
    assert.equal(error.attachmentVerification.missing, 0);
    assert.equal(error.attachmentVerification.checked, 0);
    assert.deepEqual(error.attachmentVerification.diagnostics.map(item => item.reference), references);
    return true;
  });
});

test('contains real fixture symlinks, including directory and dangling escapes', t => {
  const { dir, root, report } = attachmentFixture(t, []);
  mkdirSync(join(root, 'case'));
  writeFileSync(join(root, 'case/shot.png'), 'inside fixture');
  writeFileSync(join(dir, 'outside.png'), 'outside fixture');
  symlinkSync('case/shot.png', join(root, 'inside-link'));
  symlinkSync('../outside.png', join(root, 'outside-link'));
  symlinkSync('..', join(root, 'outside-dir'));
  symlinkSync('../absent.png', join(root, 'dangling-escape'));
  symlinkSync('absent.png', join(root, 'dangling-inside'));
  symlinkSync('loop', join(root, 'loop'));
  const paths = ['inside-link', 'outside-link', 'outside-dir/outside.png', 'dangling-escape', 'dangling-inside', 'loop', 'case'];
  report.suites[0].suites[0].specs[0].tests[0].results[0].attachments = paths.map(path => ({ path }));
  assert.throws(() => verify(report, root), error => {
    const totals = error.attachmentVerification;
    assert.equal(totals.checked, 1);
    assert.equal(totals.invalid, 5);
    assert.equal(totals.missing, 1);
    assert.match(totals.diagnostics.find(item => item.reference === 'outside-link').reason, /escape/i);
    assert.match(totals.diagnostics.find(item => item.reference === 'case').reason, /regular file/i);
    return true;
  });
});

for (const variant of ['existing', 'dangling-file', 'dangling-directory']) {
  test(`rejects indirect parent traversal through an outside fixture symlink (${variant})`, t => {
    const { dir, root, report } = attachmentFixture(t, [{ path: 'link' }, { path: 'absolute-link' }]);
    const outside = join(dir, 'outside');
    mkdirSync(outside);
    if (variant !== 'dangling-directory') mkdirSync(join(outside, 'deep'));
    if (variant === 'existing') writeFileSync(join(outside, 'x'), 'outside fixture');
    writeFileSync(join(root, 'x'), 'internal decoy must not be substituted');
    symlinkSync(join(outside, 'deep'), join(root, 'sub'));
    symlinkSync('sub/../x', join(root, 'link'));
    symlinkSync(`${root}/sub/../x`, join(root, 'absolute-link'));
    // Use kernel resolution; the JavaScript realpath fallback collapses '..'.
    for (const name of ['link', 'absolute-link']) {
      if (variant === 'existing') assert.equal(realpathSync.native(join(root, name)), join(outside, 'x'));
      else assert.throws(() => realpathSync.native(join(root, name)), { code: 'ENOENT' });
    }
    // Reject using the link text alone, before even inspecting outside targets.
    chmodSync(outside, 0o000);
    try {
      assert.throws(() => verify(report, root), error => {
        const totals = error.attachmentVerification;
        assert.deepEqual([totals.checked, totals.inline, totals.missing, totals.invalid], [0, 0, 0, 2]);
        assert.ok(totals.diagnostics.every(item => /escape/i.test(item.reason)));
        return true;
      });
    } finally {
      chmodSync(outside, 0o700);
    }
  });
}

for (const dangling of [false, true]) {
  test(`follows internal sibling fixture symlinks before parent traversal (dangling=${dangling})`, t => {
    const { root, report } = attachmentFixture(t, [{ path: 'link' }, { path: 'absolute-link' }]);
    mkdirSync(join(root, 'sibling/deep'), { recursive: true });
    symlinkSync('sibling/deep', join(root, 'sub'));
    symlinkSync('sub/../x', join(root, 'link'));
    symlinkSync(`${root}/sub/../x`, join(root, 'absolute-link'));
    if (dangling) {
      writeFileSync(join(root, 'x'), 'internal decoy must not be substituted');
      assert.throws(() => realpathSync.native(join(root, 'link')), { code: 'ENOENT' });
      assert.throws(() => verify(report, root), error => {
        const totals = error.attachmentVerification;
        assert.deepEqual([totals.checked, totals.inline, totals.missing, totals.invalid], [0, 0, 2, 0]);
        return true;
      });
    } else {
      writeFileSync(join(root, 'sibling/x'), 'actual internal fixture target');
      assert.equal(realpathSync.native(join(root, 'link')), join(root, 'sibling/x'));
      assert.deepEqual(verify(report, root), { checked: 2, inline: 0, missing: 0, invalid: 0, diagnostics: [] });
    }
  });
}

test('rejects parent traversal through a regular fixture file', t => {
  const { root, report } = attachmentFixture(t, [{ path: 'link' }]);
  writeFileSync(join(root, 'file'), 'not a directory');
  writeFileSync(join(root, 'x'), 'internal decoy');
  symlinkSync('file/../x', join(root, 'link'));
  assert.throws(() => realpathSync.native(join(root, 'link')), { code: 'ENOTDIR' });
  assert.throws(() => verify(report, root), error => {
    const totals = error.attachmentVerification;
    assert.deepEqual([totals.checked, totals.inline, totals.missing, totals.invalid], [0, 0, 0, 1]);
    assert.match(totals.diagnostics[0].reason, /directory/i);
    return true;
  });
});

test('checks every nested fixture project and failed/retry attempt while preserving native outcomes', t => {
  const { root, report } = attachmentFixture(t, [{ path: 'ok.png' }]);
  writeFileSync(join(root, 'ok.png'), 'fixture');
  const suite = report.suites[0].suites[0];
  const first = suite.specs[0].tests[0];
  first.status = 'flaky';
  first.results = [
    { status: 'failed', duration: 20, retry: 0, attachments: [{ path: 'failed.png' }] },
    { status: 'passed', duration: 10, retry: 1, attachments: [{ path: 'ok.png' }, { body: 'fixture' }] },
  ];
  suite.specs[0].tests.push({ ...first, projectName: 'webkit', status: 'unexpected',
    results: [{ status: 'failed', duration: 30, attachments: [{ path: 'webkit.png' }] }] });
  suite.suites = [{ title: 'deeper', specs: [{ ...suite.specs[0], id: 'case-2', tests: [{
    ...first, status: 'skipped', annotations: [{ type: 'skip', description: 'fixture native audio unavailable' }],
    results: [{ status: 'skipped', duration: 2, attachments: [{ body: 'fixture' }] }],
  }] }] }];
  report.stats = { expected: 0, unexpected: 1, skipped: 1, flaky: 1 };
  assert.throws(() => verify(report, root), error => {
    const totals = error.attachmentVerification;
    assert.deepEqual([totals.checked, totals.inline, totals.missing, totals.invalid], [1, 2, 2, 0]);
    assert.deepEqual(totals.diagnostics.map(item => [item.project, item.attempt, item.retry, item.reference]),
      [['firefox', 0, 0, 'failed.png'], ['webkit', 0, 0, 'webkit.png']]);
    return true;
  });
  writeFileSync(join(root, 'failed.png'), 'fixture');
  writeFileSync(join(root, 'webkit.png'), 'fixture');
  const summary = summarizeBrowserReport(report, report, { artifactRoot: root });
  assert.equal(summary.attachmentVerification.checked, 3);
  assert.deepEqual(summary.totals, report.stats);
  assert.deepEqual(summary.cases[0].attempts.map(item => item.status), ['failed', 'passed']);
  assert.deepEqual(summary.cases[2].skipReasons, ['fixture native audio unavailable']);
});

test('rejects malformed fixture attachment entries and paths instead of counting them as inline', t => {
  const entries = [null, 'file.png', [], { path: null }, { path: false }, { path: 0 },
    { path: 42 }, { path: {} }, { path: [] }, { path: '   ' }, { path: 'a\u0000b' }];
  const { root, report } = attachmentFixture(t, [...entries, { body: 'fixture' }, { path: '', body: 'fixture' }]);
  assert.throws(() => verify(report, root), error => {
    assert.equal(error.attachmentVerification.invalid, entries.length);
    assert.equal(error.attachmentVerification.inline, 2);
    assert.equal(error.attachmentVerification.missing, 0);
    assert.ok(error.attachmentVerification.diagnostics.every(item => item.caseId === 'case-1' && item.project === 'firefox' && item.attempt === 0));
    return true;
  });
});

test('rejects malformed fixture containers clearly at every traversal level', t => {
  const { root } = attachmentFixture(t, []);
  const mutations = [
    r => { r.suites = null; }, r => { r.suites = {}; }, r => { r.suites = [null]; },
    r => { r.suites[0].suites = {}; }, r => { r.suites[0].specs = null; },
    r => { r.suites[0].suites[0].specs = [null]; },
    r => { r.suites[0].suites[0].specs[0].tests = {}; },
    r => { r.suites[0].suites[0].specs[0].tests = [null]; },
    r => { r.suites[0].suites[0].specs[0].tests[0].results = null; },
    r => { r.suites[0].suites[0].specs[0].tests[0].results = [null]; },
    r => { r.suites[0].suites[0].specs[0].tests[0].results[0].attachments = {}; },
    r => { r.suites[0].suites[0].specs[0].tests[0].results[0].attachments = null; },
  ];
  for (const mutate of mutations) {
    const report = caseReport();
    mutate(report);
    assert.throws(() => verify(report, root), error => {
      assert.match(error.message, /attachment verification failed/i);
      assert.equal(error.attachmentVerification.invalid, 1);
      assert.match(error.attachmentVerification.diagnostics[0].reason, /must be (an array|an object)/);
      return true;
    });
  }
});

test('rejects unreadable fixture files and symlinks to a sibling sharing the root prefix', t => {
  const { root, report } = attachmentFixture(t, [{ path: 'unreadable' }, { path: 'sibling-link/image.png' }]);
  const file = join(root, 'unreadable');
  writeFileSync(file, 'fixture');
  const sibling = `${root}-sibling`;
  mkdirSync(sibling);
  writeFileSync(join(sibling, 'image.png'), 'outside fixture');
  symlinkSync(sibling, join(root, 'sibling-link'));
  chmodSync(file, 0o000);
  try {
    assert.throws(() => verify(report, root), error => {
      const totals = error.attachmentVerification;
      assert.deepEqual([totals.checked, totals.inline, totals.missing, totals.invalid], [0, 0, 0, 2]);
      assert.match(totals.diagnostics[0].reason, /EACCES|EPERM/);
      assert.match(totals.diagnostics[1].reason, /escape/i);
      return true;
    });
  } finally {
    chmodSync(file, 0o600);
  }
});
