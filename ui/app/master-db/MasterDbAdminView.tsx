const adminModules = [
  {
    id: 'process_db',
    titleKo: '공정 DB',
    countKo: '2개 구조 준비',
    status: 'STRUCTURE_READY',
    missingKo: '실제 품수/공기 보정값 필요',
    actionKo: '변경 요청'
  },
  {
    id: 'material_db',
    titleKo: '자재 DB',
    countKo: '카탈로그 준비',
    status: 'NEEDS_RESEARCH',
    missingKo: '공급가, 규격, 발주 단위 필요',
    actionKo: 'Import Preview'
  },
  {
    id: 'accessory_db',
    titleKo: '부자재 DB',
    countKo: '조사 테이블 준비',
    status: 'NEEDS_RESEARCH',
    missingKo: '소모품/손실률/운반비 필요',
    actionKo: '변경 요청'
  },
  {
    id: 'brand_db',
    titleKo: '브랜드 DB',
    countKo: '욕실/타일/창호 구조 준비',
    status: 'UNKNOWN',
    missingKo: '모델명, A/S, 납기 검증 필요',
    actionKo: 'Excel Import'
  },
  {
    id: 'pricing_db',
    titleKo: '단가 DB',
    countKo: '3개 조사 테이블',
    status: 'NEEDS_RESEARCH',
    missingKo: 'official/market/supplier/internal 가격 필요',
    actionKo: '가격 조사'
  },
  {
    id: 'labor_db',
    titleKo: '인건비 DB',
    countKo: '품수 구조 준비',
    status: 'EMPTY',
    missingKo: '직종별 일당, 최소 품수 필요',
    actionKo: '템플릿 생성'
  },
  {
    id: 'vendor_db',
    titleKo: '거래처 DB',
    countKo: '12개 후보',
    status: 'NEEDS_RESEARCH',
    missingKo: '검증 전 후보, 공급가 미입력',
    actionKo: '검증 대기'
  },
  {
    id: 'risk_db',
    titleKo: '리스크/하자 DB',
    countKo: '진단 규칙 준비',
    status: 'PARTIAL',
    missingKo: '현장별 실제 하자 이력 필요',
    actionKo: 'Case 연결'
  }
];

const changeSteps = [
  '초안 입력',
  '변경 요청 생성',
  '대표 승인',
  'rollback snapshot 생성',
  'Master DB 반영',
  '변경 이력 저장'
];

const importRows = [
  { format: 'JSON', useKo: '스키마 기반 대량 입력', resultKo: 'Change Request 묶음 생성' },
  { format: 'Excel', useKo: '거래처/단가표 업로드', resultKo: 'Preview 후 대표 승인' },
  { format: 'CSV', useKo: '간단한 품목표 업로드', resultKo: '누락 필드 검증' },
  { format: 'Export', useKo: 'JSON / Excel / CSV', resultKo: '내부용/대표 검토용 분리' }
];

function statusClass(status: string) {
  if (status === 'EMPTY' || status === 'NEEDS_RESEARCH') return 'admin-status warning';
  if (status === 'UNKNOWN' || status === 'PARTIAL') return 'admin-status neutral';
  return 'admin-status verified';
}

export function MasterDbAdminView() {
  return (
    <div className="master-admin">
      <div className="admin-hero">
        <div>
          <span className="eyebrow">LIVING MASTER DB</span>
          <h3>실데이터 입력 전 관리 구조</h3>
          <p>
            실제 단가와 거래처가 없어도 시스템은 예비 견적으로 동작합니다.
            단, Master DB 반영은 항상 변경 요청과 대표 승인 후에만 가능합니다.
          </p>
        </div>
        <div className="admin-hero-state">
          <strong>예비 견적 모드</strong>
          <span>UNKNOWN / NEEDS_RESEARCH 유지</span>
        </div>
      </div>

      <div className="admin-grid">
        {adminModules.map((module) => (
          <article className="admin-module" key={module.id}>
            <div>
              <span className={statusClass(module.status)}>{module.status}</span>
              <h4>{module.titleKo}</h4>
              <strong>{module.countKo}</strong>
              <p>{module.missingKo}</p>
            </div>
            <button>{module.actionKo}</button>
          </article>
        ))}
      </div>

      <div className="admin-two-column">
        <section className="admin-panel">
          <span className="eyebrow">CHANGE CONTROL</span>
          <h4>직접 수정 금지 흐름</h4>
          <ol className="change-flow">
            {changeSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="admin-panel">
          <span className="eyebrow">IMPORT / EXPORT</span>
          <h4>입력과 출력 구조</h4>
          <div className="import-list">
            {importRows.map((row) => (
              <div key={row.format}>
                <strong>{row.format}</strong>
                <span>{row.useKo}</span>
                <em>{row.resultKo}</em>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <span className="eyebrow">APPROVAL REQUIRED QUEUE</span>
        <h4>대표 승인 전에는 Master DB가 바뀌지 않습니다</h4>
        <div className="approval-rule-strip">
          <span>단가 변경</span>
          <span>거래처 VERIFIED 전환</span>
          <span>브랜드 기본값 변경</span>
          <span>공정 defaultSpec 변경</span>
          <span>rollback 없는 변경 차단</span>
        </div>
      </section>
    </div>
  );
}
