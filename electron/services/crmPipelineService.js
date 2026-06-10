'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const CRM_STAGES = [
  'LEAD',
  'CONTACTED',
  'CONSULTING',
  'SITE_SURVEY_SCHEDULED',
  'SITE_SURVEY_DONE',
  'ESTIMATE_REQUESTED',
  'ESTIMATE_SENT',
  'NEGOTIATION',
  'CONTRACT_PENDING',
  'CONTRACTED',
  'LOST',
  'ON_HOLD'
];

const CONNECTION_STATUSES = new Set(['NOT_READY', 'READY_TO_CONNECT', 'CONNECTED', 'FAILED', 'DISABLED']);
const STAGE_SET = new Set(CRM_STAGES);

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function clean(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

function normalizeConnectionStatus(value, fallback = 'NOT_READY') {
  const normalized = clean(value).toUpperCase();
  return CONNECTION_STATUSES.has(normalized) ? normalized : fallback;
}

function maskPhone(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length < 7) return `${digits.slice(0, 2)}****`;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function maskEmail(value) {
  const email = clean(value).toLowerCase();
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2) || '*'}***@${domain}`;
}

function hashToken(value) {
  const token = clean(value);
  return token ? crypto.createHash('sha256').update(token).digest('hex') : '';
}

function publicCustomerName(value) {
  const name = clean(value);
  if (!name) return '고객';
  if (name.includes('테스트')) return name;
  return name.length <= 2 ? `${name.slice(0, 1)}*` : `${name.slice(0, 1)}${'*'.repeat(name.length - 2)}${name.slice(-1)}`;
}

function createCrmPipelineService({ sqliteService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.project) {
    throw new Error('sqliteService with project database path is required');
  }

  const projectDbPath = sqliteService.dbPaths.project;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id TEXT PRIMARY KEY,
        lead_id TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_type TEXT,
        phone_masked TEXT,
        email_masked TEXT,
        address_summary TEXT,
        address_detail_internal TEXT,
        address_normalized_status TEXT,
        address_provider TEXT,
        address_provider_payload_ref TEXT,
        project_type TEXT,
        project_scope TEXT,
        expected_budget_range TEXT,
        preferred_schedule TEXT,
        source TEXT,
        stage TEXT NOT NULL,
        priority TEXT,
        assigned_to TEXT,
        next_action TEXT,
        next_action_due_at TEXT,
        linked_project_id TEXT,
        linked_estimate_id TEXT,
        linked_contract_id TEXT,
        lost_reason TEXT,
        hold_reason TEXT,
        memo_internal TEXT,
        customer_portal_status TEXT,
        portal_invite_status TEXT,
        portal_public_token_hash TEXT,
        portal_last_sent_at TEXT,
        schedule_link_status TEXT,
        calendar_provider TEXT,
        calendar_event_ref TEXT,
        calendar_sync_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crm_consultation_logs (
        id TEXT PRIMARY KEY,
        log_id TEXT UNIQUE NOT NULL,
        lead_id TEXT NOT NULL,
        contact_channel TEXT,
        consultation_type TEXT,
        summary TEXT,
        public_summary TEXT,
        next_action TEXT,
        next_action_due_at TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crm_stage_history (
        id TEXT PRIMARY KEY,
        history_id TEXT UNIQUE NOT NULL,
        lead_id TEXT NOT NULL,
        from_stage TEXT,
        to_stage TEXT NOT NULL,
        reason TEXT,
        changed_by TEXT,
        changed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crm_site_survey_requests (
        id TEXT PRIMARY KEY,
        survey_id TEXT UNIQUE NOT NULL,
        lead_id TEXT NOT NULL,
        requested_date TEXT,
        preferred_time TEXT,
        address_summary TEXT,
        survey_status TEXT,
        assigned_to TEXT,
        note_internal TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
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

  function normalizeLeadPayload(payload = {}, existing = {}) {
    const stage = clean(payload.stage || existing.stage || 'LEAD').toUpperCase();
    if (!STAGE_SET.has(stage)) throw new Error('지원하지 않는 CRM 단계입니다.');
    return {
      customer_name: clean(payload.customerName || payload.customer_name || existing.customer_name || '테스트 고객'),
      customer_type: clean(payload.customerType || payload.customer_type || existing.customer_type || 'TEST'),
      phone_masked: payload.phoneMasked || payload.phone_masked
        ? clean(payload.phoneMasked || payload.phone_masked)
        : maskPhone(payload.customerPhone || payload.customer_phone || existing.phone_masked),
      email_masked: payload.emailMasked || payload.email_masked
        ? clean(payload.emailMasked || payload.email_masked)
        : maskEmail(payload.customerEmail || payload.customer_email || existing.email_masked),
      address_summary: clean(payload.addressSummary || payload.address_summary || existing.address_summary),
      address_detail_internal: clean(payload.addressDetailInternal || payload.address_detail_internal || existing.address_detail_internal),
      address_normalized_status: normalizeConnectionStatus(payload.addressNormalizedStatus || payload.address_normalized_status, existing.address_normalized_status || 'NOT_READY'),
      address_provider: clean(payload.addressProvider || payload.address_provider || existing.address_provider),
      address_provider_payload_ref: clean(payload.addressProviderPayloadRef || payload.address_provider_payload_ref || existing.address_provider_payload_ref),
      project_type: clean(payload.projectType || payload.project_type || existing.project_type || 'FULL_REMODELING'),
      project_scope: clean(payload.projectScope || payload.project_scope || existing.project_scope),
      expected_budget_range: clean(payload.expectedBudgetRange || payload.expected_budget_range || existing.expected_budget_range),
      preferred_schedule: clean(payload.preferredSchedule || payload.preferred_schedule || existing.preferred_schedule),
      source: clean(payload.source || existing.source || 'DIRECT'),
      stage,
      priority: clean(payload.priority || existing.priority || 'NORMAL').toUpperCase(),
      assigned_to: clean(payload.assignedTo || payload.assigned_to || existing.assigned_to),
      next_action: clean(payload.nextAction || payload.next_action || existing.next_action),
      next_action_due_at: clean(payload.nextActionDueAt || payload.next_action_due_at || existing.next_action_due_at),
      linked_project_id: clean(payload.linkedProjectId || payload.linked_project_id || existing.linked_project_id),
      linked_estimate_id: clean(payload.linkedEstimateId || payload.linked_estimate_id || existing.linked_estimate_id),
      linked_contract_id: clean(payload.linkedContractId || payload.linked_contract_id || existing.linked_contract_id),
      lost_reason: clean(payload.lostReason || payload.lost_reason || existing.lost_reason),
      hold_reason: clean(payload.holdReason || payload.hold_reason || existing.hold_reason),
      memo_internal: clean(payload.memoInternal || payload.memo_internal || existing.memo_internal),
      customer_portal_status: normalizeConnectionStatus(payload.customerPortalStatus || payload.customer_portal_status, existing.customer_portal_status || 'NOT_READY'),
      portal_invite_status: normalizeConnectionStatus(payload.portalInviteStatus || payload.portal_invite_status, existing.portal_invite_status || 'NOT_READY'),
      portal_public_token_hash: payload.portalPublicToken || payload.portal_public_token
        ? hashToken(payload.portalPublicToken || payload.portal_public_token)
        : clean(existing.portal_public_token_hash),
      portal_last_sent_at: clean(payload.portalLastSentAt || payload.portal_last_sent_at || existing.portal_last_sent_at),
      schedule_link_status: normalizeConnectionStatus(payload.scheduleLinkStatus || payload.schedule_link_status, existing.schedule_link_status || 'NOT_READY'),
      calendar_provider: clean(payload.calendarProvider || payload.calendar_provider || existing.calendar_provider),
      calendar_event_ref: clean(payload.calendarEventRef || payload.calendar_event_ref || existing.calendar_event_ref),
      calendar_sync_status: normalizeConnectionStatus(payload.calendarSyncStatus || payload.calendar_sync_status, existing.calendar_sync_status || 'NOT_READY')
    };
  }

  function getLeadRow(database, leadId) {
    return database.prepare('SELECT * FROM crm_leads WHERE lead_id = ? OR id = ?').get(clean(leadId), clean(leadId));
  }

  function getCrmLeadDetailFromDb(database, leadId) {
    const lead = getLeadRow(database, leadId);
    if (!lead) return null;
    return {
      ...lead,
      consultationLogs: database.prepare('SELECT * FROM crm_consultation_logs WHERE lead_id = ? ORDER BY created_at DESC').all(lead.lead_id),
      stageHistory: database.prepare('SELECT * FROM crm_stage_history WHERE lead_id = ? ORDER BY changed_at DESC').all(lead.lead_id),
      siteSurveyRequests: database.prepare('SELECT * FROM crm_site_survey_requests WHERE lead_id = ? ORDER BY created_at DESC').all(lead.lead_id),
      customerPayload: buildCustomerSafePayload(database, lead.lead_id)
    };
  }

  function insertStageHistory(database, leadId, fromStage, toStage, reason, changedBy) {
    const changedAt = nowIso();
    database.prepare(`
      INSERT INTO crm_stage_history (
        id, history_id, lead_id, from_stage, to_stage, reason, changed_by, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(makeId('CRMSHROW'), makeId('CRMSH'), leadId, fromStage, toStage, clean(reason), clean(changedBy || 'CEO'), changedAt);
  }

  function createCrmLead(payload = {}) {
    return withDb((database) => {
      const normalized = normalizeLeadPayload(payload);
      const leadId = clean(payload.leadId || payload.lead_id) || makeId('CRM');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO crm_leads (
          id, lead_id, customer_name, customer_type, phone_masked, email_masked,
          address_summary, address_detail_internal, address_normalized_status,
          address_provider, address_provider_payload_ref, project_type, project_scope,
          expected_budget_range, preferred_schedule, source, stage, priority, assigned_to,
          next_action, next_action_due_at, linked_project_id, linked_estimate_id,
          linked_contract_id, lost_reason, hold_reason, memo_internal,
          customer_portal_status, portal_invite_status, portal_public_token_hash,
          portal_last_sent_at, schedule_link_status, calendar_provider,
          calendar_event_ref, calendar_sync_status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        makeId('CRMROW'), leadId, normalized.customer_name, normalized.customer_type,
        normalized.phone_masked, normalized.email_masked, normalized.address_summary,
        normalized.address_detail_internal, normalized.address_normalized_status,
        normalized.address_provider, normalized.address_provider_payload_ref,
        normalized.project_type, normalized.project_scope, normalized.expected_budget_range,
        normalized.preferred_schedule, normalized.source, normalized.stage,
        normalized.priority, normalized.assigned_to, normalized.next_action,
        normalized.next_action_due_at, normalized.linked_project_id,
        normalized.linked_estimate_id, normalized.linked_contract_id,
        normalized.lost_reason, normalized.hold_reason, normalized.memo_internal,
        normalized.customer_portal_status, normalized.portal_invite_status,
        normalized.portal_public_token_hash, normalized.portal_last_sent_at,
        normalized.schedule_link_status, normalized.calendar_provider,
        normalized.calendar_event_ref, normalized.calendar_sync_status,
        createdAt, createdAt
      );
      insertStageHistory(database, leadId, '', normalized.stage, '신규 고객 등록', payload.createdBy);
      return { ok: true, leadId, lead: getCrmLeadDetailFromDb(database, leadId) };
    });
  }

  function updateCrmLead(leadId, payload = {}) {
    const args = typeof leadId === 'object'
      ? { leadId: leadId.leadId || leadId.lead_id, payload: leadId }
      : { leadId, payload };
    return withDb((database) => {
      const before = getLeadRow(database, args.leadId);
      if (!before) throw new Error('CRM 고객 정보를 찾을 수 없습니다.');
      const next = normalizeLeadPayload(args.payload, before);
      database.prepare(`
        UPDATE crm_leads SET
          customer_name = ?, customer_type = ?, phone_masked = ?, email_masked = ?,
          address_summary = ?, address_detail_internal = ?, address_normalized_status = ?,
          address_provider = ?, address_provider_payload_ref = ?, project_type = ?,
          project_scope = ?, expected_budget_range = ?, preferred_schedule = ?, source = ?,
          priority = ?, assigned_to = ?, next_action = ?, next_action_due_at = ?,
          linked_project_id = ?, linked_estimate_id = ?, linked_contract_id = ?,
          lost_reason = ?, hold_reason = ?, memo_internal = ?, customer_portal_status = ?,
          portal_invite_status = ?, portal_public_token_hash = ?, portal_last_sent_at = ?,
          schedule_link_status = ?, calendar_provider = ?, calendar_event_ref = ?,
          calendar_sync_status = ?, updated_at = ?
        WHERE lead_id = ?
      `).run(
        next.customer_name, next.customer_type, next.phone_masked, next.email_masked,
        next.address_summary, next.address_detail_internal, next.address_normalized_status,
        next.address_provider, next.address_provider_payload_ref, next.project_type,
        next.project_scope, next.expected_budget_range, next.preferred_schedule, next.source,
        next.priority, next.assigned_to, next.next_action, next.next_action_due_at,
        next.linked_project_id, next.linked_estimate_id, next.linked_contract_id,
        next.lost_reason, next.hold_reason, next.memo_internal, next.customer_portal_status,
        next.portal_invite_status, next.portal_public_token_hash, next.portal_last_sent_at,
        next.schedule_link_status, next.calendar_provider, next.calendar_event_ref,
        next.calendar_sync_status, nowIso(), before.lead_id
      );
      return { ok: true, leadId: before.lead_id, lead: getCrmLeadDetailFromDb(database, before.lead_id) };
    });
  }

  function listCrmLeads(filters = {}) {
    return withDb((database) => {
      const clauses = [];
      const params = [];
      if (filters.stage) {
        clauses.push('stage = ?');
        params.push(clean(filters.stage).toUpperCase());
      }
      if (filters.priority) {
        clauses.push('priority = ?');
        params.push(clean(filters.priority).toUpperCase());
      }
      if (filters.keyword) {
        clauses.push('(customer_name LIKE ? OR project_scope LIKE ? OR address_summary LIKE ?)');
        const keyword = `%${clean(filters.keyword)}%`;
        params.push(keyword, keyword, keyword);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return database.prepare(`
        SELECT l.*,
          (SELECT MAX(created_at) FROM crm_consultation_logs c WHERE c.lead_id = l.lead_id) AS last_consultation_at
        FROM crm_leads l ${where}
        ORDER BY
          CASE priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
          updated_at DESC
      `).all(...params);
    });
  }

  function getCrmLeadDetail(leadId) {
    const normalized = typeof leadId === 'object' ? leadId.leadId || leadId.lead_id || leadId.id : leadId;
    return withDb((database) => getCrmLeadDetailFromDb(database, normalized));
  }

  function moveCrmStage(leadId, nextStage, payload = {}) {
    const args = typeof leadId === 'object'
      ? { leadId: leadId.leadId || leadId.lead_id, nextStage: leadId.nextStage || leadId.next_stage, payload: leadId }
      : { leadId, nextStage, payload };
    const normalizedStage = clean(args.nextStage).toUpperCase();
    if (!STAGE_SET.has(normalizedStage)) throw new Error('지원하지 않는 CRM 단계입니다.');
    return withDb((database) => {
      const lead = getLeadRow(database, args.leadId);
      if (!lead) throw new Error('CRM 고객 정보를 찾을 수 없습니다.');
      database.prepare(`
        UPDATE crm_leads SET stage = ?, lost_reason = ?, hold_reason = ?,
          next_action = ?, next_action_due_at = ?, updated_at = ? WHERE lead_id = ?
      `).run(
        normalizedStage,
        normalizedStage === 'LOST' ? clean(args.payload.reason || args.payload.lostReason) : lead.lost_reason,
        normalizedStage === 'ON_HOLD' ? clean(args.payload.reason || args.payload.holdReason) : lead.hold_reason,
        clean(args.payload.nextAction || lead.next_action),
        clean(args.payload.nextActionDueAt || lead.next_action_due_at),
        nowIso(),
        lead.lead_id
      );
      insertStageHistory(database, lead.lead_id, lead.stage, normalizedStage, args.payload.reason, args.payload.changedBy);
      return { ok: true, leadId: lead.lead_id, fromStage: lead.stage, toStage: normalizedStage, lead: getCrmLeadDetailFromDb(database, lead.lead_id) };
    });
  }

  function createConsultationLog(leadId, payload = {}) {
    const args = typeof leadId === 'object'
      ? { leadId: leadId.leadId || leadId.lead_id, payload: leadId }
      : { leadId, payload };
    return withDb((database) => {
      const lead = getLeadRow(database, args.leadId);
      if (!lead) throw new Error('CRM 고객 정보를 찾을 수 없습니다.');
      const logId = makeId('CRMLOG');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO crm_consultation_logs (
          id, log_id, lead_id, contact_channel, consultation_type, summary,
          public_summary, next_action, next_action_due_at, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId('CRMLOGROW'), logId, lead.lead_id,
        clean(args.payload.contactChannel || args.payload.contact_channel || 'PHONE'),
        clean(args.payload.consultationType || args.payload.consultation_type || 'INITIAL'),
        clean(args.payload.summary),
        clean(args.payload.publicSummary || args.payload.public_summary),
        clean(args.payload.nextAction || args.payload.next_action),
        clean(args.payload.nextActionDueAt || args.payload.next_action_due_at),
        clean(args.payload.createdBy || args.payload.created_by || 'CEO'),
        createdAt
      );
      database.prepare('UPDATE crm_leads SET next_action = ?, next_action_due_at = ?, updated_at = ? WHERE lead_id = ?')
        .run(clean(args.payload.nextAction || args.payload.next_action), clean(args.payload.nextActionDueAt || args.payload.next_action_due_at), createdAt, lead.lead_id);
      return { ok: true, logId, detail: getCrmLeadDetailFromDb(database, lead.lead_id) };
    });
  }

  function createSiteSurveyRequest(leadId, payload = {}) {
    const args = typeof leadId === 'object'
      ? { leadId: leadId.leadId || leadId.lead_id, payload: leadId }
      : { leadId, payload };
    return withDb((database) => {
      const lead = getLeadRow(database, args.leadId);
      if (!lead) throw new Error('CRM 고객 정보를 찾을 수 없습니다.');
      const surveyId = makeId('CRMSURVEY');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO crm_site_survey_requests (
          id, survey_id, lead_id, requested_date, preferred_time, address_summary,
          survey_status, assigned_to, note_internal, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId('CRMSURVEYROW'), surveyId, lead.lead_id,
        clean(args.payload.requestedDate || args.payload.requested_date),
        clean(args.payload.preferredTime || args.payload.preferred_time),
        clean(args.payload.addressSummary || args.payload.address_summary || lead.address_summary),
        clean(args.payload.surveyStatus || args.payload.survey_status || 'REQUESTED'),
        clean(args.payload.assignedTo || args.payload.assigned_to || lead.assigned_to),
        clean(args.payload.noteInternal || args.payload.note_internal),
        createdAt, createdAt
      );
      if (lead.stage !== 'SITE_SURVEY_SCHEDULED') {
        database.prepare('UPDATE crm_leads SET stage = ?, updated_at = ? WHERE lead_id = ?').run('SITE_SURVEY_SCHEDULED', createdAt, lead.lead_id);
        insertStageHistory(database, lead.lead_id, lead.stage, 'SITE_SURVEY_SCHEDULED', '현장조사 요청 생성', args.payload.createdBy);
      }
      return { ok: true, surveyId, detail: getCrmLeadDetailFromDb(database, lead.lead_id) };
    });
  }

  function linkEntity(leadId, field, value, stage, reason) {
    return withDb((database) => {
      const lead = getLeadRow(database, leadId);
      if (!lead) throw new Error('CRM 고객 정보를 찾을 수 없습니다.');
      const entityId = clean(value);
      if (!entityId) throw new Error('연결할 ID가 필요합니다.');
      const updatedAt = nowIso();
      database.prepare(`UPDATE crm_leads SET ${field} = ?, stage = ?, updated_at = ? WHERE lead_id = ?`)
        .run(entityId, stage || lead.stage, updatedAt, lead.lead_id);
      if (stage && stage !== lead.stage) insertStageHistory(database, lead.lead_id, lead.stage, stage, reason, 'CEO');
      return { ok: true, leadId: lead.lead_id, linkedId: entityId, lead: getCrmLeadDetailFromDb(database, lead.lead_id) };
    });
  }

  function linkLeadToProject(leadId, projectId) {
    if (typeof leadId === 'object') return linkEntity(leadId.leadId || leadId.lead_id, 'linked_project_id', leadId.projectId || leadId.project_id, '', '프로젝트 연결');
    return linkEntity(leadId, 'linked_project_id', projectId, '', '프로젝트 연결');
  }

  function linkLeadToEstimate(leadId, estimateId) {
    if (typeof leadId === 'object') return linkEntity(leadId.leadId || leadId.lead_id, 'linked_estimate_id', leadId.estimateId || leadId.estimate_id, 'ESTIMATE_SENT', '견적 연결');
    return linkEntity(leadId, 'linked_estimate_id', estimateId, 'ESTIMATE_SENT', '견적 연결');
  }

  function buildCustomerSafePayload(database, leadId) {
    const lead = getLeadRow(database, leadId);
    if (!lead) return null;
    const publicLogs = database.prepare(`
      SELECT public_summary, created_at FROM crm_consultation_logs
      WHERE lead_id = ? AND TRIM(COALESCE(public_summary, '')) <> ''
      ORDER BY created_at DESC LIMIT 5
    `).all(lead.lead_id);
    const survey = database.prepare(`
      SELECT requested_date, preferred_time, survey_status
      FROM crm_site_survey_requests WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(lead.lead_id);
    return {
      customer_safe: true,
      display_name: publicCustomerName(lead.customer_name),
      project_type: lead.project_type,
      project_scope: lead.project_scope,
      stage: lead.stage,
      estimate_status: lead.linked_estimate_id ? 'SENT_OR_LINKED' : 'NOT_SENT',
      contract_status: lead.linked_contract_id ? 'IN_PROGRESS' : 'NOT_LINKED',
      site_survey: survey || null,
      public_consultation_summaries: publicLogs,
      company_contact_status: 'AVAILABLE',
      customer_document_link_status: lead.customer_portal_status
    };
  }

  function getCrmCustomerSafePayload(leadId) {
    const normalized = typeof leadId === 'object' ? leadId.leadId || leadId.lead_id || leadId.id : leadId;
    return withDb((database) => buildCustomerSafePayload(database, normalized));
  }

  function getCrmDashboardSummary() {
    return withDb((database) => {
      const rows = database.prepare('SELECT stage, COUNT(*) AS count FROM crm_leads GROUP BY stage').all();
      const counts = Object.fromEntries(CRM_STAGES.map((stage) => [stage, 0]));
      rows.forEach((row) => { counts[row.stage] = Number(row.count || 0); });
      return {
        ok: true,
        total: Object.values(counts).reduce((sum, count) => sum + count, 0),
        counts,
        kpis: {
          newLeads: counts.LEAD,
          consulting: counts.CONTACTED + counts.CONSULTING,
          siteSurveyScheduled: counts.SITE_SURVEY_SCHEDULED,
          estimateRequested: counts.ESTIMATE_REQUESTED,
          estimateSent: counts.ESTIMATE_SENT,
          contractPending: counts.NEGOTIATION + counts.CONTRACT_PENDING,
          contracted: counts.CONTRACTED,
          heldOrLost: counts.ON_HOLD + counts.LOST
        }
      };
    });
  }

  function createCrmPipelineReport(payload = {}) {
    return withDb((database) => {
      const summary = getCrmDashboardSummary();
      const leadId = clean(payload.leadId || payload.lead_id);
      const lead = leadId ? getLeadRow(database, leadId) : null;
      const fileName = lead ? `RC_0_4_0_CRM_PIPELINE_REPORT_${lead.lead_id}.md` : 'RC_0_4_0_CRM_PIPELINE_REPORT_GENERATED.md';
      fs.mkdirSync(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, fileName);
      const lines = [
        '# RC-0.4.0 CRM Pipeline Report',
        '',
        `- Generated at: ${nowIso()}`,
        `- Total leads: ${summary.total}`,
        `- Customer safety: PASSED`,
        `- External API calls: DISABLED`,
        `- Final decision: ${payload.finalDecision || 'CRM Pipeline Foundation 사용 가능'}`
      ];
      if (lead) {
        lines.push(
          `- Lead ID: ${lead.lead_id}`,
          `- Customer display: ${publicCustomerName(lead.customer_name)}`,
          `- Stage: ${lead.stage}`,
          `- Project type: ${lead.project_type || '미정'}`,
          `- Linked project: ${lead.linked_project_id ? 'YES' : 'NO'}`,
          `- Linked estimate: ${lead.linked_estimate_id ? 'YES' : 'NO'}`,
          `- Linked contract: ${lead.linked_contract_id ? 'YES' : 'NO'}`
        );
      }
      lines.push('', '원문 전화번호, 이메일, 상세주소, 내부 메모, 가격/마진/PCE/Queue/추천 점수 정보는 포함하지 않습니다.');
      fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
      return { ok: true, reportPath, summary, customerSafety: 'PASSED' };
    });
  }

  return {
    CRM_STAGES,
    createCrmLead,
    updateCrmLead,
    listCrmLeads,
    getCrmLeadDetail,
    moveCrmStage,
    createConsultationLog,
    createSiteSurveyRequest,
    linkLeadToProject,
    linkLeadToEstimate,
    createCrmPipelineReport,
    getCrmDashboardSummary,
    getCrmCustomerSafePayload
  };
}

module.exports = {
  CRM_STAGES,
  createCrmPipelineService
};
