const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCalendarProviderAdapter } = require('../electron/services/calendarProviderAdapter');
const { createInternalCalendarService } = require('../electron/services/internalCalendarService');
const { createSiteSurveyScheduleSyncService } = require('../electron/services/siteSurveyScheduleSyncService');

const workspace = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-rc044-stabilization-'));
const sqliteService = { dbPaths: { project: path.join(tmp, 'project.db') } };
const reportsDir = path.join(tmp, 'reports');
const provider = createCalendarProviderAdapter();
const calendar = createInternalCalendarService({ sqliteService, reportsDir, providerAdapter: provider });
const surveySync = createSiteSurveyScheduleSyncService({ sqliteService, reportsDir, internalCalendarService: calendar });

const exists = (relativePath) => fs.existsSync(path.join(workspace, relativePath));
assert.ok(exists('electron/services/internalCalendarService.js'), '1. internal calendar service exists');
assert.ok(exists('electron/services/siteSurveyScheduleSyncService.js'), '2. site survey sync service exists');
assert.ok(exists('electron/services/calendarProviderAdapter.js'), '3. provider adapter exists');
assert.ok(exists('ui/app/calendar/CalendarSiteSurveySyncCenterView.tsx'), '4. center view exists');

const badStartEnd = calendar.createCalendarEvent({
  eventType: 'SITE_SURVEY',
  title: 'bad range',
  startAt: '2026-07-01T11:00:00+09:00',
  endAt: '2026-07-01T10:00:00+09:00'
});
assert.strictEqual(badStartEnd.ok, false, '5. end before start blocked');
assert.strictEqual(calendar.calculateEventDuration({ startAt: '2026-07-01T11:00:00+09:00', endAt: '2026-07-01T10:00:00+09:00' }).ok, false, '6. negative duration blocked');
assert.strictEqual(calendar.normalizeEventTime({ startAt: '2026-07-01', endAt: '2026-07-02', timezone: '' }).timezone, 'Asia/Seoul', '7. empty timezone falls back to Asia/Seoul');
assert.strictEqual(calendar.normalizeEventTime({ startAt: '2026-07-01', endAt: '2026-07-02', timezone: null }).timezone, 'Asia/Seoul', '8. null timezone falls back to Asia/Seoul');
assert.strictEqual(calendar.normalizeEventTime({ startAt: '2026-07-01', endAt: '2026-07-02', timezone: 'Mars/Base' }).timezone, 'Asia/Seoul', '9. invalid timezone safe');
assert.ok(calendar.normalizeEventTime({ startAt: '2026-07-01', endAt: '2026-07-02', allDay: true }).ok, '10. all-day event safe');
assert.ok(calendar.validateCalendarEvent({ eventType: 'SITE_SURVEY', title: 'long event', startAt: '2026-07-01T10:00:00+09:00', endAt: '2026-07-03T10:30:00+09:00' }).warnings.length >= 1, '11. 24h+ event warning');

const event = calendar.createCalendarEvent({
  eventType: 'SITE_SURVEY',
  title: '<script>alert(1)</script> 현장조사',
  customerVisibleTitle: '현장 방문 일정',
  startAt: '2026-07-01T10:00:00+09:00',
  endAt: '2026-07-01T11:00:00+09:00',
  ownerId: 'OWNER-A',
  leadId: 'LEAD-A',
  projectId: 'PROJECT-A',
  siteSurveyId: 'SURVEY-A',
  portalDraftId: 'PORTAL-A',
  locationSummary: '../internal/detail/file://secret',
  customerSafeLocationSummary: '서울 / 승인된 위치 요약',
  descriptionInternal: '내부 메모와 담당자 연락처'
});
assert.ok(event.event_id, '12. event created');
assert.ok(calendar.listCalendarEvents().some((row) => row.event_id === event.event_id), '13. event listed');
assert.strictEqual(calendar.getCalendarEvent(event.event_id).event_id, event.event_id, '14. event detail read');
assert.strictEqual(calendar.getCalendarEvent('MISSING-EVENT'), null, '15. missing event safe');
assert.strictEqual(calendar.updateCalendarEvent(event.event_id, { title: '수정된 현장조사', status: 'CONFIRMED' }).event.status, 'CONFIRMED', '16. event update/confirm works');

const conflict = calendar.createCalendarEvent({
  eventType: 'CONSULTATION',
  title: '담당자 중복 상담',
  customerVisibleTitle: '상담 일정',
  startAt: '2026-07-01T10:30:00+09:00',
  endAt: '2026-07-01T11:30:00+09:00',
  ownerId: 'OWNER-A',
  customerSafeLocationSummary: '고객용 위치'
});
assert.ok(conflict.conflicts.conflicts.some((row) => row.severity === 'BLOCKING'), '17. same owner conflict detected');
assert.strictEqual(conflict.conflicts.autoResolved, false, '18. conflict not auto-resolved');

assert.strictEqual(calendar.markEventCompleted(event.event_id).event.status, 'COMPLETED', '19. complete works');
assert.strictEqual(calendar.markEventCompleted(event.event_id).ok, false, '20. completed event re-complete blocked');
assert.strictEqual(calendar.restoreCalendarEvent(event.event_id).ok, false, '21. completed event does not restore to scheduled');
assert.strictEqual(calendar.markEventNoShow(conflict.event_id).event.status, 'NO_SHOW', '22. no-show works');
assert.strictEqual(calendar.restoreCalendarEvent(conflict.event_id).event.status, 'SCHEDULED', '23. restore from no-show works');
assert.strictEqual(calendar.cancelCalendarEvent(conflict.event_id).event.status, 'CANCELLED', '24. cancel works');
assert.strictEqual(calendar.updateCalendarEvent(conflict.event_id, { title: 'cancelled update' }).ok, false, '25. cancelled event update blocked');
assert.strictEqual(calendar.rescheduleEvent(conflict.event_id, { startAt: '2026-07-02T10:00:00+09:00', endAt: '2026-07-02T11:00:00+09:00' }).ok, false, '26. cancelled event reschedule blocked');
assert.strictEqual(calendar.restoreCalendarEvent(conflict.event_id).event.status, 'SCHEDULED', '27. restore from cancelled works');
assert.strictEqual(calendar.rescheduleEvent(conflict.event_id, { startAt: '2026-07-02T10:00:00+09:00', endAt: '2026-07-02T11:00:00+09:00' }).event.status, 'RESCHEDULED', '28. reschedule after restore works');

const linked = surveySync.createSurveyScheduleLink({
  siteSurveyId: 'SURVEY-A',
  eventId: event.event_id,
  leadId: 'LEAD-A',
  projectId: 'PROJECT-A'
});
assert.ok(linked.link_id, '29. survey link created');
assert.ok(surveySync.listSurveyScheduleLinks().some((row) => row.link_id === linked.link_id), '30. survey link listed');
assert.strictEqual(surveySync.getSurveyScheduleLink(linked.link_id).event_id, event.event_id, '31. survey link detail read');
assert.strictEqual(surveySync.updateSurveyScheduleLink(linked.link_id, { projectId: 'PROJECT-B' }).project_id, 'PROJECT-B', '32. survey link update works');

const surveyEvent = surveySync.createCalendarEventFromSurvey('SURVEY-B', {
  title: 'Survey B 방문',
  startAt: '2026-07-03T10:00:00+09:00',
  endAt: '2026-07-03T11:00:00+09:00',
  leadId: 'LEAD-B',
  projectId: 'PROJECT-B',
  ownerId: 'OWNER-B',
  addressSummary: '서울 / 요약'
});
assert.ok(surveyEvent.event.event_id, '33. survey to calendar event created');
assert.ok(surveyEvent.link.link_id, '34. survey to calendar link created');
assert.strictEqual(surveySync.syncCalendarToSurvey(surveyEvent.link.link_id).autoOverwrite, false, '35. calendar to survey does not overwrite automatically');
assert.strictEqual(surveySync.syncSurveyToCalendar(surveyEvent.link.link_id, {
  startAt: '2026-07-04T10:00:00+09:00',
  endAt: '2026-07-04T11:00:00+09:00',
  ownerId: 'OWNER-B',
  locationSummary: '변경 위치'
}).direction, 'SURVEY_TO_CALENDAR', '36. survey to calendar explicit path works');

const mismatch = surveySync.detectSurveyScheduleMismatch({
  linkId: surveyEvent.link.link_id,
  surveyStartAt: '2026-07-04T12:00:00.000Z',
  surveyEndAt: '2026-07-04T13:00:00.000Z',
  surveyOwnerId: 'OWNER-C',
  surveyLocationSummary: '다른 위치',
  surveyStatus: 'REQUESTED'
});
assert.strictEqual(mismatch.mismatch_status, 'OPEN', '37. mismatch detected');
assert.ok(mismatch.mismatch.length >= 1, '38. mismatch details exist internally');
assert.strictEqual(surveySync.resolveSurveyScheduleMismatch(surveyEvent.link.link_id, { note: '대표 확인' }).mismatch_status, 'RESOLVED', '39. mismatch resolved');
assert.strictEqual(surveySync.deferSurveyScheduleMismatch(surveyEvent.link.link_id, { reason: '고객 확인 대기' }).mismatch_status, 'DEFERRED', '40. mismatch deferred');

const extraEvent = calendar.createCalendarEvent({
  eventType: 'SITE_SURVEY',
  title: '같은 Survey 추가 일정',
  customerVisibleTitle: '방문 일정',
  startAt: '2026-07-06T10:00:00+09:00',
  endAt: '2026-07-06T11:00:00+09:00',
  ownerId: 'OWNER-D'
});
const multiple = surveySync.createSurveyScheduleLink({ siteSurveyId: 'SURVEY-A', eventId: extraEvent.event_id });
assert.strictEqual(multiple.sync_status, 'REVIEW_REQUIRED', '41. same survey multiple event link requires review');
assert.strictEqual(multiple.mismatch_status, 'OPEN', '42. same survey multiple link mismatch is open');
assert.strictEqual(surveySync.removeSurveyScheduleLink(multiple.link_id).removed, true, '43. survey link can be removed without deleting event');
assert.ok(calendar.getCalendarEvent(extraEvent.event_id), '44. event not auto-deleted when link removed');

assert.strictEqual(calendar.createEventReminder({ eventId: event.event_id, reminderType: 'SURVEY_CONFIRMATION' }).ok, false, '45. reminder without due_at blocked');
assert.strictEqual(calendar.createEventReminder({ eventId: event.event_id, reminderType: 'SURVEY_CONFIRMATION', dueAt: 'not-a-date' }).ok, false, '46. invalid due_at blocked');
const reminder = calendar.createEventReminder({ eventId: event.event_id, reminderType: 'SURVEY_CONFIRMATION', dueAt: '2026-07-01T09:00:00+09:00', note: '고객 확인' });
assert.ok(reminder.reminder_id, '47. reminder created');
assert.strictEqual(calendar.createEventReminder({ eventId: event.event_id, reminderType: 'SURVEY_CONFIRMATION', dueAt: '2026-07-01T09:30:00+09:00' }).duplicatePrevented, true, '48. duplicate reminder/action prevented');
assert.strictEqual(calendar.snoozeEventReminder(reminder.reminder_id, { snoozedUntil: '2026-07-01T09:30:00+09:00' }).status, 'SNOOZED', '49. reminder snoozed');
assert.strictEqual(calendar.completeEventReminder(reminder.reminder_id).status, 'COMPLETED', '50. reminder completed');
assert.strictEqual(calendar.completeEventReminder(reminder.reminder_id).ok, false, '51. reminder re-complete blocked');
const cancelledReminder = calendar.createEventReminder({ eventId: event.event_id, reminderType: 'EVENT_FOLLOW_UP', dueAt: '2020-01-01T09:00:00+09:00' });
assert.strictEqual(cancelledReminder.status, 'OVERDUE', '52. overdue reminder detected');
assert.strictEqual(calendar.cancelEventReminder(cancelledReminder.reminder_id).status, 'CANCELLED', '53. reminder cancelled');
assert.strictEqual(calendar.snoozeEventReminder(cancelledReminder.reminder_id, { snoozedUntil: '2026-07-01T09:30:00+09:00' }).ok, false, '54. cancelled reminder reactivation blocked');

const providerStatus = provider.getProviderStatus();
assert.strictEqual(providerStatus.status, 'DISABLED', '55. provider disabled');
assert.strictEqual(providerStatus.provider, null, '56. provider null');
assert.strictEqual(providerStatus.external_call_performed, false, '57. external call false');
assert.strictEqual(providerStatus.authentication_status, 'NOT_CONFIGURED', '58. auth not configured');
[
  provider.validateConfiguration(),
  provider.listExternalCalendars(),
  provider.createExternalEvent({}),
  provider.updateExternalEvent({}),
  provider.cancelExternalEvent({}),
  provider.fetchExternalEvent({}),
  provider.syncExternalEvent({}),
  provider.createExternalInvitation({})
].forEach((result, index) => {
  assert.strictEqual(result.external_call_performed, false, `59. provider function ${index} does not call external service`);
});

const safe = calendar.getCustomerSafeSchedulePayload(event.event_id);
assert.strictEqual(safe.customerSafety, 'PASSED', '60. customer-safe payload passed');
const serializedSafe = JSON.stringify(safe).toLowerCase();
[
  'owner', 'description_internal', 'conflict', 'mismatch', 'reminder', 'crm_action',
  'provider', 'external', 'hash', 'audit', 'db_id', 'margin', 'pce', 'queue',
  'scoring', 'vendor', 'labor', 'internal cost', 'token', 'credential', 'file://', '../'
].forEach((forbidden) => {
  assert.ok(!serializedSafe.includes(forbidden), `61. customer-safe payload hides ${forbidden}`);
});

assert.ok(calendar.getCalendarAuditHistory('').length >= 15, '62. audit history records lifecycle changes');
assert.ok(fs.existsSync(calendar.createCalendarAuditReport({ finalDecision: 'MERGE_READY' }).reportPath), '63. calendar audit report generated');
assert.ok(fs.existsSync(surveySync.createSiteSurveyScheduleReport({ finalDecision: 'MERGE_READY' }).reportPath), '64. survey sync report generated');

const changedSources = [
  'electron/services/calendarProviderAdapter.js',
  'electron/services/internalCalendarService.js',
  'electron/services/siteSurveyScheduleSyncService.js',
  'ui/app/calendar/CalendarSiteSurveySyncCenterView.tsx',
  'tests/rc-0-4-4-calendar-site-survey-sync.smoke.js'
].map((file) => fs.readFileSync(path.join(workspace, file), 'utf8').toLowerCase()).join('\n');
[
  'googleapis', 'graph.microsoft', 'icloud', 'caldav', 'client_secret', 'api_key',
  'fetch(', 'axios', 'https://www.googleapis.com', 'login.microsoftonline'
].forEach((forbidden) => {
  assert.ok(!changedSources.includes(forbidden), `65. no external provider implementation marker: ${forbidden}`);
});

const entryFiles = [
  ['First Entry Panel', 'ui/app/estimate/EstimateEntryPanel.tsx'],
  ['CEO Dashboard', 'ui/app/dashboard/CeoControlTowerView.tsx'],
  ['Drawer', 'ui/components/modals/DetailDrawer.tsx'],
  ['CRM Lead detail', 'ui/app/crm/CrmPipelineCenterView.tsx'],
  ['Site Survey detail', 'ui/app/crm/CrmPipelineCenterView.tsx'],
  ['Project detail', 'ui/app/projects/ProjectDetailView.tsx'],
  ['Customer Portal Draft detail', 'ui/app/customer-portal/CustomerPortalDraftCenterView.tsx']
];
entryFiles.forEach(([name, file]) => {
  assert.ok(fs.readFileSync(path.join(workspace, file), 'utf8').includes('calendarSiteSurveySync'), `66. ${name} internal entry exists`);
});
const clientPortal = fs.readFileSync(path.join(workspace, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
assert.ok(!clientPortal.includes('calendarSiteSurveySync'), '67. customer screen has no internal calendar sync entry');

const centerView = fs.readFileSync(path.join(workspace, 'ui', 'app', 'calendar', 'CalendarSiteSurveySyncCenterView.tsx'), 'utf8');
['등록된 내부 일정이 없습니다.', '현장조사 일정 연결이 없습니다.', 'DISABLED'].forEach((text) => {
  assert.ok(centerView.includes(text), `68. empty/provider state exists: ${text}`);
});

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-4-branch-stabilization.smoke',
  eventId: event.event_id,
  surveyLinkId: surveyEvent.link.link_id,
  provider: providerStatus.status,
  customerSafety: 'PASSED',
  externalApi: 'DISABLED',
  decision: 'MERGE_READY'
}, null, 2));
