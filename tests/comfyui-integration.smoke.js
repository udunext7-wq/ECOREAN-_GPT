const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { createSqliteService } = require('../electron/services/sqliteService');
const { injectPromptIntoWorkflow } = require('../electron/services/visualizationService');

async function run() {
  const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-comfyui-${Date.now()}`);
  const service = createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => tempRoot
    }
  });

  const savedSettings = service.saveComfyUiSettings({ host: '127.0.0.1', port: 18188, isEnabled: true });
  assert.strictEqual(savedSettings.settings.host, '127.0.0.1', 'ComfyUI settings can be saved');

  const health = await service.checkComfyUiHealth();
  assert.strictEqual(health.ok, false, 'Health check returns safe unavailable when server is down');
  assert.strictEqual(health.errorMessage, 'ComfyUI가 실행 중이 아닙니다.', 'Safe Korean unavailable message is returned');

  const workflow = {
    '6': { inputs: { text: 'old positive' }, class_type: 'CLIPTextEncode' },
    '7': { inputs: { text: 'old negative' }, class_type: 'CLIPTextEncode' },
    '9': { inputs: { seed: 1 }, class_type: 'KSampler' },
    '11': { inputs: { width: 512, height: 512 }, class_type: 'EmptyLatentImage' },
    keep: { inputs: { text: 'do not change' }, class_type: 'OtherNode' }
  };
  const preset = service.saveComfyUiWorkflowPreset({
    presetName: 'Smoke Perspective',
    presetType: 'PERSPECTIVE',
    workflow,
    positivePromptNodeId: '6',
    negativePromptNodeId: '7',
    seedNodeId: '9',
    widthNodeId: '11',
    heightNodeId: '11',
    setDefault: true
  });
  assert.ok(preset.presetId, 'Workflow preset can be saved');

  const injected = injectPromptIntoWorkflow(workflow, {
    positivePromptNodeId: '6',
    negativePromptNodeId: '7',
    seedNodeId: '9',
    widthNodeId: '11',
    heightNodeId: '11'
  }, {
    prompt: 'new positive',
    negativePrompt: 'new negative',
    seed: 42,
    width: 768,
    height: 512
  });
  assert.strictEqual(injected['6'].inputs.text, 'new positive', 'Prompt injection updates positive node');
  assert.strictEqual(injected['7'].inputs.text, 'new negative', 'Prompt injection updates negative node');
  assert.strictEqual(injected['9'].inputs.seed, 42, 'Prompt injection updates seed node');
  assert.strictEqual(injected['11'].inputs.width, 768, 'Prompt injection updates width node');
  assert.strictEqual(injected.keep.inputs.text, 'do not change', 'Prompt injection updates only selected nodes');

  const floorplan = service.saveFloorplanMetadata({
    estimateId: 'EST-COMFY-SMOKE',
    fileName: 'comfy-floorplan.png',
    filePath: 'C:/mock/comfy-floorplan.png',
    fileType: 'PNG'
  });
  const space = service.createFloorplanSpace({
    floorplanId: floorplan.floorplanId,
    spaceName: '욕실',
    spaceType: '욕실',
    areaM2: 4.2,
    notes: 'small bathroom, no window'
  });
  const brief = service.createVisualizationBrief({
    estimateType: 'bathroom_remodel',
    estimateId: 'EST-COMFY-SMOKE',
    floorplanId: floorplan.floorplanId,
    spaceId: space.spaceId,
    projectName: 'Comfy Smoke',
    customerName: 'Client'
  });
  const queued = service.queueVisualizationJob({
    briefId: brief.briefId,
    promptType: 'PERSPECTIVE',
    provider: 'COMFYUI',
    workflowPresetId: preset.presetId
  });
  assert.strictEqual(queued.job.provider, 'COMFYUI', 'Visualization job can switch provider to COMFYUI');

  const failedRun = await service.runComfyUiGeneration({ jobId: queued.jobId, workflowPresetId: preset.presetId });
  assert.strictEqual(failedRun.ok, false, 'Queue request handles unavailable ComfyUI safely');
  assert.ok(String(failedRun.errorMessage).includes('ComfyUI'), 'Failed job returns ComfyUI error');
  const failedData = service.getAIVisualizationCenterData({ briefId: brief.briefId });
  assert.strictEqual(failedData.jobs[0].status, 'FAILED', 'Failed job stores error message');
  assert.ok(failedData.jobs[0].lastError, 'Failed job stores last_error');

  const manual = service.queueVisualizationJob({ briefId: brief.briefId, promptType: 'PERSPECTIVE', provider: 'MANUAL' });
  assert.strictEqual(manual.job.provider, 'MANUAL', 'Manual workflow remains available');

  const simulated = service.queueVisualizationJob({ briefId: brief.briefId, promptType: 'PERSPECTIVE', provider: 'COMFYUI', workflowPresetId: preset.presetId });
  const simulatedRun = await service.runComfyUiGeneration({ jobId: simulated.jobId, workflowPresetId: preset.presetId, simulateSuccess: true });
  assert.strictEqual(simulatedRun.job.status, 'COMPLETED', 'Simulated generation succeeds');
  assert.ok(fs.existsSync(simulatedRun.job.outputPath), 'Result path is stored when simulated generation succeeds');

  const centerData = service.getAIVisualizationCenterData({ briefId: brief.briefId });
  assert.ok(centerData.comfyUi.settings, 'AI Visualization Center loads ComfyUI fields');
  assert.ok(centerData.comfyUi.presets.length >= 1, 'AI Visualization Center loads workflow presets');

  const stats = service.getDbStats();
  assert.ok(stats.comfyUiSettingsCount >= 1, 'ComfyUI settings table has row');
  assert.ok(stats.comfyUiWorkflowPresetCount >= 1, 'ComfyUI workflow preset table has row');
  assert.ok(stats.comfyUiJobLogCount >= 1, 'ComfyUI job log table has row');

  console.log(JSON.stringify({ ok: true, test: 'comfyui-integration.smoke' }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
