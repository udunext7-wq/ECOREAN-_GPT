function stringifyList(value, fallback = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value || fallback);
}

function buildVisualizationPromptSet(brief = {}) {
  const spaceName = brief.spaceName || 'interior space';
  const spaceType = brief.spaceType || 'interior';
  const areaM2 = brief.areaM2 || 'unknown';
  const style = brief.style || 'modern Korean interior';
  const colorTone = brief.colorTone || 'warm neutral';
  const materials = stringifyList(brief.materialKeywords, 'selected finish materials only');
  const lighting = brief.lightingMood || 'soft realistic lighting';
  const notes = brief.designNotes || 'keep the layout consistent with the floorplan notes';

  const consistency = [
    'keep geometry consistent with the floorplan notes',
    'do not invent windows unless the brief mentions windows',
    'do not invent furniture unless selected in the brief',
    'do not invent materials outside the selected material keywords',
    'maintain realistic Korean apartment remodeling proportions'
  ].join(', ');

  const perspectivePrompt = [
    `Photorealistic eye-level interior perspective of ${spaceName}`,
    `space type: ${spaceType}, area: ${areaM2} square meters`,
    `design style: ${style}`,
    `color palette: ${colorTone}`,
    `materials: ${materials}`,
    `lighting: ${lighting}`,
    `camera: realistic 24mm interior photography, eye-level view, clean composition`,
    `constraints: ${consistency}`,
    `design notes: ${notes}`
  ].join('\n');

  const isometricPrompt = [
    `Clean architectural isometric visualization of ${spaceName}`,
    `space type: ${spaceType}, area: ${areaM2} square meters`,
    `geometry-first block layout, simple wall/floor volumes, clear space labels`,
    `style reference: ${style}, color tone: ${colorTone}`,
    `materials only if selected: ${materials}`,
    `constraints: no decoration unless requested, ${consistency}`,
    `design notes: ${notes}`
  ].join('\n');

  const moodboardPrompt = [
    `Interior moodboard for ${spaceName}`,
    `style: ${style}`,
    `color tone: ${colorTone}`,
    `materials: ${materials}`,
    `lighting mood: ${lighting}`,
    `include compact material swatches, color chips, lighting references, Korean remodeling context`,
    `design notes: ${notes}`
  ].join('\n');

  const negativePrompt = [
    'people',
    'text',
    'watermark',
    'logo',
    'distorted geometry',
    'impossible perspective',
    'extra windows',
    'unselected furniture',
    'unselected materials',
    'messy construction debris',
    'low resolution',
    'overly decorative fantasy style'
  ].join(', ');

  return {
    perspectivePrompt,
    isometricPrompt,
    moodboardPrompt,
    negativePrompt
  };
}

function pickPromptByType(promptSet, promptType = 'PERSPECTIVE') {
  if (promptType === 'ISOMETRIC') return promptSet.isometricPrompt;
  if (promptType === 'MOODBOARD') return promptSet.moodboardPrompt;
  return promptSet.perspectivePrompt;
}

function cloneWorkflow(workflow) {
  if (typeof workflow === 'string') return JSON.parse(workflow);
  return JSON.parse(JSON.stringify(workflow || {}));
}

function setNodeInput(workflow, nodeId, candidates, value) {
  if (!nodeId || value == null || value === '') return;
  const node = workflow[String(nodeId)];
  if (!node) return;
  node.inputs = node.inputs || {};
  const existingKey = candidates.find((key) => Object.prototype.hasOwnProperty.call(node.inputs, key));
  node.inputs[existingKey || candidates[0]] = value;
}

function injectPromptIntoWorkflow(workflow, preset = {}, promptData = {}) {
  const injected = cloneWorkflow(workflow);
  setNodeInput(injected, preset.positivePromptNodeId || preset.positive_prompt_node_id, ['text', 'prompt', 'positive'], promptData.prompt);
  setNodeInput(injected, preset.negativePromptNodeId || preset.negative_prompt_node_id, ['text', 'negative', 'negative_prompt'], promptData.negativePrompt);
  setNodeInput(injected, preset.seedNodeId || preset.seed_node_id, ['seed'], promptData.seed);
  setNodeInput(injected, preset.widthNodeId || preset.width_node_id, ['width'], promptData.width);
  setNodeInput(injected, preset.heightNodeId || preset.height_node_id, ['height'], promptData.height);
  return injected;
}

module.exports = {
  buildVisualizationPromptSet,
  pickPromptByType,
  injectPromptIntoWorkflow
};
