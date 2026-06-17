const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createCalendarProviderAdapter } = require('../electron/services/calendarProviderAdapter');
const { createInternalCalendarService } = require('../electron/services/internalCalendarService');
const { createSiteSurveyScheduleSyncService } = require('../electron/services/siteSurveyScheduleSyncService');

const workspace = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-rc044-calendar-'));
const dbPath = path.join(tmp, 'project.db');
const reportsDir = path.join(tmp, 'docs');
const sqliteService = { dbPaths: { project: dbPath } };
const providerAdapter = createCalendarProviderAdapter();
const calendar = createInternalCalendarService({ sqliteService, reportsDir, providerAdapter });
const surveySync = createSiteSurveyScheduleSyncService({ sqliteService, reportsDir, internalCalendarService: calendar });

assert.ok(fs.existsSync(path.join(workspace, 'electron', 'services', 'internalCalendarService.js')), '1. internalCalendarService exists');
assert.ok(fs.existsSync(path.join(workspace, 'electron', 'services', 'siteSurveyScheduleSyncService.js')), '2. siteSurveyScheduleSyncService exists');
assert.ok(fs.existsSync(path.join(workspace, 'electron', 'services', 'calendarProviderAdapter.js')), '3. calendarProviderAdapter exists');
assert.ok(fs.existsSync(path.join(workspace, 'ui', 'app', 'calendar', 'CalendarSiteSurveySyncCenterView.tsx')), '4. CalendarSiteSurveySyncCenterView exists');

assert.strictEqual(providerAdapter.getProviderStatus().status, 'DISABLED', '5. provider status disabled');
assert.strictEqual(providerAdapter.createExternalEvent({}).blocked, true, '6. external create blocked');

const invalid = calendar.validateCalendarEvent({ title: '', eventType: 'SITE_SURVEY', startAt: '2026-07-01T11:00:00+09:00', endAt: '2026-07-01T10:00:00+09:00' });
assert.strictEqual(invalid.ok, false, '7. invalid calendar event blocked');
assert.strictEqual(calendar.normalizeEventTime({ startAt: '2026-07-01', endAt: '2026-07-02', timezone: 'Mars/Base' }).timezone, 'Asia/Seoul', '8. unsupported timezone falls back safely');
assert.strictEqual(calendar.calculateEventDuration({ startAt: '2026-07-01T10:00:00+09:00', endAt: '2026-07-01T11:30:00+09:00' }).minutes, 90, '9. duration calculated');

const event = calendar.createCalendarEvent({
  eventType: 'SITE_SURVEY',
  title: 'RC-0.4.4 현장조사',
  customerVisibleTitle: '현장 방문 일정',
  startAt: '2026-07-01T10:00:00+09:00',
  endAt: '2026-07-01T11:00:00+09:00',
  timezone: 'Asia/Seoul',
  ownerId: 'OWNER-1',
  leadId: 'LEAD-044',
  siteSurveyId: 'SURVEY-044',
  projectId: 'PROJECT-044',
  portalDraftId: 'PORTAL-044',
  locationSummary: '내부 상세 위치',
  customerSafeLocationSummary: '서울 / 방문 위치 요약',
  descriptionInternal: '내부 메모 원문'
});
assert.ok(event.event_id, '10. calendar event created');
assert.strictEqual(calendar.getCalendarEvent(event.event_id).event_type, 'SITE_SURVEY', '11. event detail available');
assert.ok(calendar.listCalendarEvents().some((row) => row.event_id === event.event_id), '12. event list available');

const updated = calendar.updateCalendarEvent(event.event_id, { title: 'RC-0.4.4 현장조사 수정', ownerId: 'OWNER-1' });
assert.strictEqual(updated.event.title, 'RC-0.4.4 현장조사 수정', '13. event update works');
assert.strictEqual(calendar.linkEventToLead(event.event_id, 'LEAD-LINKED').event.related_lead_id, 'LEAD-LINKED', '14. lead link works');
assert.strictEqual(calendar.linkEventToProject(event.event_id, 'PROJECT-LINKED').event.related_project_id, 'PROJECT-LINKED', '15. project link works');
assert.strictEqual(calendar.linkEventToPortalDraft(event.event_id, 'PORTAL-LINKED').event.related_portal_draft_id, 'PORTAL-LINKED', '16. portal draft link works');
assert.strictEqual(calendar.assignEventOwner(event.event_id, 'OWNER-2').event.owner_id, 'OWNER-2', '17. owner assignment works');

const attendeeAdded = calendar.addEventAttendeeInternal(event.event_id, { name: '내부 담당자', role: 'PM' });
assert.strictEqual(attendeeAdded.event.attendees.length, 1, '18. attendee added internally');
const attendeeRemoved = calendar.removeEventAttendeeInternal(event.event_id, '내부 담당자');
assert.strictEqual(attendeeRemoved.event.attendees.length, 0, '19. attendee removed internally');

const overlap = calendar.createCalendarEvent({
  eventType: 'CONSULTATION',
  title: '겹치는 상담',
  customerVisibleTitle: '상담 일정',
  startAt: '2026-07-01T10:30:00+09:00',
  endAt: '2026-07-01T11:30:00+09:00',
  ownerId: 'OWNER-2'
});
assert.ok(overlap.conflicts.conflicts.length >= 1, '20. overlapping owner conflict detected');
assert.strictEqual(overlap.conflicts.autoResolved, false, '21. conflict is not auto-resolved');

assert.strictEqual(calendar.cancelCalendarEvent(event.event_id).event.status, 'CANCELLED', '22. cancel works');
assert.strictEqual(calendar.updateCalendarEvent(event.event_id, { title: '취소 후 수정 시도' }).ok, false, '23. cancelled event update is blocked');
assert.strictEqual(calendar.restoreCalendarEvent(event.event_id).event.status, 'SCHEDULED', '24. restore works');
assert.strictEqual(calendar.rescheduleEvent(event.event_id, { startAt: '2026-07-02T10:00:00+09:00', endAt: '2026-07-02T11:00:00+09:00' }).event.status, 'RESCHEDULED', '25. reschedule works');
assert.strictEqual(calendar.markEventNoShow(event.event_id).event.status, 'NO_SHOW', '26. no-show works');
assert.strictEqual(calendar.markEventCompleted(event.event_id).event.status, 'COMPLETED', '27. complete works');

const reminder = calendar.createEventReminder({ eventId: event.event_id, reminderType: 'CRM_ACTION', dueAt: '2026-07-02T09:00:00+09:00', note: '현장조사 준비' });
assert.ok(reminder.reminder_id, '28. reminder created');
assert.strictEqual(calendar.createEventReminder({ eventId: event.event_id, reminderType: 'CRM_ACTION', dueAt: '2026-07-02T09:30:00+09:00' }).duplicatePrevented, true, '29. duplicate CRM action/reminder prevented');
assert.strictEqual(calendar.snoozeEventReminder(reminder.reminder_id, { snoozedUntil: '2026-07-02T09:30:00+09:00' }).status, 'SNOOZED', '30. reminder snooze works');
assert.strictEqual(calendar.completeEventReminder(reminder.reminder_id).status, 'COMPLETED', '31. reminder complete works');
const overdue = calendar.createEventReminder({ eventId: event.event_id, reminderType: 'IN_APP', dueAt: '2020-01-01T09:00:00+09:00' });
assert.strictEqual(overdue.status, 'OVERDUE', '32. overdue reminder detected');
assert.strictEqual(calendar.cancelEventReminder(overdue.reminder_id).status, 'CANCELLED', '33. reminder cancel works');

const surveyCreated = surveySync.createCalendarEventFromSurvey('SURVEY-NEW-044', {
  title: '신규 현장조사',
  startAt: '2026-07-03T10:00:00+09:00',
  endAt: '2026-07-03T11:00:00+09:00',
  leadId: 'LEAD-NEW-044',
  projectId: 'PROJECT-NEW-044',
  addressSummary: '서울 / 고객 승인 주소 요약',
  ownerId: 'OWNER-3'
});
assert.ok(surveyCreated.event.event_id, '34. event created from survey');
assert.ok(surveyCreated.link.link_id, '35. survey schedule link created');
assert.ok(surveySync.listSurveyScheduleLinks().some((row) => row.link_id === surveyCreated.link.link_id), '36. survey links listed');

const mismatch = surveySync.detectSurveyScheduleMismatch({
  linkId: surveyCreated.link.link_id,
  surveyStartAt: '2026-07-03T12:00:00.000Z',
  surveyEndAt: '2026-07-03T13:00:00.000Z',
  surveyOwnerId: 'OWNER-DIFFERENT',
  surveyLocationSummary: '다른 위치',
  surveyStatus: 'REQUESTED'
});
assert.strictEqual(mismatch.mismatch_status, 'OPEN', '37. survey/calendar mismatch detected');
assert.strictEqual(surveySync.resolveSurveyScheduleMismatch(surveyCreated.link.link_id, { note: '대표 확인' }).mismatch_status, 'RESOLVED', '38. mismatch resolved manually');
assert.strictEqual(surveySync.deferSurveyScheduleMismatch(surveyCreated.link.link_id, { reason: '고객 일정 재확인' }).mismatch_status, 'DEFERRED', '39. mismatch deferred');
assert.strictEqual(surveySync.syncCalendarToSurvey(surveyCreated.link.link_id).autoOverwrite, false, '40. calendar to survey does not auto-overwrite');
assert.strictEqual(surveySync.syncSurveyToCalendar(surveyCreated.link.link_id, {
  startAt: '2026-07-04T10:00:00+09:00',
  endAt: '2026-07-04T11:00:00+09:00',
  locationSummary: '변경 위치',
  ownerId: 'OWNER-3'
}).direction, 'SURVEY_TO_CALENDAR', '41. survey to calendar sync path works internally');
assert.strictEqual(surveySync.cancelLinkedSurveyEvent(surveyCreated.link.link_id).event.status, 'CANCELLED', '42. linked survey event cancel works');
assert.strictEqual(surveySync.rescheduleLinkedSurveyEvent(surveyCreated.link.link_id, { startAt: '2026-07-05T10:00:00+09:00', endAt: '2026-07-05T11:00:00+09:00' }).ok, false, '43. cancelled linked event reschedule is blocked');
calendar.restoreCalendarEvent(surveyCreated.event.event_id);
assert.strictEqual(surveySync.completeLinkedSurveyEvent(surveyCreated.link.link_id).event.status, 'COMPLETED', '44. linked survey event complete works after restore');

const safePayload = calendar.getCustomerSafeSchedulePayload(surveyCreated.event.event_id);
assert.strictEqual(safePayload.customerSafety, 'PASSED', '45. customer-safe schedule payload passed');
const serialized = JSON.stringify(safePayload).toLowerCase();
[
  'owner', 'internal', 'conflict', 'provider', 'external_event', 'reminder', 'crm_action',
  'detailed_address', 'customer_phone', 'customer_email', 'memo', 'cost', 'margin', 'pce',
  'vendor', 'labor', 'purchase', 'receiving', 'variance', 'calibration', 'backup', 'profit', 'risk_score'
].forEach((forbidden) => {
  assert.ok(!serialized.includes(forbidden), `46. customer payload hides ${forbidden}`);
});

assert.ok(calendar.getCalendarAuditHistory('').length >= 10, '47. audit history records actions');
assert.ok(calendar.getCalendarSummary().siteSurveyCount >= 1, '48. calendar summary returns site survey count');
assert.ok(surveySync.getSiteSurveyScheduleSummary().totalLinks >= 1, '49. survey sync summary returns links');
assert.ok(fs.existsSync(calendar.createCalendarAuditReport({ finalDecision: 'MERGE_READY' }).reportPath), '50. calendar audit report generated');
assert.ok(fs.existsSync(surveySync.createSiteSurveyScheduleReport({ finalDecision: 'MERGE_READY' }).reportPath), '51. survey sync report generated');

const db = new DatabaseSync(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
db.close();
['internal_calendar_events', 'site_survey_schedule_links', 'calendar_event_reminders', 'calendar_event_audit_history'].forEach((table) => {
  assert.ok(tables.includes(table), `52. table exists: ${table}`);
});

const entryFiles = [
  ['First Entry Panel', 'ui/app/estimate/EstimateEntryPanel.tsx'],
  ['CEO Dashboard', 'ui/app/dashboard/CeoControlTowerView.tsx'],
  ['Drawer', 'ui/components/modals/DetailDrawer.tsx'],
  ['CRM Lead detail', 'ui/app/crm/CrmPipelineCenterView.tsx'],
  ['Project detail', 'ui/app/projects/ProjectDetailView.tsx'],
  ['Customer Portal Draft detail', 'ui/app/customer-portal/CustomerPortalDraftCenterView.tsx']
];
entryFiles.forEach(([name, file]) => {
  assert.ok(fs.readFileSync(path.join(workspace, file), 'utf8').includes('calendarSiteSurveySync'), `53. ${name} internal entry exists`);
});

const clientPortal = fs.readFileSync(path.join(workspace, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
assert.ok(!clientPortal.includes('calendarSiteSurveySync'), '54. customer portal has no internal calendar route');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-4-calendar-site-survey-sync.smoke',
  eventId: event.event_id,
  surveyEventId: surveyCreated.event.event_id,
  linkId: surveyCreated.link.link_id,
  provider: 'DISABLED',
  customerSafety: 'PASSED',
  decision: 'MERGE_READY'
}, null, 2));
