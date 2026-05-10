const assert = require('assert');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-floorplan-${Date.now()}`);
const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => tempRoot
  }
});

const initial = service.getFloorplanCenterData();
assert.strictEqual(initial.emptyState, true, 'empty floorplan state renders correctly');

const floorplan = service.saveFloorplanMetadata({
  estimateId: 'FULL-EST-FLOORPLAN-SMOKE',
  projectId: 'PRJ-FLOORPLAN-SMOKE',
  fileName: 'sample-floorplan.png',
  filePath: 'C:/mock/sample-floorplan.png',
  fileType: 'PNG',
  width: 1200,
  height: 800
});
assert.ok(floorplan.floorplanId, 'floorplan metadata can be saved');

const space = service.createFloorplanSpace({
  floorplanId: floorplan.floorplanId,
  spaceName: '거실',
  spaceType: '거실',
  areaM2: 24,
  notes: 'manual zoning smoke test'
});
assert.ok(space.spaceId, 'space zone can be created');

const link = service.linkEstimateItemToSpace({
  spaceId: space.spaceId,
  estimateType: 'full_remodel',
  estimateId: 'FULL-EST-FLOORPLAN-SMOKE',
  estimateItemId: 'ITEM-FLOOR-001',
  itemName: '바닥재',
  amount: 1500000,
  cost: 1000000,
  margin: 500000
});
assert.ok(link.linkId, 'estimate item can be linked to space');

const afterLink = service.getFloorplanCenterData({ floorplanId: floorplan.floorplanId });
assert.strictEqual(afterLink.spaces.length, 1, 'space is returned');
assert.strictEqual(afterLink.links.length, 1, 'space estimate link is returned');
assert.strictEqual(afterLink.summaries[0].amount, 1500000, 'space summary calculates amount');
assert.strictEqual(afterLink.summaries[0].cost, 1000000, 'space summary calculates cost');
assert.strictEqual(afterLink.summaries[0].margin, 500000, 'space summary calculates margin');
assert.ok(afterLink.summaries[0].marginRate > 0.3, 'space summary calculates margin rate');
assert.strictEqual(afterLink.isometricPreview.mode, 'BLOCK_PLACEHOLDER', 'no CAD parsing is required');
assert.strictEqual(afterLink.isometricPreview.blocks.length, 1, 'isometric preview data is generated');

const moodboard = service.saveMoodboardProfile({
  floorplanId: floorplan.floorplanId,
  estimateId: 'FULL-EST-FLOORPLAN-SMOKE',
  style: 'modern minimal',
  colorTone: 'warm white and walnut',
  primaryMaterials: 'wood floor, matte paint, porcelain tile',
  lightingMood: 'soft indirect lighting',
  referenceNotes: 'clean apartment interior'
});
assert.ok(moodboard.moodboardId, 'moodboard data connects to prompt');

const prompt = service.generatePerspectivePrompt({
  floorplanId: floorplan.floorplanId,
  spaceId: space.spaceId,
  estimateId: 'FULL-EST-FLOORPLAN-SMOKE',
  promptType: 'PERSPECTIVE',
  style: 'modern minimal',
  colorTone: 'warm white and walnut',
  primaryMaterials: 'wood floor, matte paint, porcelain tile',
  lightingMood: 'soft indirect lighting'
});
assert.ok(prompt.promptText.includes('거실'), 'perspective prompt is generated with space label');
assert.ok(prompt.promptText.includes('modern minimal'), 'perspective prompt includes moodboard style');

const finalData = service.getFloorplanCenterData({ estimateId: 'FULL-EST-FLOORPLAN-SMOKE' });
assert.strictEqual(finalData.prompts.length, 1, 'prompt output is stored');
assert.strictEqual(finalData.emptyState, false, 'floorplan center has active data');

const stats = service.getDbStats();
assert.ok(stats.floorplanCount >= 1, 'floorplan table has row');
assert.ok(stats.floorplanSpaceCount >= 1, 'floorplan space table has row');
assert.ok(stats.spaceEstimateLinkCount >= 1, 'space estimate link table has row');
assert.ok(stats.designPromptOutputCount >= 1, 'design prompt table has row');
assert.ok(stats.moodboardProfileCount >= 1, 'moodboard table has row');

console.log(JSON.stringify({ ok: true, test: 'floorplan-isometric-layer.smoke' }));
