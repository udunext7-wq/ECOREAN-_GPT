'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { createCalendarProviderAdapter } = require('./calendarProviderAdapter');

const EVENT_TYPES = ['SITE_SURVEY', 'CONSULTATION', 'ESTIMATE_REVIEW', 'CONTRACT', 'CONSTRUCTION_START', 'CONSTRUCTION_MILESTONE', 'CUSTOMER_MEETING', 'INTERNAL_REVIEW', 'FOLLOW_UP'];
const EVENT_STATUSES = ['DRAFT', 'SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'RESCHEDULE_REQUIRED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
const SYNC_STATUSES = ['DISABLED', 'NOT_CONFIGURED', 'READY_INTERNAL_ONLY', 'SYNC_PENDING', 'SYNCED', 'SYNC_FAILED', 'CONFLICT'];
const REMINDER_TYPES = [
  'CALL',
  'SMS_DISABLED',
  'EMAIL_DISABLED',
  'IN_APP',
  'CRM_ACTION',
  'SURVEY_CONFIRMATION',
  'SURVEY_PREPARATION',
  'CUSTOMER_CONTACT',
  'DOCUMENT_PREPARATION',
  'TRAVEL_PREPARATION',
  'EVENT_FOLLOW_UP'
];
const REMINDER_STATUSES = ['OPEN', 'SNOOZED', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
const DEFAULT_TIMEZONE = 'Asia/Seoul';

const FORBIDDEN_CUSTOMER_KEYS = [
  'owner', 'assigned', 'memo', 'internal', 'conflict', 'provider', 'external',
  'hash', 'queue', 'cost', 'margin', 'pce', 'vendor', 'labor', 'purchase',
  'receiving', 'variance', 'calibration', 'backup', 'profit', 'risk_score',
  'detailed_address', 'customer_phone', 'customer_email', 'raw_phone', 'raw_email'
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function clean(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stableJson(value) {
  return JSON.stringify(value ?? null);
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function normalizeEnum(value, allowed, fallback) {
  const next = clean(value).toUpperCase();
  return allowed.includes(next) ? next : fallback;
}

function hashReference(value) {
  const raw = clean(value);
  return raw ? crypto.createHash('sha256').update(raw).digest('hex') : '';
}

function normalizeTimezone(value) {
  const text = clean(value);
  if (!text) return { timezone: DEFAULT_TIMEZONE, warning: '시간대가 없어 Asia/Seoul로 처리했습니다.' };
  try {
    Intl.DateTimeFormat('en-US', { timeZone: text }).format(new Date());
  } catch (_error) {
    return { timezone: DEFAULT_TIMEZONE, warning: '지원하지 않는 시간대라 Asia/Seoul로 처리했습니다.' };
  }
  return { timezone: text, warning: '' };
}

function toDate(value, timezone = DEFAULT_TIMEZONE, allDay = false, endOfAllDay = false) {
  const text = clean(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const suffix = timezone === DEFAULT_TIMEZONE ? '+09:00' : 'Z';
    return new Date(`${text}T${endOfAllDay && allDay ? '23:59:59' : '00:00:00'}${suffix}`);
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeEventTime(payload = {}) {
  const tz = normalizeTimezone(payload.timezone);
  const allDay = payload.allDay === true || payload.all_day === 1 || payload.all_day === true;
  const start = toDate(payload.startAt || payload.start_at, tz.timezone, allDay, false);
  const end = toDate(payload.endAt || payload.end_at, tz.timezone, allDay, true);
  const errors = [];
  const warnings = tz.warning ? [tz.warning] : [];
  if (!start) errors.push('시작 시간이 필요합니다.');
  if (!end) errors.push('종료 시간이 필요합니다.');
  if (start && end && start.getTime() >= end.getTime()) errors.push('종료 시간은 시작 시간 이후여야 합니다.');
  if (start && end && end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) warnings.push('24시간을 초과하는 일정입니다.');
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    timezone: tz.timezone,
    all_day: allDay ? 1 : 0,
    start_at: start ? start.toISOString() : '',
    end_at: end ? end.toISOString() : ''
  };
}

function calculateEventDuration(payload = {}) {
  const normalized = normalizeEventTime(payload);
  if (!normalized.ok) return { ok: false, minutes: 0, errors: normalized.errors };
  const minutes = Math.round((new Date(normalized.end_at).getTime() - new Date(normalized.start_at).getTime()) / 60000);
  return { ok: true, minutes };
}

function validateCalendarEvent(payload = {}) {
  const errors = [];
  const warnings = [];
  if (!clean(payload.title)) errors.push('일정 제목이 필요합니다.');
  if (!EVENT_TYPES.includes(normalizeEnum(payload.eventType || payload.event_type, EVENT_TYPES, ''))) errors.push('지원하는 일정 유형이 필요합니다.');
  const time = normalizeEventTime(payload);
  errors.push(...time.errors);
  warnings.push(...time.warnings);
  if (!clean(payload.ownerId || payload.owner_id)) warnings.push('담당자가 지정되지 않았습니다.');
  return { ok: errors.length === 0, status: errors.length ? 'BLOCKED' : warnings.length ? 'NEEDS_REVIEW' : 'VALID', errors, warnings, time };
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS internal_calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description_internal TEXT,
      customer_visible_title TEXT,
      related_lead_id TEXT,
      related_project_id TEXT,
      related_site_survey_id TEXT,
      related_portal_draft_id TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      timezone TEXT NOT NULL,
      all_day INTEGER DEFAULT 0,
      location_summary TEXT,
      customer_safe_location_summary TEXT,
      owner_id TEXT,
      attendee_internal_json TEXT,
      status TEXT NOT NULL,
      conflict_status TEXT NOT NULL,
      external_sync_status TEXT NOT NULL,
      external_provider TEXT,
      external_event_reference_hash TEXT,
      provider_status TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calendar_event_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_id TEXT UNIQUE NOT NULL,
      event_id TEXT NOT NULL,
      reminder_type TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL,
      snoozed_until TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calendar_event_audit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_id TEXT UNIQUE NOT NULL,
      event_id TEXT,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      actor TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function createInternalCalendarService({ sqliteService, reportsDir, providerAdapter } = {}) {
  if (!sqliteService?.dbPaths?.project) throw new Error('sqliteService.dbPaths.project is required');
  const adapter = providerAdapter || createCalendarProviderAdapter();
  const reportDirectory = reportsDir || path.join(process.cwd(), 'docs');

  function withDb(callback) {
    const db = new DatabaseSync(sqliteService.dbPaths.project);
    ensureSchema(db);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function getEventRow(db, eventId) {
    return db.prepare('SELECT * FROM internal_calendar_events WHERE event_id = ?').get(clean(eventId));
  }

  function serializeRow(row) {
    if (!row) return null;
    return { ...row, attendees: parseJson(row.attendee_internal_json, []) };
  }

  function audit(db, eventId, action, before, after, payload = {}) {
    db.prepare(`
      INSERT INTO calendar_event_audit_history (audit_id, event_id, action, before_json, after_json, actor, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(makeId('CAL-AUDIT'), eventId || '', action, stableJson(before), stableJson(after), clean(payload.actor || payload.changedBy || payload.createdBy || 'SYSTEM'), clean(payload.note || payload.reason), nowIso());
  }

  function writeEvent(db, eventId, patch, payload = {}) {
    const before = getEventRow(db, eventId);
    if (!before) throw new Error(`Calendar event not found: ${eventId}`);
    if (before.status === 'CANCELLED' && !['RESTORE_EVENT'].includes(payload.action)) {
      return { ok: false, error: '취소된 일정은 복원 전 수정할 수 없습니다.', event: serializeRow(before) };
    }
    const merged = { ...before, ...patch, updated_at: nowIso(), updated_by: clean(payload.updatedBy || payload.changedBy || payload.actor || before.updated_by) };
    db.prepare(`
      UPDATE internal_calendar_events
      SET event_type = ?, title = ?, description_internal = ?, customer_visible_title = ?, related_lead_id = ?,
        related_project_id = ?, related_site_survey_id = ?, related_portal_draft_id = ?, start_at = ?, end_at = ?,
        timezone = ?, all_day = ?, location_summary = ?, customer_safe_location_summary = ?, owner_id = ?,
        attendee_internal_json = ?, status = ?, conflict_status = ?, external_sync_status = ?, external_provider = ?,
        external_event_reference_hash = ?, provider_status = ?, updated_by = ?, updated_at = ?
      WHERE event_id = ?
    `).run(
      merged.event_type, merged.title, merged.description_internal, merged.customer_visible_title, merged.related_lead_id,
      merged.related_project_id, merged.related_site_survey_id, merged.related_portal_draft_id, merged.start_at, merged.end_at,
      merged.timezone, merged.all_day, merged.location_summary, merged.customer_safe_location_summary, merged.owner_id,
      merged.attendee_internal_json, merged.status, merged.conflict_status, merged.external_sync_status, merged.external_provider,
      merged.external_event_reference_hash, merged.provider_status, merged.updated_by, merged.updated_at, eventId
    );
    audit(db, eventId, payload.action || 'UPDATE_EVENT', before, merged, payload);
    return { ok: true, event: serializeRow(merged) };
  }

  function detectScheduleConflicts(payload = {}) {
    const eventId = clean(payload.eventId || payload.event_id);
    const ownerId = clean(payload.ownerId || payload.owner_id);
    const time = normalizeEventTime(payload);
    if (!time.ok) return { ok: false, conflicts: [], errors: time.errors };
    return withDb((db) => {
      const rows = db.prepare(`
        SELECT * FROM internal_calendar_events
        WHERE status != 'CANCELLED'
          AND (? = '' OR event_id != ?)
          AND (? = '' OR owner_id = ?)
          AND start_at < ?
          AND end_at > ?
        ORDER BY start_at ASC
      `).all(eventId, eventId, ownerId, ownerId, time.end_at, time.start_at);
      const conflicts = rows.map((row) => ({
        event_id: row.event_id,
        title: row.title,
        conflict_type: 'TIME_OVERLAP',
        severity: ownerId ? 'BLOCKING' : 'WARNING',
        message_ko: '동일 시간대 일정이 있습니다.'
      }));
      return { ok: true, conflicts, autoResolved: false };
    });
  }

  function createCalendarEvent(payload = {}) {
    const validation = validateCalendarEvent(payload);
    if (!validation.ok) return { ok: false, validation, errors: validation.errors };
    return withDb((db) => {
      const eventId = clean(payload.eventId || payload.event_id) || makeId('CAL');
      const conflicts = detectScheduleConflicts({ ...payload, eventId });
      const now = nowIso();
      const row = {
        event_id: eventId,
        event_type: normalizeEnum(payload.eventType || payload.event_type, EVENT_TYPES, 'FOLLOW_UP'),
        title: clean(payload.title),
        description_internal: clean(payload.descriptionInternal || payload.description_internal),
        customer_visible_title: clean(payload.customerVisibleTitle || payload.customer_visible_title || payload.title),
        related_lead_id: clean(payload.leadId || payload.relatedLeadId || payload.related_lead_id),
        related_project_id: clean(payload.projectId || payload.relatedProjectId || payload.related_project_id),
        related_site_survey_id: clean(payload.siteSurveyId || payload.relatedSiteSurveyId || payload.related_site_survey_id),
        related_portal_draft_id: clean(payload.portalDraftId || payload.relatedPortalDraftId || payload.related_portal_draft_id),
        start_at: validation.time.start_at,
        end_at: validation.time.end_at,
        timezone: validation.time.timezone,
        all_day: validation.time.all_day,
        location_summary: clean(payload.locationSummary || payload.location_summary),
        customer_safe_location_summary: clean(payload.customerSafeLocationSummary || payload.customer_safe_location_summary || payload.locationSummary || payload.location_summary),
        owner_id: clean(payload.ownerId || payload.owner_id),
        attendee_internal_json: stableJson(payload.attendees || payload.attendees_internal || []),
        status: normalizeEnum(payload.status, EVENT_STATUSES, 'SCHEDULED'),
        conflict_status: conflicts.conflicts.length ? 'CONFLICT' : 'CLEAR',
        external_sync_status: 'DISABLED',
        external_provider: '',
        external_event_reference_hash: hashReference(payload.externalEventId || payload.external_event_id),
        provider_status: 'DISABLED',
        created_by: clean(payload.createdBy || 'CEO'),
        updated_by: clean(payload.createdBy || 'CEO'),
        created_at: now,
        updated_at: now
      };
      db.prepare(`
        INSERT INTO internal_calendar_events (
          event_id, event_type, title, description_internal, customer_visible_title, related_lead_id, related_project_id,
          related_site_survey_id, related_portal_draft_id, start_at, end_at, timezone, all_day, location_summary,
          customer_safe_location_summary, owner_id, attendee_internal_json, status, conflict_status, external_sync_status,
          external_provider, external_event_reference_hash, provider_status, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...Object.values(row));
      audit(db, eventId, 'CREATE_EVENT', null, row, payload);
      return { ok: true, ...serializeRow(row), validation, conflicts };
    });
  }

  function updateCalendarEvent(eventId, payload = {}) {
    if (typeof eventId === 'object') {
      payload = eventId;
      eventId = payload.eventId || payload.event_id;
    }
    const existing = withDb((db) => getEventRow(db, eventId));
    if (!existing) return { ok: false, error: '일정을 찾을 수 없습니다.' };
    const mergedPayload = { ...existing, ...payload, eventType: payload.eventType || payload.event_type || existing.event_type, startAt: payload.startAt || payload.start_at || existing.start_at, endAt: payload.endAt || payload.end_at || existing.end_at };
    const validation = validateCalendarEvent({ ...mergedPayload, title: payload.title ?? existing.title });
    if (!validation.ok) return { ok: false, validation, errors: validation.errors };
    return withDb((db) => writeEvent(db, clean(eventId), {
      event_type: normalizeEnum(mergedPayload.eventType || mergedPayload.event_type, EVENT_TYPES, existing.event_type),
      title: clean(payload.title ?? existing.title),
      description_internal: clean(payload.descriptionInternal ?? payload.description_internal ?? existing.description_internal),
      customer_visible_title: clean(payload.customerVisibleTitle ?? payload.customer_visible_title ?? existing.customer_visible_title),
      start_at: validation.time.start_at,
      end_at: validation.time.end_at,
      timezone: validation.time.timezone,
      all_day: validation.time.all_day,
      location_summary: clean(payload.locationSummary ?? payload.location_summary ?? existing.location_summary),
      customer_safe_location_summary: clean(payload.customerSafeLocationSummary ?? payload.customer_safe_location_summary ?? existing.customer_safe_location_summary),
      owner_id: clean(payload.ownerId ?? payload.owner_id ?? existing.owner_id),
      status: normalizeEnum(payload.status, EVENT_STATUSES, existing.status)
    }, { ...payload, action: 'UPDATE_EVENT' }));
  }

  function getCalendarEvent(eventId) {
    return withDb((db) => serializeRow(getEventRow(db, eventId)));
  }

  function listCalendarEvents(filters = {}) {
    return withDb((db) => {
      const status = clean(filters.status);
      const eventType = clean(filters.eventType || filters.event_type);
      const rows = db.prepare(`
        SELECT * FROM internal_calendar_events
        WHERE (? = '' OR status = ?)
          AND (? = '' OR event_type = ?)
        ORDER BY start_at ASC
      `).all(status, status, eventType, eventType);
      return rows.map(serializeRow);
    });
  }

  function transition(eventId, status, action, payload = {}) {
    return withDb((db) => {
      const targetId = clean(eventId || payload.eventId || payload.event_id);
      const before = getEventRow(db, targetId);
      if (!before) return { ok: false, error: '일정을 찾을 수 없습니다.' };
      if (before.status === 'COMPLETED' && status === 'COMPLETED') {
        return { ok: false, error: '이미 완료된 일정입니다.', event: serializeRow(before) };
      }
      if (before.status === 'CANCELLED' && !['RESTORE_EVENT'].includes(action)) {
        return { ok: false, error: '취소된 일정은 복원 전 변경할 수 없습니다.', event: serializeRow(before) };
      }
      return writeEvent(db, targetId, { status }, { ...payload, action });
    });
  }

  function restoreCalendarEvent(eventId, payload = {}) {
    return withDb((db) => {
      const targetId = clean(eventId || payload.eventId || payload.event_id);
      const before = getEventRow(db, targetId);
      if (!before) return { ok: false, error: '일정을 찾을 수 없습니다.' };
      if (!['CANCELLED', 'NO_SHOW', 'RESCHEDULE_REQUIRED'].includes(before.status)) {
        return { ok: false, error: '복원 가능한 상태가 아닙니다.', event: serializeRow(before) };
      }
      return writeEvent(db, targetId, { status: 'SCHEDULED' }, { ...payload, action: 'RESTORE_EVENT' });
    });
  }

  function rescheduleEvent(eventId, payload = {}) {
    if (typeof eventId === 'object') {
      payload = eventId;
      eventId = payload.eventId || payload.event_id;
    }
    return updateCalendarEvent(eventId, { ...payload, status: 'RESCHEDULED' });
  }

  function linkField(eventId, field, value, action) {
    return withDb((db) => writeEvent(db, clean(eventId), { [field]: clean(value) }, { action }));
  }

  function addEventAttendeeInternal(eventId, attendee) {
    return withDb((db) => {
      const row = getEventRow(db, eventId);
      const attendees = parseJson(row?.attendee_internal_json, []);
      attendees.push({ name: clean(attendee.name || attendee), role: clean(attendee.role) });
      return writeEvent(db, eventId, { attendee_internal_json: stableJson(attendees) }, { action: 'ADD_ATTENDEE' });
    });
  }

  function removeEventAttendeeInternal(eventId, attendeeName) {
    return withDb((db) => {
      const row = getEventRow(db, eventId);
      const attendees = parseJson(row?.attendee_internal_json, []).filter((item) => clean(item.name) !== clean(attendeeName));
      return writeEvent(db, eventId, { attendee_internal_json: stableJson(attendees) }, { action: 'REMOVE_ATTENDEE' });
    });
  }

  function createEventReminder(payload = {}) {
    const eventId = clean(payload.eventId || payload.event_id);
    const reminderType = normalizeEnum(payload.reminderType || payload.reminder_type, REMINDER_TYPES, 'IN_APP');
    const rawDueAt = payload.dueAt || payload.due_at;
    const dueAt = toDate(rawDueAt);
    if (!eventId || !rawDueAt || !dueAt) return { ok: false, error: '일정과 알림 시간이 필요합니다.' };
    return withDb((db) => {
      const duplicate = db.prepare(`
        SELECT * FROM calendar_event_reminders
        WHERE event_id = ? AND reminder_type = ? AND status IN ('OPEN', 'SNOOZED')
      `).get(eventId, reminderType);
      if (duplicate) return { ok: true, duplicatePrevented: true, ...duplicate };
      const now = nowIso();
      const row = {
        reminder_id: clean(payload.reminderId || payload.reminder_id) || makeId('CAL-REM'),
        event_id: eventId,
        reminder_type: reminderType,
        due_at: dueAt.toISOString(),
        status: dueAt.getTime() < Date.now() ? 'OVERDUE' : 'OPEN',
        snoozed_until: '',
        note: clean(payload.note),
        created_at: now,
        updated_at: now
      };
      db.prepare(`
        INSERT INTO calendar_event_reminders (reminder_id, event_id, reminder_type, due_at, status, snoozed_until, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...Object.values(row));
      audit(db, eventId, 'CREATE_REMINDER', null, row, payload);
      return { ok: true, ...row };
    });
  }

  function updateReminder(reminderId, status, patch = {}) {
    return withDb((db) => {
      const before = db.prepare('SELECT * FROM calendar_event_reminders WHERE reminder_id = ?').get(clean(reminderId));
      if (!before) return { ok: false, error: '알림을 찾을 수 없습니다.' };
      if (before.status === 'COMPLETED' && status === 'COMPLETED') return { ok: false, error: '이미 완료된 알림입니다.', ...before };
      if (before.status === 'CANCELLED' && status !== 'CANCELLED') return { ok: false, error: '취소된 알림은 재활성화할 수 없습니다.', ...before };
      const after = { ...before, ...patch, status, updated_at: nowIso() };
      db.prepare('UPDATE calendar_event_reminders SET status = ?, snoozed_until = ?, note = ?, updated_at = ? WHERE reminder_id = ?')
        .run(after.status, after.snoozed_until || '', after.note || '', after.updated_at, reminderId);
      audit(db, after.event_id, `REMINDER_${status}`, before, after, patch);
      return { ok: true, ...after };
    });
  }

  function getCalendarSummary() {
    return withDb((db) => {
      const byStatus = db.prepare('SELECT status, COUNT(*) count FROM internal_calendar_events GROUP BY status').all();
      const siteSurveyCount = db.prepare("SELECT COUNT(*) count FROM internal_calendar_events WHERE event_type = 'SITE_SURVEY'").get().count;
      const conflictCount = db.prepare("SELECT COUNT(*) count FROM internal_calendar_events WHERE conflict_status = 'CONFLICT'").get().count;
      const openReminderCount = db.prepare("SELECT COUNT(*) count FROM calendar_event_reminders WHERE status IN ('OPEN', 'SNOOZED', 'OVERDUE')").get().count;
      return {
        externalSyncStatus: 'DISABLED',
        provider: adapter.getProviderStatus(),
        siteSurveyCount,
        conflictCount,
        openReminderCount,
        statusCounts: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {})
      };
    });
  }

  function createCalendarAuditReport(payload = {}) {
    return withDb((db) => {
      fs.mkdirSync(reportDirectory, { recursive: true });
      const reportPath = path.join(reportDirectory, 'RC_0_4_4_CALENDAR_AUDIT_REPORT.md');
      const eventCount = db.prepare('SELECT COUNT(*) count FROM internal_calendar_events').get().count;
      const auditCount = db.prepare('SELECT COUNT(*) count FROM calendar_event_audit_history').get().count;
      fs.writeFileSync(reportPath, [
        '# RC-0.4.4 Calendar Audit Report',
        '',
        `- events: ${eventCount}`,
        `- audits: ${auditCount}`,
        `- external sync: DISABLED`,
        `- decision: ${clean(payload.finalDecision || 'IN_PROGRESS')}`
      ].join('\n'), 'utf8');
      return { ok: true, reportPath, eventCount, auditCount };
    });
  }

  function getCustomerSafeSchedulePayload(eventId) {
    const row = getCalendarEvent(eventId);
    if (!row) return { ok: false, customerSafety: 'BLOCKED', leaks: ['event_not_found'] };
    const payload = {
      event: {
        title: row.customer_visible_title || row.title,
        eventType: row.event_type,
        startAt: row.start_at,
        endAt: row.end_at,
        timezone: row.timezone,
        status: row.status,
        locationSummary: row.customer_safe_location_summary || row.location_summary
      }
    };
    const serialized = JSON.stringify(payload).toLowerCase();
    const leaks = FORBIDDEN_CUSTOMER_KEYS.filter((key) => serialized.includes(key));
    return { ok: leaks.length === 0, customerSafety: leaks.length ? 'BLOCKED' : 'PASSED', leaks, payload };
  }

  return {
    validateCalendarEvent,
    normalizeEventTime,
    calculateEventDuration,
    createCalendarEvent,
    updateCalendarEvent,
    getCalendarEvent,
    listCalendarEvents,
    cancelCalendarEvent: (eventId, payload = {}) => transition(eventId, 'CANCELLED', 'CANCEL_EVENT', payload),
    restoreCalendarEvent,
    markEventCompleted: (eventId, payload = {}) => transition(eventId, 'COMPLETED', 'COMPLETE_EVENT', payload),
    markEventNoShow: (eventId, payload = {}) => transition(eventId, 'NO_SHOW', 'NO_SHOW_EVENT', payload),
    rescheduleEvent,
    detectScheduleConflicts,
    listScheduleConflicts: detectScheduleConflicts,
    linkEventToLead: (eventId, leadId) => linkField(eventId, 'related_lead_id', leadId, 'LINK_LEAD'),
    linkEventToSiteSurvey: (eventId, siteSurveyId) => linkField(eventId, 'related_site_survey_id', siteSurveyId, 'LINK_SITE_SURVEY'),
    linkEventToProject: (eventId, projectId) => linkField(eventId, 'related_project_id', projectId, 'LINK_PROJECT'),
    linkEventToPortalDraft: (eventId, portalDraftId) => linkField(eventId, 'related_portal_draft_id', portalDraftId, 'LINK_PORTAL_DRAFT'),
    assignEventOwner: (eventId, ownerId) => linkField(eventId, 'owner_id', ownerId, 'ASSIGN_OWNER'),
    addEventAttendeeInternal,
    removeEventAttendeeInternal,
    createEventReminder,
    completeEventReminder: (reminderId, payload = {}) => updateReminder(reminderId, 'COMPLETED', payload),
    snoozeEventReminder: (reminderId, payload = {}) => updateReminder(reminderId, 'SNOOZED', { ...payload, snoozed_until: clean(payload.snoozedUntil || payload.snoozed_until) }),
    cancelEventReminder: (reminderId, payload = {}) => updateReminder(reminderId, 'CANCELLED', payload),
    listEventReminders: (eventId) => withDb((db) => db.prepare('SELECT * FROM calendar_event_reminders WHERE event_id = ? ORDER BY due_at ASC').all(clean(eventId))),
    getCalendarAuditHistory: (eventId) => withDb((db) => db.prepare("SELECT * FROM calendar_event_audit_history WHERE (? = '' OR event_id = ?) ORDER BY id ASC").all(clean(eventId), clean(eventId))),
    getCalendarSummary,
    createCalendarAuditReport,
    getCalendarProviderStatus: () => adapter.getProviderStatus(),
    getCustomerSafeSchedulePayload
  };
}

module.exports = {
  createInternalCalendarService,
  validateCalendarEvent,
  normalizeEventTime,
  calculateEventDuration
};
