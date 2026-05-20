const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');
const minicadDir = path.join(rootDir, 'minicad');
const outputPath = path.join(__dirname, 'fixtures', 'lightbim', 'real-minicad-export.lightbim.json');
const state = require('./fixtures/lightbim/real-minicad-state.sample.js');

const context = {
  console,
  Date,
  Math,
  JSON,
  window: {},
  document: {
    createElement: () => ({ click: () => undefined, set href(value) { this._href = value; }, set download(value) { this._download = value; } }),
    body: { appendChild: () => undefined, removeChild: () => undefined }
  },
  Blob: function Blob(parts, options) { this.parts = parts; this.options = options; },
  URL: {
    createObjectURL: () => 'blob:lightbim-test',
    revokeObjectURL: () => undefined
  },
  downloadText: () => undefined,
  showStatus: () => undefined
};
context.window = context;
context.globalThis = context;
context.STATE = state;
context.window.STATE = state;

function runScript(relativePath) {
  const filePath = path.join(minicadDir, relativePath);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInNewContext(code, context, { filename: filePath });
}

function loadLightBIMModules() {
  [
    'js/lightbim/core/schema.js',
    'js/lightbim/core/geometryCore.js',
    'js/lightbim/core/openingEngine.js',
    'js/lightbim/core/wallEngine.js',
    'js/lightbim/core/spaceEngine.js',
    'js/lightbim/core/quantityEngine.js',
    'js/lightbim/adapters/miniCadStateAdapter.js',
    'js/lightbim/adapters/bocEstimateAdapter.js',
    'js/lightbim/adapters/aiPromptAdapter.js',
    'js/lightbim/adapters/dxfAdapter.js'
  ].forEach(runScript);
  context.LightBIM = context.window.LightBIM;
}

function loadRealExportFunctionFromMiniCadUi() {
  const uiPath = path.join(minicadDir, 'js', 'ui.js');
  const uiSource = fs.readFileSync(uiPath, 'utf8');
  const match = uiSource.match(/function exportLightBIMJSON\(\)[\s\S]*?window\.downloadLightBIMJSON=downloadLightBIMJSON;/);
  assert.ok(match, 'MiniCAD ui.js contains exportLightBIMJSON and downloadLightBIMJSON');
  vm.runInNewContext(match[0], context, { filename: `${uiPath}:exportLightBIMJSON` });
}

const html = fs.readFileSync(path.join(minicadDir, 'ecorean_minicad_v5_9.html'), 'utf8');
assert.ok(html.includes('js/lightbim/core/schema.js'), 'MiniCAD HTML loads LightBIM schema');
assert.ok(html.includes('js/ui.js'), 'MiniCAD HTML loads current UI script');
assert.ok(html.includes('btn-lightbim-export'), 'MiniCAD HTML has LightBIM JSON export button');

loadLightBIMModules();
assert.ok(context.window.LightBIM, 'window.LightBIM exists');
assert.ok(context.window.LightBIM.adapters?.miniCadStateAdapter, 'MiniCAD state adapter exists');

loadRealExportFunctionFromMiniCadUi();
assert.strictEqual(typeof context.window.exportLightBIMJSON, 'function', 'window.exportLightBIMJSON exists');

const exported = context.window.exportLightBIMJSON();
assert.strictEqual(exported.schema, 'ECOREAN.LightBIM.v0.1', 'exportLightBIMJSON returns valid schema');
assert.ok(exported.project, 'export includes project');
assert.ok(exported.quantities, 'export includes quantities');
assert.ok(exported.bocEstimateInput, 'export includes bocEstimateInput');
assert.ok(exported.aiPromptHints, 'export includes aiPromptHints');
assert.ok(exported.project.spaces.length >= 5, 'export includes realistic MiniCAD spaces');
assert.ok(exported.quantities.total_floor_area_m2 > 0, 'export includes floor area');
assert.ok(exported.quantities.door_count >= 1, 'export includes door count');
assert.ok(exported.quantities.window_count >= 1, 'export includes window count');

fs.writeFileSync(outputPath, `${JSON.stringify(exported, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  test: 'export-real-minicad-lightbim.smoke',
  outputPath,
  estimateType: exported.bocEstimateInput.estimate_type,
  totalAreaM2: exported.quantities.total_floor_area_m2,
  spaceCount: exported.project.spaces.length
}));
