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
        <button className="secondary-dashboard-button" onClick={() => onOpen('ceoControlTower', 'warning')}>
          CEO Control Tower
        </button>
        <button className="secondary-dashboard-button" onClick={() => onOpen('communication', 'click')}>
          Communication
        </button>
        <button className="secondary-dashboard-button" onClick={() => onOpen('payment', 'warning')}>
          Payment
        </button>
        <button className="secondary-dashboard-button" onClick={() => onOpen('closing', 'warning')}>
          Project Closing
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
        <button className="entry-button primary" onClick={() => onOpen('executionManagement', 'confirm')}>
          <span>현장 실행 관리</span>
          <strong>공사일보 / 출역 / 입고 / 검수</strong>
          <em>시공 통제</em>
        </button>
        <button className="entry-button primary" onClick={() => onOpen('ceoControlTower', 'warning')}>
          <span>CEO Control Tower</span>
          <strong>오늘 위험 / 승인 / 현금흐름</strong>
          <em>대표 판단</em>
        </button>
        <button className="entry-button primary" onClick={() => onOpen('communication', 'click')}>
          <span>커뮤니케이션 센터</span>
          <strong>고객 안내 / 발주 메시지 / 결제 요청</strong>
          <em>복사 발송</em>
        </button>
        <button className="entry-button primary" onClick={() => onOpen('payment', 'warning')}>
          <span>결제 / 현금흐름</span>
          <strong>계약금 / 중도금 / 잔금 / 지급 승인</strong>
          <em>돈 흐름 통제</em>
        </button>
        <button className="entry-button primary" onClick={() => onOpen('closing', 'warning')}>
          <span>프로젝트 마감</span>
          <strong>실제 수익 / 실제 원가 / 최종 마진 확정</strong>
          <em>마감 학습</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('executionManagement', 'click')}>
          <span>공사일보</span>
          <strong>금일 공정 기록</strong>
          <em>현장 기록</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('executionManagement', 'click')}>
          <span>출역일보</span>
          <strong>품수 / 노무비 기록</strong>
          <em>원가 연결</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('executionManagement', 'click')}>
          <span>자재입고</span>
          <strong>발주 대비 입고 확인</strong>
          <em>부족 경고</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('executionManagement', 'warning')}>
          <span>검수 체크리스트</span>
          <strong>FAIL 시 후속 공정 차단</strong>
          <em>RED ALERT</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('executionManagement', 'warning')}>
          <span>추가공사 승인</span>
          <strong>PCE 기반 저마진 차단</strong>
          <em>승인 필요</em>
        </button>
        <button className="entry-button" onClick={() => onOpen('executionManagement', 'warning')}>
          <span>하자관리</span>
          <strong>Root Cause / 예방 룰 연결</strong>
          <em>학습 반영</em>
        </button>
      </div>
    </section>
  );
}
