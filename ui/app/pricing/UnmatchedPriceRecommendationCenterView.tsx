import { useEffect, useMemo, useState } from 'react';
import {
  approveRecommendation,
  createRecommendation,
  createRecommendationReport,
  deferRecommendation,
  formatRate,
  formatScore,
  formatWon,
  getRecommendationCandidates,
  getUnmatchedRecommendationData,
  linkRecommendationToQueue,
  rejectRecommendation,
  type UnmatchedRecommendationData
} from '../../services/pricing-service/unmatchedPriceRecommendationService';

const confidenceOptions = ['ALL', 'HIGH', 'MEDIUM', 'LOW', 'NO_MATCH'];
const statusOptions = ['ALL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DEFERRED', 'LINKED_TO_QUEUE', 'NO_MATCH'];
const importTypeOptions = [
  { value: 'ALL', label: '전체 가져오기 유형' },
  { value: 'MATERIAL_PRICE_LIST', label: '자재 단가표' },
  { value: 'VENDOR_QUOTE', label: '업체 견적 단가표' },
  { value: 'ACTUAL_PURCHASE', label: '실제 매입 단가표' },
  { value: 'LABOR_RATE', label: '노무 단가표' },
  { value: 'EQUIPMENT_PRICE', label: '장비 단가표' },
  { value: 'STANDARD_ITEM_PRICE', label: '표준 견적 품목 단가표' }
];

type Candidate = Record<string, unknown> & {
  target_type?: string;
  target_id?: string;
  target_name?: string;
  unit?: string;
  current_price?: number;
  similarity_score?: number;
  confidence_level?: string;
  recommendation_reason?: string;
  score_detail?: Record<string, unknown>;
};

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
}

function confidenceClass(value: unknown) {
  const confidence = String(value || '');
  if (confidence === 'HIGH') return 'green';
  if (confidence === 'MEDIUM') return 'yellow';
  if (confidence === 'LOW') return 'yellow';
  return 'red';
}

function rowNormalized(row: Record<string, unknown>) {
  return (row.normalized || {}) as Record<string, unknown>;
}

export function UnmatchedPriceRecommendationCenterView() {
  const [data, setData] = useState<UnmatchedRecommendationData | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [importType, setImportType] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [selectedRowId, setSelectedRowId] = useState('');
  const [candidatesByRow, setCandidatesByRow] = useState<Record<string, Candidate[]>>({});
  const [selectedCandidateByRow, setSelectedCandidateByRow] = useState<Record<string, string>>({});
  const [reviewNote, setReviewNote] = useState('대표 검토 완료');
  const [queueId, setQueueId] = useState('');
  const [messageKo, setMessageKo] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setData(await getUnmatchedRecommendationData({
      confidenceLevel,
      status,
      importType,
      keyword
    }));
  }

  useEffect(() => {
    void refresh();
  }, [confidenceLevel, status, importType]);

  const rows = useMemo(() => data?.rows || [], [data]);
  const summary = data?.summary || {};
  const selectedRow = rows.find((row) => String(row.id) === selectedRowId) || null;
  const selectedRecommendation = (selectedRow?.recommendation || null) as Record<string, unknown> | null;
  const selectedCandidates = selectedRowId ? candidatesByRow[selectedRowId] || [] : [];

  async function loadCandidates(rowId: string) {
    setBusy(true);
    try {
      const result = await getRecommendationCandidates(rowId, { limit: 3 });
      const candidates = ((result as Record<string, unknown>)?.candidates || []) as Candidate[];
      setCandidatesByRow((current) => ({ ...current, [rowId]: candidates }));
      setSelectedRowId(rowId);
      if (candidates[0]) {
        setSelectedCandidateByRow((current) => ({
          ...current,
          [rowId]: `${String(candidates[0].target_type)}::${String(candidates[0].target_id)}`
        }));
      }
      setMessageKo(candidates.length > 0 ? '추천 후보 Top 3를 계산했습니다.' : '추천 기준을 충족하는 후보가 없습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '추천 후보 계산에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function saveRecommendation(rowId: string) {
    const selected = selectedCandidateByRow[rowId];
    const [targetType, candidateMasterItemId] = selected ? selected.split('::') : ['', ''];
    setBusy(true);
    try {
      const recommendation = await createRecommendation(rowId, {
        targetType,
        candidateMasterItemId,
        note: reviewNote
      });
      setMessageKo(`추천이 생성되었습니다: ${String(recommendation?.confidence_level || 'NO_MATCH')}`);
      await refresh();
      setSelectedRowId(rowId);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '추천 생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function requestNewMaster(rowId: string) {
    setBusy(true);
    try {
      await createRecommendation(rowId, {
        forceNoMatch: true,
        note: '신규 Master Data 후보 검토 요청'
      });
      setMessageKo('신규 Master Data 후보 검토 요청으로 기록했습니다. 자동 생성이나 단가 반영은 수행하지 않습니다.');
      await refresh();
      setSelectedRowId(rowId);
    } finally {
      setBusy(false);
    }
  }

  async function review(action: 'approve' | 'reject' | 'defer') {
    const recommendationId = String(selectedRecommendation?.recommendation_id || '');
    if (!recommendationId) {
      setMessageKo('검토할 추천을 먼저 생성하세요.');
      return;
    }
    setBusy(true);
    try {
      if (action === 'approve') {
        await approveRecommendation(recommendationId, { note: reviewNote, reviewedBy: 'CEO' });
        setMessageKo('추천을 승인했습니다. Master Data 가격은 변경되지 않았습니다.');
      }
      if (action === 'reject') {
        await rejectRecommendation(recommendationId, { reason: reviewNote, reviewedBy: 'CEO' });
        setMessageKo('추천을 반려했습니다.');
      }
      if (action === 'defer') {
        await deferRecommendation(recommendationId, { reason: reviewNote, reviewedBy: 'CEO' });
        setMessageKo('추천을 보류했습니다.');
      }
      await refresh();
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '추천 검토 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function linkQueue() {
    const recommendationId = String(selectedRecommendation?.recommendation_id || '');
    if (!recommendationId) {
      setMessageKo('승인된 추천을 먼저 선택하세요.');
      return;
    }
    setBusy(true);
    try {
      const result = await linkRecommendationToQueue(recommendationId, queueId);
      const linkedQueue = (result?.queue || {}) as Record<string, unknown>;
      setQueueId(String(linkedQueue.id || queueId || ''));
      setMessageKo(`Price Queue 연결 완료: ${String(linkedQueue.id || '-')}. 상태는 PENDING_REVIEW이며 Master Data는 변경되지 않았습니다.`);
      await refresh();
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : 'Price Queue 연결에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function createReport() {
    const result = await createRecommendationReport({ confidenceLevel, status, importType, keyword });
    setMessageKo(`추천 리포트 생성: ${String(result?.reportPath || '-')}`);
  }

  if (!data) return <div className="drawer-block">단가 미매칭 추천 센터 로딩 중...</div>;

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">UNMATCHED PRICE RECOMMENDATION</span>
          <h2>단가 미매칭 추천 센터</h2>
          <p>미매칭 import row와 기존 Master Data를 비교해 후보 Top 3와 신뢰도를 제시합니다.</p>
        </div>
        <strong className={Number(summary.totalUnmatchedCount || 0) > 0 ? 'red-kpi' : 'green-kpi'}>
          미매칭 {String(summary.totalUnmatchedCount || 0)}건
        </strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <strong>자동 추천, 수동 결정</strong>
        <p>추천 승인이나 Queue 연결만으로 Master Data 가격은 변경되지 않습니다. 최종 반영은 기존 워크벤치 승인, 백업, 이력 기록 절차를 사용합니다.</p>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>미매칭 전체</span><strong>{String(summary.totalUnmatchedCount || 0)}건</strong></div>
        <div><span>HIGH 추천</span><strong>{String(summary.highRecommendationCount || 0)}건</strong></div>
        <div><span>MEDIUM 추천</span><strong>{String(summary.mediumRecommendationCount || 0)}건</strong></div>
        <div><span>LOW 추천</span><strong>{String(summary.lowRecommendationCount || 0)}건</strong></div>
        <div><span>NO_MATCH</span><strong>{String(summary.noMatchCount || 0)}건</strong></div>
        <div><span>Queue 연결 가능</span><strong>{String(summary.queueLinkableCount || 0)}건</strong></div>
        <div><span>신규 Master 검토</span><strong>{String(summary.newMasterReviewCount || 0)}건</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">FILTER</span>
            <h3>가져오기 유형 / 신뢰도 / 상태</h3>
          </div>
          <button disabled={busy} onClick={() => void refresh()}>새로고침</button>
        </div>
        <div className="estimate-form-grid">
          <label>가져오기 유형
            <select value={importType} onChange={(event) => setImportType(event.target.value)}>
              {importTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>신뢰도
            <select value={confidenceLevel} onChange={(event) => setConfidenceLevel(event.target.value)}>
              {confidenceOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>추천 상태
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>검색
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="품목명 / 분류 / 규격" />
          </label>
        </div>
        <div className="button-row">
          <button onClick={() => void refresh()}>검색 적용</button>
          <button onClick={() => navigate('priceWorkbookImport')}>관련 import row</button>
          <button onClick={() => navigate('realPriceWorkbench')}>관련 Workbench</button>
          <button onClick={() => navigate('priceCalibrationPriority')}>단가 보정 우선순위</button>
          <button onClick={() => void createReport()}>리포트 생성</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">UNMATCHED ROWS</span>
            <h3>미매칭 import row / 추천 결과</h3>
          </div>
        </div>
        {rows.length === 0 ? <p className="empty-state">추천할 미매칭 항목이 없습니다.</p> : (
          <div className="cost-table-wrapper">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Import 품목</th>
                  <th>분류 / 규격</th>
                  <th>단위</th>
                  <th>Import 단가</th>
                  <th>추천 Master</th>
                  <th>기존 단가</th>
                  <th>점수</th>
                  <th>신뢰도</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const normalized = rowNormalized(row);
                  const recommendation = (row.recommendation || {}) as Record<string, unknown>;
                  const rowId = String(row.id || '');
                  return (
                    <tr key={rowId}>
                      <td>
                        <button onClick={() => {
                          setSelectedRowId(rowId);
                          void loadCandidates(rowId);
                        }}>
                          {String(normalized.item_name || '이름 없음')}
                        </button>
                      </td>
                      <td>{String(normalized.category || '-') } / {String(normalized.spec || '-')}</td>
                      <td>{String(normalized.unit || row.unit || '-')}</td>
                      <td>{formatWon(row.proposed_price || normalized.price)}</td>
                      <td>{String(recommendation.candidate_item_name || '추천 전')}</td>
                      <td>{formatWon(recommendation.candidate_price)}</td>
                      <td>{formatScore(recommendation.similarity_score)}</td>
                      <td><span className={`status-pill ${confidenceClass(recommendation.confidence_level)}`}>{String(recommendation.confidence_level || '-')}</span></td>
                      <td>{String(recommendation.status || row.match_status || '-')}</td>
                      <td>
                        <button disabled={busy} onClick={() => void loadCandidates(rowId)}>후보 Top 3</button>
                        <button disabled={busy} onClick={() => void requestNewMaster(rowId)}>신규 Master 검토</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">DETAIL</span>
            <h3>추천 후보 Top 3 / 점수 근거 / 검토</h3>
          </div>
        </div>
        {!selectedRow ? <p className="empty-state">미매칭 행을 선택하세요.</p> : (
          <>
            <div className="cost-leak-list">
              {selectedCandidates.length === 0 ? <p className="empty-state">후보 계산을 실행하세요.</p> : selectedCandidates.map((candidate, index) => {
                const value = `${String(candidate.target_type)}::${String(candidate.target_id)}`;
                const scoreDetail = candidate.score_detail || {};
                return (
                  <article className={`cost-leak ${confidenceClass(candidate.confidence_level)}`} key={value}>
                    <label>
                      <input
                        type="radio"
                        name={`candidate-${selectedRowId}`}
                        checked={selectedCandidateByRow[selectedRowId] === value}
                        onChange={() => setSelectedCandidateByRow((current) => ({ ...current, [selectedRowId]: value }))}
                      />
                      후보 {index + 1}: {String(candidate.target_name || '-')}
                    </label>
                    <p>{String(candidate.target_type)} / {String(candidate.unit || '-')} / {formatWon(candidate.current_price)}</p>
                    <strong>{formatScore(candidate.similarity_score)} / {String(candidate.confidence_level)}</strong>
                    <p>{String(candidate.recommendation_reason || '점수 근거 없음')}</p>
                    <em>
                      이름 {Math.round(Number(scoreDetail.nameSimilarity || 0) * 100)}% /
                      분류 {Math.round(Number(scoreDetail.categorySimilarity || 0) * 100)}% /
                      단위 {scoreDetail.unitMatch ? '일치' : '차이'}
                    </em>
                  </article>
                );
              })}
            </div>

            <div className="estimate-form-grid">
              <label>승인 / 반려 / 보류 메모
                <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
              </label>
              <label>기존 Queue ID 연결 (선택)
                <input value={queueId} onChange={(event) => setQueueId(event.target.value)} placeholder="비우면 PENDING_REVIEW Queue 생성" />
              </label>
            </div>
            <div className="button-row">
              <button className="command command-approve" disabled={busy || selectedCandidates.length === 0} onClick={() => void saveRecommendation(selectedRowId)}>추천 저장</button>
              <button disabled={busy || !selectedRecommendation || selectedRecommendation.status === 'NO_MATCH'} onClick={() => void review('approve')}>추천 승인</button>
              <button disabled={busy || !selectedRecommendation || selectedRecommendation.status === 'NO_MATCH'} onClick={() => void review('reject')}>추천 반려</button>
              <button disabled={busy || !selectedRecommendation} onClick={() => void review('defer')}>추천 보류</button>
              <button
                disabled={busy || String(selectedRecommendation?.status || '') !== 'APPROVED'}
                onClick={() => void linkQueue()}
              >
                Price Queue로 연결
              </button>
              <button onClick={() => navigate('priceWorkbookImport')}>관련 import row로 이동</button>
              <button onClick={() => navigate('realPriceWorkbench')}>관련 Workbench로 이동</button>
            </div>

            {selectedRecommendation ? (
              <div className="cost-leak-list">
                <article className={`cost-leak ${confidenceClass(selectedRecommendation.confidence_level)}`}>
                  <strong>현재 추천 상태</strong>
                  <p>{String(selectedRecommendation.recommendation_id)} / {String(selectedRecommendation.status)}</p>
                  <em>{String(selectedRecommendation.review_note || '검토 메모 없음')}</em>
                </article>
                <article className="cost-leak yellow">
                  <strong>가격 차이율</strong>
                  <p>
                    Import {formatWon(selectedRecommendation.import_price)} /
                    Master {formatWon(selectedRecommendation.candidate_price)}
                  </p>
                  <em>
                    {formatRate(
                      Number(selectedRecommendation.candidate_price || 0) > 0
                        ? (Number(selectedRecommendation.import_price || 0) - Number(selectedRecommendation.candidate_price || 0))
                          / Number(selectedRecommendation.candidate_price)
                        : null
                    )}
                  </em>
                </article>
                <article className="cost-leak green">
                  <strong>Queue 연결</strong>
                  <p>{String(selectedRecommendation.linked_queue_id || '아직 연결되지 않음')}</p>
                  <em>연결 후에도 기존 워크벤치 승인/백업/반영이 필요합니다.</em>
                </article>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
