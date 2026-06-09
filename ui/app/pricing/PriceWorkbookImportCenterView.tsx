import { useEffect, useMemo, useState } from 'react';
import {
  createPriceUpdateQueueFromWorkbook,
  createPriceWorkbookImportReport,
  clearPriceImportRowMatch,
  excludePriceImportRow,
  formatRate,
  formatWon,
  getPriceImportQueueReadiness,
  getPriceWorkbookImportHistory,
  getPriceWorkbookImportDetail,
  manuallyMatchPriceImportRow,
  previewPriceWorkbookImport,
  priceWorkbookImportTypes,
  searchPriceImportMatchCandidates,
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
  normalized?: Record<string, unknown>;
  id?: string | number;
};

type Candidate = {
  target_type: string;
  target_id: string | number;
  target_name: string;
  category?: string;
  unit?: string;
  current_price?: number;
  price_status?: string;
  match_score?: number;
  reason?: string;
};

export function PriceWorkbookImportCenterView() {
  const [importType, setImportType] = useState<PriceWorkbookImportType>('MATERIAL_PRICE_LIST');
  const [filePath, setFilePath] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRows, setSelectedRows] = useState<Array<string | number>>([]);
  const [candidateRows, setCandidateRows] = useState<Record<string, Candidate[]>>({});
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [manualNotes, setManualNotes] = useState<Record<string, string>>({});
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
  const readiness = useMemo(() => (preview?.readiness as Record<string, unknown>) || {}, [preview]);
  const columnMapping = useMemo(() => (preview?.columnMapping as Record<string, unknown>) || {}, [preview]);
  const importId = String(preview?.importId || (preview?.import as Record<string, unknown>)?.import_id || '');
  const manualRows = useMemo(() => rows.filter((row) => row.match_status === 'UNMATCHED' || row.match_status === 'MULTIPLE_MATCHES'), [rows]);
  const multipleRows = useMemo(() => rows.filter((row) => row.match_status === 'MULTIPLE_MATCHES'), [rows]);

  function rowId(row: PreviewRow) {
    return String(row.row_db_id || row.id || row.row_index || '');
  }

  function rowField(row: PreviewRow, key: string) {
    return String((row as Record<string, unknown>)[key] || row.normalized?.[key] || '-');
  }

  function toggleRow(row: PreviewRow) {
    const key = row.row_db_id || row.id || row.row_index || '';
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
      const resultImportId = String((result as Record<string, unknown>).importId || '');
      if (resultImportId) {
        const readinessResult = await getPriceImportQueueReadiness(resultImportId);
        setPreview({ ...result, readiness: readinessResult || {} });
      }
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
      await refreshImportDetail();
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

  async function refreshImportDetail() {
    if (!importId) return;
    const detail = await getPriceWorkbookImportDetail(importId);
    const readinessResult = await getPriceImportQueueReadiness(importId);
    if (detail) {
      setPreview({ ...detail, importId, rows: (detail as Record<string, unknown>).rows || [], readiness: readinessResult || (detail as Record<string, unknown>).readiness || {} });
      const detailRows = ((detail as Record<string, unknown>).rows as PreviewRow[]) || [];
      setSelectedRows(detailRows.filter((row) => (row.match_status === 'MATCHED' || row.match_status === 'MATCHED_MANUAL') && row.validation_status === 'VALID' && !row.queue_id).map(rowId));
    }
  }

  async function searchCandidates(row: PreviewRow) {
    const key = rowId(row);
    const keyword = rowField(row, 'item_name') !== '-' ? rowField(row, 'item_name') : '';
    const result = await searchPriceImportMatchCandidates({
      importType,
      keyword,
      filters: {
        targetType: rowField(row, 'target_type') !== '-' ? rowField(row, 'target_type') : undefined,
        category: rowField(row, 'category') !== '-' ? rowField(row, 'category') : undefined,
        unit: rowField(row, 'unit') !== '-' ? rowField(row, 'unit') : undefined
      }
    });
    setCandidateRows((current) => ({ ...current, [key]: (result.candidates as Candidate[]) || [] }));
    setMessageKo(((result.candidates as Candidate[]) || []).length > 0 ? '매칭 후보를 불러왔습니다.' : '검색 결과가 없습니다.');
  }

  async function saveManualMatch(row: PreviewRow) {
    const key = rowId(row);
    const selected = selectedCandidates[key];
    if (!selected) {
      setMessageKo('매칭할 마스터 항목을 선택하세요.');
      return;
    }
    const [targetType, targetId] = selected.split('::');
    await manuallyMatchPriceImportRow({ importRowId: key, targetType, targetId, note: manualNotes[key] || '단가표 수동 매칭' });
    setMessageKo('수동 매칭이 저장되었습니다.');
    await refreshImportDetail();
  }

  async function clearManualMatch(row: PreviewRow) {
    await clearPriceImportRowMatch({ importRowId: rowId(row) });
    setMessageKo('매칭이 해제되었습니다. 미매칭 항목은 승인 Queue로 생성되지 않습니다.');
    await refreshImportDetail();
  }

  async function excludeRow(row: PreviewRow) {
    await excludePriceImportRow({ importRowId: rowId(row), reason: manualNotes[rowId(row)] || '이번 가져오기에서 제외' });
    setMessageKo('제외된 행은 Queue 생성 대상에서 제외됩니다.');
    await refreshImportDetail();
  }

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">PRICE WORKBOOK IMPORT</span>
          <h2>단가표 일괄 가져오기</h2>
          <p>CSV 단가표를 미리보기, 컬럼 매핑, 자동 매칭, 차이율 분석 후 승인 대기 큐로 보냅니다.</p>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realPriceWorkbench' }))}>실제 단가 보정 워크벤치</button>
        <div className="button-row">
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realProjectIntake' }))}>실제 프로젝트 접수</button>
          <strong className="green-kpi">승인 후 반영</strong>
        </div>
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
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'priceCalibrationPriority' }))}>단가 보정 우선순위</button>
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

      <section className="cost-capture-panel warning-row">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">QUEUE READINESS</span>
            <h3>Queue 생성 가능 여부</h3>
          </div>
          <strong>{String(readiness.statusKo || '미리보기 필요')}</strong>
        </div>
        <div className="cost-kpi-grid live-margin-grid">
          <div><span>Queue 생성 가능</span><strong>{String(readiness.queueEligibleRows || 0)}건</strong></div>
          <div><span>수동 매칭</span><strong>{String(readiness.manuallyMatchedRows || 0)}건</strong></div>
          <div><span>매칭 필요</span><strong>{String(Number(readiness.unmatchedRows || 0) + Number(readiness.multipleMatchRows || 0))}건</strong></div>
          <div><span>검증 오류</span><strong>{String(readiness.invalidRows || 0)}건</strong></div>
          <div><span>제외됨</span><strong>{String(readiness.excludedRows || 0)}건</strong></div>
          <div><span>Queue 생성됨</span><strong>{String(readiness.queueCreatedRows || 0)}건</strong></div>
        </div>
        <p>미매칭 항목과 다중 매칭 항목은 수동 매칭을 저장하거나 제외해야 승인 Queue로 넘어가지 않습니다.</p>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">MANUAL MATCHING</span>
            <h3>미매칭 항목 / 다중 매칭 항목 / 수동 매칭</h3>
          </div>
          <span className="status-chip">다중 매칭 {String(multipleRows.length)}건</span>
        </div>
        {manualRows.length === 0 ? <p className="empty-state">미매칭 항목이 없습니다. 다중 매칭 항목이 없습니다.</p> : (
          <div className="today-action-list">
            {manualRows.map((row) => {
              const key = rowId(row);
              const candidates = candidateRows[key] || [];
              return (
                <div key={key} className="action-row warning-row">
                  <span>{String(row.match_status)}</span>
                  <div>
                    <strong>{rowField(row, 'item_name')}</strong>
                    <p>
                      분류 {rowField(row, 'category')} / 규격 {rowField(row, 'spec')} / 브랜드 {rowField(row, 'brand')} / 단위 {rowField(row, 'unit')} / 제안 단가 {formatWon(row.proposed_price || rowField(row, 'price'))}
                    </p>
                    <p>{String(row.validation_message || '마스터 데이터와 매칭되지 않았습니다.')}</p>
                    <div className="estimate-form-grid">
                      <label>
                        마스터 데이터 검색
                        <input
                          value={manualNotes[`${key}-keyword`] || (rowField(row, 'item_name') !== '-' ? rowField(row, 'item_name') : '')}
                          onChange={(event) => setManualNotes((current) => ({ ...current, [`${key}-keyword`]: event.target.value }))}
                        />
                      </label>
                      <label>
                        매칭 후보
                        <select value={selectedCandidates[key] || ''} onChange={(event) => setSelectedCandidates((current) => ({ ...current, [key]: event.target.value }))}>
                          <option value="">매칭할 마스터 항목을 선택하세요.</option>
                          {candidates.map((candidate) => (
                            <option key={`${candidate.target_type}-${candidate.target_id}`} value={`${candidate.target_type}::${candidate.target_id}`}>
                              {candidate.target_name} / {candidate.unit} / {formatWon(candidate.current_price)} / {candidate.reason}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        수동 매칭 메모
                        <input value={manualNotes[key] || ''} onChange={(event) => setManualNotes((current) => ({ ...current, [key]: event.target.value }))} placeholder="수동 매칭 사유" />
                      </label>
                    </div>
                    {candidates.length === 0 ? <p className="empty-state">검색 결과가 없습니다.</p> : null}
                  </div>
                  <div className="button-row">
                    <button onClick={() => void searchCandidates({ ...row, item_name: manualNotes[`${key}-keyword`] || rowField(row, 'item_name') })}>후보 검색</button>
                    <button onClick={() => void saveManualMatch(row)}>수동 매칭 저장</button>
                    <button onClick={() => void clearManualMatch(row)}>매칭 해제</button>
                    <button onClick={() => void excludeRow(row)}>이 행 제외</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                    <td>{rowField(row, 'item_name')}</td>
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
