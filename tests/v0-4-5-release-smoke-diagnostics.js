const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');
const { healthCheck: comfyUiHealthCheck } = require('../electron/services/visualizationProviders/comfyuiProvider');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const QA_OUTPUT_DIR = path.join(PROJECT_ROOT, 'qa-output', 'v0.4.5');
const SUMMARY_PATH = path.join(QA_OUTPUT_DIR, 'release-smoke-summary.json');

const releaseChecks = [
  { label: '욕실 견적 생성', script: 'bathroom-estimate-wizard.smoke.js' },
  { label: '주방 견적 생성', script: 'kitchen-estimate-wizard.smoke.js' },
  { label: '전체 리모델링 견적 생성', script: 'full-remodeling-estimate-wizard.smoke.js' },
  { label: 'LightBIM E2E 검증', script: 'lightbim-e2e-validation.smoke.js' },
  { label: 'MiniCAD 실제 LightBIM 내보내기', script: 'export-real-minicad-lightbim.smoke.js' },
  { label: 'MiniCAD 실제 LightBIM BOC 가져오기', script: 'lightbim-real-minicad-import.smoke.js' },
  { label: 'LightBIM 수량 정확도', script: 'lightbim-quantity-accuracy.smoke.js' },
  { label: 'LightBIM 수량 견적 바인딩', script: 'lightbim-quantity-binding.smoke.js' },
  { label: 'LightBIM 수량 검토/수정', script: 'lightbim-quantity-review.smoke.js' },
  { label: 'LightBIM 공정표/발주 수량 연결', script: 'lightbim-schedule-purchase-binding.smoke.js' },
  { label: 'LightBIM 실행 피드백', script: 'lightbim-execution-feedback.smoke.js' },
  { label: 'LightBIM 시각 추적', script: 'lightbim-traceability.smoke.js' },
  { label: 'LightBIM 공간 맵', script: 'lightbim-interactive-space-map.smoke.js' },
  { label: 'LightBIM 고객 제안 맵', script: 'lightbim-customer-proposal-map.smoke.js' },
  { label: 'LightBIM 제안 보드 통합', script: 'lightbim-proposal-board-integration.smoke.js' },
  { label: 'LightBIM BOC 릴리스 흐름', script: 'lightbim-boc-release-flow.smoke.js' },
  { label: 'LightBIM 고객 안전 회귀', script: 'lightbim-customer-safety-regression.smoke.js' },
  { label: 'RC-0.3.0 사용자 테스트 패키지', script: 'rc-0-3-0-user-test-package.smoke.js' },
  { label: '견적 출력', script: 'estimate-export.smoke.js' },
  { label: '계약서 생성', script: 'contract-generation.smoke.js' },
  { label: '공정표 생성', script: 'schedule-generation.smoke.js' },
  { label: '발주서 생성', script: 'purchase-order.smoke.js' },
  { label: '공사일보 생성', script: 'daily-site-report.smoke.js' },
  { label: '현장 모바일 운영', script: 'field-mobile-operations.smoke.js' },
  { label: '고객 포털', script: 'client-portal.smoke.js' },
  { label: '경영 분석 센터', script: 'analytics-business-intelligence.smoke.js' },
  { label: 'AI 운영 자동화', script: 'ai-agent-automation.smoke.js' },
  { label: '결제/현금흐름', script: 'payment-cashflow.smoke.js' },
  { label: '프로젝트 마감', script: 'project-profit-closing.smoke.js', timeoutMs: 60000, reason: 'Measured standalone duration is about 31s on Windows/Node 24.' },
  { label: '실제 프로젝트 보정', script: 'project-calibration.smoke.js' },
  { label: '협력업체 단가 지능화', script: 'vendor-price-intelligence.smoke.js' },
  { label: '기준 데이터 관리', script: 'master-data-management.smoke.js' },
  { label: '초기 기준 데이터 세팅', script: 'initial-master-data-setup.smoke.js' },
  { label: '실제 단가 보정', script: 'real-price-calibration.smoke.js' },
  { label: '단가표 일괄 가져오기', script: 'price-workbook-import.smoke.js' },
  { label: '단가표 수동 매칭 UX', script: 'price-import-manual-matching.smoke.js' },
  { label: '실제 단가표 가져오기 사용자 테스트', script: 'real-price-import-user-test.smoke.js' },
  { label: 'RC-0.3.1 운영 데이터 입력', script: 'operational-data-onboarding.smoke.js' },
  { label: 'RC-0.3.1 첫 운영 데이터 입력 테스트', script: 'rc-0-3-1-first-operational-onboarding.smoke.js' },
  { label: 'RC-0.3.1 브랜치 안정화', script: 'rc-0-3-1-branch-stabilization.smoke.js' },
  { label: 'RC-0.3.2 실제 프로젝트 접수', script: 'real-project-intake.smoke.js' },
  { label: 'RC-0.3.2 첫 실제 프로젝트 접수 테스트', script: 'rc-0-3-2-first-real-project-intake.smoke.js' },
  { label: 'RC-0.3.2 브랜치 안정화', script: 'rc-0-3-2-branch-stabilization.smoke.js' },
  { label: '프랜차이즈 복제', script: 'franchise-replication.smoke.js' },
  { label: 'AI 투시도 프롬프트', script: 'ai-visualization-generation.smoke.js' },
  { label: '디자인 보드', script: 'board-generation.smoke.js' },
  { label: '비어 있는 화면 상태', script: 'floorplan-isometric-layer.smoke.js' }
];

function nowIso() {
  return new Date().toISOString();
}

function ensureQaDir() {
  fs.mkdirSync(QA_OUTPUT_DIR, { recursive: true });
}

function tail(text, maxLength = 2400) {
  const value = String(text || '');
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
}

function knownWarningsFrom(stdout, stderr) {
  const combined = `${stdout || ''}\n${stderr || ''}`;
  const warnings = [];
  if (combined.includes('ExperimentalWarning: SQLite')) warnings.push('SQLite experimental API warning');
  if (combined.includes('DEP0190')) warnings.push('Node DEP0190 warning');
  if (combined.includes('npm notice')) warnings.push('npm update notice');
  return [...new Set(warnings)];
}

function getRemainingProcesses() {
  if (process.platform !== 'win32') return [];
  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    "Get-Process | Where-Object { $_.ProcessName -like '*ECOREAN*' -or $_.ProcessName -like '*electron*' } | Select-Object ProcessName,Id,MainWindowTitle | ConvertTo-Json -Compress"
  ], { encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0 || !result.stdout.trim()) return [];
  try {
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_error) {
    return [{ parse_error: tail(result.stdout, 500) }];
  }
}

function runSmokeScript(check, defaultTimeoutMs) {
  const timeoutMs = Number(check.timeoutMs || defaultTimeoutMs);
  const startedAt = Date.now();
  const scriptPath = path.join(__dirname, check.script);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 8,
    env: {
      ...process.env,
      BOC_RELEASE_DIAGNOSTIC_CHILD: '1'
    }
  });
  const completedAt = Date.now();
  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');
  const exitCode = typeof result.status === 'number' ? result.status : null;
  const signal = result.signal || null;
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  return {
    label: check.label,
    script: check.script,
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date(completedAt).toISOString(),
    duration_ms: completedAt - startedAt,
    status: timedOut ? 'TIMEOUT' : exitCode === 0 ? 'PASSED' : 'FAILED',
    exit_code: exitCode,
    signal,
    timed_out: timedOut,
    timeout_ms: timeoutMs,
    timeout_reason: check.reason || null,
    stdout_tail: tail(stdout),
    stderr_tail: tail(stderr),
    known_warnings: knownWarningsFrom(stdout, stderr),
    error: result.error ? String(result.error.message || result.error) : null
  };
}

function createReleaseService(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => root
    }
  });
}

async function runDirectChecks() {
  const startedAt = Date.now();
  const results = [];
  try {
    const service = createReleaseService('boc-release-direct');
    const tower = service.getCeoControlTowerData();
    results.push({
      label: 'CEO Control Tower',
      script: 'direct-service-check',
      status: Array.isArray(tower.decisions) && Array.isArray(tower.redAlerts) && tower.cashflow ? 'PASSED' : 'FAILED',
      duration_ms: Date.now() - startedAt,
      error: null
    });

    const emptyBoard = service.getBoardGenerationCenterData({ projectId: 'NO-DATA' });
    results.push({
      label: '비어 있는 보드 상태',
      script: 'direct-empty-state-check',
      status: emptyBoard.emptyState === true ? 'PASSED' : 'FAILED',
      duration_ms: Date.now() - startedAt,
      error: emptyBoard.emptyState === true ? null : 'Board empty state was not returned'
    });
  } catch (error) {
    results.push({
      label: '직접 서비스 검사',
      script: 'direct-service-check',
      status: 'FAILED',
      duration_ms: Date.now() - startedAt,
      error: error && error.stack ? error.stack : String(error)
    });
  }

  const comfyStartedAt = Date.now();
  try {
    const comfyHealth = await comfyUiHealthCheck({ host: '127.0.0.1', port: 18188, timeoutMs: 100 });
    results.push({
      label: 'ComfyUI 오프라인 안전 처리',
      script: 'direct-comfyui-health-check',
      status: comfyHealth.ok === false && String(comfyHealth.errorMessage || comfyHealth.messageKo || '').includes('ComfyUI') ? 'PASSED' : 'FAILED',
      duration_ms: Date.now() - comfyStartedAt,
      error: comfyHealth.ok === false ? null : 'ComfyUI offline check did not return safe unavailable status'
    });
  } catch (error) {
    results.push({
      label: 'ComfyUI 오프라인 안전 처리',
      script: 'direct-comfyui-health-check',
      status: 'FAILED',
      duration_ms: Date.now() - comfyStartedAt,
      error: error && error.stack ? error.stack : String(error)
    });
  }
  return results;
}

async function runReleaseSmokeDiagnostics(options = {}) {
  const {
    perTestTimeoutMs = 30000,
    writeSummary = true,
    failFast = false
  } = options;
  const startedAt = Date.now();
  const tests = [];

  ensureQaDir();

  for (const check of releaseChecks) {
    const result = runSmokeScript(check, perTestTimeoutMs);
    tests.push(result);
    if (failFast && result.status !== 'PASSED') break;
  }

  const directChecks = await runDirectChecks();
  tests.push(...directChecks.map((check) => ({
    ...check,
    started_at: nowIso(),
    completed_at: nowIso(),
    exit_code: check.status === 'PASSED' ? 0 : 1,
    signal: null,
    timed_out: false,
    stdout_tail: '',
    stderr_tail: '',
    known_warnings: []
  })));

  const completedAt = Date.now();
  const timedOutTests = tests.filter((test) => test.timed_out).map((test) => test.script);
  const failedTests = tests.filter((test) => test.status !== 'PASSED' && !test.timed_out).map((test) => test.script);
  const allWarnings = [...new Set(tests.flatMap((test) => test.known_warnings || []))];
  const remainingProcesses = getRemainingProcesses();
  const summary = {
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date(completedAt).toISOString(),
    total_duration_ms: completedAt - startedAt,
    result: timedOutTests.length || failedTests.length ? 'FAILED' : 'PASSED',
    per_test_timeout_ms: perTestTimeoutMs,
    tests,
    timed_out_tests: timedOutTests,
    failed_tests: failedTests,
    slowest_tests: [...tests].sort((a, b) => Number(b.duration_ms || 0) - Number(a.duration_ms || 0)).slice(0, 8).map((test) => ({
      label: test.label,
      script: test.script,
      duration_ms: test.duration_ms,
      status: test.status
    })),
    remaining_processes: remainingProcesses,
    known_warnings: allWarnings,
    summary_path: SUMMARY_PATH
  };

  if (writeSummary) {
    fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  return summary;
}

async function main() {
  const summary = await runReleaseSmokeDiagnostics({
    perTestTimeoutMs: Number(process.env.BOC_RELEASE_SMOKE_TIMEOUT_MS || 30000),
    writeSummary: true,
    failFast: false
  });
  console.log(JSON.stringify({
    ok: summary.result === 'PASSED',
    test: 'v0-4-5-release-smoke-diagnostics',
    result: summary.result,
    total_duration_ms: summary.total_duration_ms,
    timed_out_tests: summary.timed_out_tests,
    failed_tests: summary.failed_tests,
    slowest_tests: summary.slowest_tests,
    remaining_processes: summary.remaining_processes,
    summary_path: summary.summary_path
  }, null, 2));
  assert.strictEqual(summary.result, 'PASSED', 'release smoke diagnostics should pass');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  releaseChecks,
  runReleaseSmokeDiagnostics
};
