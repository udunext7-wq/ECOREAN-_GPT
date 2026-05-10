function requestExternalApiGeneration() {
  return {
    provider: 'EXTERNAL_API',
    status: 'PROVIDER_NOT_CONFIGURED',
    errorMessage: 'External image API provider is not configured yet.'
  };
}

module.exports = {
  requestExternalApiGeneration
};
