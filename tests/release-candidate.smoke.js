const assert = require('assert');
const { runReleaseSmokeDiagnostics } = require('./v0-4-5-release-smoke-diagnostics');

async function run() {
  const summary = await runReleaseSmokeDiagnostics({
    writeSummary: true,
    failFast: false,
    perTestTimeoutMs: Number(process.env.BOC_RELEASE_SMOKE_TIMEOUT_MS || 30000)
  });

  if (summary.result !== 'PASSED') {
    console.error(JSON.stringify({
      ok: false,
      timed_out_tests: summary.timed_out_tests,
      failed_tests: summary.failed_tests,
      summary_path: summary.summary_path
    }, null, 2));
  }

  assert.strictEqual(summary.failed_tests.length, 0, 'release candidate smoke checks should not fail');
  assert.strictEqual(summary.timed_out_tests.length, 0, 'release candidate smoke checks should not time out');

  console.log(JSON.stringify({
    ok: true,
    test: 'release-candidate.smoke',
    checks: summary.tests.map(({ label, script, duration_ms }) => ({ label, script, duration_ms })),
    total_duration_ms: summary.total_duration_ms,
    summary_path: summary.summary_path
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
