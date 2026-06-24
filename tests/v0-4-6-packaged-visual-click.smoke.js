const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createPackagedHarness, QA_ROOT } = require('./helpers/packagedVisualClickHarness');

async function main() {
  const harness = await createPackagedHarness();
  const scenarios = [];
  try {
    const initialText = await harness.visibleText();
    assert.ok(initialText.includes('ECOREAN'), 'packaged dashboard should render');

    scenarios.push(await harness.runClickScenario({
      id: 'lightbim-import',
      clickLabel: 'LightBIM 도면 가져오기',
      expectedText: 'LightBIM JSON 파일'
    }));
    await harness.closeDrawer();

    scenarios.push(await harness.runClickScenario({
      id: 'crm-pipeline',
      clickLabel: '고객 CRM 파이프라인',
      expectedText: '고객 CRM 파이프라인 센터'
    }));
    await harness.closeDrawer();

    scenarios.push(await harness.runClickScenario({
      id: 'client-portal',
      clickLabel: 'Client Portal',
      expectedText: '고객 포털'
    }));

    for (const scenario of scenarios) {
      assert.strictEqual(scenario.before.layout.status, 'PASSED', `${scenario.id} before layout should fit viewport`);
      assert.strictEqual(scenario.after.layout.status, 'PASSED', `${scenario.id} after layout should fit viewport`);
      assert.ok(scenario.pixel_comparison.changed_pixel_ratio >= 0.005, `${scenario.id} should visibly change pixels`);
    }

    const manifest = {
      test: 'v0-4-6-packaged-visual-click',
      result: 'PASSED',
      capture_scope: 'APP_VIEWPORT_ONLY',
      fixture: harness.fixtureMarker,
      isolated_user_data: harness.userDataPath,
      exe_path: harness.exePath,
      scenarios,
      customer_safety: 'PASSED',
      created_at: new Date().toISOString()
    };
    fs.mkdirSync(QA_ROOT, { recursive: true });
    const manifestPath = path.join(QA_ROOT, 'visual-click-manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({
      ok: true,
      test: manifest.test,
      result: manifest.result,
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        click: scenario.clicked_text,
        pixel_change: scenario.pixel_comparison.changed_pixel_ratio,
        layout: scenario.after.layout.status
      })),
      manifest_path: manifestPath
    }, null, 2));
  } finally {
    await harness.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
