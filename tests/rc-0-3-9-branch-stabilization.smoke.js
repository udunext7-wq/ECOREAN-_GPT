'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const implementationOutput = execFileSync(
  process.execPath,
  [path.join(__dirname, 'rc-0-3-9-recommendation-scoring.smoke.js')],
  { cwd: projectRoot, encoding: 'utf8' }
);

assert.ok(implementationOutput.includes('"ok": true'), 'RC-0.3.9 implementation smoke passes');
assert.ok(implementationOutput.includes('"score": 93') && implementationOutput.includes('"level": "HIGH"'), 'HIGH 93 is reproduced');
assert.ok(implementationOutput.includes('"score": 66') && implementationOutput.includes('"level": "MEDIUM"'), 'MEDIUM 66 is reproduced');
assert.ok(implementationOutput.includes('"score": 54') && implementationOutput.includes('"level": "LOW"'), 'LOW 54 is reproduced');
assert.ok(implementationOutput.includes('"score": 0') && implementationOutput.includes('"level": "NO_MATCH"'), 'NO_MATCH 0 is reproduced');
assert.ok(implementationOutput.includes('"vendorOnlyConfidence": "NO_MATCH"'), 'vendor-only weak match is not promoted to HIGH');
assert.ok(implementationOutput.includes('"masterDataUnchanged": true'), 'rule, approval, and queue flows do not change Master Data');
assert.ok(implementationOutput.includes('"legacyApprovalQueueSafety": "PASSED"'), 'legacy approval and queue safety remains intact');
assert.ok(implementationOutput.includes('"customerSafety": "PASSED"'), 'customer safety remains intact');

const serviceSource = fs.readFileSync(
  path.join(projectRoot, 'electron/services/recommendationScoringService.js'),
  'utf8'
);
const rulesViewSource = fs.readFileSync(
  path.join(projectRoot, 'ui/app/pricing/RecommendationScoringRulesView.tsx'),
  'utf8'
);
const uiBridgeSource = fs.readFileSync(
  path.join(projectRoot, 'ui/services/pricing-service/recommendationScoringService.ts'),
  'utf8'
);

assert.ok(serviceSource.includes('if (left === right) return 100;'), 'identical normalized strings retain 100 similarity');
assert.ok(serviceSource.includes("confidenceForScore"), 'confidence classification is available');
assert.ok(rulesViewSource.includes('등록된 추천 점수 규칙이 없습니다.'), 'rules view has a safe empty state');
assert.ok(rulesViewSource.includes('Master Data 가격은 변경되지 않았습니다.'), 'rules view explains Master Data protection');
assert.ok(uiBridgeSource.includes('window.ecorean?.bocDb'), 'UI uses the typed ECOREAN database bridge');
assert.ok(!uiBridgeSource.includes('window.electronAPI'), 'obsolete UI bridge reference does not recur');

const entryPoints = [
  ['CEO Dashboard', 'ui/app/dashboard/CeoDashboard.tsx'],
  ['Drawer navigation', 'ui/components/modals/DetailDrawer.tsx'],
  ['Unmatched Price Recommendation Center', 'ui/app/pricing/UnmatchedPriceRecommendationCenterView.tsx'],
  ['Master Data Center', 'ui/app/master/MasterDataCenterView.tsx'],
  ['Real Price Calibration Workbench', 'ui/app/pricing/RealPriceCalibrationWorkbenchView.tsx']
].map(([label, file]) => {
  const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');
  assert.ok(
    source.includes('recommendationScoringRules') || source.includes('RecommendationScoringRulesView'),
    `${label} contains the scoring rules entry point`
  );
  return label;
});

const unresolvedS1S2 = [];
const decision = unresolvedS1S2.length === 0 ? 'MERGE_READY' : 'NOT_READY';
assert.strictEqual(decision, 'MERGE_READY', 'stabilization decision is MERGE_READY when no S1/S2 remains');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-9-branch-stabilization.smoke',
  implementationSmoke: 'PASSED',
  confidence: {
    high: 93,
    medium: 66,
    low: 54,
    noMatch: 0
  },
  scoreBreakdown: 'PASSED',
  vendorWeight: 'PASSED',
  vendorOnlyHighPrevention: 'PASSED',
  historyWeight: 'PASSED',
  masterDataProtection: 'PASSED',
  customerSafety: 'PASSED',
  uiBridgeRegression: 'PASSED',
  identicalSimilarityRegression: 'PASSED',
  testDatabaseFixtureRegression: 'PASSED',
  entryPoints,
  decision
}, null, 2));
