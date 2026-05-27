const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createSqliteService } = require('../electron/services/sqliteService');
const { healthCheck: comfyUiHealthCheck } = require('../electron/services/visualizationProviders/comfyuiProvider');

const releaseChecks = [
  {
    label: '욕실 견적 생성',
    script: 'bathroom-estimate-wizard.smoke.js'
  },
  {
    label: '주방 견적 생성',
    script: 'kitchen-estimate-wizard.smoke.js'
  },
  {
    label: '전체 리모델링 견적 생성',
    script: 'full-remodeling-estimate-wizard.smoke.js'
  },
  {
    label: 'LightBIM E2E 검증',
    script: 'lightbim-e2e-validation.smoke.js'
  },
  {
    label: 'MiniCAD 실제 LightBIM 내보내기',
    script: 'export-real-minicad-lightbim.smoke.js'
  },
  {
    label: 'MiniCAD 실제 LightBIM BOC 가져오기',
    script: 'lightbim-real-minicad-import.smoke.js'
  },
  {
    label: 'LightBIM 수량 정확도',
    script: 'lightbim-quantity-accuracy.smoke.js'
  },
  {
    label: 'LightBIM 수량 견적 바인딩',
    script: 'lightbim-quantity-binding.smoke.js'
  },
  {
    label: 'LightBIM 수량 검토/수정',
    script: 'lightbim-quantity-review.smoke.js'
  },
  {
    label: 'LightBIM 공정표/발주 수량 연결',
    script: 'lightbim-schedule-purchase-binding.smoke.js'
  },
  {
    label: 'LightBIM 실행 피드백',
    script: 'lightbim-execution-feedback.smoke.js'
  },
  {
    label: 'LightBIM 시각 추적',
    script: 'lightbim-traceability.smoke.js'
  },
  {
    label: '견적 출력',
    script: 'estimate-export.smoke.js'
  },
  {
    label: '계약서 생성',
    script: 'contract-generation.smoke.js'
  },
  {
    label: '공정표 생성',
    script: 'schedule-generation.smoke.js'
  },
  {
    label: '발주서 생성',
    script: 'purchase-order.smoke.js'
  },
  {
    label: '공사일보 생성',
    script: 'daily-site-report.smoke.js'
  },
  {
    label: '현장 모바일 운영',
    script: 'field-mobile-operations.smoke.js'
  },
  {
    label: '고객 포털',
    script: 'client-portal.smoke.js'
  },
  {
    label: '경영 분석 센터',
    script: 'analytics-business-intelligence.smoke.js'
  },
  {
    label: 'AI 운영 자동화',
    script: 'ai-agent-automation.smoke.js'
  },
  {
    label: '결제/현금흐름',
    script: 'payment-cashflow.smoke.js'
  },
  {
    label: '프로젝트 마감',
    script: 'project-profit-closing.smoke.js'
  },
  {
    label: '실제 프로젝트 보정',
    script: 'project-calibration.smoke.js'
  },
  {
    label: '협력업체 단가 지능화',
    script: 'vendor-price-intelligence.smoke.js'
  },
  {
    label: '기준 데이터 관리',
    script: 'master-data-management.smoke.js'
  },
  {
    label: '프랜차이즈 복제',
    script: 'franchise-replication.smoke.js'
  },
  {
    label: 'AI 투시도 프롬프트',
    script: 'ai-visualization-generation.smoke.js'
  },
  {
    label: '디자인 보드',
    script: 'board-generation.smoke.js'
  },
  {
    label: '비어 있는 화면 상태',
    script: 'floorplan-isometric-layer.smoke.js'
  }
];

function createReleaseService(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => root
    }
  });
}

async function run() {
const results = releaseChecks.map((check) => {
  const scriptPath = path.join(__dirname, check.script);
  try {
    delete require.cache[require.resolve(scriptPath)];
    require(scriptPath);
    return {
      label: check.label,
      script: check.script,
      status: 0,
      error: null
    };
  } catch (error) {
    return {
      label: check.label,
      script: check.script,
      status: 1,
      error: error && error.stack ? error.stack : String(error)
    };
  }
});

const service = createReleaseService('boc-release-direct');
const tower = service.getCeoControlTowerData();
results.push({
  label: 'CEO Control Tower',
  script: 'direct-service-check',
  status: Array.isArray(tower.decisions) && Array.isArray(tower.redAlerts) && tower.cashflow ? 0 : 1,
  error: null
});

const emptyBoard = service.getBoardGenerationCenterData({ projectId: 'NO-DATA' });
results.push({
  label: '비어 있는 보드 상태',
  script: 'direct-empty-state-check',
  status: emptyBoard.emptyState === true ? 0 : 1,
  error: emptyBoard.emptyState === true ? null : 'Board empty state was not returned'
});

const comfyHealth = await comfyUiHealthCheck({ host: '127.0.0.1', port: 18188, timeoutMs: 100 });
results.push({
  label: 'ComfyUI 오프라인 안전 처리',
  script: 'direct-comfyui-health-check',
  status: comfyHealth.ok === false && String(comfyHealth.errorMessage || comfyHealth.messageKo || '').includes('ComfyUI') ? 0 : 1,
  error: comfyHealth.ok === false ? null : 'ComfyUI offline check did not return safe unavailable status'
});

const failed = results.filter((result) => result.status !== 0 || result.error);

if (failed.length > 0) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
}

assert.strictEqual(failed.length, 0, 'release candidate smoke checks should pass');

console.log(JSON.stringify({
  ok: true,
  test: 'release-candidate.smoke',
  checks: results.map(({ label, script }) => ({ label, script }))
}, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
