'use strict';

const DISABLED_STATUS = {
  provider: null,
  status: 'DISABLED',
  authentication_status: 'NOT_CONFIGURED',
  external_call_performed: false,
  message: 'External calendar sync is disabled for RC-0.4.4.'
};

function disabledResult(extra = {}) {
  return { ...DISABLED_STATUS, ...extra };
}

function createCalendarProviderAdapter() {
  return {
    getProviderStatus: () => disabledResult(),
    validateProviderConfiguration: () => disabledResult({ ok: false }),
    validateConfiguration: () => disabledResult({ ok: false }),
    listExternalCalendars: () => disabledResult({ calendars: [] }),
    createExternalEvent: () => disabledResult({ ok: false, blocked: true }),
    updateExternalEvent: () => disabledResult({ ok: false, blocked: true }),
    cancelExternalEvent: () => disabledResult({ ok: false, blocked: true }),
    fetchExternalEvent: () => disabledResult({ ok: false, blocked: true }),
    syncExternalEvent: () => disabledResult({ ok: false, blocked: true }),
    sendExternalInvitation: () => disabledResult({ ok: false, blocked: true }),
    createExternalInvitation: () => disabledResult({ ok: false, blocked: true })
  };
}

module.exports = { createCalendarProviderAdapter, DISABLED_STATUS };
