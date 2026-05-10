import { useMemo, useState } from 'react';
import { AIEstimateAssistantPanel } from './AIEstimateAssistantPanel';
import {
  calculateFullRemodelingEstimate,
  exportFullRemodelingEstimate,
  generateFullRemodelingContract,
  generateFullRemodelingPurchaseOrder,
  generateFullRemodelingSchedule,
  saveFullRemodelingEstimate,
  type FullRemodelingEstimateInput,
  type FullRemodelingEstimatePreview
} from '../../services/full-remodeling-estimate-service/fullRemodelingEstimateService';

const steps = ['기본 정보', '철거/폐기물', '주요 공정', '공정별 옵션', '자동 산출', 'AI 검토', '출력'];

const initialInput: FullRemodelingEstimateInput = {
  customerName: '',
  siteName: '',
  constructionType: 'full_remodel',
  housingType: 'apartment',
  areaM2: 79,
  areaPyeong: 24,
  roomCount: 3,
  bathroomCount: 1,
  kitchenType: 'straight',
  balconyCount: 1,
  constructionScope: 'full_interior',
  demolition: {
    fullDemolition: false,
    bathroomDemolition: true,
    kitchenDemolition: true,
    floorDemolition: true,
    ceilingDemolition: false,
    moldingDemolition: true,
    wasteVolumeTon: 2.5
  },
  selectedProcesses: {
    bathroom: true,
    kitchen: true,
    flooring: true,
    wallpaper: true,
    painting: false,
    carpentry: true,
    electrical: true,
    lighting: true,
    film: false,
    windows: false,
    builtInFurniture: false,
    entrance: true,
    balcony: true
  },
  options: {
    bathroom: { count: 1, tileMethod: 'overlay', waterproofMethod: 'membrane', showerBooth: false, bathtub: false, zenda: false },
    kitchen: { type: 'straight', lengthMm: 3300, countertopType: 'artificial_marble', hood: true, cooktop: false, sinkBowl: true },
    flooring: { type: 'engineered_wood', demolitionIncluded: true },
    wallpaper: { type: 'silk', ceilingIncluded: true },
    painting: { doors: false, frames: false, balcony: false, ceiling: false, walls: false },
    carpentry: { ceiling: false, indirectBox: false, artWall: false, molding: true, doorTrim: true },
    electrical: { outletAdd: true, switchReplace: true, panelBoard: false, upgrade: false },
    lighting: { downlight: true, indirect: false, lineLight: false, mainLight: true },
    film: { doors: false, frames: false, sash: false, furniture: false },
    windows: { replacement: false, glassReplacement: false, insulation: false },
    builtInFurniture: { closet: false, shoeCabinet: false, pantry: false, storage: false }
  },
  customerPriceMultiplier: 1.22
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

const processLabels: Record<string, string> = {
  bathroom: '욕실',
  kitchen: '주방',
  flooring: '바닥',
  wallpaper: '도배',
  painting: '도장',
  carpentry: '목공',
  electrical: '전기',
  lighting: '조명',
  film: '필름',
  windows: '창호',
  builtInFurniture: '붙박이 / 빌트인 가구',
  entrance: '현관',
  balcony: '발코니'
};

export function FullRemodelingEstimateWizardView() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<FullRemodelingEstimateInput>(initialInput);
  const [preview, setPreview] = useState<FullRemodelingEstimatePreview | null>(null);
  const [activeOutput, setActiveOutput] = useState<'customer' | 'internal'>('customer');
  const [messageKo, setMessageKo] = useState('전체 리모델링 조건을 입력하고 자동 산출을 실행하세요.');
  const [isBusy, setIsBusy] = useState(false);
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null);
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);

  const groupedInternalRows = useMemo(() => {
    return ((preview?.estimate.process_summary as Array<{ category: string; customerTotal: number; internalTotal: number; margin: number; marginRate: number }> | undefined) || []);
  }, [preview]);

  function updateField<Key extends keyof FullRemodelingEstimateInput>(key: Key, value: FullRemodelingEstimateInput[Key]) {
    setInput((current) => {
      const next = { ...current, [key]: value };
      if (key === 'areaM2') next.areaPyeong = Number((Number(value || 0) / 3.3058).toFixed(1));
      if (key === 'areaPyeong') next.areaM2 = Number((Number(value || 0) * 3.3058).toFixed(1));
      return next;
    });
  }

  function updateDemolition(key: string, value: boolean | number) {
    setInput((current) => ({ ...current, demolition: { ...current.demolition, [key]: value } }));
  }

  function updateProcess(key: string, value: boolean) {
    setInput((current) => ({ ...current, selectedProcesses: { ...current.selectedProcesses, [key]: value } }));
  }

  function updateOption(group: string, key: string, value: unknown) {
    setInput((current) => ({
      ...current,
      options: { ...current.options, [group]: { ...(current.options[group] || {}), [key]: value } }
    }));
  }

  async function handleCalculate() {
    setIsBusy(true);
    try {
      const result = await calculateFullRemodelingEstimate(input);
      setPreview(result);
      setStep(4);
      setMessageKo(`자동 산출 완료: ${pceKo(result.estimate.pce_decision)} / 예상 마진율 ${percent(result.estimate.expected_margin_rate)}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '자동 산출 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function ensureSavedEstimate() {
    if (savedEstimateId) return savedEstimateId;
    const saved = await saveFullRemodelingEstimate(input);
    const estimateId = String(saved.estimateId || '');
    setSavedEstimateId(estimateId);
    return estimateId;
  }

  async function handleSave() {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      setMessageKo(`저장 완료: ${estimateId}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExport(documentType: 'customer' | 'internal', format: 'pdf' | 'xlsx') {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await exportFullRemodelingEstimate({ estimateId, documentType, format });
      setMessageKo(`출력 파일 생성 완료: ${String(result.fileName || result.filePath)}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '출력 파일 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  function handlePrint(documentType: 'customer' | 'internal') {
    setActiveOutput(documentType);
    window.setTimeout(() => window.print(), 80);
  }

  function openFloorplanCenter() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'floorplanCenter' }));
  }

  async function handleGenerateContract() {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await generateFullRemodelingContract(estimateId);
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
      const result = await generateFullRemodelingSchedule(estimateId, generatedContractId || undefined);
      setMessageKo(`공정표 생성 완료: ${String(result.scheduleId || '전체 리모델링 공정표')}`);
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
      const result = await generateFullRemodelingPurchaseOrder(estimateId, generatedContractId || undefined);
      setMessageKo(`발주서 생성 완료: ${String(result.purchaseOrderId || '전체 리모델링 발주서')}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '발주서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  const blocked = preview?.estimate.pce_decision === 'BLOCK' || preview?.estimate.pce_decision === 'MODIFY';

  return (
    <div className="bathroom-wizard">
      <div className="wizard-hero">
        <div>
          <span className="eyebrow">FULL REMODELING ESTIMATE</span>
          <h2>전체 리모델링 자동견적</h2>
          <p>욕실, 주방, 바닥, 도배, 목공, 전기, 조명, 필름, 창호, 가구까지 하나의 견적 흐름으로 산출합니다.</p>
        </div>
        <button className="primary-entry-button" onClick={handleCalculate} disabled={isBusy}>자동 산출</button>
      </div>

      <div className="wizard-stepper">
        {steps.map((label, index) => (
          <button key={label} className={step === index ? 'active' : ''} onClick={() => setStep(index)}>
            <span>{index + 1}</span>{label}
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
                <label>주거 유형<select value={input.housingType} onChange={(event) => updateField('housingType', event.target.value)}>
                  <option value="apartment">아파트</option><option value="villa">빌라</option><option value="house">단독주택</option><option value="office">상업/사무실</option>
                </select></label>
                <label>전체 면적 m2<input type="number" value={input.areaM2} onChange={(event) => updateField('areaM2', Number(event.target.value))} /></label>
                <label>평수<input type="number" value={input.areaPyeong} onChange={(event) => updateField('areaPyeong', Number(event.target.value))} /></label>
                <label>방 개수<input type="number" value={input.roomCount} onChange={(event) => updateField('roomCount', Number(event.target.value))} /></label>
                <label>욕실 개수<input type="number" value={input.bathroomCount} onChange={(event) => updateField('bathroomCount', Number(event.target.value))} /></label>
                <label>주방 형태<select value={input.kitchenType} onChange={(event) => updateField('kitchenType', event.target.value)}>
                  <option value="straight">일자형</option><option value="l_shape">ㄱ자형</option><option value="u_shape">ㄷ자형</option><option value="island">아일랜드형</option>
                </select></label>
                <label>발코니 개수<input type="number" value={input.balconyCount} onChange={(event) => updateField('balconyCount', Number(event.target.value))} /></label>
                <label>고객가 계수<input type="number" step="0.01" value={input.customerPriceMultiplier} onChange={(event) => updateField('customerPriceMultiplier', Number(event.target.value))} /></label>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="drawer-block">
              <h3>철거 / 폐기물</h3>
              <div className="toggle-grid">
                {['fullDemolition', 'bathroomDemolition', 'kitchenDemolition', 'floorDemolition', 'ceilingDemolition', 'moldingDemolition'].map((key) => (
                  <label key={key}><input type="checkbox" checked={Boolean(input.demolition[key])} onChange={(event) => updateDemolition(key, event.target.checked)} /> {key}</label>
                ))}
                <label>폐기물 예상량 ton<input type="number" step="0.1" value={Number(input.demolition.wasteVolumeTon || 0)} onChange={(event) => updateDemolition('wasteVolumeTon', Number(event.target.value))} /></label>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="drawer-block">
              <h3>주요 공정 선택</h3>
              <div className="toggle-grid">
                {Object.entries(processLabels).map(([key, label]) => (
                  <label key={key}><input type="checkbox" checked={Boolean(input.selectedProcesses[key])} onChange={(event) => updateProcess(key, event.target.checked)} /> {label}</label>
                ))}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="drawer-block">
              <h3>공정별 옵션</h3>
              <div className="form-grid">
                <label>욕실 타일 방식<select value={String(input.options.bathroom.tileMethod)} onChange={(event) => updateOption('bathroom', 'tileMethod', event.target.value)}><option value="overlay">덧방</option><option value="bond">본드시공</option><option value="floating">떠붙임</option></select></label>
                <label>방수 방식<select value={String(input.options.bathroom.waterproofMethod)} onChange={(event) => updateOption('bathroom', 'waterproofMethod', event.target.value)}><option value="liquid">액체방수</option><option value="membrane">도막방수</option><option value="elastic">탄성방수</option></select></label>
                <label>주방 길이(mm)<input type="number" value={Number(input.options.kitchen.lengthMm || 0)} onChange={(event) => updateOption('kitchen', 'lengthMm', Number(event.target.value))} /></label>
                <label>상판 종류<select value={String(input.options.kitchen.countertopType)} onChange={(event) => updateOption('kitchen', 'countertopType', event.target.value)}><option value="artificial_marble">인조대리석</option><option value="ceramic">세라믹</option><option value="engineered_stone">엔지니어드 스톤</option></select></label>
                <label>바닥재<select value={String(input.options.flooring.type)} onChange={(event) => updateOption('flooring', 'type', event.target.value)}><option value="engineered_wood">강마루</option><option value="vinyl">장판</option><option value="porcelain_tile">포세린 타일</option><option value="deco_tile">데코타일</option></select></label>
                <label>벽지<select value={String(input.options.wallpaper.type)} onChange={(event) => updateOption('wallpaper', 'type', event.target.value)}><option value="silk">실크벽지</option><option value="paper">합지</option></select></label>
              </div>
              <div className="toggle-grid">
                {[
                  ['bathroom', 'showerBooth', '샤워부스'], ['bathroom', 'bathtub', '욕조'], ['bathroom', 'zenda', '젠다이'],
                  ['kitchen', 'hood', '후드'], ['kitchen', 'cooktop', '쿡탑'], ['kitchen', 'sinkBowl', '싱크볼'],
                  ['electrical', 'panelBoard', '분전반'], ['electrical', 'upgrade', '전기 증설'],
                  ['lighting', 'indirect', '간접조명'], ['lighting', 'lineLight', '라인조명'],
                  ['windows', 'replacement', '창호 교체'], ['builtInFurniture', 'closet', '붙박이장']
                ].map(([group, key, label]) => (
                  <label key={`${group}-${key}`}><input type="checkbox" checked={Boolean(input.options[group][key])} onChange={(event) => updateOption(group, key, event.target.checked)} /> {label}</label>
                ))}
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
                  <table className="data-table"><thead><tr><th>공정</th><th>고객가</th><th>원가</th><th>마진</th></tr></thead><tbody>
                    {groupedInternalRows.map((row) => <tr key={row.category}><td>{row.category}</td><td>{formatWon(row.customerTotal)}</td><td>{formatWon(row.internalTotal)}</td><td>{formatWon(row.margin)}</td></tr>)}
                  </tbody></table>
                </>
              ) : <p>아직 자동 산출이 실행되지 않았습니다.</p>}
            </section>
          ) : null}

          {step === 5 ? <AIEstimateAssistantPanel input={input} preview={preview} /> : null}

          {step === 6 ? (
            <section className="drawer-block print-container">
              <div className="section-header"><div><h3>{activeOutput === 'customer' ? '고객용 견적서' : '내부 원가표'}</h3><p>{input.customerName || '고객명 미입력'} / {input.siteName || '현장명 미입력'}</p></div><div className="button-row no-print"><button onClick={() => setActiveOutput('customer')}>고객용</button><button onClick={() => setActiveOutput('internal')}>내부용</button></div></div>
              {preview ? (
                <>
                  <table className="data-table">
                    <thead><tr>{activeOutput === 'customer' ? <><th>공정</th><th>금액</th></> : <><th>공정</th><th>고객가</th><th>원가</th><th>마진</th><th>마진율</th></>}</tr></thead>
                    <tbody>
                      {groupedInternalRows.map((row) => activeOutput === 'customer'
                        ? <tr key={row.category}><td>{row.category}</td><td>{formatWon(row.customerTotal)}</td></tr>
                        : <tr key={row.category}><td>{row.category}</td><td>{formatWon(row.customerTotal)}</td><td>{formatWon(row.internalTotal)}</td><td>{formatWon(row.margin)}</td><td>{percent(row.marginRate)}</td></tr>)}
                    </tbody>
                  </table>
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
                  </div>
                  {blocked ? <p className="assistant-message">수익성 검증 {preview.estimate.pce_decision} 상태에서는 계약/공정표/발주서를 생성할 수 없습니다.</p> : null}
                </>
              ) : <p>자동 산출 후 출력할 수 있습니다.</p>}
            </section>
          ) : null}

          <div className="button-row">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>이전</button>
            <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}>다음</button>
            <button className="primary-entry-button" onClick={handleCalculate} disabled={isBusy}>자동 산출</button>
          </div>
          <p className="assistant-message">{messageKo}</p>
        </main>
        {step !== 5 ? <AIEstimateAssistantPanel input={input} preview={preview} /> : null}
      </div>
    </div>
  );
}
