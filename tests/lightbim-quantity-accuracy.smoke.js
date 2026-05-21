const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');
const minicadDir = path.join(rootDir, 'minicad');
const state = require('./fixtures/lightbim/quantity-accuracy-state.sample.js');

const context = { console, Date, Math, JSON, window: {} };
context.window = context;
context.globalThis = context;

function runScript(relativePath) {
  const filePath = path.join(minicadDir, relativePath);
  vm.runInNewContext(fs.readFileSync(filePath, 'utf8'), context, { filename: filePath });
}

[
  'js/lightbim/core/schema.js',
  'js/lightbim/core/geometryCore.js',
  'js/lightbim/core/openingEngine.js',
  'js/lightbim/core/wallEngine.js',
  'js/lightbim/core/spaceEngine.js',
  'js/lightbim/core/quantityEngine.js',
  'js/lightbim/adapters/miniCadStateAdapter.js',
  'js/lightbim/adapters/bocEstimateAdapter.js'
].forEach(runScript);

const LB = context.window.LightBIM;
const project = LB.adapters.miniCadStateAdapter.normalizeMiniCadState(state);
const quantities = LB.quantityEngine.calculateProjectQuantities(project);
const bySpace = Object.fromEntries(quantities.space_quantities.map((space) => [space.space_id, space]));

assert.strictEqual(bySpace['space-living'].floor_area_m2, 20, 'Space floor area is calculated correctly');
assert.strictEqual(bySpace['space-living'].ceiling_area_m2, 20, 'Space ceiling area follows floor area');
assert.strictEqual(bySpace['space-living'].perimeter_m, 18, 'Space perimeter is calculated correctly');

const livingWindowWall = project.walls.find((wall) => wall.id === 'wall-living-window');
const wallQuantity = LB.wallEngine.calculateNetWallArea(livingWindowWall, project.vertices, project.openings);
assert.strictEqual(wallQuantity.length_m, 4, 'Wall length is calculated in meters');
assert.strictEqual(wallQuantity.gross_wall_area_m2, 9.6, 'Wall gross area is calculated correctly');
assert.strictEqual(wallQuantity.opening_area_m2, 1.44, 'Opening area is subtracted from wall area');
assert.strictEqual(wallQuantity.net_wall_area_m2, 8.16, 'Net wall area is calculated correctly');

const overOpened = LB.wallEngine.calculateNetWallArea(
  { id: 'over-opened', v1Id: 'lv0', v2Id: 'lv1', height: 1000 },
  project.vertices,
  [{ id: 'huge', type: 'window', wallId: 'over-opened', width: 10000, height: 3000 }]
);
assert.strictEqual(overOpened.net_wall_area_m2, 0, 'Net wall area is never negative');

assert.strictEqual(quantities.door_count, 2, 'Door count is correct');
assert.strictEqual(quantities.window_count, 1, 'Window count is correct');

const expectedBathroomTile = 4.4 + ((2 + 2.2 + 2 + 2.2) * 2.4 - (0.9 * 2.1));
assert.strictEqual(quantities.process_quantities.bathroom_tile_area_m2, LB.geometryCore.roundQuantity(expectedBathroomTile), 'Bathroom tile area includes wall + floor');
assert.ok(quantities.process_quantities.kitchen_wall_tile_area_m2 > 0, 'Kitchen wall tile fallback is generated');
assert.ok(quantities.warnings.some((warning) => warning.code === 'ESTIMATED_KITCHEN_TILE_AREA'), 'Kitchen wall tile fallback warning exists');

const totalPerimeter = quantities.space_quantities.reduce((sum, space) => sum + space.perimeter_m, 0);
assert.ok(quantities.process_quantities.baseboard_length_m < totalPerimeter, 'Baseboard length subtracts door width if possible');
assert.ok(quantities.warnings.some((warning) => warning.code === 'DEFAULT_OPENING_SIZE_USED'), 'Quantity warnings are returned');

const bocInput = LB.adapters.bocEstimateAdapter.createBOCEstimateInput(project, quantities);
assert.ok(bocInput.quantity_basis, 'BOC estimate input includes quantity_basis');
assert.strictEqual(bocInput.quantity_basis.total_area_m2, quantities.total_floor_area_m2, 'BOC quantity basis includes total area');
assert.strictEqual(bocInput.quantity_basis.net_wall_area_m2, quantities.total_net_wall_area_m2, 'BOC quantity basis includes net wall area');
assert.strictEqual(bocInput.selected_processes.flooring, true, 'Full remodeling selected_processes infer flooring');
assert.strictEqual(bocInput.selected_processes.wallpaper, true, 'Full remodeling selected_processes infer wallpaper');
assert.strictEqual(bocInput.selected_processes.painting, true, 'Full remodeling selected_processes infer painting');
assert.strictEqual(bocInput.selected_processes.bathroom, true, 'Full remodeling selected_processes infer bathroom');
assert.strictEqual(bocInput.selected_processes.kitchen, true, 'Full remodeling selected_processes infer kitchen');
assert.strictEqual(bocInput.selected_processes.windows, true, 'Full remodeling selected_processes infer windows');
assert.strictEqual(bocInput.selected_processes.doors, true, 'Full remodeling selected_processes infer doors');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-quantity-accuracy.smoke',
  totalAreaM2: quantities.total_floor_area_m2,
  netWallAreaM2: quantities.total_net_wall_area_m2,
  warningCount: quantities.warnings.length
}));
