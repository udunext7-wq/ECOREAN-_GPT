import { useEffect, useMemo, useState } from 'react';
import {
  applyLightBIMQuantityReview,
  confirmLightBIMQuantityReview,
  getLightBIMQuantityReviews,
  ignoreLightBIMQuantityReview,
  recalculateEstimateAfterQuantityReview,
  resetLightBIMQuantityReviewToDefault,
  updateLightBIMQuantityReview
} from '../../services/lightbim-quantity-review-service/lightBIMQuantityReviewService';

type ReviewItem = {
  id: string;
  estimateType: string;
  estimateId: string;
  category: string;
  itemName: string;
  unit: string;
  originalQuantity: number;
  lightBimQuantity: number | null;
  currentQuantity: number;
  quantitySource: 'LIGHTBIM' | 'USER' | 'DEFAULT';
  quantityBasisKey: string;
  quantityNote: string;
  warningCode: string;
  warningMessage: string;
  warningStatus: string;
  reviewedStatus: 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN' | 'IGNORED';
  overrideReason: string;
};

type ReviewSummary = {
  totalCount?: number;
  pendingCount?: number;
  confirmedCount?: number;
  overriddenCount?: number;
  ignoredCount?: number;
  criticalUnresolvedCount?: number;
  lightbimCount?: number;
  userCount?: number;
  defaultCount?: number;
  estimateType?: string;
  estimateId?: string;
};

function sourceLabel(source: string) {
  if (source === 'LIGHTBIM') return 'LightBIM 도면 수량';
  if (source === 'USER') return '사용자 수정';
  return '기본 산식';
}

function statusLabel(status: string) {
  if (status === 'CONFIRMED') return '확정됨';
  if (status === 'OVERRIDDEN') return '사용자 수정';
  if (status === 'IGNORED') return '무시';
  return '수량 검토 필요';
}

function formatNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '0';
}

export function LightBIMQuantityReviewView() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({});
  const [message, setMessage] = useState('LightBIM 수량 검토 데이터를 불러오는 중입니다.');
  const [edits, setEdits] = useState<Record<string, { quantity: string; reason: string }>>({});
  const [recalculation, setRecalculation] = useState<Record<string, unknown> | null>(null);

  const target = useMemo(() => ({
    estimateType: summary.estimateType || reviews[0]?.estimateType,
    estimateId: summary.estimateId || reviews[0]?.estimateId
  }), [reviews, summary]);

  function storeReviewState(nextSummary: ReviewSummary, nextReviews: ReviewItem[]) {
    try {
      const raw = window.sessionStorage.getItem('ecorean:lightbimDraft');
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;
      draft.quantityReviewSummary = nextSummary;
      const input = (draft.input || {}) as Record<string, unknown>;
      const manualQuantityOverrides = nextReviews.reduce<Record<string, number>>((overrides, review) => {
        if (review.quantitySource === 'USER' && review.quantityBasisKey) {
          overrides[review.quantityBasisKey] = review.currentQuantity;
        }
        return overrides;
      }, {});
      const lightBimQuantityReviewState = nextReviews.reduce<Record<string, Record<string, unknown>>>((state, review) => {
        if (review.quantityBasisKey) {
          state[review.quantityBasisKey] = {
            reviewedStatus: review.reviewedStatus,
            quantitySource: review.quantitySource,
            currentQuantity: review.currentQuantity,
            overrideReason: review.overrideReason
          };
        }
        return state;
      }, {});
      draft.input = { ...input, manualQuantityOverrides, lightBimQuantityReviewState };
      window.sessionStorage.setItem('ecorean:lightbimDraft', JSON.stringify(draft));
    } catch {
      // Storage is optional; the review center remains usable without it.
    }
  }

  async function load(payload: Record<string, unknown> = {}) {
    const result = await getLightBIMQuantityReviews(payload);
    const nextReviews = Array.isArray(result.reviews) ? result.reviews as ReviewItem[] : [];
    setReviews(nextReviews);
    const nextSummary = (result.summary || {}) as ReviewSummary;
    setSummary(nextSummary);
    storeReviewState(nextSummary, nextReviews);
    setMessage(nextReviews.length ? '가져오기 성공' : '수량 검토 항목이 없습니다.');
  }

  useEffect(() => {
    void load();
  }, []);

  async function refreshFromResult(result: Record<string, unknown>) {
    if (result?.ok === false) {
      setMessage(String(result.errorMessage || '데이터를 불러오지 못했습니다.'));
      return;
    }
    const review = result.review as ReviewItem | undefined;
    const nextSummary = (result.summary || summary) as ReviewSummary;
    setSummary(nextSummary);
    if (review) {
      setReviews((current) => {
        const nextReviews = current.map((item) => (item.id === review.id ? review : item));
        storeReviewState(nextSummary, nextReviews);
        return nextReviews;
      });
      setMessage('재계산 완료');
      return;
    }
    await load(target);
  }

  async function confirmAll() {
    for (const review of reviews.filter((item) => item.reviewedStatus === 'PENDING')) {
      await confirmLightBIMQuantityReview({ reviewId: review.id });
    }
    await load(target);
    setMessage('전체 확인 완료');
  }

  async function recalculate() {
    const result = await recalculateEstimateAfterQuantityReview(target as Record<string, unknown>) as Record<string, unknown>;
    setRecalculation(result);
    setMessage(String(result.pceMessageKo || result.messageKo || 'PCE 재검증 완료'));
  }

  return (
    <div className="view-stack">
      <section className="panel-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">LIGHTBIM QUANTITY REVIEW</span>
            <h3>LightBIM 수량 검토</h3>
            <p>도면에서 넘어온 수량을 견적 확정 전에 확인하고, 필요한 항목은 사용자 수량으로 수정합니다.</p>
          </div>
          <div className="button-row">
            <button onClick={confirmAll} disabled={!reviews.length}>전체 확인</button>
            <button onClick={recalculate} disabled={!reviews.length}>재계산</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimExecutionFeedback' }))}>실행 피드백 열기</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimTraceability' }))}>이 수량 추적</button>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card"><span>전체 항목</span><strong>{summary.totalCount || 0}</strong></div>
          <div className="kpi-card"><span>검토 대기</span><strong>{summary.pendingCount || 0}</strong></div>
          <div className="kpi-card"><span>사용자 수정</span><strong>{summary.overriddenCount || 0}</strong></div>
          <div className="kpi-card"><span>Critical 경고</span><strong>{summary.criticalUnresolvedCount || 0}</strong></div>
        </div>
        <p className="muted">{message}</p>
      </section>

      <section className="panel-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">SPACE / PROCESS / ITEM</span>
            <h3>공간별 수량 · 공정별 수량 · 견적 항목별 수량</h3>
          </div>
        </div>

        {!reviews.length ? (
          <div className="empty-state">수량 검토 항목이 없습니다.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>공정</th>
                  <th>항목</th>
                  <th>도면 수량</th>
                  <th>현재 적용 수량</th>
                  <th>단위</th>
                  <th>수량 출처</th>
                  <th>수량 근거</th>
                  <th>경고</th>
                  <th>상태</th>
                  <th>수정 수량</th>
                  <th>사유</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const edit = edits[review.id] || { quantity: String(review.currentQuantity || ''), reason: review.overrideReason || '' };
                  return (
                    <tr key={review.id}>
                      <td>{review.category}</td>
                      <td>{review.itemName}</td>
                      <td>{review.lightBimQuantity == null ? '데이터 없음' : formatNumber(review.lightBimQuantity)}</td>
                      <td>{formatNumber(review.currentQuantity)}</td>
                      <td>{review.unit}</td>
                      <td>{sourceLabel(review.quantitySource)}</td>
                      <td>{review.quantityBasisKey || review.quantityNote || '기본 산식'}</td>
                      <td>
                        {review.warningCode ? (
                          <span className={review.warningStatus === 'CRITICAL' ? 'status-chip red' : 'status-chip yellow'}>
                            {review.warningMessage || review.warningCode}
                          </span>
                        ) : '없음'}
                      </td>
                      <td>{statusLabel(review.reviewedStatus)}</td>
                      <td>
                        <input
                          value={edit.quantity}
                          onChange={(event) => setEdits((current) => ({ ...current, [review.id]: { ...edit, quantity: event.target.value } }))}
                          inputMode="decimal"
                        />
                      </td>
                      <td>
                        <input
                          value={edit.reason}
                          placeholder="수정 사유"
                          onChange={(event) => setEdits((current) => ({ ...current, [review.id]: { ...edit, reason: event.target.value } }))}
                        />
                      </td>
                      <td>
                        <div className="button-row compact">
                          <button onClick={async () => refreshFromResult(await confirmLightBIMQuantityReview({ reviewId: review.id }))}>확인</button>
                          <button onClick={async () => refreshFromResult(await updateLightBIMQuantityReview({ reviewId: review.id, quantity: edit.quantity, reason: edit.reason }))}>수량 수정</button>
                          <button onClick={async () => refreshFromResult(await applyLightBIMQuantityReview({ reviewId: review.id }))}>LightBIM 수량 적용</button>
                          <button onClick={async () => refreshFromResult(await resetLightBIMQuantityReviewToDefault({ reviewId: review.id }))}>기본값으로 되돌리기</button>
                          <button onClick={async () => refreshFromResult(await ignoreLightBIMQuantityReview({ reviewId: review.id, reason: edit.reason || '검토 후 무시' }))}>무시</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">RECALCULATION</span>
            <h3>재계산 · PCE 재검증 · 확정</h3>
          </div>
        </div>
        {recalculation ? (
          <div className="kpi-grid">
            <div className="kpi-card"><span>변경 전 고객가</span><strong>{formatNumber((recalculation.before as Record<string, unknown>)?.revenue)}원</strong></div>
            <div className="kpi-card"><span>변경 후 고객가</span><strong>{formatNumber((recalculation.after as Record<string, unknown>)?.revenue)}원</strong></div>
            <div className="kpi-card"><span>변경 전 원가</span><strong>{formatNumber((recalculation.before as Record<string, unknown>)?.totalCost)}원</strong></div>
            <div className="kpi-card"><span>변경 후 원가</span><strong>{formatNumber((recalculation.after as Record<string, unknown>)?.totalCost)}원</strong></div>
            <div className="kpi-card"><span>변경 전 PCE</span><strong>{String((recalculation.before as Record<string, unknown>)?.decision || '-')}</strong></div>
            <div className="kpi-card"><span>변경 후 PCE</span><strong>{String((recalculation.after as Record<string, unknown>)?.decision || '-')}</strong></div>
          </div>
        ) : (
          <div className="empty-state">재계산 결과가 없습니다.</div>
        )}
      </section>
    </div>
  );
}
