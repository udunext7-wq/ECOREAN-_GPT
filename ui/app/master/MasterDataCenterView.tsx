import { useEffect, useMemo, useState } from 'react';
import {
  createMasterDataItem,
  exportMasterDataCsv,
  formatWon,
  getMasterDataCenterData,
  importMasterDataCsv,
  runMasterDataValidation,
  type MasterDataCenterData
} from '../../services/master-data-service/masterDataService';

const masterTypes = [
  { key: 'process', labelKo: '공정 마스터' },
  { key: 'material', labelKo: '자재 마스터' },
  { key: 'vendor', labelKo: '업체 마스터' },
  { key: 'labor', labelKo: '인력 마스터' },
  { key: 'equipment', labelKo: '장비 마스터' },
  { key: 'standardItem', labelKo: '표준 품목' }
];

function defaultPayload(type: string): Record<string, unknown> {
  if (type === 'process') return { majorCategory: '리모델링', middleCategory: '욕실', minorCategory: '공통', processName: '방수', defaultUnit: '식', defaultLaborQty: 1, riskLevel: 'HIGH', inspectionRequired: true };
  if (type === 'material') return { materialCategory: 'tile', materialName: '600각 포세린 타일', specification: '600x600', brand: 'UNKNOWN', unit: '㎡', defaultUnitPrice: 0, latestUnitPrice: 0, recommendedVendor: '', appliedProcess: '타일' };
  if (type === 'vendor') return { vendorName: '업체명 입력', vendorType: 'supplier', processScope: '타일', contact: 'UNKNOWN', region: '서울/경기', defaultPaymentTerms: 'UNKNOWN', reliabilityScore: 70, notes: '' };
  if (type === 'labor') return { role: '기공', process: '타일', defaultDailyWage: 0, defaultProductivity: 1, skillLevel: 'NORMAL' };
  if (type === 'equipment') return { equipmentName: '장비명 입력', equipmentType: 'tool', unit: '일', defaultUnitPrice: 0, appliedProcess: '공통' };
  return { itemName: '표준 항목 입력', process: '타일', defaultUnit: '식', defaultCustomerUnitPrice: 0, defaultMaterialCost: 0, defaultLaborCost: 0, defaultSubcontractCost: 0, defaultMarginRate: 0.25, estimateType: 'bathroom_remodel', isMandatory: true };
}

export function MasterDataCenterView() {
  const [data, setData] = useState<MasterDataCenterData | null>(null);
  const [activeType, setActiveType] = useState('process');
  const [payloadText, setPayloadText] = useState(JSON.stringify(defaultPayload('process'), null, 2));
  const [csvText, setCsvText] = useState('');
  const [messageKo, setMessageKo] = useState('');

  async function refresh(runValidation = false) {
    setData(await getMasterDataCenterData({ runValidation }));
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setPayloadText(JSON.stringify(defaultPayload(activeType), null, 2));
  }, [activeType]);

  const activeRows = useMemo(() => {
    if (!data) return [];
    if (activeType === 'process') return data.processes;
    if (activeType === 'material') return data.materials;
    if (activeType === 'vendor') return data.vendors;
    if (activeType === 'labor') return data.labor;
    if (activeType === 'equipment') return data.equipment;
    return data.standardItems;
  }, [activeType, data]);

  async function handleCreate() {
    try {
      const payload = JSON.parse(payloadText);
      const result = await createMasterDataItem(activeType, payload);
      setData((result as { masterData?: MasterDataCenterData })?.masterData ?? await getMasterDataCenterData({ runValidation: true }));
      setMessageKo('기준 데이터가 저장되었습니다.');
    } catch (error) {
      setMessageKo(`저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  async function handleValidate() {
    await runMasterDataValidation();
    await refresh(true);
    setMessageKo('기준 데이터 검증을 실행했습니다.');
  }

  async function handleImport() {
    const result = await importMasterDataCsv(activeType, csvText);
    setData((result as { masterData?: MasterDataCenterData })?.masterData ?? await getMasterDataCenterData({ runValidation: true }));
    setMessageKo(`${Number((result as { importedCount?: number })?.importedCount || 0)}건을 가져왔습니다.`);
    setCsvText('');
  }

  async function handleExport() {
    const result = await exportMasterDataCsv(activeType);
    setCsvText(String((result as { csv?: string })?.csv || ''));
    setMessageKo('CSV Export 데이터가 아래 입력창에 생성되었습니다.');
  }

  if (!data) return <div className="drawer-block">기준 데이터 관리 로딩 중...</div>;

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">MASTER DATA CENTER</span>
          <h2>기준 데이터 관리</h2>
          <p>공정, 자재, 업체, 단가, 인력, 장비, 표준 품목, 견적 기본값을 하나의 기준 DB로 관리합니다.</p>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realPriceWorkbench' }))}>실제 단가 보정 워크벤치</button>
        <strong className={Number(data.summary.validationWarningCount || 0) > 0 ? 'red-kpi' : 'green-kpi'}>
          검증 {String(data.summary.validationWarningCount || 0)}건
        </strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">INITIAL SETUP</span>
            <h3>초기 기준 데이터 / 실제 단가 보정</h3>
          </div>
          <div className="button-row">
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'initialMasterData' }))}>초기 세팅 열기</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realPriceCalibration' }))}>실제 단가 보정</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'priceCalibrationPriority' }))}>단가 보정 우선순위</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'priceWorkbookImport' }))}>단가표 일괄 가져오기</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'unmatchedPriceRecommendation' }))}>단가 미매칭 추천</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'recommendationScoringRules' }))}>추천 점수 규칙</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'operationalOnboarding' }))}>운영 데이터 입력</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realProjectIntake' }))}>실제 프로젝트 접수</button>
          </div>
        </div>
        <p>초기 세팅 후 `수정 필요` 단가는 업체 견적, 실제 매입가, 노무 단가로 승인 반영하세요.</p>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>공정</span><strong>{String(data.summary.processCount || 0)}건</strong></div>
        <div><span>자재</span><strong>{String(data.summary.materialCount || 0)}건</strong></div>
        <div><span>업체</span><strong>{String(data.summary.vendorCount || 0)}곳</strong></div>
        <div><span>표준 품목</span><strong>{String(data.summary.standardItemCount || 0)}건</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">MASTER TYPES</span>
            <h3>관리 대상</h3>
          </div>
          <button onClick={handleValidate}>데이터 검증</button>
        </div>
        <div className="action-command-grid">
          {masterTypes.map((type) => (
            <button key={type.key} className={activeType === type.key ? 'command command-approve' : 'command'} onClick={() => setActiveType(type.key)}>
              {type.labelKo}
            </button>
          ))}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">MANUAL ENTRY</span>
            <h3>입력 / 수정</h3>
          </div>
        </div>
        <textarea value={payloadText} onChange={(event) => setPayloadText(event.target.value)} rows={12} />
        <button className="command command-approve" onClick={handleCreate}>기준 데이터 저장</button>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">VALIDATION</span>
            <h3>데이터 검증</h3>
          </div>
        </div>
        {data.validationLogs.length === 0 ? <p className="empty-state">검증 경고가 없습니다.</p> : (
          <div className="today-action-list">
            {data.validationLogs.map((log) => (
              <div key={String(log.id)} className={`action-row ${String(log.severity) === 'RED' ? 'warning-row' : ''}`}>
                <span>{String(log.severity)}</span>
                <div>
                  <strong>{String(log.warning_type)}</strong>
                  <p>{String(log.message_ko)}</p>
                </div>
                <em>{String(log.entity_type)}</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">MASTER LIST</span>
            <h3>{masterTypes.find((type) => type.key === activeType)?.labelKo}</h3>
          </div>
        </div>
        {activeRows.length === 0 ? <p className="empty-state">아직 등록된 기준 데이터가 없습니다.</p> : (
          <div className="cost-leak-list">
            {activeRows.slice(0, 30).map((row) => (
              <article key={String(row.id)} className="cost-leak green">
                <strong>{String(row.process_name || row.material_name || row.vendor_name || row.role || row.equipment_name || row.item_name)}</strong>
                <p>{String(row.major_category || row.material_category || row.vendor_type || row.process || row.equipment_type || row.estimate_type || '')}</p>
                <em>{row.default_unit_price || row.latest_unit_price || row.default_daily_wage || row.default_customer_unit_price ? formatWon(row.default_unit_price || row.latest_unit_price || row.default_daily_wage || row.default_customer_unit_price) : String(row.default_unit || row.unit || row.region || row.skill_level || '')}</em>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">IMPORT / EXPORT</span>
            <h3>CSV Import / Export</h3>
          </div>
        </div>
        <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder="CSV 데이터를 붙여넣거나 Export 결과를 확인합니다." rows={7} />
        <div className="button-row">
          <button onClick={handleImport}>CSV Import</button>
          <button onClick={handleExport}>CSV Export</button>
        </div>
      </section>
    </div>
  );
}
