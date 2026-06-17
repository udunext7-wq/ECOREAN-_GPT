type Payload = Record<string, unknown>;

const api = () => window.ecorean?.bocDb as Record<string, ((payload?: Payload) => Promise<unknown>)> | undefined;

function call<T = Payload>(name: string, payload?: Payload): Promise<T> {
  const bridge = api();
  const fn = bridge?.[name] as ((payload?: Payload) => Promise<T>) | undefined;
  if (!fn) return Promise.reject(new Error(`Calendar bridge is not available: ${String(name)}`));
  return fn(payload);
}

export const calendarSiteSurveySyncService = {
  providerStatus: () => call('getCalendarProviderStatus'),
  summary: () => call('getCalendarSummary'),
  surveySummary: () => call('getSiteSurveyScheduleSummary'),
  listEvents: (payload?: Payload) => call<Payload[]>('listCalendarEvents', payload),
  createEvent: (payload: Payload) => call('createCalendarEvent', payload),
  updateEvent: (payload: Payload) => call('updateCalendarEvent', payload),
  cancelEvent: (payload: Payload) => call('cancelCalendarEvent', payload),
  restoreEvent: (payload: Payload) => call('restoreCalendarEvent', payload),
  completeEvent: (payload: Payload) => call('completeCalendarEvent', payload),
  noShowEvent: (payload: Payload) => call('markCalendarEventNoShow', payload),
  rescheduleEvent: (payload: Payload) => call('rescheduleCalendarEvent', payload),
  detectConflicts: (payload: Payload) => call('detectCalendarConflicts', payload),
  createReminder: (payload: Payload) => call('createCalendarEventReminder', payload),
  listReminders: (payload: Payload) => call<Payload[]>('listCalendarEventReminders', payload),
  createSurveyEvent: (payload: Payload) => call('createSurveyCalendarEvent', payload),
  listLinks: (payload?: Payload) => call<Payload[]>('listSurveyScheduleLinks', payload),
  detectMismatch: (payload: Payload) => call('detectSurveyScheduleMismatch', payload),
  resolveMismatch: (payload: Payload) => call('resolveSurveyScheduleMismatch', payload),
  deferMismatch: (payload: Payload) => call('deferSurveyScheduleMismatch', payload),
  safePayload: (payload: Payload) => call('getCustomerSafeSchedulePayload', payload),
  calendarReport: (payload?: Payload) => call('createCalendarAuditReport', payload),
  surveyReport: (payload?: Payload) => call('createSiteSurveyScheduleReport', payload)
};
