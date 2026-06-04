'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const expansionSmoke = path.join(root, 'tests', 'rc-0-3-4-actual-customer-pilot-expansion.smoke.js');

function runExpansionSmoke() {
  const result = spawnSync(process.execPath, [expansionSmoke], {
    cwd: root,
    encoding: 'utf8',
    env: process.env
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`RC-0.3.4 expansion smoke failed with exit code ${result.status}`);
  }

  const output = (result.stdout || '').trim();
  const jsonStart = output.indexOf('{');
  assert.ok(jsonStart >= 0, 'expansion smoke returns JSON output');
  return JSON.parse(output.slice(jsonStart));
}

function calculateDecision(summary) {
  const pilots = Array.isArray(summary.results) ? summary.results : [];
  const allCriticalFlowsPass =
    summary.ok === true &&
    summary.pilotCount === 3 &&
    pilots.length === 3 &&
    pilots.every((pilot) => pilot.intakeId && pilot.lightbimImportId && pilot.estimateId) &&
    pilots.every((pilot) => ['BATHROOM', 'KITCHEN', 'FULL_REMODELING'].includes(pilot.estimateType)) &&
    pilots.every((pilot) => ['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(pilot.pceDecision)) &&
    pilots.every((pilot) => pilot.customerOutput === 'READY' && pilot.internalOutput === 'READY') &&
    pilots.every((pilot) => pilot.privacyAnonymization === 'PASSED') &&
    pilots.every((pilot) => pilot.customerSafety === 'PASSED') &&
    pilots.every((pilot) => typeof pilot.friction === 'string' && pilot.friction.length > 0);

  return allCriticalFlowsPass ? 'MERGE_READY' : 'NOT_READY';
}

const summary = runExpansionSmoke();
const decision = calculateDecision(summary);
const pilots = summary.results;

assert.strictEqual(summary.ok, true, 'RC-0.3.4 pilot expansion smoke passed');
assert.strictEqual(summary.pilotCount, 3, 'three pilot scenarios are verified');
assert.deepStrictEqual(
  pilots.map((pilot) => pilot.estimateType),
  ['BATHROOM', 'KITCHEN', 'FULL_REMODELING'],
  'bathroom, kitchen, and full remodeling pilots are covered'
);
pilots.forEach((pilot) => {
  assert.ok(pilot.pilotId, `${pilot.label} pilot run exists`);
  assert.ok(pilot.intakeId, `${pilot.label} connects to intake`);
  assert.ok(pilot.lightbimImportId, `${pilot.label} connects to LightBIM`);
  assert.ok(pilot.estimateId, `${pilot.label} estimate is generated`);
  assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(pilot.priceReadiness), `${pilot.label} price readiness is supported`);
  assert.ok(['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(pilot.pceDecision), `${pilot.label} PCE result exists`);
  assert.strictEqual(pilot.customerOutput, 'READY', `${pilot.label} customer output is ready`);
  assert.strictEqual(pilot.internalOutput, 'READY', `${pilot.label} internal output is ready`);
  assert.strictEqual(pilot.privacyAnonymization, 'PASSED', `${pilot.label} report anonymization passes`);
  assert.strictEqual(pilot.customerSafety, 'PASSED', `${pilot.label} customer safety passes`);
  assert.ok(pilot.friction.includes('Pilot'), `${pilot.label} operational bottleneck is recorded`);
});
assert.strictEqual(summary.privacyAnonymization, 'PASSED', 'raw sensitive values are blocked from reports');
assert.strictEqual(summary.customerSafety, 'PASSED', 'customer safety passes');
assert.strictEqual(summary.finalDecision, '3개 Pilot 유형 반복 검증 가능', 'pilot expansion decision is calculated');
assert.strictEqual(decision, 'MERGE_READY', 'stabilization decision is MERGE_READY when no S1/S2 exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-4-branch-stabilization.smoke',
  pilotCount: summary.pilotCount,
  pilotTypes: pilots.map((pilot) => pilot.estimateType),
  privacyAnonymization: summary.privacyAnonymization,
  customerSafety: summary.customerSafety,
  estimatePce: 'PASSED',
  bottlenecksRecorded: pilots.map((pilot) => pilot.friction),
  stabilizationDecision: decision
}, null, 2));
