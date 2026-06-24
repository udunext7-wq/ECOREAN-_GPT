const assert = require('assert');
const { createPackagedHarness } = require('./helpers/packagedVisualClickHarness');
const {
  assertNoSensitiveDomText,
  assertSafeCaptureContext
} = require('./helpers/safeScreenshotCapture');

async function main() {
  assert.throws(() => assertSafeCaptureContext({
    outputPath: 'C:\\temp\\desktop.png',
    userDataPath: 'C:\\Users\\operator\\AppData\\Roaming\\ecorean-boc-electron',
    captureMethod: 'DESKTOP_FULL_SCREEN',
    fixtureMarker: 'REAL_DATA'
  }), /SAFE_CAPTURE_OUTPUT_MUST_BE_QA_OUTPUT/);
  assert.throws(() => assertNoSensitiveDomText('customer_phone: 010-0000-0000'), /SAFE_CAPTURE_PRIVATE_TEXT_DETECTED/);

  const harness = await createPackagedHarness();
  try {
    const capture = await harness.capture('safe-capture-proof');
    assert.strictEqual(capture.status, 'PASSED');
    assert.strictEqual(capture.capture_scope, 'APP_VIEWPORT_ONLY');
    assert.strictEqual(capture.capture_method, 'CDP_PAGE_VIEWPORT');
    assert.strictEqual(capture.layout.status, 'PASSED');
    console.log(JSON.stringify({
      ok: true,
      test: 'v0-4-6-safe-screenshot-harness',
      capture_scope: capture.capture_scope,
      capture_method: capture.capture_method,
      isolated_user_data: harness.userDataPath,
      desktop_capture: 'REJECTED',
      sensitive_dom_capture: 'REJECTED',
      screenshot_path: capture.output_path
    }, null, 2));
  } finally {
    await harness.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
