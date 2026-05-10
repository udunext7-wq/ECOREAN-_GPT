import { useMemo, useState } from 'react';
import {
  calculateBathroomEstimate,
  exportBathroomEstimate,
  exportBathroomContractPdf,
  generateBathroomContract,
  generateBathroomPurchaseOrder,
  generateBathroomSchedule,
  saveBathroomEstimate,
  type BathroomEstimateInput,
  type BathroomEstimatePreview
} from '../../services/bathroom-estimate-service/bathroomEstimateService';
import { AIEstimateAssistantPanel } from './AIEstimateAssistantPanel';

const steps = ['기본 정보', '시공 방식', '옵션', '자동 산출', '출력'];

const initialInput: BathroomEstimateInput = {
  customerName: '',
  siteName: '',
  constructionType: 'bathroom_remodel',
  bathroomCount: 1,
  bathroomAreaM2: 4.2,
  ceilingHeightMm: 2200,
  demolitionIncluded: true,
  constructionMethod: 'bond',
  waterproofMethod: 'liquid',
  tileWallType: 'ceramic_300x600',
  tileFloorType: 'porcelain_600',
  fixtureGrade: 'basic',
  options: {
    showerBooth: false,
    zenda: false,
    bathtub: false,
    slidingCabinet: false,
    ventilationFanReplace: true,
    lightingReplace: true,
    faucetReplace: true
  }
};

function formatWon(value: number | undefined) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function marginStatusClass(decision?: string) {
  if (decision === 'BLOCK') return 'blocked';
  if (decision === 'MODIFY') return 'approval';
  if (decision === 'SCALE') return 'priority';
  return 'pass';
}

function pceDescription(decision?: string) {
  if (decision === 'BLOCK') return '25% 미만: 위험, 승인 견적 저장 차단';
  if (decision === 'MODIFY') return '25~30%: 수정 필요';
  if (decision === 'SCALE') return '35% 이상: 고마진 복제 대상';
  return '30~35%: 진행 가능';
}

function displayLabel(value: string, map: Record<string, string>) {
  return map[value] || value;
}

const constructionMethodKo: Record<string, string> = {
  bond: '본드시공',
  floating: '떠붙임',
  overlay: '덧방',
  full_demolition: '전체철거'
};

const waterproofMethodKo: Record<string, string> = {
  liquid: '액체방수',
  membrane: '도막방수',
  elastic: '탄성방수'
};

const tileTypeKo: Record<string, string> = {
  ceramic_300x600: '300x600 벽타일',
  porcelain_600: '600각 포세린/폴리싱',
  large_tile: '대형타일',
  basic_floor: '기본 바닥타일'
};

const fixtureGradeKo: Record<string, string> = {
  basic: '기본형',
  mid: '중급형',
  high: '고급형'
};

export function BathroomEstimateWizardView() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<BathroomEstimateInput>(initialInput);
  const [preview, setPreview] = useState<BathroomEstimatePreview | null>(null);
  const [activeOutput, setActiveOutput] = useState<'customer' | 'internal'>('customer');
  const [messageKo, setMessageKo] = useState('입력값을 넣고 자동 산출을 실행하세요.');
  const [isBusy, setIsBusy] = useState(false);
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null);
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);
  const [estimateNumber] = useState(() => `BATH-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(Math.random() * 900 + 100)}`);

  const groupedCustomerRows = useMemo(() => {
    const groups = (preview?.customerView?.groups as Array<{ category: string; customerTotal: number }> | undefined) || [];
    return groups;
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

  const selectedOptionsKo = useMemo(() => {
    const result = [];
    if (input.options.showerBooth) result.push('샤워부스');
    if (input.options.zenda) result.push('젠다이');
    if (input.options.bathtub) result.push('욕조');
    if (input.options.slidingCabinet) result.push('슬라이딩장');
    if (input.options.ventilationFanReplace) result.push('환풍기 교체');
    if (input.options.lightingReplace) result.push('조명 교체');
    if (input.options.faucetReplace) result.push('수전 교체');
    return result.length ? result : ['선택 옵션 없음'];
  }, [input.options]);

  function updateField<Key extends keyof BathroomEstimateInput>(key: Key, value: BathroomEstimateInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateOption(key: keyof BathroomEstimateInput['options'], value: boolean) {
    setInput((current) => ({ ...current, options: { ...current.options, [key]: value } }));
  }

  async function handleCalculate() {
    setIsBusy(true);
    try {
      const result = await calculateBathroomEstimate(input);
      setPreview(result);
      setStep(3);
      setMessageKo(`자동 산출 완료: ${result.estimate.pce_label_ko}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '자동 산출 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    setIsBusy(true);
    try {
      const saved = await saveBathroomEstimate(input);
      setSavedEstimateId(String(saved.estimateId || ''));
      setMessageKo(`저장 완료: ${String(saved.estimateId || '욕실 견적')}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function ensureSavedEstimate() {
    if (savedEstimateId) return savedEstimateId;
    const saved = await saveBathroomEstimate(input);
    const estimateId = String(saved.estimateId || '');
    setSavedEstimateId(estimateId);
    return estimateId;
  }

  async function handleExport(documentType: 'customer' | 'internal', format: 'pdf' | 'xlsx') {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await exportBathroomEstimate({ estimateId, documentType, format });
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

  function executionBlockedMessage() {
    const decision = preview?.estimate.pce_decision;
    if (decision === 'BLOCK') return '수익성 검증 BLOCK 상태에서는 계약/공정표/발주서를 생성할 수 없습니다.';
    if (decision === 'MODIFY') return '수정 필요 상태입니다. 견적 수정 후 계약서를 생성하세요.';
    return '';
  }

  async function handleGenerateContract() {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await generateBathroomContract(estimateId);
      const contractId = String(result.contractId || '');
      setGeneratedContractId(contractId);
      setMessageKo(`계약서 생성 완료: ${contractId}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '계약서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExportContractPdf() {
    setIsBusy(true);
    try {
      const contractId = generatedContractId || String((await generateBathroomContract(await ensureSavedEstimate())).contractId || '');
      setGeneratedContractId(contractId);
      const result = await exportBathroomContractPdf(contractId);
      setMessageKo(`계약서 PDF 생성 완료: ${String(result.fileName || result.filePath)}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '계약서 PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateSchedule() {
    setIsBusy(true);
    try {
      const estimateId = await ensureSavedEstimate();
      const result = await generateBathroomSchedule(estimateId, generatedContractId || undefined);
      setMessageKo(`공정표 생성 완료: ${String(result.scheduleId || '욕실 공정표')}`);
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
      const result = await generateBathroomPurchaseOrder(estimateId, generatedContractId || undefined);
      setMessageKo(`발주서 생성 완료: ${String(result.purchaseOrderId || '욕실 발주서')}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '발주서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="bathroom-wizard">
      <div className="wizard-hero">
        <div>
          <span className="eyebrow">BATHROOM ESTIMATE</span>
          <h2>욕실 단독 리모델링 자동견적</h2>
          <p>최소 입력값으로 고객용 견적서와 내부 원가표를 동시에 산출합니다.</p>
        </div>
        <button className="primary-entry-button" onClick={handleCalculate} disabled={isBusy}>
          자동 산출
        </button>
      </div>

      <div className="wizard-step-tabs">
        {steps.map((label, index) => (
          <button key={label} className={index === step ? 'active' : ''} onClick={() => setStep(index)}>
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <AIEstimateAssistantPanel input={input} preview={preview} />

      {step === 0 ? (
        <section className="wizard-panel">
          <h3>기본 정보</h3>
          <div className="wizard-form-grid">
            <label>고객명<input value={input.customerName} onChange={(event) => updateField('customerName', event.target.value)} /></label>
            <label>현장명<input value={input.siteName} onChange={(event) => updateField('siteName', event.target.value)} /></label>
            <label>공사 유형<select value={input.constructionType} onChange={(event) => updateField('constructionType', event.target.value)}>
              <option value="bathroom_remodel">욕실 단독 리모델링</option>
            </select></label>
            <label>욕실 수<input type="number" min={1} value={input.bathroomCount} onChange={(event) => updateField('bathroomCount', Number(event.target.value))} /></label>
            <label>욕실 면적 ㎡<input type="number" min={1} step={0.1} value={input.bathroomAreaM2} onChange={(event) => updateField('bathroomAreaM2', Number(event.target.value))} /></label>
            <label>천장고 mm<input type="number" min={1800} value={input.ceilingHeightMm} onChange={(event) => updateField('ceilingHeightMm', Number(event.target.value))} /></label>
            <label className="toggle-line"><input type="checkbox" checked={input.demolitionIncluded} onChange={(event) => updateField('demolitionIncluded', event.target.checked)} />철거 포함</label>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="wizard-panel">
          <h3>시공 방식</h3>
          <div className="wizard-form-grid">
            <label>타일 시공 방식<select value={input.constructionMethod} onChange={(event) => updateField('constructionMethod', event.target.value)}>
              <option value="bond">본드시공</option>
              <option value="floating">떠붙임</option>
              <option value="overlay">덧방</option>
              <option value="full_demolition">전체철거</option>
            </select></label>
            <label>방수 방식<select value={input.waterproofMethod} onChange={(event) => updateField('waterproofMethod', event.target.value)}>
              <option value="liquid">액체방수</option>
              <option value="membrane">도막방수</option>
              <option value="elastic">탄성방수</option>
            </select></label>
            <label>벽 타일 종류<select value={input.tileWallType} onChange={(event) => updateField('tileWallType', event.target.value)}>
              <option value="ceramic_300x600">300x600 벽타일</option>
              <option value="porcelain_600">600각 포세린/폴리싱</option>
              <option value="large_tile">대형타일</option>
            </select></label>
            <label>바닥 타일 종류<select value={input.tileFloorType} onChange={(event) => updateField('tileFloorType', event.target.value)}>
              <option value="basic_floor">기본 바닥타일</option>
              <option value="porcelain_600">600각 포세린/폴리싱</option>
              <option value="large_tile">대형타일</option>
            </select></label>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="wizard-panel">
          <h3>옵션</h3>
          <div className="wizard-option-grid">
            <label><input type="checkbox" checked={input.options.showerBooth} onChange={(event) => updateOption('showerBooth', event.target.checked)} />샤워부스</label>
            <label><input type="checkbox" checked={input.options.zenda} onChange={(event) => updateOption('zenda', event.target.checked)} />젠다이</label>
            <label><input type="checkbox" checked={input.options.bathtub} onChange={(event) => updateOption('bathtub', event.target.checked)} />욕조</label>
            <label><input type="checkbox" checked={input.options.slidingCabinet} onChange={(event) => updateOption('slidingCabinet', event.target.checked)} />슬라이딩장</label>
            <label><input type="checkbox" checked={input.options.ventilationFanReplace} onChange={(event) => updateOption('ventilationFanReplace', event.target.checked)} />환풍기 교체</label>
            <label><input type="checkbox" checked={input.options.lightingReplace} onChange={(event) => updateOption('lightingReplace', event.target.checked)} />조명 교체</label>
            <label><input type="checkbox" checked={input.options.faucetReplace} onChange={(event) => updateOption('faucetReplace', event.target.checked)} />수전 교체</label>
            <label>도기 브랜드 등급<select value={input.fixtureGrade} onChange={(event) => updateField('fixtureGrade', event.target.value)}>
              <option value="basic">기본</option>
              <option value="mid">중급</option>
              <option value="high">고급</option>
            </select></label>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="wizard-panel">
          <h3>자동 산출</h3>
          {!preview ? <p className="empty-state">아직 산출 결과가 없습니다. 자동 산출 버튼을 누르세요.</p> : (
            <>
              <div className="wizard-summary-grid">
                <div><span>고객가</span><strong>{formatWon(preview.estimate.revenue)}</strong></div>
                <div><span>예상 원가</span><strong>{formatWon(preview.estimate.total_cost)}</strong></div>
                <div><span>예상 마진</span><strong>{formatWon(preview.estimate.expected_margin)}</strong></div>
                <div className={`margin-status ${marginStatusClass(preview.estimate.pce_decision)}`}>
                  <span>마진율 / PCE</span>
                  <strong>{(preview.estimate.expected_margin_rate * 100).toFixed(1)}% · {preview.estimate.pce_label_ko}</strong>
                </div>
              </div>
              <p className="margin-reason">{pceDescription(preview.estimate.pce_decision)}</p>
            </>
          )}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="wizard-panel professional-output-panel">
          <div className="professional-output-heading">
            <div>
              <span className="eyebrow">PROFESSIONAL OUTPUT</span>
              <h3>견적 출력</h3>
            </div>
            <div className="document-badge">{activeOutput === 'customer' ? '고객 제출용' : '내부 검토용'}</div>
          </div>
          {!preview ? <p className="empty-state">출력 전 자동 산출이 필요합니다.</p> : (
            <>
              <div className="estimate-document-toggle">
                <button className={activeOutput === 'customer' ? 'active' : ''} onClick={() => setActiveOutput('customer')}>고객용 견적서 보기</button>
                <button className={activeOutput === 'internal' ? 'active' : ''} onClick={() => setActiveOutput('internal')}>내부 원가표 보기</button>
              </div>
              {activeOutput === 'customer' ? (
                <article className="estimate-document customer-document print-container">
                  <header className="document-header">
                    <div>
                      <span>ECOREAN</span>
                      <h2>욕실 리모델링 견적서</h2>
                      <p>견적번호 {estimateNumber}</p>
                    </div>
                    <div className="document-total-box">
                      <span>총 견적 금액</span>
                      <strong>{formatWon(preview.estimate.revenue)}</strong>
                      <em>VAT 별도 · 현장 확인 후 조정 가능</em>
                    </div>
                  </header>

                  <section className="document-info-grid">
                    <div><span>고객명</span><strong>{input.customerName || '미입력'}</strong></div>
                    <div><span>현장명</span><strong>{input.siteName || '미입력'}</strong></div>
                    <div><span>견적일</span><strong>{new Date().toLocaleDateString('ko-KR')}</strong></div>
                    <div><span>유효기간</span><strong>견적일로부터 7일</strong></div>
                  </section>

                  <section className="document-spec-strip">
                    <div><span>공사 유형</span><strong>욕실 단독 리모델링</strong></div>
                    <div><span>욕실 수 / 면적</span><strong>{input.bathroomCount}개 · {input.bathroomAreaM2}㎡</strong></div>
                    <div><span>시공 방식</span><strong>{displayLabel(input.constructionMethod, constructionMethodKo)}</strong></div>
                    <div><span>방수 방식</span><strong>{displayLabel(input.waterproofMethod, waterproofMethodKo)}</strong></div>
                    <div><span>벽 타일</span><strong>{displayLabel(input.tileWallType, tileTypeKo)}</strong></div>
                    <div><span>바닥 타일</span><strong>{displayLabel(input.tileFloorType, tileTypeKo)}</strong></div>
                    <div><span>도기 등급</span><strong>{displayLabel(input.fixtureGrade, fixtureGradeKo)}</strong></div>
                    <div><span>선택 옵션</span><strong>{selectedOptionsKo.join(', ')}</strong></div>
                  </section>

                  <table className="estimate-line-table professional-table">
                    <thead><tr><th>공사 구분</th><th>포함 내용</th><th>금액</th></tr></thead>
                    <tbody>
                      {groupedCustomerRows.map((row) => (
                        <tr key={row.category}>
                          <td>{row.category}</td>
                          <td>{row.category} 관련 표준 시공 및 필요 자재 포함</td>
                          <td>{formatWon(row.customerTotal)}</td>
                        </tr>
                      ))}
                      <tr className="total-row"><td colSpan={2}>총 견적 금액</td><td>{formatWon(preview.estimate.revenue)}</td></tr>
                    </tbody>
                  </table>

                  <section className="document-terms-grid">
                    <div>
                      <h4>결제 조건</h4>
                      <p>계약금 30% · 중도금 40% · 잔금 30%</p>
                    </div>
                    <div>
                      <h4>포함 기준</h4>
                      <p>철거, 방수, 타일, 도기, 천장/전기, 선택 옵션, 마감, 청소, 검수 기준</p>
                    </div>
                    <div>
                      <h4>별도 협의</h4>
                      <p>배관 대수선, 누수 보수, 구조 보강, 고객 추가 요청, 현장 변수 발생분</p>
                    </div>
                    <div>
                      <h4>고객 안내</h4>
                      <p>본 견적은 입력 조건 기준의 예비 견적이며, 실측 및 현장 확인 후 확정됩니다.</p>
                    </div>
                  </section>

                  <footer className="document-signature">
                    <span>고객 확인</span>
                    <span>ECOREAN 확인</span>
                  </footer>
                </article>
              ) : (
                <article className="estimate-document internal-document print-container">
                  <header className="document-header">
                    <div>
                      <span>INTERNAL COST SHEET</span>
                      <h2>욕실 리모델링 내부 원가표</h2>
                      <p>견적번호 {estimateNumber} · 대표 검토용</p>
                    </div>
                    <div className={`document-total-box margin-status ${marginStatusClass(preview.estimate.pce_decision)}`}>
                      <span>PCE 결과</span>
                      <strong>{preview.estimate.pce_label_ko}</strong>
                      <em>{(preview.estimate.expected_margin_rate * 100).toFixed(1)}% / {formatWon(preview.estimate.expected_margin)}</em>
                    </div>
                  </header>

                  <section className="internal-kpi-grid">
                    <div><span>고객가</span><strong>{formatWon(preview.estimate.revenue)}</strong></div>
                    <div><span>총원가</span><strong>{formatWon(preview.estimate.total_cost)}</strong></div>
                    <div><span>자재비</span><strong>{formatWon(preview.estimate.material_cost)}</strong></div>
                    <div><span>노무비</span><strong>{formatWon(preview.estimate.labor_cost)}</strong></div>
                    <div><span>외주비</span><strong>{formatWon(preview.estimate.subcontract_cost)}</strong></div>
                    <div><span>마진율</span><strong>{(preview.estimate.expected_margin_rate * 100).toFixed(1)}%</strong></div>
                  </section>

                  <h4>공정별 원가 요약</h4>
                  <table className="estimate-line-table professional-table">
                    <thead><tr><th>공정</th><th>고객가</th><th>내부원가</th><th>예상마진</th><th>마진율</th></tr></thead>
                    <tbody>
                      {groupedInternalRows.map((row) => (
                        <tr key={row.category}>
                          <td>{row.category}</td>
                          <td>{formatWon(row.customerTotal)}</td>
                          <td>{formatWon(row.internalTotal)}</td>
                          <td>{formatWon(row.margin)}</td>
                          <td>{row.customerTotal > 0 ? `${((row.margin / row.customerTotal) * 100).toFixed(1)}%` : '0.0%'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4>상세 원가</h4>
                  <table className="estimate-line-table professional-table compact">
                    <thead><tr><th>항목</th><th>수량</th><th>단위</th><th>고객가</th><th>자재</th><th>노무</th><th>외주</th><th>마진</th></tr></thead>
                    <tbody>
                      {preview.estimate.line_items.map((item) => (
                        <tr key={`${item.category}-${item.itemName}`}>
                          <td>{item.itemName}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>{formatWon(item.customerTotal)}</td>
                          <td>{formatWon(item.materialCost)}</td>
                          <td>{formatWon(item.laborCost)}</td>
                          <td>{formatWon(item.subcontractCost)}</td>
                          <td>{formatWon(item.margin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <section className="internal-risk-note">
                    <h4>대표 판단 기준</h4>
                    <p>{pceDescription(preview.estimate.pce_decision)}</p>
                    <p>25% 미만 견적은 승인 견적으로 전환하지 않습니다. 실제 단가 확보 후 원가표를 다시 갱신해야 합니다.</p>
                  </section>
                </article>
              )}
              <div className="wizard-output-actions">
                <button onClick={handleSave} disabled={isBusy}>저장</button>
                {activeOutput === 'customer' ? (
                  <>
                    <button onClick={() => handleExport('customer', 'pdf')} disabled={isBusy}>PDF 다운로드</button>
                    <button onClick={() => handleExport('customer', 'xlsx')} disabled={isBusy}>Excel 다운로드</button>
                    <button onClick={() => handlePrint('customer')} className="no-print">인쇄</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleExport('internal', 'pdf')} disabled={isBusy}>내부 PDF 다운로드</button>
                    <button onClick={() => handleExport('internal', 'xlsx')} disabled={isBusy}>내부 Excel 다운로드</button>
                    <button onClick={() => handlePrint('internal')} className="no-print">내부 인쇄</button>
                  </>
                )}
              </div>
              <section className="execution-document-actions">
                <div>
                  <span className="eyebrow">EXECUTION READY</span>
                  <h4>견적 승인 후 실행 문서 생성</h4>
                  {executionBlockedMessage() ? <p className="execution-block-message">{executionBlockedMessage()}</p> : <p>GO 또는 SCALE 견적은 계약서, 공정표, 발주서를 바로 생성할 수 있습니다.</p>}
                </div>
                <div className="wizard-output-actions">
                  <button onClick={handleGenerateContract} disabled={isBusy || Boolean(executionBlockedMessage())}>계약서 생성</button>
                  <button onClick={handleExportContractPdf} disabled={isBusy || Boolean(executionBlockedMessage())}>계약서 PDF</button>
                  <button onClick={handleGenerateSchedule} disabled={isBusy || Boolean(executionBlockedMessage())}>공정표 생성</button>
                  <button onClick={handleGeneratePurchaseOrder} disabled={isBusy || Boolean(executionBlockedMessage())}>발주서 생성</button>
                  <button onClick={openFloorplanCenter} disabled={isBusy}>평면도 / 아이소메트릭</button>
                </div>
              </section>
            </>
          )}
        </section>
      ) : null}

      <div className="wizard-footer">
        <button onClick={() => setStep(Math.max(0, step - 1))}>이전</button>
        <span>{messageKo}</span>
        <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))}>다음</button>
      </div>
    </div>
  );
}
