'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function clean(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
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

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_survey_schedule_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id TEXT UNIQUE NOT NULL,
      site_survey_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      lead_id TEXT,
      project_id TEXT,
      sync_status TEXT NOT NULL,
      mismatch_status TEXT NOT NULL,
      mismatch_json TEXT,
      last_checked_at TEXT,
      resolved_at TEXT,
      resolution_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function compareFields(left, right) {
  const mismatches = [];
  ['start_at', 'end_at', 'owner_id', 'location_summary', 'status'].forEach((key) => {
    if (clean(left[key]) && clean(right[key]) && clean(left[key]) !== clean(right[key])) {
      mismatches.push({ field: key, survey_value: clean(left[key]), event_value: clean(right[key]) });
    }
  });
  return mismatches;
}

function createSiteSurveyScheduleSyncService({ sqliteService, internalCalendarService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.project) throw new Error('sqliteService.dbPaths.project is required');
  if (!internalCalendarService) throw new Error('internalCalendarService is required');
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

  function getLinkRow(db, linkId) {
    return db.prepare('SELECT * FROM site_survey_schedule_links WHERE link_id = ?').get(clean(linkId));
  }

  function serializeLink(row) {
    return row ? { ...row, mismatch: parseJson(row.mismatch_json, []) } : null;
  }

  function updateLink(db, linkId, patch) {
    const before = getLinkRow(db, linkId);
    if (!before) return null;
    const after = { ...before, ...patch, updated_at: nowIso() };
    db.prepare(`
      UPDATE site_survey_schedule_links
      SET site_survey_id = ?, event_id = ?, lead_id = ?, project_id = ?, sync_status = ?, mismatch_status = ?,
        mismatch_json = ?, last_checked_at = ?, resolved_at = ?, resolution_note = ?, updated_at = ?
      WHERE link_id = ?
    `).run(after.site_survey_id, after.event_id, after.lead_id, after.project_id, after.sync_status, after.mismatch_status,
      after.mismatch_json, after.last_checked_at, after.resolved_at, after.resolution_note, after.updated_at, linkId);
    return serializeLink(after);
  }

  function createSurveyScheduleLink(payload = {}) {
    const siteSurveyId = clean(payload.siteSurveyId || payload.site_survey_id);
    const eventId = clean(payload.eventId || payload.event_id);
    if (!siteSurveyId || !eventId) return { ok: false, error: '현장조사와 일정 ID가 필요합니다.' };
    return withDb((db) => {
      const existing = db.prepare('SELECT * FROM site_survey_schedule_links WHERE site_survey_id = ? AND event_id = ?').get(siteSurveyId, eventId);
      if (existing) return { ok: true, duplicatePrevented: true, ...serializeLink(existing) };
      const now = nowIso();
      const row = {
        link_id: clean(payload.linkId || payload.link_id) || makeId('SURVEY-CAL'),
        site_survey_id: siteSurveyId,
        event_id: eventId,
        lead_id: clean(payload.leadId || payload.lead_id),
        project_id: clean(payload.projectId || payload.project_id),
        sync_status: 'READY_INTERNAL_ONLY',
        mismatch_status: 'CLEAR',
        mismatch_json: '[]',
        last_checked_at: now,
        resolved_at: '',
        resolution_note: '',
        created_at: now,
        updated_at: now
      };
      db.prepare(`
        INSERT INTO site_survey_schedule_links (
          link_id, site_survey_id, event_id, lead_id, project_id, sync_status, mismatch_status,
          mismatch_json, last_checked_at, resolved_at, resolution_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...Object.values(row));
      internalCalendarService.linkEventToSiteSurvey(eventId, siteSurveyId);
      return { ok: true, ...serializeLink(row) };
    });
  }

  function getSurveyScheduleLink(linkId) {
    return withDb((db) => serializeLink(getLinkRow(db, linkId)));
  }

  function listSurveyScheduleLinks(filters = {}) {
    return withDb((db) => {
      const status = clean(filters.syncStatus || filters.sync_status);
      return db.prepare("SELECT * FROM site_survey_schedule_links WHERE (? = '' OR sync_status = ?) ORDER BY updated_at DESC")
        .all(status, status)
        .map(serializeLink);
    });
  }

  function updateSurveyScheduleLink(linkId, payload = {}) {
    if (typeof linkId === 'object') {
      payload = linkId;
      linkId = payload.linkId || payload.link_id;
    }
    return withDb((db) => updateLink(db, clean(linkId), {
      lead_id: clean(payload.leadId || payload.lead_id),
      project_id: clean(payload.projectId || payload.project_id),
      sync_status: clean(payload.syncStatus || payload.sync_status || 'READY_INTERNAL_ONLY'),
      last_checked_at: nowIso()
    }));
  }

  function removeSurveyScheduleLink(linkId) {
    return withDb((db) => {
      const row = getLinkRow(db, linkId);
      if (!row) return { ok: false, error: '연결을 찾을 수 없습니다.' };
      db.prepare('DELETE FROM site_survey_schedule_links WHERE link_id = ?').run(clean(linkId));
      return { ok: true, removed: true, link_id: clean(linkId) };
    });
  }

  function createCalendarEventFromSurvey(surveyId, payload = {}) {
    if (typeof surveyId === 'object') {
      payload = surveyId;
      surveyId = payload.siteSurveyId || payload.site_survey_id || payload.surveyId || payload.survey_id;
    }
    const siteSurveyId = clean(surveyId);
    const event = internalCalendarService.createCalendarEvent({
      eventType: 'SITE_SURVEY',
      title: payload.title || '현장조사 일정',
      customerVisibleTitle: payload.customerVisibleTitle || '현장 방문 일정',
      startAt: payload.startAt || payload.start_at || `${payload.requestedDate || payload.requested_date || '2026-07-01'}T10:00:00+09:00`,
      endAt: payload.endAt || payload.end_at || `${payload.requestedDate || payload.requested_date || '2026-07-01'}T11:00:00+09:00`,
      timezone: payload.timezone || 'Asia/Seoul',
      locationSummary: payload.addressSummary || payload.address_summary || '주소 요약',
      customerSafeLocationSummary: payload.customerSafeLocationSummary || payload.customer_safe_location_summary || payload.addressSummary || payload.address_summary || '방문 위치 요약',
      ownerId: payload.ownerId || payload.owner_id || payload.assignedTo || payload.assigned_to,
      leadId: payload.leadId || payload.lead_id,
      siteSurveyId,
      createdBy: payload.createdBy || 'CEO'
    });
    if (!event.ok) return event;
    const link = createSurveyScheduleLink({
      siteSurveyId,
      eventId: event.event_id,
      leadId: payload.leadId || payload.lead_id,
      projectId: payload.projectId || payload.project_id
    });
    const reminder = internalCalendarService.createEventReminder({
      eventId: event.event_id,
      reminderType: 'CRM_ACTION',
      dueAt: payload.reminderDueAt || event.start_at,
      note: '현장조사 준비'
    });
    return { ok: true, event, link, crmActionDuplicatePrevented: reminder.duplicatePrevented === true };
  }

  function compareSurveyAndEvent(payload = {}) {
    const link = clean(payload.linkId || payload.link_id) ? getSurveyScheduleLink(payload.linkId || payload.link_id) : null;
    const eventId = clean(payload.eventId || payload.event_id || link?.event_id);
    const event = internalCalendarService.getCalendarEvent(eventId);
    if (!event) return { ok: false, error: '일정을 찾을 수 없습니다.' };
    const survey = {
      start_at: clean(payload.surveyStartAt || payload.survey_start_at),
      end_at: clean(payload.surveyEndAt || payload.survey_end_at),
      owner_id: clean(payload.surveyOwnerId || payload.survey_owner_id),
      location_summary: clean(payload.surveyLocationSummary || payload.survey_location_summary),
      status: clean(payload.surveyStatus || payload.survey_status)
    };
    const mismatch = compareFields(survey, event);
    return { ok: true, mismatch, mismatch_status: mismatch.length ? 'OPEN' : 'CLEAR', autoOverwrite: false };
  }

  function detectSurveyScheduleMismatch(payload = {}) {
    const compared = compareSurveyAndEvent(payload);
    if (!compared.ok) return compared;
    const linkId = clean(payload.linkId || payload.link_id);
    if (linkId) {
      withDb((db) => updateLink(db, linkId, {
        mismatch_status: compared.mismatch.length ? 'OPEN' : 'CLEAR',
        mismatch_json: stableJson(compared.mismatch),
        sync_status: compared.mismatch.length ? 'REVIEW_REQUIRED' : 'READY_INTERNAL_ONLY',
        last_checked_at: nowIso()
      }));
    }
    return compared;
  }

  function resolveSurveyScheduleMismatch(linkId, payload = {}) {
    if (typeof linkId === 'object') {
      payload = linkId;
      linkId = payload.linkId || payload.link_id;
    }
    return withDb((db) => updateLink(db, clean(linkId), {
      mismatch_status: 'RESOLVED',
      mismatch_json: '[]',
      sync_status: 'READY_INTERNAL_ONLY',
      resolved_at: nowIso(),
      resolution_note: clean(payload.resolutionNote || payload.note || '수동 확인 완료')
    }));
  }

  function deferSurveyScheduleMismatch(linkId, payload = {}) {
    if (typeof linkId === 'object') {
      payload = linkId;
      linkId = payload.linkId || payload.link_id;
    }
    return withDb((db) => updateLink(db, clean(linkId), {
      mismatch_status: 'DEFERRED',
      sync_status: 'REVIEW_REQUIRED',
      resolution_note: clean(payload.reason || payload.note || '보류')
    }));
  }

  function syncSurveyToCalendar(linkId, payload = {}) {
    const link = getSurveyScheduleLink(linkId);
    if (!link) return { ok: false, error: '연결을 찾을 수 없습니다.' };
    const event = internalCalendarService.updateCalendarEvent(link.event_id, {
      startAt: payload.startAt || payload.start_at,
      endAt: payload.endAt || payload.end_at,
      locationSummary: payload.locationSummary || payload.location_summary,
      ownerId: payload.ownerId || payload.owner_id,
      status: payload.eventStatus || payload.status || 'RESCHEDULED'
    });
    return { ok: event.ok !== false, direction: 'SURVEY_TO_CALENDAR', event, link: updateSurveyScheduleLink(linkId, { syncStatus: 'READY_INTERNAL_ONLY' }) };
  }

  function syncCalendarToSurvey(linkId) {
    const link = getSurveyScheduleLink(linkId);
    if (!link) return { ok: false, error: '연결을 찾을 수 없습니다.' };
    const event = internalCalendarService.getCalendarEvent(link.event_id);
    return { ok: true, direction: 'CALENDAR_TO_SURVEY', event, surveyUpdateRequired: true, autoOverwrite: false };
  }

  function cancelLinkedSurveyEvent(linkId, payload = {}) {
    const link = getSurveyScheduleLink(linkId);
    if (!link) return { ok: false, error: '연결을 찾을 수 없습니다.' };
    return internalCalendarService.cancelCalendarEvent(link.event_id, payload);
  }

  function completeLinkedSurveyEvent(linkId, payload = {}) {
    const link = getSurveyScheduleLink(linkId);
    if (!link) return { ok: false, error: '연결을 찾을 수 없습니다.' };
    return internalCalendarService.markEventCompleted(link.event_id, payload);
  }

  function rescheduleLinkedSurveyEvent(linkId, payload = {}) {
    const link = getSurveyScheduleLink(linkId);
    if (!link) return { ok: false, error: '연결을 찾을 수 없습니다.' };
    return internalCalendarService.rescheduleEvent(link.event_id, payload);
  }

  function getSiteSurveyScheduleSummary() {
    return withDb((db) => {
      const total = db.prepare('SELECT COUNT(*) count FROM site_survey_schedule_links').get().count;
      const review = db.prepare("SELECT COUNT(*) count FROM site_survey_schedule_links WHERE sync_status = 'REVIEW_REQUIRED'").get().count;
      const deferred = db.prepare("SELECT COUNT(*) count FROM site_survey_schedule_links WHERE mismatch_status = 'DEFERRED'").get().count;
      return { totalLinks: total, reviewRequired: review, deferred, externalSync: 'DISABLED' };
    });
  }

  function createSiteSurveyScheduleReport(payload = {}) {
    fs.mkdirSync(reportDirectory, { recursive: true });
    const reportPath = path.join(reportDirectory, 'RC_0_4_4_SITE_SURVEY_SCHEDULE_SYNC_REPORT.md');
    const summary = getSiteSurveyScheduleSummary();
    fs.writeFileSync(reportPath, [
      '# RC-0.4.4 Site Survey Schedule Sync Report',
      '',
      `- total links: ${summary.totalLinks}`,
      `- review required: ${summary.reviewRequired}`,
      `- deferred: ${summary.deferred}`,
      '- external calendar sync: DISABLED',
      `- decision: ${clean(payload.finalDecision || 'IN_PROGRESS')}`
    ].join('\n'), 'utf8');
    return { ok: true, reportPath, summary };
  }

  return {
    createSurveyScheduleLink,
    updateSurveyScheduleLink,
    getSurveyScheduleLink,
    listSurveyScheduleLinks,
    removeSurveyScheduleLink,
    createCalendarEventFromSurvey,
    syncSurveyToCalendar,
    syncCalendarToSurvey,
    compareSurveyAndEvent,
    detectSurveyScheduleMismatch,
    resolveSurveyScheduleMismatch,
    deferSurveyScheduleMismatch,
    cancelLinkedSurveyEvent,
    completeLinkedSurveyEvent,
    rescheduleLinkedSurveyEvent,
    getSiteSurveyScheduleSummary,
    createSiteSurveyScheduleReport
  };
}

module.exports = { createSiteSurveyScheduleSyncService };
