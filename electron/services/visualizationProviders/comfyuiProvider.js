function requestComfyUiGeneration() {
  return {
    provider: 'COMFYUI',
    status: 'PROVIDER_NOT_CONFIGURED',
    errorMessage: 'ComfyUI provider is not configured yet.'
  };
}

module.exports = {
  requestComfyUiGeneration
};
