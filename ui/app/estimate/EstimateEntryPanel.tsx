import type { ViewKey } from '../../src/types/dashboard';

type Tone = 'click' | 'confirm' | 'warning';

type Props = {
  onOpen: (view: ViewKey, tone?: Tone) => void;
};

type EntryAction = {
  title: string;
  headline: string;
  note: string;
  view: ViewKey;
  tone?: Tone;
  primary?: boolean;
};

const primaryActions: EntryAction[] = [
  {
    title: '새 견적 만들기',
    headline: '욕실 리모델링부터 바로 시작',
    note: '견적 생성',
    view: 'bathroomEstimate',
    tone: 'confirm',
    primary: true
  },
  {
    title: '욕실 리모델링',
    headline: '타일 / 도기 / 방수 / 옵션 자동 산출',
    note: '사용 가능',
    view: 'bathroomEstimate',
    tone: 'confirm',
    primary: true
  },
  {
    title: '주방 리모델링',
    headline: '가구 / 상판 / 설비 / 전기 자동 산출',
    note: '사용 가능',
    view: 'kitchenEstimate',
    tone: 'confirm',
    primary: true
  },
  {
    title: '전체 리모델링',
    headline: '공정별 견적 / 원가 / 마진 통합 산출',
    note: '사용 가능',
    view: 'fullRemodelingEstimate',
    tone: 'confirm',
    primary: true
  },
  {
    title: '저장된 견적 불러오기',
    headline: '저장된 견적과 프로젝트를 다시 확인',
    note: '프로젝트 목록',
    view: 'project'
  },
  {
    title: '고객용 견적서 출력',
    headline: '고객 제출용 PDF / Excel / 인쇄',
    note: '출력 준비',
    view: 'bathroomEstimate'
  },
  {
    title: '내부 원가표 보기',
    headline: '원가 / 마진 / PCE 결과 확인',
    note: '내부 검토',
    view: 'bathroomEstimate'
  }
];

const secondaryActions: EntryAction[] = [
  { title: 'CEO Control Tower', headline: '오늘의 위험과 승인 대기', note: '운영 통제', view: 'ceoControlTower', tone: 'warning' },
  { title: '현장 모바일', headline: '출역 / 공사일보 / 사진 / 검수 / 위험 보고', note: '모바일 현장', view: 'fieldMobile', tone: 'confirm' },
  { title: '현장 실행 관리', headline: '공사일보 / 출역 / 자재입고 / 검수', note: '현장 관리', view: 'executionManagement' },
  { title: '결제/현금흐름', headline: '입금 / 지급 / 연체 / 7일 현금흐름', note: '자금 관리', view: 'payment', tone: 'warning' },
  { title: '고객 포털', headline: '견적 / 계약 / 일정 / 결제 / 하자 접수', note: '고객 화면', view: 'clientPortal', tone: 'confirm' },
  { title: '커뮤니케이션 센터', headline: '고객 / 협력업체 메시지 생성', note: '발송 기록', view: 'communication' },
  { title: '프로젝트 마감', headline: '실제 원가 / 마진 / 원가 누수 분석', note: '마감 검토', view: 'closing' },
  { title: '실제 프로젝트 보정', headline: '완료 데이터로 다음 견적 보정', note: '학습 승인', view: 'calibration', tone: 'warning' },
  { title: '협력업체 단가 지능화', headline: '실제 매입가와 업체 신뢰도로 다음 견적 보정', note: '단가 학습', view: 'vendorIntelligence', tone: 'warning' },
  { title: '기준 데이터 관리', headline: '공정 / 자재 / 업체 / 인력 / 표준 품목 관리', note: 'Master DB', view: 'masterDb', tone: 'warning' },
  { title: '프랜차이즈 관리', headline: '본사 기준 배포와 지점별 수익/리스크 관리', note: 'HQ 운영', view: 'franchise', tone: 'warning' },
  { title: '평면도 / 아이소메트릭', headline: '공간 구역과 견적 연결', note: '공간 관리', view: 'floorplanCenter' },
  { title: 'AI 투시도 생성', headline: '프롬프트 / ComfyUI / 이미지 검토', note: '시각화', view: 'aiVisualization' },
  { title: '디자인 보드 생성', headline: '고객 제안서 / 포트폴리오 보드', note: '보드 출력', view: 'boardGeneration' }
];

export function EstimateEntryPanel({ onOpen }: Props) {
  const renderButton = (action: EntryAction) => (
    <button
      key={action.title}
      className={`entry-button${action.primary ? ' primary' : ''}`}
      onClick={() => onOpen(action.view, action.tone ?? 'click')}
    >
      <span>{action.title}</span>
      <strong>{action.headline}</strong>
      <em>{action.note}</em>
    </button>
  );

  return (
    <section className="estimate-entry-panel">
      <div className="estimate-entry-heading">
        <div>
          <span className="eyebrow">MAIN ENTRY</span>
          <h1>자동견적 시작</h1>
          <p>BOC는 견적 생성이 첫 화면입니다. 견적을 만들고, 수익성 검증 후 계약과 실행으로 넘깁니다.</p>
        </div>
      </div>

      <div className="estimate-entry-grid">{primaryActions.map(renderButton)}</div>

      <div className="estimate-entry-heading secondary-heading">
        <div>
          <span className="eyebrow">OPERATIONS</span>
          <h2>운영 관리</h2>
          <p>견적 이후의 승인, 현장, 결제, 시각화, 보드 출력은 여기서 관리합니다.</p>
        </div>
      </div>

      <div className="estimate-entry-grid secondary-grid">{secondaryActions.map(renderButton)}</div>
    </section>
  );
}
