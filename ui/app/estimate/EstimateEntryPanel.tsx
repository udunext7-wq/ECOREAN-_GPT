import type { ViewKey } from '../../src/types/dashboard';

type Props = {
  onOpen: (view: ViewKey, tone?: 'click' | 'confirm' | 'warning') => void;
};

export function EstimateEntryPanel({ onOpen }: Props) {
  return (
    <section className="estimate-entry-panel">
      <div className="estimate-entry-heading">
        <div>
          <span className="eyebrow">MAIN ENTRY</span>
          <h1>자동견적 시작</h1>
          <p>BOC는 여기서 견적을 만들고, 수익성 검증 후 실행으로 넘깁니다.</p>
        </div>
        <button className="secondary-dashboard-button" onClick={() => onOpen('dashboard', 'click')}>
          CEO Dashboard
        </button>
      </div>

      <div className="estimate-entry-grid">
        <button className="entry-button primary" onClick={() => onOpen('bathroomEstimate', 'confirm')}>
          <span>새 견적 만들기</span>
          <strong>욕실 단독 리모델링</strong>
          <em>바로 견적 생성</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('bathroomEstimate', 'click')}>
          <span>욕실 리모델링</span>
          <strong>고객가 / 원가 / 마진 자동 산출</strong>
          <em>사용 가능</em>
        </button>
        <button className="entry-button disabled" disabled>
          <span>주방 리모델링</span>
          <strong>준비 중</strong>
          <em>다음 확장</em>
        </button>
        <button className="entry-button disabled" disabled>
          <span>전체 리모델링</span>
          <strong>준비 중</strong>
          <em>공정 통합 예정</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('project', 'click')}>
          <span>저장된 견적 불러오기</span>
          <strong>프로젝트 상세</strong>
          <em>불러오기</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('bathroomEstimate', 'click')}>
          <span>고객용 견적서 출력</span>
          <strong>고객 표시 금액만 보기</strong>
          <em>출력 준비</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('bathroomEstimate', 'click')}>
          <span>내부 원가표 보기</span>
          <strong>원가 / 마진 / PCE 확인</strong>
          <em>내부용</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('contractDocuments', 'click')}>
          <span>계약 문서</span>
          <strong>견적 승인 후 계약서 생성</strong>
          <em>실행 준비</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('constructionSchedule', 'click')}>
          <span>공정표</span>
          <strong>철거부터 인도까지 자동 생성</strong>
          <em>일정 관리</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('purchaseOrders', 'click')}>
          <span>발주 관리</span>
          <strong>자재 발주 목록 자동 생성</strong>
          <em>구매 준비</em>
        </button>
      </div>
    </section>
  );
}
