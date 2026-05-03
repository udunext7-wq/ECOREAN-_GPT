import { useEffect, useMemo, useState } from 'react';
import {
  type CostCaptureDashboardData,
  type CostRequirement,
  formatRate,
  formatWon,
  getCostCaptureDashboard,
  saveActualCostEntry
} from '../../services/cost-capture-service/costCaptureService';

const statusLabel: Record<string, string> = {
  MISSING_CRITICAL: '핵심 원가 미입력',
  NEEDS_RESEARCH: '조사 필요',
  CAPTURED: '입력 완료',
  WAIVED_BY_APPROVAL: '대표 승인 예외'
};

function requirementTone(requirement: CostRequirement) {
  if (requirement.status === 'CAPTURED') return 'GREEN';
  return requirement.blockingLevel;
}

function marginTone(alertLevel?: string) {
  if (alertLevel === 'RED') return 'danger-cell';
  if (alertLevel === 'YELLOW') return 'warning-cell';
  return '';
}

export function CostCaptureDashboard() {
  const [data, setData] = useState<CostCaptureDashboardData | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [vendorNameKo, setVendorNameKo] = useState<string>('');
  const [messageKo, setMessageKo] = useState<string>('');

  async function refresh() {
    setData(await getCostCaptureDashboard());
  }

  useEffect(() => {
    refresh();
  }, []);

  const activeStatus = data?.topKpis[0];
  const liveMargin = activeStatus?.liveMargin;
  const selectedRequirement = useMemo(
    () => data?.requirements.find((item) => item.requirementId === selectedRequirementId),
    [data, selectedRequirementId]
  );

  async function handleSaveActualCost() {
    if (!selectedRequirement) {
      setMessageKo('먼저 원가 항목을 선택해야 합니다.');
      return;
    }

    await saveActualCostEntry({
      requirementId: selectedRequirement.requirementId,
      amount: Number(amount),
      quantity: 1,
      unit: 'EA',
      vendorNameKo,
      capturedBy: 'CEO',
      sourceDocumentKo: '현장 입력',
      notesKo: 'Actual Cost Capture V2 입력'
    });
    setMessageKo(`${selectedRequirement.itemNameKo} 실제 원가가 저장되었습니다. 실시간 마진이 재계산되었습니다.`);
    setAmount('');
    setVendorNameKo('');
    setSelectedRequirementId('');
    await refresh();
  }

  if (!data) {
    return <div className="drawer-block">Actual Cost Capture Dashboard 로딩 중...</div>;
  }

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">ACTUAL MONEY CONTROL</span>
          <h2>Actual Cost Capture System V2</h2>
          <p>공정 진행 중 실제 원가를 입력할 때마다 현재 예상 마진율과 Cost Leak을 즉시 재계산합니다.</p>
        </div>
        <strong className={activeStatus?.completionBlocked ? 'red-kpi' : 'green-kpi'}>
          {activeStatus?.completionBlocked ? 'COMPLETION 차단' : '완료 가능'}
        </strong>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div>
          <span>최종 매출</span>
          <strong>{formatWon(activeStatus?.revenue ?? 0)}</strong>
        </div>
        <div>
          <span>누적 실제 원가</span>
          <strong>{formatWon(activeStatus?.capturedCost ?? 0)}</strong>
        </div>
        <div>
          <span>예상 잔여 원가</span>
          <strong>{formatWon(liveMargin?.estimatedRemainingCost ?? 0)}</strong>
        </div>
        <div className={marginTone(liveMargin?.alertLevel)}>
          <span>현재 예상 마진율</span>
          <strong>{formatRate(liveMargin?.currentForecastMarginRate ?? 0)}</strong>
        </div>
        <div>
          <span>최초 견적 마진율</span>
          <strong>{formatRate(liveMargin?.initialEstimatedMarginRate ?? 0)}</strong>
        </div>
        <div className={marginTone(liveMargin?.alertLevel)}>
          <span>마진 하락폭</span>
          <strong>{formatRate(liveMargin?.marginDropRate ?? 0)}p</strong>
        </div>
        <div>
          <span>현재 예상 마진</span>
          <strong>{formatWon(liveMargin?.currentForecastMargin ?? activeStatus?.forecastMargin ?? 0)}</strong>
        </div>
        <div className={(activeStatus?.missingCriticalCount ?? 0) > 0 ? 'danger-cell' : ''}>
          <span>핵심 누락</span>
          <strong>{activeStatus?.missingCriticalCount ?? 0}건</strong>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">VENDOR PRICE</span>
            <h3>실제 공급가 연결 상태</h3>
          </div>
        </div>
        <div className="cost-kpi-grid live-margin-grid">
          <div>
            <span>상태</span>
            <strong>{data.vendorPriceSummary?.displayKo ?? '실제 공급가 입력 대기'}</strong>
          </div>
          <div>
            <span>VERIFIED 단가</span>
            <strong>{data.vendorPriceSummary?.verifiedCatalogCount ?? 0}개</strong>
          </div>
          <div>
            <span>조사 필요</span>
            <strong>{data.vendorPriceSummary?.needsResearchCatalogCount ?? 0}개</strong>
          </div>
          <div>
            <span>실제 입력 이력</span>
            <strong>{data.vendorPriceSummary?.historyCount ?? 0}건</strong>
          </div>
          <div>
            <span>Learning 후보</span>
            <strong>{data.vendorPriceSummary?.learningCandidateCount ?? 0}건</strong>
          </div>
        </div>
        <p className="small-note">{data.vendorPriceSummary?.warningKo}</p>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">REQUIRED INPUT</span>
            <h3>공정별 실제 원가 입력</h3>
          </div>
          <button onClick={refresh}>새로고침</button>
        </div>

        <div className="cost-requirement-list">
          {data.requirements.map((item) => (
            <button
              key={item.requirementId}
              className={`cost-requirement ${requirementTone(item).toLowerCase()} ${selectedRequirementId === item.requirementId ? 'active' : ''}`}
              onClick={() => setSelectedRequirementId(item.requirementId)}
            >
              <span>{item.itemNameKo}</span>
              <strong>{statusLabel[item.status] ?? item.status}</strong>
              <em>{item.requiredStage}</em>
            </button>
          ))}
        </div>

        <div className="cost-entry-form">
          <div>
            <label>선택 항목</label>
            <strong>{selectedRequirement?.itemNameKo ?? '항목 선택 필요'}</strong>
          </div>
          <label>
            실제 금액
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="예: 350000" />
          </label>
          <label>
            거래처 / 공급처
            <input value={vendorNameKo} onChange={(event) => setVendorNameKo(event.target.value)} placeholder="예: 거래처명 또는 현장 지급" />
          </label>
          <button className="command command-approve" onClick={handleSaveActualCost}>실제 원가 저장</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PROCESS COST LEAK</span>
            <h3>공정별 Cost Leak</h3>
          </div>
        </div>
        <div className="cost-leak-list">
          {data.processCostLeaks.length === 0 ? <p className="small-note">현재 baseline 대비 15% 초과 원가 누수는 없습니다.</p> : null}
          {data.processCostLeaks.map((item) => (
            <article key={item.leakId} className={`cost-leak ${item.severity.toLowerCase()}`}>
              <strong>{item.itemNameKo}</strong>
              <p>{item.alertMessageKo}</p>
              <em>baseline {formatWon(item.baselineAmount)} / actual {formatWon(item.actualAmount)} / 차이 {formatRate(item.varianceRate)}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">ROOT CAUSE ANALYZER</span>
            <h3>원가 누수 원인 분석</h3>
          </div>
        </div>
        <div className="cost-leak-list">
          {data.rootCauses.length === 0 ? <p className="small-note">아직 분류된 원가 누수 원인이 없습니다.</p> : null}
          {data.rootCauses.map((item) => (
            <article key={item.rootCauseId} className="cost-leak yellow">
              <strong>{item.itemNameKo} - {item.rootCauseNameKo}</strong>
              <p>{item.reasonKo}</p>
              <em>{item.status} / 대표 승인 전 Master DB 반영 금지</em>
            </article>
          ))}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">ROOT CAUSE PATTERN</span>
            <h3>반복 원인 패턴</h3>
          </div>
        </div>
        <div className="cost-leak-list">
          {data.rootCausePatterns.length === 0 ? <p className="small-note">반복 원인 2건 이상 패턴이 아직 없습니다.</p> : null}
          {data.rootCausePatterns.map((item) => (
            <article key={item.patternId} className={`cost-leak ${item.severity === 'HIGH' ? 'red' : item.severity === 'MEDIUM' ? 'yellow' : 'green'}`}>
              <strong>{item.rootCauseNameKo}</strong>
              <p>{item.occurrenceCount}건 반복 / {item.detectionRuleKo}</p>
              <em>2건 이상 반복 시 Learning Suggestion 후보 생성</em>
            </article>
          ))}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">BLOCKING RULES</span>
            <h3>Completion 차단 규칙</h3>
          </div>
        </div>
        <div className="rule-chip-list">
          {data.blockingRules.map((rule) => (
            <span key={rule.ruleId} className={rule.severity === 'RED' ? 'rule-chip red' : 'rule-chip yellow'}>
              {rule.ruleId} - {rule.titleKo}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
