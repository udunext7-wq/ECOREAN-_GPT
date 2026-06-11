import { useEffect, useMemo, useState } from 'react';
import { realProjectIntakeService } from '../../services/intake-service/realProjectIntakeService';

type IntakeState = {
  intakeId?: string;
  customerName: string;
  customerType: string;
  siteName: string;
  addressSummary: string;
  buildingType: string;
  floor: string;
  elevatorAvailable: boolean;
  parkingAvailable: boolean;
  estimateType: 'BATHROOM' | 'KITCHEN' | 'FULL_REMODELING';
  totalAreaM2: string;
  budgetAmount: string;
  budgetGrade: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'LUXURY' | 'UNKNOWN';
  desiredStartDate: string;
  desiredEndDate: string;
  constructionScope: string;
  spaceProgram: string;
  lightbimImportId: string;
};

const initialState: IntakeState = {
  customerName: 'RC-0.3.2 테스트 고객',
  customerType: 'TEST',
  siteName: 'RC-0.3.2 실제 프로젝트 접수 테스트 현장',
  addressSummary: '서울 / 테스트 주소',
  buildingType: '아파트',
  floor: '중층',
  elevatorAvailable: true,
  parkingAvailable: true,
  estimateType: 'FULL_REMODELING',
  totalAreaM2: '48.5',
  budgetAmount: '45000000',
  budgetGrade: 'STANDARD',
  desiredStartDate: '2026-06-10',
  desiredEndDate: '2026-07-20',
  constructionScope: '철거, 설비, 방수, 타일, 목공, 전기, 도배, 바닥, 마감',
  spaceProgram: '욕실, 주방, 거실, 침실, 현관',
  lightbimImportId: ''
};

const navigate = (view: string) => {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
};

function toList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function RealProjectIntakeCenterView() {
  const [form, setForm] = useState<IntakeState>(initialState);
  const [intakes, setIntakes] = useState<Array<Record<string, unknown>>>([]);
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [priceReadiness, setPriceReadiness] = useState<Record<string, unknown> | null>(null);
  const [estimateResult, setEstimateResult] = useState<Record<string, unknown> | null>(null);
  const [safetyResult, setSafetyResult] = useState<Record<string, unknown> | null>(null);
  const [messageKo, setMessageKo] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const rows = await realProjectIntakeService.listRealProjectIntakes();
    setIntakes(rows);
  }

  useEffect(() => {
    refresh();
  }, []);

  const activeIntakeId = useMemo(() => form.intakeId || String(current?.intake_id || current?.intakeId || ''), [form.intakeId, current]);

  function updateField<K extends keyof IntakeState>(key: K, value: IntakeState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    return {
      intakeId: form.intakeId,
      customerName: form.customerName,
      customerType: form.customerType,
      siteName: form.siteName,
      addressSummary: form.addressSummary,
      buildingType: form.buildingType,
      floor: form.floor,
      elevatorAvailable: form.elevatorAvailable,
      parkingAvailable: form.parkingAvailable,
      estimateType: form.estimateType,
      totalAreaM2: Number(form.totalAreaM2 || 0),
      budgetAmount: Number(form.budgetAmount || 0),
      budgetGrade: form.budgetGrade,
      desiredStartDate: form.desiredStartDate,
      desiredEndDate: form.desiredEndDate,
      constructionScope: toList(form.constructionScope),
      spaceProgram: toList(form.spaceProgram)
    };
  }

  async function runAction(action: () => Promise<Record<string, unknown>>, success: string) {
    setBusy(true);
    setMessageKo('');
    try {
      const result = await action();
      setMessageKo(success);
      return result;
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createDraft() {
    const result = await runAction(() => realProjectIntakeService.createRealProjectIntake(buildPayload()), '실제 프로젝트 접수 초안이 생성되었습니다.');
    if (result) {
      const intake = result.intake as Record<string, unknown>;
      const intakeId = String(result.intakeId || intake?.intake_id || '');
      setForm((prev) => ({ ...prev, intakeId }));
      setCurrent(intake);
      await refresh();
    }
  }

  async function saveDraft() {
    if (!activeIntakeId) return createDraft();
    const result = await runAction(
      () => realProjectIntakeService.updateRealProjectIntake({ ...buildPayload(), intakeId: activeIntakeId }),
      '접수 정보가 임시 저장되었습니다.'
    );
    if (result) {
      setCurrent(result.intake as Record<string, unknown>);
      await refresh();
    }
    return result;
  }

  async function validate() {
    const saved = await saveDraft();
    const intakeId = String(saved?.intakeId || activeIntakeId);
    if (!intakeId) return;
    const result = await runAction(() => realProjectIntakeService.validateRealProjectIntake({ intakeId }), '접수 정보 검증이 완료되었습니다.');
    if (result) setValidation(result);
  }

  async function connectLightBIM() {
    const saved = await saveDraft();
    const intakeId = String(saved?.intakeId || activeIntakeId);
    if (!intakeId || !form.lightbimImportId) {
      setMessageKo('연결할 LightBIM importId를 입력하세요.');
      return;
    }
    const result = await runAction(
      () => realProjectIntakeService.connectLightBIMToIntake({ intakeId, importId: form.lightbimImportId }),
      'LightBIM 도면 연결이 완료되었습니다.'
    );
    if (result) setCurrent(result.intake as Record<string, unknown>);
  }

  async function checkPrice() {
    const saved = await saveDraft();
    const intakeId = String(saved?.intakeId || activeIntakeId);
    if (!intakeId) return;
    const result = await runAction(() => realProjectIntakeService.checkIntakePriceReadiness({ intakeId }), '단가 준비 상태 확인이 완료되었습니다.');
    if (result) setPriceReadiness(result);
  }

  async function generateEstimate() {
    const saved = await saveDraft();
    const intakeId = String(saved?.intakeId || activeIntakeId);
    if (!intakeId) return;
    const result = await runAction(() => realProjectIntakeService.generateEstimateFromIntake({ intakeId }), '견적 생성이 완료되었습니다.');
    if (result) setEstimateResult(result);
  }

  async function runSafety() {
    const saved = await saveDraft();
    const intakeId = String(saved?.intakeId || activeIntakeId);
    if (!intakeId) return;
    const result = await runAction(() => realProjectIntakeService.runIntakeCustomerSafetyCheck({ intakeId }), '고객 출력 전 점검이 완료되었습니다.');
    if (result) setSafetyResult(result);
  }

  async function createIssue() {
    const intakeId = activeIntakeId;
    if (!intakeId) {
      setMessageKo('먼저 접수 초안을 생성하세요.');
      return;
    }
    await runAction(
      () => realProjectIntakeService.createRealProjectIntakeIssue({
        intakeId,
        severity: 'S3',
        category: 'INTAKE_UX',
        description: '첫 실제 프로젝트 접수 중 확인이 필요한 항목입니다.',
        resolutionStatus: 'OPEN',
        targetVersion: 'RC-0.3.2'
      }),
      '접수 이슈가 기록되었습니다.'
    );
    const next = await realProjectIntakeService.getRealProjectIntake({ intakeId });
    setCurrent(next);
  }

  async function createReport() {
    const intakeId = activeIntakeId;
    if (!intakeId) {
      setMessageKo('먼저 접수 초안을 생성하세요.');
      return;
    }
    await runAction(() => realProjectIntakeService.createRealProjectIntakeReport({ intakeId }), '접수 리포트가 생성되었습니다.');
  }

  const renderInput = (label: string, value: string, onChange: (value: string) => void) => (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );

  return (
    <section className="cost-capture-view">
      <div className="section-header">
        <div>
          <span className="eyebrow">RC-0.3.2 INTAKE</span>
          <h2>실제 프로젝트 접수</h2>
          <p>고객/현장 정보는 최소한으로 받고, 견적 생성 전 LightBIM·단가·고객 안전성을 순서대로 확인합니다.</p>
        </div>
        <div className="button-row">
          <button onClick={() => navigate('crmPipeline')}>고객 CRM 파이프라인</button>
          <button onClick={() => navigate('crmNextActions')}>CRM 다음 액션 / 알림</button>
          <button onClick={() => navigate('backupRestore')}>백업 / 복구 센터</button>
          <button onClick={() => navigate('priceWorkbookImport')}>단가표 가져오기</button>
          <button onClick={() => navigate('priceCalibrationPriority')}>단가 보정 우선순위</button>
          <button onClick={() => navigate('lightbimImport')}>LightBIM 도면 가져오기</button>
        </div>
      </div>

      {messageKo ? <div className="drawer-block">{messageKo}</div> : null}

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>접수 상태</span>
          <strong>{String(current?.status || 'DRAFT')}</strong>
          <small>{activeIntakeId || '초안 생성 전'}</small>
        </div>
        <div className="kpi-card">
          <span>단가 적용 확인</span>
          <strong>{String(priceReadiness?.labelKo || current?.price_profile_status || '확인 전')}</strong>
          <small>READY / PARTIAL / NEEDS_UPDATE</small>
        </div>
        <div className="kpi-card">
          <span>PCE 결과</span>
          <strong>{String((estimateResult?.pce as Record<string, unknown>)?.decision || '미실행')}</strong>
          <small>{String(estimateResult?.estimateId || current?.generated_estimate_id || '견적 생성 전')}</small>
        </div>
        <div className="kpi-card">
          <span>고객 출력 전 점검</span>
          <strong>{safetyResult?.ok ? '통과' : current?.customer_safety_checked ? '통과' : '확인 전'}</strong>
          <small>내부정보 비노출 검사</small>
        </div>
      </div>

      <div className="cost-capture-layout">
        <div className="drawer-block">
          <h3>고객 정보</h3>
          {renderInput('고객명', form.customerName, (value) => updateField('customerName', value))}
          {renderInput('고객 유형', form.customerType, (value) => updateField('customerType', value))}
          <p>전화번호, 이메일, 상세주소는 필수 입력이 아니며 고객용 payload에는 넣지 않습니다.</p>
        </div>

        <div className="drawer-block">
          <h3>현장 정보</h3>
          {renderInput('현장명', form.siteName, (value) => updateField('siteName', value))}
          {renderInput('주소 요약', form.addressSummary, (value) => updateField('addressSummary', value))}
          {renderInput('건물 유형', form.buildingType, (value) => updateField('buildingType', value))}
          {renderInput('층수', form.floor, (value) => updateField('floor', value))}
          <label className="toggle-line">
            <input type="checkbox" checked={form.elevatorAvailable} onChange={(event) => updateField('elevatorAvailable', event.target.checked)} />
            엘리베이터 있음
          </label>
          <label className="toggle-line">
            <input type="checkbox" checked={form.parkingAvailable} onChange={(event) => updateField('parkingAvailable', event.target.checked)} />
            주차 가능
          </label>
        </div>

        <div className="drawer-block">
          <h3>공사 유형</h3>
          <label className="field">
            <span>견적 유형</span>
            <select value={form.estimateType} onChange={(event) => updateField('estimateType', event.target.value as IntakeState['estimateType'])}>
              <option value="BATHROOM">욕실</option>
              <option value="KITCHEN">주방</option>
              <option value="FULL_REMODELING">전체 리모델링</option>
            </select>
          </label>
          {renderInput('면적 / 공간 구성', form.totalAreaM2, (value) => updateField('totalAreaM2', value))}
          {renderInput('공간 구성', form.spaceProgram, (value) => updateField('spaceProgram', value))}
          {renderInput('공사 범위', form.constructionScope, (value) => updateField('constructionScope', value))}
        </div>

        <div className="drawer-block">
          <h3>예산 / 등급</h3>
          {renderInput('예산 금액', form.budgetAmount, (value) => updateField('budgetAmount', value))}
          <label className="field">
            <span>예산 등급</span>
            <select value={form.budgetGrade} onChange={(event) => updateField('budgetGrade', event.target.value as IntakeState['budgetGrade'])}>
              <option value="BASIC">BASIC</option>
              <option value="STANDARD">STANDARD</option>
              <option value="PREMIUM">PREMIUM</option>
              <option value="LUXURY">LUXURY</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          </label>
        </div>

        <div className="drawer-block">
          <h3>일정 정보</h3>
          {renderInput('희망 시작일', form.desiredStartDate, (value) => updateField('desiredStartDate', value))}
          {renderInput('희망 종료일', form.desiredEndDate, (value) => updateField('desiredEndDate', value))}
        </div>

        <div className="drawer-block">
          <h3>LightBIM 도면 연결</h3>
          {renderInput('LightBIM importId', form.lightbimImportId, (value) => updateField('lightbimImportId', value))}
          <button disabled={busy} onClick={connectLightBIM}>LightBIM 연결</button>
          <pre>{JSON.stringify((current?.lightbimSummary as Record<string, unknown>) || validation?.lightbimSummary || {}, null, 2)}</pre>
        </div>

        <div className="drawer-block">
          <h3>단가 적용 확인</h3>
          <button disabled={busy} onClick={checkPrice}>단가 준비 상태 확인</button>
          <button onClick={() => navigate('priceCalibrationPriority')}>보정 우선순위 확인</button>
          <pre>{JSON.stringify(priceReadiness || {}, null, 2)}</pre>
        </div>

        <div className="drawer-block">
          <h3>견적 생성</h3>
          <div className="button-row">
            <button disabled={busy} onClick={createDraft}>새 프로젝트 접수</button>
            <button disabled={busy} onClick={saveDraft}>임시 저장</button>
            <button disabled={busy} onClick={validate}>접수 정보 검증</button>
            <button disabled={busy} onClick={generateEstimate}>견적 생성</button>
          </div>
          <pre>{JSON.stringify(validation || estimateResult || {}, null, 2)}</pre>
        </div>

        <div className="drawer-block">
          <h3>고객 출력 전 점검</h3>
          <div className="button-row">
            <button disabled={busy} onClick={runSafety}>고객 안전성 검사</button>
            <button disabled={busy} onClick={() => navigate('bathroomEstimate')}>고객용 견적서 열기</button>
            <button disabled={busy} onClick={() => navigate('fullRemodelingEstimate')}>내부 원가표 열기</button>
          </div>
          <pre>{JSON.stringify(safetyResult || {}, null, 2)}</pre>
        </div>

        <div className="drawer-block">
          <h3>접수 리포트</h3>
          <div className="button-row">
            <button disabled={busy} onClick={createIssue}>이슈 기록</button>
            <button disabled={busy} onClick={createReport}>접수 리포트 생성</button>
          </div>
          <p>견적 진행 가능 / 조건부 견적 가능 / 보완 후 견적 / 접수 보류 중 하나로 판정합니다.</p>
        </div>
      </div>

      <div className="drawer-block">
        <h3>최근 접수</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>현장</th>
                <th>고객</th>
                <th>공사 유형</th>
                <th>상태</th>
                <th>견적 ID</th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((item) => (
                <tr key={String(item.intake_id)}>
                  <td>{String(item.site_name || '-')}</td>
                  <td>{String(item.customer_name || '-')}</td>
                  <td>{String(item.estimate_type || '-')}</td>
                  <td>{String(item.status || '-')}</td>
                  <td>{String(item.generated_estimate_id || '-')}</td>
                </tr>
              ))}
              {intakes.length === 0 ? (
                <tr>
                  <td colSpan={5}>등록된 실제 프로젝트 접수가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
