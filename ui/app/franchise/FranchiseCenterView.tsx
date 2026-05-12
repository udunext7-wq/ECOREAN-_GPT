import { useEffect, useMemo, useState } from 'react';
import {
  applyFranchisePackageToBranch,
  applyReplicationTemplateToBranch,
  calculateFranchiseFeeRecord,
  createBranchProfitPolicy,
  createFranchiseBranch,
  createFranchiseReplicationTemplate,
  formatRate,
  formatWon,
  getFranchiseCenterData,
  markFranchiseFeePaid,
  publishFranchiseDistributionPackage,
  type FranchiseCenterData
} from '../../services/franchise-service/franchiseService';

function value(row: Record<string, unknown>, key: string, fallback = '-') {
  return String(row?.[key] ?? fallback);
}

export function FranchiseCenterView() {
  const [data, setData] = useState<FranchiseCenterData | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('HEADQUARTERS');
  const [messageKo, setMessageKo] = useState('');

  async function refresh(branchId = selectedBranchId) {
    const next = await getFranchiseCenterData({ branchId });
    setData(next);
    if (next.selectedBranch?.id) setSelectedBranchId(String(next.selectedBranch.id));
  }

  useEffect(() => {
    refresh('HEADQUARTERS');
  }, []);

  const selectedMetric = useMemo(() => {
    if (!data) return null;
    return data.branchMetrics.find((metric) => metric.branchId === selectedBranchId) ?? data.branchMetrics[0] ?? null;
  }, [data, selectedBranchId]);

  async function handleCreateBranch() {
    const branchCode = `BR${Date.now().toString().slice(-4)}`;
    const result = await createFranchiseBranch({
      branchId: `BRANCH-${branchCode}`,
      branchName: `신규 지점 ${branchCode}`,
      branchCode,
      ownerName: 'UNKNOWN',
      contact: 'UNKNOWN',
      region: 'UNKNOWN',
      address: 'UNKNOWN'
    });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData());
    setMessageKo('지점을 생성했습니다.');
  }

  async function handlePublishPackage() {
    const result = await publishFranchiseDistributionPackage({
      packageName: '본사 표준 운영 패키지',
      packageType: 'MASTER_STANDARD',
      version: '1.0.0',
      status: 'PUBLISHED'
    });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData());
    setMessageKo('본사 기준 패키지를 배포했습니다.');
  }

  async function handleApplyPackage(packageId: string) {
    const result = await applyFranchisePackageToBranch({ branchId: selectedBranchId, packageId });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData({ branchId: selectedBranchId }));
    setMessageKo('선택한 지점에 패키지를 적용했습니다.');
  }

  async function handleRequestPolicy() {
    const result = await createBranchProfitPolicy({
      branchId: selectedBranchId,
      minMarginRate: 0.27,
      scaleMarginRate: 0.38,
      blockThreshold: 0.27,
      reasonKo: '지점별 마진 기준 변경 테스트'
    });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData({ branchId: selectedBranchId }));
    setMessageKo((result as { approvalRequired?: boolean })?.approvalRequired ? '본사 승인 대기 항목을 생성했습니다.' : '마진 정책을 저장했습니다.');
  }

  async function handleCalculateFee() {
    const result = await calculateFranchiseFeeRecord({ branchId: selectedBranchId, period: new Date().toISOString().slice(0, 7) });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData({ branchId: selectedBranchId }));
    setMessageKo('지점 수수료를 계산했습니다.');
  }

  async function handleMarkFeePaid(recordId: string, amount: unknown) {
    const result = await markFranchiseFeePaid({ recordId, paidAmount: amount });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData({ branchId: selectedBranchId }));
    setMessageKo('수수료 입금을 처리했습니다.');
  }

  async function handleCreateTemplate() {
    const result = await createFranchiseReplicationTemplate({
      templateName: '신규 지점 표준 복제 템플릿',
      version: '1.0.0',
      status: 'ACTIVE'
    });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData({ branchId: selectedBranchId }));
    setMessageKo('복제 템플릿을 생성했습니다.');
  }

  async function handleApplyTemplate(templateId: string) {
    const result = await applyReplicationTemplateToBranch({ branchId: selectedBranchId, templateId });
    setData((result as { franchiseData?: FranchiseCenterData })?.franchiseData ?? await getFranchiseCenterData({ branchId: selectedBranchId }));
    setMessageKo('선택한 지점에 복제 템플릿을 적용했습니다.');
  }

  if (!data) {
    return <section className="drawer-block">프랜차이즈 데이터를 불러오는 중입니다.</section>;
  }

  return (
    <section className="drawer-block">
      <div className="section-header">
        <div>
          <span className="eyebrow">FRANCHISE REPLICATION</span>
          <h2>프랜차이즈 관리</h2>
          <p>본사가 운영 기준을 정의하고, 지점별 수익/리스크/현장 흐름을 통합 관리합니다.</p>
        </div>
        <button onClick={() => refresh()}>새로고침</button>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>전체 지점</h5>
          <strong>{String(data.summary.branchCount ?? data.branches.length)}</strong>
          <p>활성 지점 {String(data.summary.activeBranchCount ?? 0)}개</p>
        </div>
        <div className="estimate-preview-card">
          <h5>지점 평균 마진</h5>
          <strong>{formatRate(data.summary.averageMarginRate)}</strong>
          <p>25% 미만 지점 {String(data.summary.lowMarginBranchCount ?? 0)}개</p>
        </div>
        <div className="estimate-preview-card warning-row">
          <h5>위험 알림</h5>
          <strong>{String(data.summary.openRiskAlertCount ?? data.riskAlerts.length)}</strong>
          <p>저마진 / PCE 반복 / 현금흐름 악화</p>
        </div>
        <div className="estimate-preview-card">
          <h5>통합 매출</h5>
          <strong>{formatWon(data.summary.totalRevenue)}</strong>
          <p>{String(data.summary.displayStatusKo ?? '데이터 없음')}</p>
        </div>
      </div>

      <div className="action-command-grid">
        <button className="command command-approve" onClick={handleCreateBranch}>지점 생성</button>
        <button className="command command-order" onClick={handlePublishPackage}>본사 기준 배포</button>
        <button className="command command-block" onClick={handleRequestPolicy}>마진 정책 변경 요청</button>
        <button className="command command-approve" onClick={handleCalculateFee}>수수료 계산</button>
        <button className="command command-order" onClick={handleCreateTemplate}>복제 템플릿 생성</button>
      </div>
      {messageKo ? <p className="form-message">{messageKo}</p> : null}

      <div className="drawer-block">
        <h3>지점 관리</h3>
        <select
          value={selectedBranchId}
          onChange={(event) => {
            setSelectedBranchId(event.target.value);
            refresh(event.target.value);
          }}
        >
          {data.branches.map((branch) => (
            <option key={String(branch.id)} value={String(branch.id)}>
              {value(branch, 'branch_name')} / {value(branch, 'region')}
            </option>
          ))}
        </select>
        {selectedMetric ? (
          <div className="case-library-grid">
            <div className="estimate-preview-card">
              <h5>견적 / 계약</h5>
              <strong>{String(selectedMetric.estimateCount)} / {String(selectedMetric.contractCount)}</strong>
              <p>계약 전환율 {formatRate(selectedMetric.contractConversionRate)}</p>
            </div>
            <div className="estimate-preview-card">
              <h5>수익 현황</h5>
              <strong>{formatWon(selectedMetric.totalRevenue)}</strong>
              <p>원가 {formatWon(selectedMetric.totalCost)} / 마진 {formatRate(selectedMetric.averageMarginRate)}</p>
            </div>
            <div className="estimate-preview-card warning-row">
              <h5>마진 방어</h5>
              <strong>{String(selectedMetric.lowMarginProjectCount)}</strong>
              <p>PCE BLOCK {String(selectedMetric.pceBlockCount)}건</p>
            </div>
            <div className="estimate-preview-card">
              <h5>현금흐름</h5>
              <strong>{formatWon(selectedMetric.cashflow)}</strong>
              <p>미수 {formatWon(selectedMetric.receivableAmount)} / 미지급 {formatWon(selectedMetric.payableAmount)}</p>
            </div>
          </div>
        ) : <p>등록된 지점 성과 데이터가 없습니다.</p>}
      </div>

      <div className="drawer-block">
        <h3>본사 기준 배포</h3>
        {data.packages.length === 0 ? <p>배포된 본사 기준 패키지가 없습니다.</p> : null}
        <div className="today-action-list">
          {data.packages.slice(0, 6).map((pkg) => (
            <button key={String(pkg.id)} className="action-row" onClick={() => handleApplyPackage(String(pkg.id))}>
              <span>{value(pkg, 'status')}</span>
              <div>
                <strong>{value(pkg, 'package_name')}</strong>
                <p>{value(pkg, 'package_type')} / v{value(pkg, 'version')}</p>
              </div>
              <em>적용</em>
            </button>
          ))}
        </div>
      </div>

      <div className="drawer-block">
        <h3>지점별 위험 알림</h3>
        {data.riskAlerts.length === 0 ? <p>지점 위험 알림이 없습니다.</p> : null}
        <div className="today-action-list">
          {data.riskAlerts.slice(0, 8).map((alert) => (
            <div key={String(alert.id)} className={String(alert.severity) === 'RED' ? 'action-row warning-row' : 'action-row'}>
              <span>{value(alert, 'severity')}</span>
              <div>
                <strong>{value(alert, 'title')}</strong>
                <p>{value(alert, 'description')}</p>
              </div>
              <em>{value(alert, 'status')}</em>
            </div>
          ))}
        </div>
      </div>

      <div className="drawer-block">
        <h3>프랜차이즈 수수료</h3>
        {data.feeRecords.length === 0 ? <p>계산된 수수료 기록이 없습니다.</p> : null}
        <div className="today-action-list">
          {data.feeRecords.slice(0, 6).map((record) => (
            <button key={String(record.id)} className="action-row" onClick={() => handleMarkFeePaid(String(record.id), record.calculated_fee)}>
              <span>{value(record, 'period')}</span>
              <div>
                <strong>{formatWon(record.calculated_fee)}</strong>
                <p>매출 기준 {formatWon(record.branch_revenue)} / 입금 {formatWon(record.paid_amount)}</p>
              </div>
              <em>{value(record, 'status')}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="drawer-block">
        <h3>복제 템플릿</h3>
        {data.templates.length === 0 ? <p>등록된 지점 복제 템플릿이 없습니다.</p> : null}
        <div className="today-action-list">
          {data.templates.slice(0, 6).map((template) => (
            <button key={String(template.id)} className="action-row" onClick={() => handleApplyTemplate(String(template.id))}>
              <span>{value(template, 'status')}</span>
              <div>
                <strong>{value(template, 'template_name')}</strong>
                <p>v{value(template, 'version')} / 신규 지점 표준 운영 구조</p>
              </div>
              <em>적용</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
