const fs = require('fs');
const path = require('path');

const PRIVATE_TERMS = [
  'customer_phone',
  'customer_email',
  'detailed_address',
  'raw phone',
  'raw email',
  '실제 고객',
  '주민등록',
  '계좌번호'
];

function assertSafeCaptureContext({ outputPath, userDataPath, captureMethod, fixtureMarker }) {
  const normalizedOutput = path.resolve(outputPath);
  const normalizedUserData = path.resolve(userDataPath);
  if (!normalizedOutput.includes(`${path.sep}qa-output${path.sep}`)) {
    throw new Error('SAFE_CAPTURE_OUTPUT_MUST_BE_QA_OUTPUT');
  }
  if (!normalizedUserData.includes(`${path.sep}qa-output${path.sep}`)) {
    throw new Error('SAFE_CAPTURE_USER_DATA_MUST_BE_ISOLATED');
  }
  if (captureMethod !== 'CDP_PAGE_VIEWPORT') {
    throw new Error('SAFE_CAPTURE_REJECTS_DESKTOP_CAPTURE');
  }
  if (fixtureMarker !== 'SYNTHETIC_V0_4_6_QA') {
    throw new Error('SAFE_CAPTURE_REQUIRES_SYNTHETIC_FIXTURE');
  }
}

function assertNoSensitiveDomText(text) {
  const lower = String(text || '').toLowerCase();
  const hits = PRIVATE_TERMS.filter((term) => lower.includes(term.toLowerCase()));
  if (hits.length) throw new Error(`SAFE_CAPTURE_PRIVATE_TEXT_DETECTED:${hits.join(',')}`);
  return { status: 'PASSED', forbidden_hits: [] };
}

function saveViewportScreenshot({ base64, outputPath, userDataPath, fixtureMarker, domText = '' }) {
  assertSafeCaptureContext({
    outputPath,
    userDataPath,
    captureMethod: 'CDP_PAGE_VIEWPORT',
    fixtureMarker
  });
  assertNoSensitiveDomText(domText);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length < 256 || bytes.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('SAFE_CAPTURE_INVALID_PNG');
  }
  fs.writeFileSync(outputPath, bytes);
  return {
    status: 'PASSED',
    capture_scope: 'APP_VIEWPORT_ONLY',
    capture_method: 'CDP_PAGE_VIEWPORT',
    output_path: outputPath,
    bytes: bytes.length
  };
}

module.exports = {
  PRIVATE_TERMS,
  assertSafeCaptureContext,
  assertNoSensitiveDomText,
  saveViewportScreenshot
};
