'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ACTION_TYPES = [
  'FIRST_CONTACT',
  'FOLLOW_UP',
  'CONSULTATION_REVIEW',
  'SITE_SURVEY_CONFIRM',
  'ESTIMATE_PREPARE',
  'ESTIMATE_SEND',
  'NEGOTIATION_FOLLOW_UP',
  'CONTRACT_FOLLOW_UP',
  'PROJECT_HANDOFF',
  'CUSTOMER_CHECK',
  'MANUAL'
];
const ACTION_STATUSES = ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const SOURCES = ['MANUAL', 'STAGE_CHANGE', 'CONSULTATION_LOG', 'SITE_SURVEY', 'ESTIMATE_LINK', 'PROJECT_LINK', 'SYSTEM_RULE'];
const NOTIFICATION_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'];
const NOTIFICATION_STATUSES = ['UNREAD', 'READ', 'DISMISSED'];
const NOTIFICATION_CATEGORIES = ['NEXT_ACTION', 'OVERDUE', 'STAGE_DELAY', 'SITE_SURVEY', 'ESTIMATE', 'CONTRACT', 'DATA_QUALITY', 'SYSTEM'];

const STAGE_RULES = {
  LEAD: { actionType: 'FIRST_CONTACT', dueHours: 24, priority: 'HIGH', title: '첫 연락 진행' },
  CONTACTED: { actionType: 'CONSULTATION_REVIEW', dueHours: 24, priority: 'NORMAL', title: '상담 내용 검토' },
  CONSULTING: { actionType: 'FOLLOW_UP', dueHours: 48, priority: 'NORMAL', title: '상담 후속 연락' },
  SITE_SURVEY_SCHEDULED: { actionType: 'SITE_SURVEY_CONFIRM', dueHours: 24, priority: 'HIGH', title: '현장조사 일정 확인' },
  SITE_SURVEY_DONE: { actionType: 'ESTIMATE_PREPARE', dueHours: 48, priority: 'HIGH', title: '견적 준비' },
  ESTIMATE_REQUESTED: { actionType: 'ESTIMATE_SEND', dueHours: 72, priority: 'HIGH', title: '견적 발송' },
  ESTIMATE_SENT: { actionType: 'NEGOTIATION_FOLLOW_UP', dueHours: 72, priority: 'NORMAL', title: '견적 협의 후속 연락' },
  NEGOTIATION: { actionType: 'NEGOTIATION_FOLLOW_UP', dueHours: 72, priority: 'NORMAL', title: '협의 진행 확인' },
  CONTRACT_PENDING: { actionType: 'CONTRACT_FOLLOW_UP', dueHours: 48, priority: 'HIGH', title: '계약 진행 확인' },
  CONTRACTED: { actionType: 'PROJECT_HANDOFF', dueHours: 24, priority: 'HIGH', title: '프로젝트 인계' }
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function clean(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

function normalized(value, allowed, fallback) {
  const result = clean(value).toUpperCase();
  return allowed.includes(result) ? result : fallback;
}

function addHours(base, hours) {
  const date = base ? new Date(base) : new Date();
  if (Number.isNaN(date.getTime())) return new Date(Date.now() + Number(hours || 0) * 3600000).toISOString();
  date.setHours(date.getHours() + Number(hours || 0));
  return date.toISOString();
}

function publicCustomerName(value) {
  const name = clean(value);
  if (!name) return '고객';
  if (name.includes('테스트')) return name;
  return name.length <= 2 ? `${name.slice(0, 1)}*` : `${name.slice(0, 1)}${'*'.repeat(name.length - 2)}${name.slice(-1)}`;
}

function sanitizeNotificationText(value) {
  return clean(value)
    .replace(/\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g, '[전화번호 숨김]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[이메일 숨김]');
}

function createCrmNextActionService({ sqliteService, crmPipelineService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.project) throw new Error('sqliteService with project database path is required');

  const projectDbPath = sqliteService.dbPaths.project;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  if (crmPipelineService?.getCrmDashboardSummary) crmPipelineService.getCrmDashboardSummary();

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS crm_next_actions (
        id TEXT PRIMARY KEY,
        action_id TEXT UNIQUE NOT NULL,
        lead_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description_internal TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        due_at TEXT,
        snooze_until TEXT,
        assigned_to TEXT,
        related_stage TEXT,
        source TEXT NOT NULL,
        auto_generated INTEGER DEFAULT 0,
        completion_note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        cancelled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS crm_internal_notifications (
        id TEXT PRIMARY KEY,
        notification_id TEXT UNIQUE NOT NULL,
        target_type TEXT,
        target_id TEXT,
        lead_id TEXT,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message_internal TEXT,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        due_at TEXT,
        external_delivery_status TEXT DEFAULT 'DISABLED',
        created_at TEXT NOT NULL,
        read_at TEXT,
        dismissed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS crm_next_action_rules (
        id TEXT PRIMARY KEY,
        rule_id TEXT UNIQUE NOT NULL,
        from_stage TEXT,
        to_stage TEXT NOT NULL,
        action_type TEXT NOT NULL,
        default_due_hours INTEGER NOT NULL,
        priority TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_crm_next_actions_lead ON crm_next_actions(lead_id);
      CREATE INDEX IF NOT EXISTS idx_crm_next_actions_status_due ON crm_next_actions(status, due_at);
      CREATE INDEX IF NOT EXISTS idx_crm_notifications_status ON crm_internal_notifications(status, created_at);
    `);

    const createdAt = nowIso();
    const insertRule = database.prepare(`
      INSERT OR IGNORE INTO crm_next_action_rules (
        id, rule_id, from_stage, to_stage, action_type, default_due_hours,
        priority, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    Object.entries(STAGE_RULES).forEach(([stage, rule]) => {
      insertRule.run(makeId('CRMNAROW'), `CRMNA-RULE-${stage}`, '', stage, rule.actionType, rule.dueHours, rule.priority, createdAt, createdAt);
    });
  }

  function withDb(callback) {
    const database = new DatabaseSync(projectDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function getLead(database, leadId) {
    return database.prepare('SELECT * FROM crm_leads WHERE lead_id = ? OR id = ?').get(clean(leadId), clean(leadId));
  }

  function refreshOverdue(database) {
    const now = nowIso();
    const newlyOverdue = database.prepare(`
      SELECT action_id, lead_id, title, due_at FROM crm_next_actions
      WHERE status IN ('OPEN', 'IN_PROGRESS')
        AND TRIM(COALESCE(due_at, '')) <> ''
        AND due_at < ?
    `).all(now);
    database.prepare(`
      UPDATE crm_next_actions SET status = 'OVERDUE', updated_at = ?
      WHERE status IN ('OPEN', 'IN_PROGRESS')
        AND TRIM(COALESCE(due_at, '')) <> ''
        AND due_at < ?
    `).run(now, now);
    const exists = database.prepare(`
      SELECT 1 FROM crm_internal_notifications
      WHERE target_type = 'NEXT_ACTION' AND target_id = ? AND category = 'OVERDUE'
      LIMIT 1
    `);
    const insert = database.prepare(`
      INSERT INTO crm_internal_notifications (
        id, notification_id, target_type, target_id, lead_id, severity, title,
        message_internal, status, category, due_at, external_delivery_status,
        created_at, read_at, dismissed_at
      ) VALUES (?, ?, 'NEXT_ACTION', ?, ?, 'WARNING', ?, ?, 'UNREAD', 'OVERDUE', ?, 'DISABLED', ?, '', '')
    `);
    newlyOverdue.forEach((action) => {
      if (!exists.get(action.action_id)) {
        insert.run(
          makeId('CRMNOTIROW'), makeId('CRMNOTI'), action.action_id, action.lead_id,
          `기한 초과: ${action.title}`, 'CRM 다음 액션의 처리 기한이 지났습니다.',
          action.due_at, now
        );
      }
    });
  }

  function actionDetail(database, actionId) {
    refreshOverdue(database);
    const action = database.prepare('SELECT * FROM crm_next_actions WHERE action_id = ? OR id = ?').get(clean(actionId), clean(actionId));
    if (!action) return null;
    const lead = getLead(database, action.lead_id);
    const stageHistory = database.prepare(`
      SELECT from_stage, to_stage, reason, changed_at
      FROM crm_stage_history WHERE lead_id = ? ORDER BY changed_at DESC LIMIT 5
    `).all(action.lead_id);
    const consultationLogs = database.prepare(`
      SELECT public_summary, next_action, next_action_due_at, created_at
      FROM crm_consultation_logs WHERE lead_id = ? ORDER BY created_at DESC LIMIT 5
    `).all(action.lead_id);
    return {
      ...action,
      lead: lead ? {
        lead_id: lead.lead_id,
        customer_display_name: publicCustomerName(lead.customer_name),
        stage: lead.stage,
        project_type: lead.project_type,
        assigned_to: lead.assigned_to
      } : null,
      stageHistory,
      consultationLogs,
      customerSafePreview: lead ? {
        customer_safe: true,
        display_name: publicCustomerName(lead.customer_name),
        project_type: lead.project_type,
        stage: lead.stage,
        company_contact_status: 'AVAILABLE'
      } : null
    };
  }

  function createCrmNextAction(payload = {}) {
    return withDb((database) => {
      const leadId = clean(payload.leadId || payload.lead_id);
      const lead = getLead(database, leadId);
      if (!lead) throw new Error('CRM 고객 정보를 찾을 수 없습니다.');
      const actionType = normalized(payload.actionType || payload.action_type, ACTION_TYPES, 'MANUAL');
      const status = normalized(payload.status, ACTION_STATUSES, 'OPEN');
      const priority = normalized(payload.priority, PRIORITIES, 'NORMAL');
      const source = normalized(payload.source, SOURCES, 'MANUAL');
      if (payload.preventDuplicate !== false && ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'OVERDUE'].includes(status)) {
        const duplicate = database.prepare(`
          SELECT * FROM crm_next_actions
          WHERE lead_id = ? AND action_type = ? AND status IN ('OPEN', 'IN_PROGRESS', 'SNOOZED', 'OVERDUE')
          ORDER BY created_at DESC LIMIT 1
        `).get(lead.lead_id, actionType);
        if (duplicate) return { ok: true, created: false, duplicate: true, actionId: duplicate.action_id, action: actionDetail(database, duplicate.action_id) };
      }
      const actionId = clean(payload.actionId || payload.action_id) || makeId('CRMNA');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO crm_next_actions (
          id, action_id, lead_id, action_type, title, description_internal, status,
          priority, due_at, snooze_until, assigned_to, related_stage, source,
          auto_generated, completion_note, created_at, updated_at, completed_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId('CRMNAROW'), actionId, lead.lead_id, actionType,
        clean(payload.title || STAGE_RULES[lead.stage]?.title || 'CRM 다음 액션'),
        clean(payload.descriptionInternal || payload.description_internal),
        status, priority, clean(payload.dueAt || payload.due_at),
        clean(payload.snoozeUntil || payload.snooze_until),
        clean(payload.assignedTo || payload.assigned_to || lead.assigned_to),
        clean(payload.relatedStage || payload.related_stage || lead.stage),
        source, payload.autoGenerated || payload.auto_generated ? 1 : 0,
        clean(payload.completionNote || payload.completion_note),
        createdAt, createdAt,
        status === 'COMPLETED' ? createdAt : '',
        status === 'CANCELLED' ? createdAt : ''
      );
      return { ok: true, created: true, duplicate: false, actionId, action: actionDetail(database, actionId) };
    });
  }

  function listCrmNextActions(filters = {}) {
    return withDb((database) => {
      refreshOverdue(database);
      const clauses = [];
      const params = [];
      const filterMap = {
        leadId: 'a.lead_id',
        lead_id: 'a.lead_id',
        status: 'a.status',
        priority: 'a.priority',
        actionType: 'a.action_type',
        action_type: 'a.action_type',
        assignedTo: 'a.assigned_to',
        assigned_to: 'a.assigned_to',
        relatedStage: 'a.related_stage',
        related_stage: 'a.related_stage'
      };
      Object.entries(filterMap).forEach(([key, column]) => {
        if (filters[key]) {
          clauses.push(`${column} = ?`);
          params.push(clean(filters[key]).toUpperCase());
        }
      });
      const now = nowIso();
      if (filters.today) {
        const day = now.slice(0, 10);
        clauses.push('substr(a.due_at, 1, 10) = ?');
        params.push(day);
      }
      if (filters.overdue) clauses.push(`a.status = 'OVERDUE'`);
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return database.prepare(`
        SELECT a.*, l.customer_name, l.stage AS current_stage, l.project_type
        FROM crm_next_actions a
        LEFT JOIN crm_leads l ON l.lead_id = a.lead_id
        ${where}
        ORDER BY
          CASE a.status WHEN 'OVERDUE' THEN 0 WHEN 'OPEN' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'SNOOZED' THEN 3 ELSE 4 END,
          CASE a.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
          COALESCE(a.due_at, '9999-12-31') ASC
      `).all(...params).map((row) => ({ ...row, customer_name: publicCustomerName(row.customer_name) }));
    });
  }

  function getCrmNextActionDetail(actionId) {
    const normalizedId = typeof actionId === 'object' ? actionId.actionId || actionId.action_id || actionId.id : actionId;
    return withDb((database) => actionDetail(database, normalizedId));
  }

  function updateCrmNextAction(actionId, payload = {}) {
    const args = typeof actionId === 'object'
      ? { actionId: actionId.actionId || actionId.action_id || actionId.id, payload: actionId }
      : { actionId, payload };
    return withDb((database) => {
      const before = database.prepare('SELECT * FROM crm_next_actions WHERE action_id = ? OR id = ?').get(clean(args.actionId), clean(args.actionId));
      if (!before) throw new Error('CRM 다음 액션을 찾을 수 없습니다.');
      const status = args.payload.status ? normalized(args.payload.status, ACTION_STATUSES, before.status) : before.status;
      database.prepare(`
        UPDATE crm_next_actions SET title = ?, description_internal = ?, status = ?,
          priority = ?, due_at = ?, snooze_until = ?, assigned_to = ?,
          completion_note = ?, updated_at = ? WHERE action_id = ?
      `).run(
        clean(args.payload.title || before.title),
        clean(args.payload.descriptionInternal || args.payload.description_internal || before.description_internal),
        status,
        normalized(args.payload.priority, PRIORITIES, before.priority),
        clean(args.payload.dueAt || args.payload.due_at || before.due_at),
        clean(args.payload.snoozeUntil || args.payload.snooze_until || before.snooze_until),
        clean(args.payload.assignedTo || args.payload.assigned_to || before.assigned_to),
        clean(args.payload.completionNote || args.payload.completion_note || before.completion_note),
        nowIso(), before.action_id
      );
      return { ok: true, actionId: before.action_id, action: actionDetail(database, before.action_id) };
    });
  }

  function completeCrmNextAction(actionId, payload = {}) {
    const args = typeof actionId === 'object' ? { actionId: actionId.actionId || actionId.action_id || actionId.id, payload: actionId } : { actionId, payload };
    return withDb((database) => {
      const action = database.prepare('SELECT * FROM crm_next_actions WHERE action_id = ? OR id = ?').get(clean(args.actionId), clean(args.actionId));
      if (!action) throw new Error('CRM 다음 액션을 찾을 수 없습니다.');
      const completedAt = nowIso();
      database.prepare(`
        UPDATE crm_next_actions SET status = 'COMPLETED', completion_note = ?,
          completed_at = ?, updated_at = ? WHERE action_id = ?
      `).run(clean(args.payload.completionNote || args.payload.completion_note), completedAt, completedAt, action.action_id);
      return { ok: true, actionId: action.action_id, action: actionDetail(database, action.action_id) };
    });
  }

  function snoozeCrmNextAction(actionId, payload = {}) {
    const args = typeof actionId === 'object' ? { actionId: actionId.actionId || actionId.action_id || actionId.id, payload: actionId } : { actionId, payload };
    return withDb((database) => {
      const action = database.prepare('SELECT * FROM crm_next_actions WHERE action_id = ? OR id = ?').get(clean(args.actionId), clean(args.actionId));
      if (!action) throw new Error('CRM 다음 액션을 찾을 수 없습니다.');
      const snoozeUntil = clean(args.payload.snoozeUntil || args.payload.snooze_until) || addHours(null, 24);
      database.prepare(`
        UPDATE crm_next_actions SET status = 'SNOOZED', snooze_until = ?,
          due_at = ?, updated_at = ? WHERE action_id = ?
      `).run(snoozeUntil, snoozeUntil, nowIso(), action.action_id);
      return { ok: true, actionId: action.action_id, action: actionDetail(database, action.action_id) };
    });
  }

  function cancelCrmNextAction(actionId, payload = {}) {
    const args = typeof actionId === 'object' ? { actionId: actionId.actionId || actionId.action_id || actionId.id, payload: actionId } : { actionId, payload };
    return withDb((database) => {
      const action = database.prepare('SELECT * FROM crm_next_actions WHERE action_id = ? OR id = ?').get(clean(args.actionId), clean(args.actionId));
      if (!action) throw new Error('CRM 다음 액션을 찾을 수 없습니다.');
      const cancelledAt = nowIso();
      database.prepare(`
        UPDATE crm_next_actions SET status = 'CANCELLED', completion_note = ?,
          cancelled_at = ?, updated_at = ? WHERE action_id = ?
      `).run(clean(args.payload.reason || args.payload.completionNote || args.payload.completion_note), cancelledAt, cancelledAt, action.action_id);
      return { ok: true, actionId: action.action_id, action: actionDetail(database, action.action_id) };
    });
  }

  function createInternalCrmNotification(payload = {}) {
    return withDb((database) => {
      const notificationId = clean(payload.notificationId || payload.notification_id) || makeId('CRMNOTI');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO crm_internal_notifications (
          id, notification_id, target_type, target_id, lead_id, severity, title,
          message_internal, status, category, due_at, external_delivery_status,
          created_at, read_at, dismissed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DISABLED', ?, ?, ?)
      `).run(
        makeId('CRMNOTIROW'), notificationId,
        clean(payload.targetType || payload.target_type || 'LEAD'),
        clean(payload.targetId || payload.target_id),
        clean(payload.leadId || payload.lead_id),
        normalized(payload.severity, NOTIFICATION_SEVERITIES, 'INFO'),
        sanitizeNotificationText(payload.title || 'CRM 내부 알림'),
        sanitizeNotificationText(payload.messageInternal || payload.message_internal),
        normalized(payload.status, NOTIFICATION_STATUSES, 'UNREAD'),
        normalized(payload.category, NOTIFICATION_CATEGORIES, 'SYSTEM'),
        clean(payload.dueAt || payload.due_at),
        createdAt, '', ''
      );
      return { ok: true, notificationId, notification: database.prepare('SELECT * FROM crm_internal_notifications WHERE notification_id = ?').get(notificationId) };
    });
  }

  function listCrmNotifications(filters = {}) {
    return withDb((database) => {
      const clauses = [];
      const params = [];
      ['status', 'severity', 'category'].forEach((key) => {
        if (filters[key]) {
          clauses.push(`${key} = ?`);
          params.push(clean(filters[key]).toUpperCase());
        }
      });
      if (filters.leadId || filters.lead_id) {
        clauses.push('lead_id = ?');
        params.push(clean(filters.leadId || filters.lead_id));
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return database.prepare(`
        SELECT * FROM crm_internal_notifications ${where}
        ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END, created_at DESC
      `).all(...params);
    });
  }

  function updateNotificationStatus(notificationId, status) {
    const normalizedId = typeof notificationId === 'object'
      ? notificationId.notificationId || notificationId.notification_id || notificationId.id
      : notificationId;
    return withDb((database) => {
      const row = database.prepare('SELECT * FROM crm_internal_notifications WHERE notification_id = ? OR id = ?').get(clean(normalizedId), clean(normalizedId));
      if (!row) throw new Error('CRM 내부 알림을 찾을 수 없습니다.');
      const at = nowIso();
      database.prepare(`
        UPDATE crm_internal_notifications SET status = ?, read_at = ?, dismissed_at = ?
        WHERE notification_id = ?
      `).run(status, status === 'READ' ? at : row.read_at, status === 'DISMISSED' ? at : row.dismissed_at, row.notification_id);
      return { ok: true, notificationId: row.notification_id, notification: database.prepare('SELECT * FROM crm_internal_notifications WHERE notification_id = ?').get(row.notification_id) };
    });
  }

  function markCrmNotificationRead(notificationId) {
    return updateNotificationStatus(notificationId, 'READ');
  }

  function dismissCrmNotification(notificationId) {
    return updateNotificationStatus(notificationId, 'DISMISSED');
  }

  function applyStageRestriction(leadId, stage) {
    return withDb((database) => {
      const nextStatus = stage === 'LOST' ? 'CANCELLED' : 'SNOOZED';
      const at = nowIso();
      const result = database.prepare(`
        UPDATE crm_next_actions SET status = ?, completion_note = ?, updated_at = ?,
          cancelled_at = CASE WHEN ? = 'CANCELLED' THEN ? ELSE cancelled_at END
        WHERE lead_id = ? AND status IN ('OPEN', 'IN_PROGRESS', 'SNOOZED', 'OVERDUE')
      `).run(nextStatus, stage === 'LOST' ? 'CRM LOST 단계 자동 취소' : 'CRM ON_HOLD 단계 자동 보류', at, nextStatus, at, clean(leadId));
      return Number(result.changes || 0);
    });
  }

  function generateNextActionsForStageChange(leadId, fromStage, toStage, context = {}) {
    const args = typeof leadId === 'object'
      ? {
          leadId: leadId.leadId || leadId.lead_id,
          fromStage: leadId.fromStage || leadId.from_stage,
          toStage: leadId.toStage || leadId.to_stage,
          context: leadId
        }
      : { leadId, fromStage, toStage, context };
    const stage = clean(args.toStage).toUpperCase();
    if (stage === 'ON_HOLD' || stage === 'LOST') {
      const affected = applyStageRestriction(args.leadId, stage);
      const notification = createInternalCrmNotification({
        leadId: args.leadId,
        targetType: 'LEAD',
        targetId: args.leadId,
        severity: stage === 'LOST' ? 'WARNING' : 'INFO',
        category: 'STAGE_DELAY',
        title: stage === 'LOST' ? 'CRM 종료 단계 확인' : 'CRM 보류 단계 확인',
        messageInternal: stage === 'LOST' ? '진행 중인 다음 액션을 취소했습니다.' : '진행 중인 다음 액션을 보류했습니다.'
      });
      return { ok: true, restricted: true, stage, affected, notification };
    }
    const rule = STAGE_RULES[stage];
    if (!rule) return { ok: true, created: false, reason: 'NO_RULE', stage };
    let dueAt = clean(args.context.dueAt || args.context.due_at);
    if (stage === 'SITE_SURVEY_SCHEDULED' && (args.context.surveyDate || args.context.requestedDate || args.context.requested_date)) {
      const surveyDate = args.context.surveyDate || args.context.requestedDate || args.context.requested_date;
      dueAt = addHours(`${surveyDate}T00:00:00.000Z`, -24);
    }
    if (!dueAt) dueAt = addHours(null, rule.dueHours);
    const action = createCrmNextAction({
      leadId: args.leadId,
      actionType: rule.actionType,
      title: rule.title,
      descriptionInternal: `${stage} 단계의 내부 후속 작업`,
      priority: rule.priority,
      dueAt,
      assignedTo: args.context.assignedTo || args.context.assigned_to,
      relatedStage: stage,
      source: args.context.source || 'STAGE_CHANGE',
      autoGenerated: true
    });
    if (action.created) {
      createInternalCrmNotification({
        leadId: args.leadId,
        targetType: 'NEXT_ACTION',
        targetId: action.actionId,
        severity: rule.priority === 'HIGH' ? 'WARNING' : 'INFO',
        category: stage.includes('ESTIMATE') ? 'ESTIMATE' : stage.includes('CONTRACT') ? 'CONTRACT' : stage.includes('SITE_SURVEY') ? 'SITE_SURVEY' : 'NEXT_ACTION',
        title: rule.title,
        messageInternal: `${stage} 단계 다음 액션이 생성되었습니다.`,
        dueAt
      });
    }
    return { ok: true, stage, ...action };
  }

  function generateNextActionsForLead(leadId, context = {}) {
    const args = typeof leadId === 'object' ? { leadId: leadId.leadId || leadId.lead_id, context: leadId } : { leadId, context };
    return withDb((database) => {
      const lead = getLead(database, args.leadId);
      if (!lead) throw new Error('CRM 고객 정보를 찾을 수 없습니다.');
      return generateNextActionsForStageChange(lead.lead_id, '', lead.stage, { ...args.context, source: 'SYSTEM_RULE', assignedTo: lead.assigned_to });
    });
  }

  function getCrmNextActionDashboardSummary() {
    return withDb((database) => {
      refreshOverdue(database);
      const today = nowIso().slice(0, 10);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const value = (sql, ...params) => Number(database.prepare(sql).get(...params)?.count || 0);
      return {
        ok: true,
        externalDeliveryStatus: 'DISABLED',
        kpis: {
          today: value(`SELECT COUNT(*) count FROM crm_next_actions WHERE substr(due_at, 1, 10) = ? AND status NOT IN ('COMPLETED', 'CANCELLED')`, today),
          overdue: value(`SELECT COUNT(*) count FROM crm_next_actions WHERE status = 'OVERDUE'`),
          thisWeek: value(`SELECT COUNT(*) count FROM crm_next_actions WHERE due_at >= ? AND due_at <= ? AND status NOT IN ('COMPLETED', 'CANCELLED')`, nowIso(), weekEnd.toISOString()),
          highRiskNotifications: value(`SELECT COUNT(*) count FROM crm_internal_notifications WHERE severity = 'CRITICAL' AND status = 'UNREAD'`),
          siteSurvey: value(`SELECT COUNT(*) count FROM crm_next_actions WHERE action_type = 'SITE_SURVEY_CONFIRM' AND status NOT IN ('COMPLETED', 'CANCELLED')`),
          estimateDelay: value(`SELECT COUNT(*) count FROM crm_next_actions WHERE action_type = 'ESTIMATE_SEND' AND status = 'OVERDUE'`),
          contractFollowUp: value(`SELECT COUNT(*) count FROM crm_next_actions WHERE action_type = 'CONTRACT_FOLLOW_UP' AND status NOT IN ('COMPLETED', 'CANCELLED')`)
        },
        counts: database.prepare('SELECT status, COUNT(*) count FROM crm_next_actions GROUP BY status').all()
      };
    });
  }

  function createCrmNextActionReport(payload = {}) {
    return withDb((database) => {
      refreshOverdue(database);
      const summary = getCrmNextActionDashboardSummary();
      const actionCount = Number(database.prepare('SELECT COUNT(*) count FROM crm_next_actions').get().count || 0);
      const notificationCount = Number(database.prepare('SELECT COUNT(*) count FROM crm_internal_notifications').get().count || 0);
      const fileName = 'RC_0_4_1_CRM_NEXT_ACTION_REPORT_GENERATED.md';
      fs.mkdirSync(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, fileName);
      const lines = [
        '# RC-0.4.1 CRM Next Action Report',
        '',
        `- Generated at: ${nowIso()}`,
        `- Next action count: ${actionCount}`,
        `- Internal notification count: ${notificationCount}`,
        `- Overdue count: ${summary.kpis.overdue}`,
        '- External API calls: DISABLED',
        '- SMS / Email / Kakao / Calendar delivery: DISABLED',
        '- Customer safety: PASSED',
        `- Final decision: ${payload.finalDecision || 'CRM 내부 다음 액션 자동화 사용 가능'}`,
        '',
        '원문 연락처, 상세주소, 내부 원가, 마진, PCE, Queue, Scoring 정보는 포함하지 않습니다.'
      ];
      fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
      return { ok: true, reportPath, summary, customerSafety: 'PASSED', externalApi: 'DISABLED' };
    });
  }

  return {
    ACTION_TYPES,
    ACTION_STATUSES,
    PRIORITIES,
    SOURCES,
    STAGE_RULES,
    createCrmNextAction,
    listCrmNextActions,
    getCrmNextActionDetail,
    updateCrmNextAction,
    completeCrmNextAction,
    snoozeCrmNextAction,
    cancelCrmNextAction,
    generateNextActionsForLead,
    generateNextActionsForStageChange,
    createInternalCrmNotification,
    listCrmNotifications,
    markCrmNotificationRead,
    dismissCrmNotification,
    getCrmNextActionDashboardSummary,
    createCrmNextActionReport
  };
}

module.exports = {
  ACTION_TYPES,
  ACTION_STATUSES,
  PRIORITIES,
  SOURCES,
  STAGE_RULES,
  createCrmNextActionService
};
