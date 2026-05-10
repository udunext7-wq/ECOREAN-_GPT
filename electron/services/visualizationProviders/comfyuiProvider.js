function buildBaseUrl(settings = {}) {
  const explicit = settings.baseUrl || settings.base_url;
  if (explicit) return String(explicit).replace(/\/$/, '');
  const host = settings.host || '127.0.0.1';
  const port = settings.port || 8188;
  return `http://${host}:${port}`;
}

async function fetchJson(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function healthCheck(settings = {}) {
  const baseUrl = buildBaseUrl(settings);
  try {
    await fetchJson(`${baseUrl}/system_stats`, {}, Number(settings.timeoutMs || 2500));
    return {
      provider: 'COMFYUI',
      baseUrl,
      ok: true,
      status: 'AVAILABLE',
      messageKo: 'ComfyUI 연결 성공'
    };
  } catch (error) {
    return {
      provider: 'COMFYUI',
      baseUrl,
      ok: false,
      status: 'UNAVAILABLE',
      errorMessage: 'ComfyUI가 실행 중이 아닙니다.',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function queuePrompt(settings = {}, workflow, promptData = {}) {
  const baseUrl = buildBaseUrl(settings);
  try {
    const result = await fetchJson(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: promptData.clientId || `ecorean-boc-${Date.now()}`
      })
    }, Number(settings.timeoutMs || 8000));
    return {
      provider: 'COMFYUI',
      status: 'QUEUED',
      providerJobId: result.prompt_id,
      raw: result
    };
  } catch (error) {
    return {
      provider: 'COMFYUI',
      status: 'FAILED',
      errorMessage: 'ComfyUI가 실행 중이 아닙니다.',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function getHistory(settings = {}, promptId) {
  const baseUrl = buildBaseUrl(settings);
  try {
    const history = await fetchJson(`${baseUrl}/history/${encodeURIComponent(promptId)}`, {}, Number(settings.timeoutMs || 8000));
    return { provider: 'COMFYUI', status: 'OK', history };
  } catch (error) {
    return {
      provider: 'COMFYUI',
      status: 'FAILED',
      errorMessage: 'ComfyUI가 실행 중이 아닙니다.',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

function extractImagesFromHistory(historyResult, promptId) {
  const history = historyResult?.history || historyResult || {};
  const entry = history[promptId] || Object.values(history)[0] || {};
  const outputs = entry.outputs || {};
  const images = [];
  for (const output of Object.values(outputs)) {
    for (const image of output.images || []) {
      images.push(image);
    }
  }
  return images;
}

async function downloadImage(settings = {}, image) {
  const baseUrl = buildBaseUrl(settings);
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || '',
    type: image.type || 'output'
  });
  const response = await fetch(`${baseUrl}/view?${params.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function downloadImages(settings = {}, promptId) {
  const historyResult = await getHistory(settings, promptId);
  if (historyResult.status === 'FAILED') return historyResult;
  const images = extractImagesFromHistory(historyResult.history, promptId);
  const downloads = [];
  for (const image of images) {
    downloads.push({
      image,
      bytes: await downloadImage(settings, image)
    });
  }
  return { provider: 'COMFYUI', status: downloads.length ? 'COMPLETED' : 'GENERATING', images, downloads };
}

async function cancelJob(settings = {}, promptId) {
  const baseUrl = buildBaseUrl(settings);
  try {
    await fetchJson(`${baseUrl}/interrupt`, { method: 'POST' }, Number(settings.timeoutMs || 2500));
    return { provider: 'COMFYUI', status: 'CANCELLED', providerJobId: promptId };
  } catch (error) {
    return {
      provider: 'COMFYUI',
      status: 'FAILED',
      errorMessage: 'ComfyUI 작업 취소에 실패했습니다.',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

function requestComfyUiGeneration() {
  return {
    provider: 'COMFYUI',
    status: 'PROVIDER_NOT_CONFIGURED',
    errorMessage: 'ComfyUI provider requires settings and workflow preset.'
  };
}

module.exports = {
  buildBaseUrl,
  healthCheck,
  queuePrompt,
  getHistory,
  downloadImages,
  cancelJob,
  requestComfyUiGeneration,
  extractImagesFromHistory
};
