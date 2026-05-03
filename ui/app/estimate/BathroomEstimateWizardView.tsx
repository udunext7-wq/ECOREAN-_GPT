import { useMemo, useState } from 'react';
import {
  calculateBathroomEstimate,
  saveBathroomEstimate,
  type BathroomEstimateInput,
  type BathroomEstimatePreview
} from '../../services/bathroom-estimate-service/bathroomEstimateService';

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

export function BathroomEstimateWizardView() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<BathroomEstimateInput>(initialInput);
  const [preview, setPreview] = useState<BathroomEstimatePreview | null>(null);
  const [activeOutput, setActiveOutput] = useState<'customer' | 'internal'>('customer');
  const [messageKo, setMessageKo] = useState('입력값을 넣고 자동 산출을 실행하세요.');
  const [isBusy, setIsBusy] = useState(false);

  const groupedCustomerRows = useMemo(() => {
    const groups = (preview?.customerView?.groups as Array<{ category: string; customerTotal: number }> | undefined) || [];
    return groups;
  }, [preview]);

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
      setMessageKo(`저장 완료: ${String(saved.estimateId || '욕실 견적')}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
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
        <section className="wizard-panel">
          <h3>출력</h3>
          {!preview ? <p className="empty-state">출력 전 자동 산출이 필요합니다.</p> : (
            <>
              <div className="estimate-document-toggle">
                <button className={activeOutput === 'customer' ? 'active' : ''} onClick={() => setActiveOutput('customer')}>고객용 견적서 보기</button>
                <button className={activeOutput === 'internal' ? 'active' : ''} onClick={() => setActiveOutput('internal')}>내부 원가표 보기</button>
              </div>
              {activeOutput === 'customer' ? (
                <table className="estimate-line-table">
                  <thead><tr><th>구분</th><th>고객 표시 금액</th></tr></thead>
                  <tbody>
                    {groupedCustomerRows.map((row) => <tr key={row.category}><td>{row.category}</td><td>{formatWon(row.customerTotal)}</td></tr>)}
                    <tr className="total-row"><td>합계</td><td>{formatWon(preview.estimate.revenue)}</td></tr>
                  </tbody>
                </table>
              ) : (
                <table className="estimate-line-table">
                  <thead><tr><th>항목</th><th>고객가</th><th>자재</th><th>노무</th><th>외주</th><th>마진</th></tr></thead>
                  <tbody>
                    {preview.estimate.line_items.map((item) => (
                      <tr key={`${item.category}-${item.itemName}`}>
                        <td>{item.itemName}</td>
                        <td>{formatWon(item.customerTotal)}</td>
                        <td>{formatWon(item.materialCost)}</td>
                        <td>{formatWon(item.laborCost)}</td>
                        <td>{formatWon(item.subcontractCost)}</td>
                        <td>{formatWon(item.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="wizard-output-actions">
                <button onClick={handleSave} disabled={isBusy}>저장</button>
                <button disabled>PDF 출력 준비</button>
                <button disabled>Excel 출력 준비</button>
              </div>
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
