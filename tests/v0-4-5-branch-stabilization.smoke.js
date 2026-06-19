const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

function git(args) {
  const result = spawnSync('git', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 15000
  });
  assert.strictEqual(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return String(result.stdout || '').trim();
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

function assertIncludes(text, expected, message) {
  assert.ok(text.includes(expected), message || `Expected text to include ${expected}`);
}

const branch = git(['branch', '--show-current']);
assert.strictEqual(branch, 'v0.4.5-visual-output-qa-stabilization', 'v0.4.5 branch context exists');

const officialTagTarget = git(['rev-list', '-n', '1', 'v0.4.4']);
assert.strictEqual(officialTagTarget, '36aaa3d98b26743a828a879d878b142e9e003905', 'official v0.4.4 tag target preserved');

const v045Tags = git(['tag', '--list', 'v0.4.5*']);
assert.strictEqual(v045Tags, '', 'v0.4.5 tag should not exist during branch stabilization');

const diagnostics = read('tests/v0-4-5-release-smoke-diagnostics.js');
const visualQa = read('tests/v0-4-5-packaged-visual-qa.smoke.js');
const outputQa = read('tests/v0-4-5-output-artifact-render.smoke.js');
const releaseCandidate = read('tests/release-candidate.smoke.js');
const packageJson = JSON.parse(read('electron/package.json'));
const gitignore = read('.gitignore');
const smokeDocs = read('docs/V0_4_5_RELEASE_SMOKE_DIAGNOSTICS.md');
const visualReport = read('docs/V0_4_5_VISUAL_OUTPUT_QA_REPORT.md');
const releaseNotes = read('RELEASE_NOTES.md');

assert.ok(fileExists('tests/v0-4-5-release-smoke-diagnostics.js'), 'release diagnostics test exists');
assert.ok(fileExists('tests/v0-4-5-packaged-visual-qa.smoke.js'), 'visual QA test exists');
assert.ok(fileExists('tests/v0-4-5-output-artifact-render.smoke.js'), 'output artifact QA test exists');

assertIncludes(releaseCandidate, 'runReleaseSmokeDiagnostics', 'release-candidate smoke uses diagnostics runner');
assertIncludes(diagnostics, 'spawnSync(process.execPath', 'release diagnostics uses child process isolation');
assertIncludes(diagnostics, 'timed_out_tests', 'timed out tests are reported');
assertIncludes(diagnostics, 'failed_tests', 'failed tests are reported');
assertIncludes(diagnostics, 'remaining_processes', 'remaining process field exists');
assertIncludes(diagnostics, 'stdout_tail', 'stdout tail is recorded');
assertIncludes(diagnostics, 'stderr_tail', 'stderr tail is recorded');
assertIncludes(diagnostics, 'exit_code', 'exit code is recorded');
assertIncludes(diagnostics, 'signal', 'signal is recorded');
assertIncludes(diagnostics, "script: 'project-profit-closing.smoke.js', timeoutMs: 60000", 'project-profit-closing timeout documented as 60000ms');
assertIncludes(diagnostics, 'Measured standalone duration is about 31s', 'project-profit-closing timeout reason documented');
assert.ok(!diagnostics.includes('timeoutMs: Infinity'), 'no global unlimited timeout');
assert.ok(!diagnostics.includes('process.exit(0); // always'), 'no unconditional success path');

assert.strictEqual(
  packageJson.scripts['smoke:release'],
  'node -e "const path=require(\'path\'); process.chdir(\'..\'); require(path.join(process.cwd(),\'tests\',\'release-candidate.smoke.js\'))"',
  'smoke:release script still exists'
);
assert.ok(packageJson.scripts['smoke:release:diagnose'], 'smoke:release:diagnose script exists');

assertIncludes(gitignore, 'qa-output/', 'qa-output ignored by Git');
assertIncludes(gitignore, '*.pdf', 'generated PDFs ignored by Git');
assertIncludes(gitignore, '*.xlsx', 'generated Excels ignored by Git');
assertIncludes(gitignore, 'screenshots/', 'screenshots ignored by Git');

assertIncludes(visualQa, 'NOT_CAPTURED_TO_AVOID_REAL_DESKTOP_OR_CUSTOMER_DATA_CAPTURE', 'visual QA protects real desktop/customer capture');
assertIncludes(visualQa, 'ClientPortalCenterView.tsx', 'customer screen source isolation is scoped to customer portal');
assertIncludes(visualQa, 'customer_safety_status', 'visual QA verifies customer safety');

assertIncludes(outputQa, 'synthetic-v0.4.5-output-qa', 'output QA uses synthetic fixture');
assertIncludes(outputQa, 'customer_safety_status', 'output QA verifies customer safety');
assertIncludes(outputQa, "documentType: 'customer'", 'output QA covers customer document export');
assertIncludes(outputQa, "documentType: 'internal'", 'output QA covers internal document export');
assertIncludes(outputQa, 'Total Customer Price', 'output QA checks customer PDF total semantics');
assertIncludes(outputQa, 'ECOREAN INTERNAL COST SHEET', 'output QA checks internal PDF semantics');
assertIncludes(outputQa, 'print-html', 'print HTML verified');
assertIncludes(outputQa, 'PDF_KOREAN_TEXT_ASCII_FALLBACK', 'PDF warning recorded');
assertIncludes(outputQa, 'inspectExcel', 'Excel structure verified');
assertIncludes(outputQa, 'forbiddenCustomerTerms', 'customer/internal separation verified');

assertIncludes(smokeDocs, 'project-profit-closing.smoke.js', 'stabilization docs record slow smoke');
assertIncludes(smokeDocs, '60000 ms', 'stabilization docs record per-test timeout');
assertIncludes(visualReport, 'CONDITIONAL_MERGE_READY', 'visual report records final decision');
assertIncludes(releaseNotes, 'v0.4.5 Visual & Output QA Stabilization', 'release notes updated');

const forbiddenSecrets = [
  'client_secret',
  'api_key',
  'oauth_client_secret'
];
const combined = [diagnostics, visualQa, outputQa, smokeDocs, visualReport, releaseNotes].join('\n');
for (const secret of forbiddenSecrets) {
  assert.ok(!combined.includes(secret), `credential must not be committed: ${secret}`);
}

console.log(JSON.stringify({
  ok: true,
  test: 'v0-4-5-branch-stabilization.smoke',
  branch,
  officialTagTarget,
  checks: 26,
  finalDecision: 'CONDITIONAL_MERGE_READY'
}, null, 2));
