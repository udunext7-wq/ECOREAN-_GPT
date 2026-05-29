'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_VERSION = 'RC-0.3.1';

const DEFAULT_ONBOARDING_STEPS = [
  { key: 'backup_full', name: '전체 백업 생성', expected: '운영 데이터 입력 전 전체 백업이 생성됩니다.' },
  { key: 'initial_master_status', name: '초기 기준 데이터 상태 확인', expected: '공정/자재/노무/표준 품목 기본값 상태를 확인합니다.' },
  { key: 'vendor_entry', name: '업체 정보 입력', expected: '실제 협력업체 기본 정보가 입력됩니다.' },
  { key: 'material_price_import', name: '자재 단가표 CSV 가져오기', expected: '자재 단가 CSV가 미리보기/매칭/차이율 분석까지 진행됩니다.' },
  { key: 'labor_rate_import', name: '노무 단가표 CSV 가져오기', expected: '노무 단가 CSV가 미리보기/매칭/차이율 분석까지 진행됩니다.' },
  { key: 'price_approval_apply', name: '단가 승인 및 Master Data 반영', expected: '승인된 단가가 백업 후 Master Data에 반영됩니다.' },
  { key: 'first_project_create', name: '첫 실제 프로젝트 생성', expected: '실제 고객/현장 기준 첫 프로젝트가 생성됩니다.' },
  { key: 'lightbim_import', name: 'LightBIM 도면 가져오기', expected: '첫 프로젝트에 LightBIM JSON 도면을 가져옵니다.' },
  { key: 'estimate_pce', name: '견적 계산 및 PCE 확인', expected: '견적 계산과 PCE 판정이 정상 실행됩니다.' },
  { key: 'output_check', name: '고객용 견적서 / 내부 원가표 출력', expected: '고객용 출력과 내부 원가표 출력이 분리됩니다.' },
  { key: 'customer_safety_check', name: '고객용 화면 내부정보 비노출 확인', expected: '고객 화면에서 내부 원가/마진/PCE/업체 정보가 노출되지 않습니다.' },
  { key: 'issue_backlog', name: '문제 기록 및 RC-0.3.1 수정 후보 정리', expected: '운영 중 발견한 문제를 심각도별로 기록합니다.' }
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function sanitizeText(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

function createOperationalOnboardingService({ sqliteService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.project) {
    throw new Error('sqliteService with project database path is required');
  }

  const dbPath = sqliteService.dbPaths.project;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function withDb(callback) {
    const database = new DatabaseSync(dbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS operational_onboarding_runs (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        run_name TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        result_note TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS operational_onboarding_steps (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_key TEXT NOT NULL,
        step_name TEXT NOT NULL,
        status TEXT NOT NULL,
        expected_result TEXT,
        actual_result TEXT,
        issue_severity TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(run_id, step_key)
      );

      CREATE TABLE IF NOT EXISTS operational_onboarding_issues (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT,
        severity TEXT NOT NULL,
        screen TEXT,
        description TEXT NOT NULL,
        reproduction_steps TEXT,
        decision TEXT,
        target_version TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  function rowToRun(database, runId) {
    const run = database.prepare('SELECT * FROM operational_onboarding_runs WHERE id = ?').get(runId);
    if (!run) return null;
    const steps = database.prepare('SELECT * FROM operational_onboarding_steps WHERE run_id = ? ORDER BY created_at, id').all(runId);
    const issues = database.prepare('SELECT * FROM operational_onboarding_issues WHERE run_id = ? ORDER BY created_at DESC').all(runId);
    return { ...run, steps, issues, summary: summarize(run, steps, issues) };
  }

  function summarize(run, steps, issues) {
    const count = (status) => steps.filter((step) => step.status === status).length;
    const openIssues = issues.filter((issue) => issue.status === 'OPEN');
    const s1s2Open = openIssues.filter((issue) => issue.severity === 'S1' || issue.severity === 'S2').length;
    const deferredLower = issues.filter((issue) => issue.status === 'DEFERRED' && (issue.severity === 'S3' || issue.severity === 'S4')).length;
    const failedOrBlocked = steps.filter((step) => step.status === 'FAILED' || step.status === 'BLOCKED').length;
    const completed = steps.length > 0 && count('PASSED') + count('SKIPPED') === steps.length && s1s2Open === 0;
    const decisionKo = s1s2Open > 0
      ? '수정 후 재검토'
      : failedOrBlocked > 0
        ? '조건부 운영 가능'
        : completed
          ? '운영 시작 가능'
          : '진행 중';

    return {
      runId: run.id,
      status: run.status,
      totalSteps: steps.length,
      notStartedCount: count('NOT_STARTED'),
      passedCount: count('PASSED'),
      failedCount: count('FAILED'),
      skippedCount: count('SKIPPED'),
      blockedCount: count('BLOCKED'),
      issueCount: issues.length,
      openIssueCount: openIssues.length,
      s1OpenCount: openIssues.filter((issue) => issue.severity === 'S1').length,
      s2OpenCount: openIssues.filter((issue) => issue.severity === 'S2').length,
      deferredLowerIssueCount: deferredLower,
      decisionKo
    };
  }

  function createOperationalOnboardingRun(version = DEFAULT_VERSION, runName = '전체 운영 데이터 입력') {
    const normalizedVersion = typeof version === 'object' ? (version.version || DEFAULT_VERSION) : version;
    const normalizedRunName = typeof version === 'object' ? (version.runName || version.run_name || runName) : runName;
    return withDb((database) => {
      const runId = makeId('OOR');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO operational_onboarding_runs (
          id, version, run_name, status, started_at, completed_at, result_note, created_at
        ) VALUES (?, ?, ?, 'IN_PROGRESS', ?, NULL, '', ?)
      `).run(runId, normalizedVersion || DEFAULT_VERSION, normalizedRunName || '전체 운영 데이터 입력', createdAt, createdAt);

      DEFAULT_ONBOARDING_STEPS.forEach((step, index) => {
        database.prepare(`
          INSERT INTO operational_onboarding_steps (
            id, run_id, step_key, step_name, status, expected_result,
            actual_result, issue_severity, note, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'NOT_STARTED', ?, '', '', '', ?, ?)
        `).run(
          makeId(`OOS${String(index + 1).padStart(2, '0')}`),
          runId,
          step.key,
          step.name,
          step.expected,
          createdAt,
          createdAt
        );
      });

      return rowToRun(database, runId);
    });
  }

  function getOperationalOnboardingRuns() {
    return withDb((database) => database.prepare('SELECT * FROM operational_onboarding_runs ORDER BY created_at DESC LIMIT 100').all());
  }

  function getOperationalOnboardingRun(runId) {
    const normalizedRunId = typeof runId === 'object' ? runId.runId || runId.id : runId;
    return withDb((database) => rowToRun(database, normalizedRunId));
  }

  function updateOperationalOnboardingStep(runId, stepKey, status, payload = {}) {
    const normalized = typeof runId === 'object'
      ? { runId: runId.runId, stepKey: runId.stepKey, status: runId.status, payload: runId.payload || runId }
      : { runId, stepKey, status, payload };
    return withDb((database) => {
      const existing = database.prepare('SELECT * FROM operational_onboarding_steps WHERE run_id = ? AND step_key = ?').get(normalized.runId, normalized.stepKey);
      if (!existing) throw new Error('온보딩 단계를 찾을 수 없습니다.');
      const body = normalized.payload || {};
      database.prepare(`
        UPDATE operational_onboarding_steps
        SET status = ?,
            actual_result = COALESCE(NULLIF(?, ''), actual_result),
            issue_severity = COALESCE(NULLIF(?, ''), issue_severity),
            note = COALESCE(NULLIF(?, ''), note),
            updated_at = ?
        WHERE run_id = ? AND step_key = ?
      `).run(
        normalized.status || 'NOT_STARTED',
        sanitizeText(body.actualResult || body.actual_result),
        sanitizeText(body.issueSeverity || body.issue_severity),
        sanitizeText(body.note),
        nowIso(),
        normalized.runId,
        normalized.stepKey
      );
      return rowToRun(database, normalized.runId);
    });
  }

  function createOperationalOnboardingIssue(runId, stepKey, payload = {}) {
    const normalized = typeof runId === 'object'
      ? { runId: runId.runId, stepKey: runId.stepKey, payload: runId.payload || runId }
      : { runId, stepKey, payload };
    return withDb((database) => {
      const body = normalized.payload || {};
      const step = database.prepare('SELECT * FROM operational_onboarding_steps WHERE run_id = ? AND step_key = ?').get(normalized.runId, normalized.stepKey);
      const issueId = makeId('OOI');
      const severity = body.severity || body.issueSeverity || 'S3';
      const status = body.status || (severity === 'S3' || severity === 'S4' ? 'OPEN' : 'OPEN');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO operational_onboarding_issues (
          id, run_id, step_id, severity, screen, description, reproduction_steps,
          decision, target_version, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        issueId,
        normalized.runId,
        step?.id || '',
        severity,
        sanitizeText(body.screen),
        sanitizeText(body.description || '운영 데이터 입력 중 확인 필요'),
        sanitizeText(body.reproductionSteps || body.reproduction_steps),
        sanitizeText(body.decision || '검토 필요'),
        sanitizeText(body.targetVersion || body.target_version || 'RC-0.3.1'),
        status,
        createdAt,
        createdAt
      );
      if (step) {
        database.prepare(`
          UPDATE operational_onboarding_steps
          SET issue_severity = ?, note = COALESCE(NULLIF(?, ''), note), updated_at = ?
          WHERE id = ?
        `).run(severity, sanitizeText(body.note), createdAt, step.id);
      }
      return { issueId, run: rowToRun(database, normalized.runId) };
    });
  }

  function getOperationalOnboardingSummary(runId) {
    return withDb((database) => {
      const run = rowToRun(database, typeof runId === 'object' ? runId.runId || runId.id : runId);
      return run?.summary || null;
    });
  }

  function completeOperationalOnboardingRun(runId) {
    const normalizedRunId = typeof runId === 'object' ? runId.runId || runId.id : runId;
    return withDb((database) => {
      const run = rowToRun(database, normalizedRunId);
      if (!run) throw new Error('온보딩 실행 이력을 찾을 수 없습니다.');
      const criticalOpen = run.issues.filter((issue) => issue.status === 'OPEN' && (issue.severity === 'S1' || issue.severity === 'S2'));
      const blockingSteps = run.steps.filter((step) => step.status === 'FAILED' || step.status === 'BLOCKED');
      if (criticalOpen.length > 0) {
        return { ok: false, decisionKo: '수정 후 재검토', messageKo: 'S1/S2 이슈가 남아 있어 운영 시작 가능으로 완료할 수 없습니다.', summary: run.summary };
      }
      if (blockingSteps.length > 0) {
        return { ok: false, decisionKo: '조건부 운영 가능', messageKo: '실패 또는 차단 단계가 남아 있습니다. 해결하거나 이슈로 정리하세요.', summary: run.summary };
      }
      const completedAt = nowIso();
      database.prepare(`
        UPDATE operational_onboarding_runs
        SET status = 'COMPLETED', completed_at = ?, result_note = ?
        WHERE id = ?
      `).run(completedAt, '운영 시작 가능', normalizedRunId);
      return { ok: true, decisionKo: '운영 시작 가능', run: rowToRun(database, normalizedRunId) };
    });
  }

  function generateOperationalOnboardingReport(runId) {
    const normalizedRunId = typeof runId === 'object' ? runId.runId || runId.id : runId;
    const run = getOperationalOnboardingRun(normalizedRunId);
    if (!run) throw new Error('온보딩 실행 이력을 찾을 수 없습니다.');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `RC_0_3_1_OPERATIONAL_ONBOARDING_REPORT_${normalizedRunId}.md`);
    const lines = [
      '# RC-0.3.1 운영 데이터 입력 리포트',
      '',
      `- 실행 ID: ${run.id}`,
      `- 버전: ${run.version}`,
      `- 실행명: ${run.run_name}`,
      `- 상태: ${run.status}`,
      `- 최종 판정: ${run.summary.decisionKo}`,
      '',
      '## 단계 결과',
      '',
      '| 단계 | 상태 | 실제 결과 | 비고 |',
      '| --- | --- | --- | --- |',
      ...run.steps.map((step) => `| ${step.step_name} | ${step.status} | ${step.actual_result || '-'} | ${step.note || '-'} |`),
      '',
      '## 이슈',
      '',
      run.issues.length === 0
        ? '기록된 이슈가 없습니다.'
        : '| 심각도 | 화면 | 설명 | 상태 |\n| --- | --- | --- | --- |\n' + run.issues.map((issue) => `| ${issue.severity} | ${issue.screen || '-'} | ${issue.description} | ${issue.status} |`).join('\n'),
      '',
      '고객 화면에는 온보딩 이슈 상세, 내부 원가, 마진, PCE, 백업 경로를 표시하지 않습니다.'
    ];
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    return { runId: normalizedRunId, reportPath, summary: run.summary };
  }

  return {
    defaultSteps: DEFAULT_ONBOARDING_STEPS,
    createOperationalOnboardingRun,
    getOperationalOnboardingRuns,
    getOperationalOnboardingRun,
    updateOperationalOnboardingStep,
    createOperationalOnboardingIssue,
    getOperationalOnboardingSummary,
    completeOperationalOnboardingRun,
    generateOperationalOnboardingReport
  };
}

module.exports = {
  DEFAULT_ONBOARDING_STEPS,
  createOperationalOnboardingService
};
