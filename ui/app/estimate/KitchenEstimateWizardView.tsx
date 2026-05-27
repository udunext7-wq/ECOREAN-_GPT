import { useMemo, useState } from 'react';
import { AIEstimateAssistantPanel } from './AIEstimateAssistantPanel';
import {
  calculateKitchenEstimate,
  exportKitchenEstimate,
  generateKitchenContract,
  generateKitchenPurchaseOrder,
  generateKitchenSchedule,
  saveKitchenEstimate,
  type KitchenEstimateInput,
  type KitchenEstimatePreview
} from '../../services/kitchen-estimate-service/kitchenEstimateService';
import { formatLightBIMSource, formatQuantityReviewSummary, formatQuantitySourceSummary, getLightBIMSource, hasCriticalQuantityReviewWarning, quantitySourceLabel, readLightBIMInitialInput, readLightBIMQuantityReviewSummary } from './lightBimDraft';

const steps = ['기본 정보', '가구 사양', '설비/전기', '마감', '자동 산출', '출력'];

const initialInput: KitchenEstimateInput = {
  customerName: '',
  siteName: '',
  constructionType: 'kitchen_remodel',
  kitchenType: 'straight',
  kitchenLengthMm: 3000,
  ceilingHeightMm: 2300,
  demolitionIncluded: true,
  expansionIncluded: false,
  upperCabinetLengthMm: 3000,
  lowerCabinetLengthMm: 3000,
  tallCabinet: false,
  pantry: false,
  island: false,
  doorFinish: 'pet',
  countertopType: 'artificial_marble',
  handleType: 'exposed',
  customerPriceMultiplier: 1.18,
  options: {
    sinkBowlReplace: true,
    faucetReplace: true,
    hoodReplace: true,
    cooktopReplace: false,
    outletAdd: false,
    indirectLighting: false,
    electricalUpgrade: false,
    wallTile: true,
    floorFinishConnection: true,
    wallpaperConnection: false,
    ceilingFinish: false,
    moldingFinish: true
  }
};

const kitchenTypeKo: Record<string, string> = {
  straight: '일자형',
  l_shape: 'ㄱ자형',
  u_shape: 'ㄷ자형',
  island: '아일랜드형'
};

const doorFinishKo: Record<string, string> = {
  pet: 'PET',
  uv: 'UV',
  painted: '도장',
  matte: '무광'
};

const countertopKo: Record<string, string> = {
  artificial_marble: '인조대리석',
  ceramic: '세라믹',
  engineered_stone: '엔지니어드 스톤'
};

const handleKo: Record<string, string> = {
  exposed: '노출형',
  hidden: '히든형'
};

function formatWon(value: number | undefined) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function percent(value: number | undefined) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function pceClass(decision?: string) {
  if (decision === 'BLOCK') return 'blocked';
  if (decision === 'MODIFY') return 'approval';
  if (decision === 'SCALE') return 'priority';
  return 'pass';
}

function pceKo(decision?: string) {
  if (decision === 'BLOCK') return '위험: 계약 차단';
  if (decision === 'MODIFY') return '수정 필요';
  if (decision === 'SCALE') return '고마진 복제 대상';
  return '진행 가능';
}

function pceHelp(decision?: string) {
  if (decision === 'BLOCK') return '마진율 25% 미만입니다. 계약서, 공정표, 발주서 생성이 차단됩니다.';
  if (decision === 'MODIFY') return '마진율 25~30% 구간입니다. 견적 수정 후 진행해야 합니다.';
  if (decision === 'SCALE') return '마진율 35% 이상입니다. 고마진 템플릿 후보로 볼 수 있습니다.';
  return '마진율 30~35% 구간입니다. 실행 전환이 가능합니다.';
}

function optionLabel(input: KitchenEstimateInput) {
  const labels = [];
  if (input.tallCabinet) labels.push('키큰장');
  if (input.pantry) labels.push('팬트리');
  if (input.island) labels.push('아일랜드');
  if (input.options.sinkBowlReplace) labels.push('싱크볼');
  if (input.options.faucetReplace) labels.push('수전');
  if (input.options.hoodReplace) labels.push('후드');
  if (input.options.cooktopReplace) labels.push('쿡탑');
  if (input.options.outletAdd) labels.push('콘센트 추가');
  if (input.options.indirectLighting) labels.push('간접조명');
  if (input.options.electricalUpgrade) labels.push('전기 증설');
  if (input.options.wallTile) labels.push('벽 타일');
  return labels.length ? labels.join(', ') : '선택 옵션 없음';
}

export function KitchenEstimateWizardView() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<KitchenEstimateInput>(() => readLightBIMInitialInput('KITCHEN', initialInput));
  const [preview, setPreview] = useState<KitchenEstimatePreview | null>(null);
  const [activeOutput, setActiveOutput] = useState<'customer' | 'internal'>('customer');
  const [messageKo, setMessageKo] = useState('주방 조건을 입력하고 자동 산출을 실행하세요.');
  const [isBusy, setIsBusy] = useState(false);
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null);
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);
  const lightBimSource = getLightBIMSource(input);
  const quantityReviewSummary = readLightBIMQuantityReviewSummary('KITCHEN');
  const hasCriticalQuantityWarning = hasCriticalQuantityReviewWarning(quantityReviewSummary);

  const groupedCustomerRows = useMemo(() => {
    return ((preview?.customerView?.groups as Array<{ category: string; customerTotal: number }> | undefined) || []);
  }, [preview]);

  const groupedInternalRows = useMemo(() => {
    const rows = new Map<string, { category: string; customerTotal: number; internalTotal: number; margin: number }>();
    for (const item of preview?.estimate.line_items || []) {
      const current = rows.get(item.category) || { category: item.category, customerTotal: 0, internalTotal: 0, margin: 0 };
      current.customerTotal += item.customerTotal;
      current.internalTotal += item.internalTotal;
      current.margin += item.margin;
      rows.set(item.category, current);
    }
    return Array.from(rows.values());
  }, [preview]);

  function updateField<Key extends keyof KitchenEstimateInput>(key: Key, value: KitchenEstimateInput[Key]) {
    setInput((current) => {
      const next = { ...current, [key]: value };
      if (key === 'kitchenLengthMm') {
        const length = Number(value || 0);
        next.upperCabinetLengthMm = length;
        next.lowerCabinetLengthMm = length;
      }
      if (key === 'kitchenType' && value === 'island') {
        next.island = true;
      }
      return next;
    });
  }

  function updateOption(key: keyof KitchenEstimateInput['options'], value: boolean) {
    setInput((current) => ({ ...current, options: { ...current.options, [key]: value } }));
  }

  async function handleCalculate() {
    setIsBusy(true);
    try {
      const result = await calculateKitchenEstimate(input);
      setPreview(result);
      setStep(4);
      setMessageKo(`자동 산출 완료: ${pceKo(result.estimate.pce_decision)} / 예상 마진율 ${percent(result.estimate.expected_margin_rate)}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '자동 산출 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    setIsBusy(true);
    try {
      const saved = await saveKitchenEstimate(input);
      const estimateId = String(saved.estimateId || '');
      setSavedEstimateId(estimateId);
      setMessageKo(`저장 완료: ${estimateId}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function ensureSavedEstimate() {
    if (savedEstimateId) return savedEstimateId;
    const saved = await saveKitchenEstimate(input);
    const estimateId = String(saved.estimateId || '');
    setSavedEstimateId(estimateId);
    return estimateId;
  }

  async function handleExport(documentType: 'customer' | 'internal', format: 'pdf' | 'xlsx') {
    if (hasCriticalQuantityWarning) {
      setMessageKo('수량 검토가 필요한 Critical 경고가 있어 출력할 수 없습니다.');
      return;
    }
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await exportKitchenEstimate({ estimateId, documentType, format });
      setMessageKo(`출력 파일 생성 완료: ${String(result.fileName || result.filePath)}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '출력 파일 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  function handlePrint(documentType: 'customer' | 'internal') {
    if (hasCriticalQuantityWarning) {
      setMessageKo('수량 검토가 필요한 Critical 경고가 있어 출력할 수 없습니다.');
      return;
    }
    setActiveOutput(documentType);
    window.setTimeout(() => window.print(), 80);
  }

  function openFloorplanCenter() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'floorplanCenter' }));
  }

  function openAIVisualizationCenter() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'aiVisualization' }));
  }

  async function handleGenerateContract() {
    if (hasCriticalQuantityWarning) {
      setMessageKo('Critical 수량 경고가 해결될 때까지 계약서를 생성할 수 없습니다.');
      return;
    }
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await generateKitchenContract(estimateId);
      const contractId = String(result.contractId || '');
      setGeneratedContractId(contractId);
      setMessageKo(`계약서 생성 완료: ${contractId}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '계약서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateSchedule() {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await generateKitchenSchedule(estimateId, generatedContractId || undefined);
      setMessageKo(`공정표 생성 완료: ${String(result.scheduleId || '주방 공정표')}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '공정표 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGeneratePurchaseOrder() {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await generateKitchenPurchaseOrder(estimateId, generatedContractId || undefined);
      setMessageKo(`발주서 생성 완료: ${String(result.purchaseOrderId || '주방 발주서')}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '발주서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  const blocked = preview?.estimate.pce_decision === 'BLOCK' || preview?.estimate.pce_decision === 'MODIFY' || hasCriticalQuantityWarning;

  return (
    <div className="bathroom-wizard">
      <div className="wizard-hero">
        <div>
          <span className="eyebrow">KITCHEN ESTIMATE</span>
          <h2>주방 리모델링 자동견적</h2>
          <p>주방 형태, 가구 길이, 상판, 전기/설비, 마감 옵션을 기준으로 고객가와 내부 원가를 동시에 산출합니다.</p>
        </div>
        <button className="primary-entry-button" onClick={handleCalculate} disabled={isBusy}>
          자동 산출
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimImport' }))} disabled={isBusy}>
          LightBIM 도면 가져오기
        </button>
      </div>

      {lightBimSource ? (
        <section className="drawer-block">
          <strong>LightBIM 도면 데이터가 적용되었습니다.</strong>
          <p>{formatLightBIMSource(lightBimSource)}</p>
          <p>LightBIM 수량 검토 필요</p>
          {quantityReviewSummary ? <p>{formatQuantityReviewSummary(quantityReviewSummary)}</p> : null}
          {hasCriticalQuantityWarning ? <p className="danger-text">Critical 수량 경고를 확인한 뒤 출력과 계약 생성을 진행하세요.</p> : null}
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimQuantityReview' }))}>
            수량 검토 열기
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimTraceability' }))}>
            수량 추적
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimSpaceMap' }))}>
            LightBIM 공간 맵
          </button>
        </section>
      ) : null}

      <div className="wizard-stepper">
        {steps.map((label, index) => (
          <button key={label} className={step === index ? 'active' : ''} onClick={() => setStep(index)}>
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="wizard-layout">
        <main className="wizard-main">
          {step === 0 ? (
            <section className="drawer-block">
              <h3>기본 정보</h3>
              <div className="form-grid">
                <label>고객명<input value={input.customerName} onChange={(event) => updateField('customerName', event.target.value)} /></label>
                <label>현장명<input value={input.siteName} onChange={(event) => updateField('siteName', event.target.value)} /></label>
                <label>주방 형태<select value={input.kitchenType} onChange={(event) => updateField('kitchenType', event.target.value as KitchenEstimateInput['kitchenType'])}>
                  {Object.entries(kitchenTypeKo).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                <label>주방 길이(mm)<input type="number" value={input.kitchenLengthMm} onChange={(event) => updateField('kitchenLengthMm', Number(event.target.value))} /></label>
                <label>천장고(mm)<input type="number" value={input.ceilingHeightMm} onChange={(event) => updateField('ceilingHeightMm', Number(event.target.value))} /></label>
                <label>고객가 계수<input type="number" step="0.01" value={input.customerPriceMultiplier} onChange={(event) => updateField('customerPriceMultiplier', Number(event.target.value))} /></label>
              </div>
              <div className="toggle-grid">
                <label><input type="checkbox" checked={input.demolitionIncluded} onChange={(event) => updateField('demolitionIncluded', event.target.checked)} /> 철거 포함</label>
                <label><input type="checkbox" checked={input.expansionIncluded} onChange={(event) => updateField('expansionIncluded', event.target.checked)} /> 확장 포함</label>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="drawer-block">
              <h3>가구 사양</h3>
              <div className="form-grid">
                <label>상부장 길이(mm)<input type="number" value={input.upperCabinetLengthMm} onChange={(event) => updateField('upperCabinetLengthMm', Number(event.target.value))} /></label>
                <label>하부장 길이(mm)<input type="number" value={input.lowerCabinetLengthMm} onChange={(event) => updateField('lowerCabinetLengthMm', Number(event.target.value))} /></label>
                <label>도어 마감<select value={input.doorFinish} onChange={(event) => updateField('doorFinish', event.target.value as KitchenEstimateInput['doorFinish'])}>
                  {Object.entries(doorFinishKo).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                <label>상판 종류<select value={input.countertopType} onChange={(event) => updateField('countertopType', event.target.value as KitchenEstimateInput['countertopType'])}>
                  {Object.entries(countertopKo).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                <label>손잡이 방식<select value={input.handleType} onChange={(event) => updateField('handleType', event.target.value as KitchenEstimateInput['handleType'])}>
                  {Object.entries(handleKo).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
              </div>
              <div className="toggle-grid">
                <label><input type="checkbox" checked={input.tallCabinet} onChange={(event) => updateField('tallCabinet', event.target.checked)} /> 키큰장</label>
                <label><input type="checkbox" checked={input.pantry} onChange={(event) => updateField('pantry', event.target.checked)} /> 팬트리</label>
                <label><input type="checkbox" checked={input.island} onChange={(event) => updateField('island', event.target.checked)} /> 아일랜드</label>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="drawer-block">
              <h3>설비 / 전기</h3>
              <div className="toggle-grid">
                <label><input type="checkbox" checked={input.options.sinkBowlReplace} onChange={(event) => updateOption('sinkBowlReplace', event.target.checked)} /> 싱크볼 교체</label>
                <label><input type="checkbox" checked={input.options.faucetReplace} onChange={(event) => updateOption('faucetReplace', event.target.checked)} /> 수전 교체</label>
                <label><input type="checkbox" checked={input.options.hoodReplace} onChange={(event) => updateOption('hoodReplace', event.target.checked)} /> 후드 교체</label>
                <label><input type="checkbox" checked={input.options.cooktopReplace} onChange={(event) => updateOption('cooktopReplace', event.target.checked)} /> 쿡탑 교체</label>
                <label><input type="checkbox" checked={input.options.outletAdd} onChange={(event) => updateOption('outletAdd', event.target.checked)} /> 콘센트 추가</label>
                <label><input type="checkbox" checked={input.options.indirectLighting} onChange={(event) => updateOption('indirectLighting', event.target.checked)} /> 간접조명</label>
                <label><input type="checkbox" checked={input.options.electricalUpgrade} onChange={(event) => updateOption('electricalUpgrade', event.target.checked)} /> 전기 증설</label>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="drawer-block">
              <h3>마감</h3>
              <div className="toggle-grid">
                <label><input type="checkbox" checked={input.options.wallTile} onChange={(event) => updateOption('wallTile', event.target.checked)} /> 벽 타일</label>
                <label><input type="checkbox" checked={input.options.floorFinishConnection} onChange={(event) => updateOption('floorFinishConnection', event.target.checked)} /> 바닥 연결 마감</label>
                <label><input type="checkbox" checked={input.options.wallpaperConnection} onChange={(event) => updateOption('wallpaperConnection', event.target.checked)} /> 도배 연계</label>
                <label><input type="checkbox" checked={input.options.ceilingFinish} onChange={(event) => updateOption('ceilingFinish', event.target.checked)} /> 천장 마감</label>
                <label><input type="checkbox" checked={input.options.moldingFinish} onChange={(event) => updateOption('moldingFinish', event.target.checked)} /> 몰딩 마감</label>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="drawer-block">
              <h3>자동 산출</h3>
              {preview ? (
                <>
                  <div className="kpi-grid compact">
                    <div><span>고객가</span><strong>{formatWon(preview.estimate.revenue)}</strong></div>
                    <div><span>예상 원가</span><strong>{formatWon(preview.estimate.total_cost)}</strong></div>
                    <div><span>예상 마진</span><strong>{formatWon(preview.estimate.expected_margin)}</strong></div>
                    <div className={pceClass(preview.estimate.pce_decision)}><span>마진율</span><strong>{percent(preview.estimate.expected_margin_rate)}</strong></div>
                    <div className={pceClass(preview.estimate.pce_decision)}><span>PCE 결과</span><strong>{pceKo(preview.estimate.pce_decision)}</strong></div>
                    <div><span>예상 공기</span><strong>{preview.estimate.schedule_days}일</strong></div>
                  </div>
                  <p className="assistant-message">{pceHelp(preview.estimate.pce_decision)}</p>
                </>
              ) : (
                <p>아직 자동 산출이 실행되지 않았습니다.</p>
              )}
            </section>
          ) : null}

          {step === 5 ? (
            <section className="drawer-block print-container">
              <div className="section-header">
                <div>
                  <h3>{activeOutput === 'customer' ? '고객용 견적서' : '내부 원가표'}</h3>
                  <p>{input.customerName || '고객명 미입력'} / {input.siteName || '현장명 미입력'}</p>
                </div>
                <div className="button-row no-print">
                  <button onClick={() => setActiveOutput('customer')}>고객용</button>
                  <button onClick={() => setActiveOutput('internal')}>내부용</button>
                </div>
              </div>
              {preview ? (
                <>
                  <div className="estimate-summary-strip">
                    <span>주방 형태: {kitchenTypeKo[input.kitchenType]}</span>
                    <span>도어: {doorFinishKo[input.doorFinish]}</span>
                    <span>상판: {countertopKo[input.countertopType]}</span>
                    <span>옵션: {optionLabel(input)}</span>
                  </div>
                  {activeOutput === 'customer' ? (
                    <table className="data-table">
                      <thead><tr><th>공정</th><th>금액</th></tr></thead>
                      <tbody>
                        {groupedCustomerRows.map((row) => <tr key={row.category}><td>{row.category}</td><td>{formatWon(row.customerTotal)}</td></tr>)}
                        <tr><th>총 견적금액</th><th>{formatWon(preview.estimate.revenue)}</th></tr>
                      </tbody>
                    </table>
                  ) : (
                    <>
                      <table className="data-table">
                        <thead><tr><th>공정</th><th>고객가</th><th>원가</th><th>마진</th><th>마진율</th></tr></thead>
                        <tbody>
                          {groupedInternalRows.map((row) => <tr key={row.category}><td>{row.category}</td><td>{formatWon(row.customerTotal)}</td><td>{formatWon(row.internalTotal)}</td><td>{formatWon(row.margin)}</td><td>{percent(row.customerTotal ? row.margin / row.customerTotal : 0)}</td></tr>)}
                          <tr><th>합계</th><th>{formatWon(preview.estimate.revenue)}</th><th>{formatWon(preview.estimate.total_cost)}</th><th>{formatWon(preview.estimate.expected_margin)}</th><th>{percent(preview.estimate.expected_margin_rate)}</th></tr>
                        </tbody>
                      </table>
                      {preview.estimate.quantity_source_summary ? (
                        <p className="assistant-message">수량 출처: {formatQuantitySourceSummary(preview.estimate.quantity_source_summary)}</p>
                      ) : null}
                      {quantityReviewSummary ? <p className="assistant-message">검토 상태: {formatQuantityReviewSummary(quantityReviewSummary)}</p> : null}
                      <table className="data-table compact">
                        <thead><tr><th>항목</th><th>수량</th><th>단위</th><th>수량 출처</th><th>수량 근거</th></tr></thead>
                        <tbody>
                          {preview.estimate.line_items.map((item) => (
                            <tr key={`${item.category}-${item.itemName}`}>
                              <td>{item.itemName}</td>
                              <td>{item.quantity}</td>
                              <td>{item.unit}</td>
                              <td>{quantitySourceLabel(item.quantity_source || item.quantitySource)}</td>
                              <td>{item.quantity_basis_key || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  <div className="button-row no-print">
                    <button onClick={() => handleExport('customer', 'pdf')} disabled={isBusy}>고객 PDF 다운로드</button>
                    <button onClick={() => handleExport('customer', 'xlsx')} disabled={isBusy}>고객 Excel 다운로드</button>
                    <button onClick={() => handlePrint('customer')}>고객용 인쇄</button>
                    <button onClick={() => handleExport('internal', 'pdf')} disabled={isBusy}>내부 PDF 다운로드</button>
                    <button onClick={() => handleExport('internal', 'xlsx')} disabled={isBusy}>내부 Excel 다운로드</button>
                    <button onClick={() => handlePrint('internal')}>내부 인쇄</button>
                  </div>
                  <div className="button-row no-print">
                    <button onClick={handleSave} disabled={isBusy}>저장</button>
                    <button onClick={handleGenerateContract} disabled={isBusy || blocked}>계약서 생성</button>
                    <button onClick={handleGenerateSchedule} disabled={isBusy || blocked}>공정표 생성</button>
                    <button onClick={handleGeneratePurchaseOrder} disabled={isBusy || blocked}>발주서 생성</button>
                    <button onClick={openFloorplanCenter} disabled={isBusy}>평면도 / 아이소메트릭</button>
                    <button onClick={openAIVisualizationCenter} disabled={isBusy}>AI 투시도 생성</button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'vendorIntelligence' }))} disabled={isBusy}>협력업체 단가 지능화</button>
                  </div>
                  {blocked ? <p className="assistant-message">수익성 검증 {preview.estimate.pce_decision} 상태에서는 계약/공정표/발주서를 생성할 수 없습니다.</p> : null}
                </>
              ) : (
                <p>자동 산출 후 출력할 수 있습니다.</p>
              )}
            </section>
          ) : null}

          <div className="button-row">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>이전</button>
            <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}>다음</button>
            <button className="primary-entry-button" onClick={handleCalculate} disabled={isBusy}>자동 산출</button>
          </div>
          <p className="assistant-message">{messageKo}</p>
        </main>

        <AIEstimateAssistantPanel input={input} preview={preview} />
      </div>
    </div>
  );
}
