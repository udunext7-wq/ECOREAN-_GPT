import { useEffect, useMemo, useState } from 'react';
import {
  createRecommendationScoringReport,
  getRecommendationScoringData,
  saveRecommendationScoringRule,
  setRecommendationScoringRuleStatus
} from '../../services/pricing-service/recommendationScoringService';

const ruleTypes = ['VENDOR_ALIAS', 'ITEM_SYNONYM', 'UNIT_ALIAS', 'SPEC_PATTERN', 'REJECTED_PATTERN', 'APPROVED_PATTERN'];
type Rule = Record<string, unknown>;

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
}

export function RecommendationScoringRulesView() {
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleType, setRuleType] = useState('ALL');
  const [form, setForm] = useState({ ruleType: 'ITEM_SYNONYM', vendorName: '', pattern: '', weight: '5', direction: 'BOOST' });
  const [messageKo, setMessageKo] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const data = await getRecommendationScoringData({ ruleType });
    setSummary(data.summary);
    setRules(data.rules);
  }

  useEffect(() => {
    void refresh();
  }, [ruleType]);

  const grouped = useMemo(() => rules.reduce<Record<string, Rule[]>>((result, rule) => {
    const key = String(rule.rule_type || 'OTHER');
    result[key] = [...(result[key] || []), rule];
    return result;
  }, {}), [rules]);

  async function saveRule() {
    if (!form.pattern.trim()) {
      setMessageKo('규칙 패턴을 입력하세요.');
      return;
    }
    setBusy(true);
    try {
      await saveRecommendationScoringRule({ ...form, weight: Number(form.weight), status: 'ACTIVE' });
      setMessageKo('추천 점수 규칙을 저장했습니다. Master Data 가격은 변경되지 않았습니다.');
      setForm((current) => ({ ...current, pattern: '', vendorName: '' }));
      await refresh();
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '규칙 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRule(rule: Rule) {
    const nextStatus = String(rule.status) === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusy(true);
    try {
      await setRecommendationScoringRuleStatus(String(rule.rule_id), nextStatus);
      setMessageKo(`규칙 상태를 ${nextStatus}로 변경했습니다.`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createReport() {
    const result = await createRecommendationScoringReport();
    setMessageKo(`추천 점수 리포트 생성: ${String(result.reportPath || '-')}`);
  }

  const weights = (summary.weights || {}) as Record<string, number>;

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">RECOMMENDATION SCORING RULES</span>
          <h2>추천 점수 규칙 센터</h2>
          <p>공급처, 동의어, 단위, 규격과 승인/반려 이력을 추천 점수에 반영합니다.</p>
        </div>
        <strong className="green-kpi">활성 규칙 {String(summary.activeRules || 0)}건</strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <strong>판단 보조 전용</strong>
        <p>규칙 변경은 추천 점수에만 반영됩니다. 추천 승인이나 Queue 연결만으로 Master Data 가격은 변경되지 않습니다.</p>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>전체 규칙</span><strong>{String(summary.totalRules || 0)}건</strong></div>
        <div><span>공급처 규칙</span><strong>{String(summary.vendorRules || 0)}건</strong></div>
        <div><span>동의어 규칙</span><strong>{String(summary.synonymRules || 0)}건</strong></div>
        <div><span>단위 alias</span><strong>{String(summary.unitRules || 0)}건</strong></div>
        <div><span>승인/반려 이력</span><strong>{String(summary.historyRules || 0)}건</strong></div>
        <div><span>고객 안전성</span><strong>{String(summary.customerSafety || 'PASSED')}</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact"><div><span className="eyebrow">SCORE BREAKDOWN</span><h3>추천 점수 계산 기준</h3></div></div>
        <div className="cost-leak-list">
          <article className="cost-leak green"><strong>품목명</strong><p>{Math.round((weights.name || 0.3) * 100)}%</p><em>동의어와 문자열 유사도</em></article>
          <article className="cost-leak green"><strong>공정 / 분류</strong><p>{Math.round((weights.category || 0.2) * 100)}%</p><em>분류와 적용 공정</em></article>
          <article className="cost-leak yellow"><strong>단위</strong><p>{Math.round((weights.unit || 0.15) * 100)}%</p><em>표준 단위 alias</em></article>
          <article className="cost-leak yellow"><strong>규격</strong><p>{Math.round((weights.spec || 0.15) * 100)}%</p><em>브랜드, 재질, 모델 분리</em></article>
          <article className="cost-leak yellow"><strong>공급처</strong><p>{Math.round((weights.vendor || 0.1) * 100)}%</p><em>단독 HIGH 승격 금지</em></article>
          <article className="cost-leak yellow"><strong>이력</strong><p>{Math.round((weights.history || 0.05) * 100)}%</p><em>승인 가산, 반려 감산</em></article>
          <article className="cost-leak yellow"><strong>가격</strong><p>{Math.round((weights.price || 0.05) * 100)}%</p><em>안전 차이율 범위</em></article>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div><span className="eyebrow">RULE EDITOR</span><h3>공급처 / 동의어 / 단위 / 규격 / 이력 규칙</h3></div>
          <button disabled={busy} onClick={() => void refresh()}>새로고침</button>
        </div>
        <div className="estimate-form-grid">
          <label>규칙 유형<select value={form.ruleType} onChange={(event) => setForm((current) => ({ ...current, ruleType: event.target.value }))}>{ruleTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>공급처 (선택)<input value={form.vendorName} onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))} /></label>
          <label>패턴<input value={form.pattern} onChange={(event) => setForm((current) => ({ ...current, pattern: event.target.value }))} placeholder="동의어는 tile=타일 형식" /></label>
          <label>가중치<input type="number" min="0" max="20" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} /></label>
          <label>방향<select value={form.direction} onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value }))}><option>BOOST</option><option>PENALTY</option><option>NEUTRAL</option></select></label>
        </div>
        <div className="button-row">
          <button className="command command-approve" disabled={busy} onClick={() => void saveRule()}>규칙 저장</button>
          <button onClick={() => void createReport()}>리포트 생성</button>
          <button onClick={() => navigate('unmatchedPriceRecommendation')}>단가 미매칭 추천</button>
          <button onClick={() => navigate('realPriceWorkbench')}>실제 단가 보정 워크벤치</button>
          <button onClick={() => navigate('masterDb')}>Master Data</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div><span className="eyebrow">RULE LIST</span><h3>활성 / 비활성 규칙</h3></div>
          <select value={ruleType} onChange={(event) => setRuleType(event.target.value)}><option value="ALL">전체 규칙</option>{ruleTypes.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {rules.length === 0 ? <p className="empty-state">등록된 추천 점수 규칙이 없습니다.</p> : Object.entries(grouped).map(([type, typeRules]) => (
          <div key={type}>
            <h4>{type}</h4>
            <div className="cost-table-wrapper">
              <table className="cost-table">
                <thead><tr><th>공급처</th><th>패턴</th><th>방향</th><th>가중치</th><th>상태</th><th>작업</th></tr></thead>
                <tbody>{typeRules.map((rule) => (
                  <tr key={String(rule.rule_id)}>
                    <td>{String(rule.vendor_name || '-')}</td><td>{String(rule.pattern || '-')}</td>
                    <td>{String(rule.direction || 'NEUTRAL')}</td><td>{String(rule.weight || 0)}</td><td>{String(rule.status || 'ACTIVE')}</td>
                    <td><button disabled={busy} onClick={() => void toggleRule(rule)}>{rule.status === 'ACTIVE' ? '비활성' : '활성'}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
