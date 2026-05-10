const assert = require('assert');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');
const { requestManualGeneration } = require('../electron/services/visualizationProviders/manualProvider');
const { requestComfyUiGeneration } = require('../electron/services/visualizationProviders/comfyuiProvider');

const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-ai-visualization-${Date.now()}`);
const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => tempRoot
  }
});

const floorplan = service.saveFloorplanMetadata({
  estimateId: 'FULL-EST-VIS-SMOKE',
  projectId: 'PRJ-VIS-SMOKE',
  fileName: 'visualization-floorplan.png',
  filePath: 'C:/mock/visualization-floorplan.png',
  fileType: 'PNG',
  width: 1200,
  height: 900
});

const space = service.createFloorplanSpace({
  floorplanId: floorplan.floorplanId,
  spaceName: '주방',
  spaceType: '주방',
  areaM2: 12.5,
  notes: 'window on north wall, no island selected'
});

service.saveMoodboardProfile({
  floorplanId: floorplan.floorplanId,
  estimateId: 'FULL-EST-VIS-SMOKE',
  style: 'warm modern kitchen',
  colorTone: 'warm white and oak',
  primaryMaterials: 'oak cabinet, ceramic wall tile, engineered stone countertop',
  lightingMood: 'warm under cabinet lighting',
  referenceNotes: 'practical Korean apartment kitchen'
});

const briefResult = service.createVisualizationBrief({
  estimateType: 'full_remodel',
  estimateId: 'FULL-EST-VIS-SMOKE',
  floorplanId: floorplan.floorplanId,
  spaceId: space.spaceId,
  projectName: 'AI Visualization Smoke Project',
  customerName: 'Smoke Client',
  designNotes: 'do not add an island'
});

assert.ok(briefResult.briefId, 'Visualization brief can be created from space data');
assert.strictEqual(briefResult.brief.spaceName, '주방', 'brief keeps space name');

const generated = service.generateVisualizationPrompts({ briefId: briefResult.briefId });
assert.ok(generated.prompts.perspectivePrompt.includes('Photorealistic'), 'Perspective prompt is generated');
assert.ok(generated.prompts.isometricPrompt.includes('isometric'), 'Isometric prompt is generated');
assert.ok(generated.prompts.moodboardPrompt.includes('moodboard'), 'Moodboard prompt is generated');
assert.ok(generated.prompts.negativePrompt.includes('watermark'), 'Negative prompt is generated');

const queued = service.queueVisualizationJob({
  briefId: briefResult.briefId,
  promptType: 'PERSPECTIVE',
  provider: 'MANUAL'
});
assert.ok(queued.jobId, 'Visualization job can be queued manually');
assert.strictEqual(queued.job.provider, 'MANUAL', 'Manual provider is used');
assert.strictEqual(queued.providerResult.status, 'READY_FOR_COPY', 'Manual provider returns copy-ready prompt');

const manualProviderResult = requestManualGeneration({
  jobId: 'MANUAL-SMOKE',
  promptType: 'PERSPECTIVE',
  prompt: generated.prompts.perspectivePrompt,
  negativePrompt: generated.prompts.negativePrompt
});
assert.strictEqual(manualProviderResult.status, 'READY_FOR_COPY', 'Manual provider direct call is safe');

const attached = service.attachVisualizationResult({
  jobId: queued.jobId,
  imagePath: 'C:/manual/visualization-result.png',
  resultType: 'PERSPECTIVE'
});
assert.ok(attached.resultId, 'Image result can be attached');
assert.strictEqual(attached.result.status, 'PENDING_REVIEW', 'attached image is pending review');

const approved = service.decideVisualizationResult({
  resultId: attached.resultId,
  action: 'APPROVE',
  reviewNote: 'usable for proposal'
});
assert.strictEqual(approved.result.status, 'APPROVED', 'Result can be approved');

const rejectedAttachment = service.attachVisualizationResult({
  jobId: queued.jobId,
  imagePath: 'C:/manual/visualization-rejected.png',
  resultType: 'PERSPECTIVE'
});
const rejected = service.decideVisualizationResult({
  resultId: rejectedAttachment.resultId,
  action: 'REJECT',
  reviewNote: 'geometry mismatch'
});
assert.strictEqual(rejected.result.status, 'REJECTED', 'Result can be rejected');

const comfy = requestComfyUiGeneration();
assert.strictEqual(comfy.status, 'PROVIDER_NOT_CONFIGURED', 'ComfyUI provider returns provider-not-configured safely');

const data = service.getAIVisualizationCenterData({ briefId: briefResult.briefId });
assert.strictEqual(data.briefs.length, 1, 'AI Visualization Center returns brief');
assert.ok(data.jobs.length >= 1, 'AI Visualization Center returns jobs');
assert.ok(data.results.length >= 2, 'AI Visualization Center returns results');

const stats = service.getDbStats();
assert.ok(stats.visualizationBriefCount >= 1, 'visualization brief table has row');
assert.ok(stats.visualizationJobCount >= 1, 'visualization job table has row');
assert.ok(stats.visualizationResultCount >= 2, 'visualization result table has rows');

console.log(JSON.stringify({ ok: true, test: 'ai-visualization-generation.smoke' }));
