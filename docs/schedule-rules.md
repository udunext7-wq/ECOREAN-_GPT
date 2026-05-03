# ECOREAN Schedule Rules

## 1. 목적

ECOREAN 자동견적 OS는 견적과 공정표를 분리하지 않는다.

견적 항목이 선택되면 관련 공정이 생성되고, 공정이 생성되면 필요한 자재, 부자재, 인력, 장비, 발주 시점, 선후행 관계가 동시에 연결된다.

공정표는 별도 수동 작성물이 아니라 견적 선택값과 온톨로지 관계에서 자동 생성되는 운영 데이터다.

## 2. 핵심 원칙

```text
1. 견적 항목이 선택되면 관련 공정도 자동 생성된다.
2. 공정이 생성되면 필요한 자재, 부자재, 인력, 장비, 발주 시점도 함께 연결된다.
3. 공정표는 견적 선택값과 온톨로지 관계에서 자동 생성한다.
4. 모든 공정은 선행공정, 후행공정, 의존관계, 양생시간, 대기시간, 발주 리드타임을 가진다.
5. 같은 공정이 여러 공간에 적용될 경우 공정표에서는 묶어서 관리한다.
6. 고객용 견적서는 공간별로 보기 쉽게 표시한다.
7. 인건비는 공간별 단독 계산이 아니라 공정별 통합 품수 기준으로 계산한다.
8. 공정 충돌, 순서 오류, 발주 누락, 최소 품수 누락은 diagnostics에서 감지한다.
9. 공정관리 데이터는 MS Project, Gantt Chart, Calendar, 현장관리표로 출력 가능해야 한다.
```

## 3. 일정 필수 필드

모든 공정에는 아래 일정 관련 필드를 포함한다.

```ts
type ProcessScheduleProfile = {
  scheduleId: string;
  processId: string;
  processName: string;
  appliesToSpaces: string[];
  dependencies: string[];
  predecessors: string[];
  successors: string[];
  earliestStartRule: string;
  defaultDuration: number | 'NEEDS_RESEARCH';
  minDuration: number | 'NEEDS_RESEARCH';
  maxDuration: number | 'NEEDS_RESEARCH';
  curingTime: number | 'NEEDS_RESEARCH';
  waitingTime: number | 'NEEDS_RESEARCH';
  leadTimeDays: number | 'NEEDS_RESEARCH';
  materialOrderDateRule: string;
  laborCrewType: string;
  crewSize: number | 'NEEDS_RESEARCH';
  crewProductivity: number | 'NEEDS_RESEARCH';
  batchingRule: string;
  conflictRules: string[];
  inspectionPoint: string[];
  completionCriteria: string[];
  riskFlags: string[];
};
```

## 4. 공정표 엔진 모듈 구조

```text
schedule-engine/
  schedule-engine.ts
  dependency-resolver.ts
  duration-calculator.ts
  labor-allocation.ts
  material-order-timing.ts
  gantt-builder.ts
  conflict-detector.ts
  inspection-point-builder.ts
```

현재 단계에서는 파일 구조 명세만 정의하고 코드는 작성하지 않는다.

## 5. 데이터 흐름

```text
견적 입력
-> 선택 공정 확인
-> 온톨로지 관계 탐색
-> 공정 생성
-> 동일 공정 공간별 적용값 통합
-> 선행/후행 관계 해석
-> 자재 발주 시점 계산
-> 인력 투입 계산
-> 기간 계산
-> 충돌 진단
-> 공정표 출력 데이터 생성
```

## 6. 출력 가능 형식

공정관리 데이터는 다음 출력으로 확장 가능해야 한다.

```text
Gantt Chart
Calendar
MS Project
현장관리표
자재 발주표
인력 투입표
검수 체크리스트
```

## 7. 공정 통합 예시

입력:

```text
욕실 타일 15㎡
주방 벽타일 5㎡
현관 바닥타일 3㎡
발코니 바닥타일 8㎡
```

공정표 생성:

```text
공정명: 타일공정
적용공간: 욕실, 주방, 현관, 발코니
총 면적: 31㎡
인력: 타일공 1팀
일정: 통합 공정으로 배치
고객용 표시: 공간별 분리
내부용 표시: 타일공정 통합
```

## 8. 승인 필요 항목

다음 일정 기준은 대표님 승인 후 운영 기준으로 확정한다.

```text
defaultDuration
minDuration
maxDuration
curingTime
waitingTime
leadTimeDays
crewProductivity
conflictRules
inspectionPoint
completionCriteria
```

