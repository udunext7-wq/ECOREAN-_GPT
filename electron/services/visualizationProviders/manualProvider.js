function requestManualGeneration({ jobId, promptType, prompt, negativePrompt }) {
  return {
    provider: 'MANUAL',
    jobId,
    promptType,
    status: 'READY_FOR_COPY',
    prompt,
    negativePrompt,
    message: 'Copy-ready prompt generated. No external image API was called.'
  };
}

module.exports = {
  requestManualGeneration
};
