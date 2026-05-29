import { useEffect, useMemo, useState } from 'react';
import {
  createPriceUpdateQueueFromWorkbook,
  createPriceWorkbookImportReport,
  formatRate,
  formatWon,
  getPriceWorkbookImportHistory,
  previewPriceWorkbookImport,
  priceWorkbookImportTypes,
  selectPriceWorkbookFile,
  type PriceWorkbookImportType
} from '../../services/pricing-service/priceWorkbookImportService';

type PreviewRow = Record<string, unknown> & {
  row_db_id?: number;
  row_index?: number;
  item_name?: string;
  unit?: string;
  price?: number;
  current_price?: number;
  variance_rate?: number | null;
  match_status?: string;
  validation_status?: string;
  validation_message?: string;
  matched_target_name?: string;
};

export function PriceWorkbookImportCenterView() {
  const [importType, setImportType] = useState<PriceWorkbookImportType>('MATERIAL_PRICE_LIST');
  const [filePath, setFilePath] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRows, setSelectedRows] = useState<Array<string | number>>([]);
  const [messageKo, setMessageKo] = useState('');
  const [busy, setBusy] = useState(false);

  async function refreshHistory() {
    setHistory(await getPriceWorkbookImportHistory());
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  const rows = useMemo(() => (preview?.rows as PreviewRow[]) || [], [preview]);
  const summary = useMemo(() => (preview?.summary as Record<string, unknown>) || {}, [preview]);
  const columnMapping = useMemo(() => (preview?.columnMapping as Record<string, unknown>) || {}, [preview]);
  const importId = String(preview?.importId || '');

  function toggleRow(row: PreviewRow) {
    const key = row.row_db_id || row.row_index || '';
    setSelectedRows((current) => (
      current.map(String).includes(String(key))
        ? current.filter((item) => String(item) !== String(key))
        : [...current, key]
    ));
  }

  async function chooseFile() {
    const result = await selectPriceWorkbookFile();
    if (result?.canceled) return;
    setFilePath(String((result as Record<string, unknown>)?.filePath || ''));
  }

  async function runPreview() {
    if (!filePath) {
      setMessageKo('가져올 CSV 파일을 먼저 선택하세요.');
      return;
    }
    setBusy(true);
    try {
      const result = await previewPriceWorkbookImport({ filePath, importType });
      setPreview(result);
      setSelectedRows(((result.rows as PreviewRow[]) || []).filter((row) => row.match_status === 'MATCHED' && row.validation_status === 'VALID').map((row) => row.row_db_id || row.row_index || ''));
      setMessageKo('단가표 미리보기와 자동 매칭이 완료되었습니다.');
      await refreshHistory();
    } catch (error) {
      setMessageKo(`단가표 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setBusy(false);
    }
  }

  async function createQueue() {
    if (!importId) return;
    setBusy(true);
    try {
      const result = await createPriceUpdateQueueFromWorkbook({ importId, selectedRowIds: selectedRows, selectedRowIndexes: selectedRows });
      setMessageKo(`승인 대기 단가 ${String(result?.createdCount || 0)}건이 생성되었습니다. 실제 단가 보정 센터에서 승인 후 반영하세요.`);
      await refreshHistory();
    } finally {
      setBusy(false);
    }
  }

  async function createReport() {
    if (!importId) return;
    const result = await createPriceWorkbookImportReport(importId);
    setMessageKo(`가져오기 리포트 생성: ${String(result?.reportPath || '-')}`);
  }

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">PRICE WORKBOOK IMPORT</span>
          <h2>단가표 일괄 가져오기</h2>
          <p>CSV 단가표를 미리보기, 컬럼 매핑, 자동 매칭, 차이율 분석 후 승인 대기 큐로 보냅니다.</p>
        </div>
        <strong className="green-kpi">승인 후 반영</strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <strong>고객 안전 / 운영 주의</strong>
        <p>가져온 단가는 마스터 데이터에 직접 반영되지 않습니다. 실제 단가 보정 센터에서 승인과 백업 후 반영해야 하며, 고객 화면에는 업체 견적/노무 단가/차이율을 표시하지 않습니다.</p>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">FILE</span>
            <h3>파일 선택 / 가져오기 유형</h3>
          </div>
          <button disabled={busy} onClick={() => void refreshHistory()}>가져오기 이력</button>
        </div>
        <div className="estimate-form-grid">
          <label>
            가져오기 유형
            <select value={importType} onChange={(event) => setImportType(event.target.value as PriceWorkbookImportType)}>
              {priceWorkbookImportTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label>
            선택 파일
            <input value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder="CSV 파일 경로" />
          </label>
        </div>
        <div className="button-row">
          <button disabled={busy} onClick={() => void chooseFile()}>파일 선택</button>
          <button className="command command-approve" disabled={busy} onClick={() => void runPreview()}>미리보기 / 자동 매칭</button>
          <button disabled={!importId || busy} onClick={() => void createQueue()}>승인 대기 생성</button>
          <button disabled={!importId || busy} onClick={() => void createReport()}>가져오기 리포트</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realPriceCalibration' }))}>실제 단가 보정으로 이동</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'operationalOnboarding' }))}>운영 데이터 입력으로 이동</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>전체 행</span><strong>{String(summary.rowCount || 0)}건</strong></div>
        <div><span>정상 행</span><strong>{String(summary.validCount || 0)}건</strong></div>
        <div><span>자동 매칭</span><strong>{String(summary.matchedCount || 0)}건</strong></div>
        <div><span>미매칭 항목</span><strong>{String(summary.unmatchedCount || 0)}건</strong></div>
        <div><span>차이율 주의</span><strong>{String(summary.highVarianceCount || 0)}건</strong></div>
        <div><span>선택 행</span><strong>{String(selectedRows.length)}건</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">COLUMN MAPPING</span>
            <h3>컬럼 매핑</h3>
          </div>
        </div>
        <div className="cost-kpi-grid live-margin-grid">
          {Object.entries((columnMapping.mapping as Record<string, unknown>) || {}).map(([field, header]) => (
            <div key={field}><span>{field}</span><strong>{String(header)}</strong></div>
          ))}
          {((columnMapping.missingRequired as string[]) || []).map((field) => (
            <div key={field}><span>{field}</span><strong>필수 컬럼 매핑 부족</strong></div>
          ))}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PREVIEW</span>
            <h3>미리보기 / 미매칭 항목 / 차이율 분석</h3>
          </div>
        </div>
        <div className="cost-table-wrapper">
          <table className="cost-table">
            <thead>
              <tr>
                <th>선택</th>
                <th>항목명</th>
                <th>매칭 대상</th>
                <th>가져온 단가</th>
                <th>현재 단가</th>
                <th>단위</th>
                <th>차이율</th>
                <th>매칭</th>
                <th>검증</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = row.row_db_id || row.row_index || '';
                const checked = selectedRows.map(String).includes(String(key));
                const selectable = row.match_status === 'MATCHED' && row.validation_status === 'VALID';
                return (
                  <tr key={String(key)}>
                    <td><input type="checkbox" checked={checked} disabled={!selectable} onChange={() => toggleRow(row)} /></td>
                    <td>{String(row.item_name || '-')}</td>
                    <td>{String(row.matched_target_name || '-')}</td>
                    <td>{formatWon(row.price)}</td>
                    <td>{formatWon(row.current_price)}</td>
                    <td>{String(row.unit || '-')}</td>
                    <td>{formatRate(row.variance_rate)}</td>
                    <td>{String(row.match_status || '-')}</td>
                    <td>{String(row.validation_message || row.validation_status || '-')}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? <tr><td colSpan={9}>가져온 단가표가 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">HISTORY</span>
            <h3>가져오기 이력</h3>
          </div>
        </div>
        {history.length === 0 ? <p className="empty-state">가져오기 이력이 없습니다.</p> : (
          <div className="today-action-list">
            {history.slice(0, 20).map((item) => (
              <div key={String(item.import_id)} className="action-row">
                <span>{String(item.status)}</span>
                <div>
                  <strong>{String(item.file_name)}</strong>
                  <p>{String(item.import_type)} / 행 {String(item.row_count)} / 매칭 {String(item.matched_count)} / 승인 대기 {String(item.queue_created_count)}</p>
                </div>
                <em>{String(item.created_at)}</em>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
