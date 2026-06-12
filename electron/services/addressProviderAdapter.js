'use strict';

const DISABLED_RESPONSE = Object.freeze({
  status: 'DISABLED',
  provider: null,
  external_call_performed: false,
  message: 'Address provider connection is not enabled.'
});

function disabledResponse() {
  return { ...DISABLED_RESPONSE };
}

function createAddressProviderAdapter() {
  return {
    getProviderStatus: disabledResponse,
    validateConfiguration: disabledResponse,
    normalizeAddress: disabledResponse,
    searchAddress: disabledResponse,
    lookupPostalCode: disabledResponse,
    lookupCoordinates: disabledResponse
  };
}

module.exports = {
  DISABLED_RESPONSE,
  createAddressProviderAdapter
};
