# Process Dependency Schema

## 1. 목적

공정 의존성 스키마는 견적에서 선택된 공정이 어떤 순서로 실행되어야 하는지 정의한다.

이 스키마는 공정표 자동 생성, 공정 충돌 진단, 발주 시점 계산, 검수 포인트 생성을 위한 기준이다.

## 2. 의존성 유형

```ts
type DependencyType =
  | 'hard'
  | 'soft'
  | 'inspection'
  | 'curing'
  | 'materialLeadTime'
  | 'laborAvailability';
```

정의:

```text
hard: 반드시 완료되어야 다음 공정 가능
soft: 권장 순서이지만 현장 판단으로 조정 가능
inspection: 검수 완료 후 다음 공정 가능
curing: 양생시간 경과 후 다음 공정 가능
materialLeadTime: 자재 입고 후 공정 가능
laborAvailability: 인력 배정 후 공정 가능
```

## 3. ProcessDependency

```ts
type ProcessDependency = {
  dependencyId: string;
  fromProcessId: string;
  toProcessId: string;
  dependencyType: DependencyType;
  required: boolean;
  lagDays: number | 'NEEDS_RESEARCH';
  conditionExpression?: string;
  blockingIfUnmet: boolean;
  diagnosticCode?: string;
  note?: string;
};
```

## 4. 공정 의존성 예시

### 욕실 방수 -> 욕실 타일

```json
{
  "dependencyId": "DEP_BATH_WATERPROOF_TO_TILE",
  "fromProcessId": "BATH_WATERPROOF",
  "toProcessId": "BATH_TILE",
  "dependencyType": "curing",
  "required": true,
  "lagDays": "NEEDS_RESEARCH",
  "conditionExpression": "BATH_TILE.selected == true",
  "blockingIfUnmet": true,
  "diagnosticCode": "MISSING_WATERPROOF_OR_CURING",
  "note": "방수 완료 및 양생 후 타일 시공 가능"
}
```

### 타일 -> 도기 설치

```json
{
  "dependencyId": "DEP_BATH_TILE_TO_SANITARY",
  "fromProcessId": "BATH_TILE",
  "toProcessId": "BATH_SANITARY_FIXTURE",
  "dependencyType": "hard",
  "required": true,
  "lagDays": "NEEDS_RESEARCH",
  "conditionExpression": "BATH_SANITARY_FIXTURE.selected == true",
  "blockingIfUnmet": true,
  "diagnosticCode": "SANITARY_BEFORE_TILE_ERROR",
  "note": "도기 설치는 타일 시공 이후 배치"
}
```

## 5. ScheduleNode

```ts
type ScheduleNode = {
  scheduleId: string;
  processId: string;
  processName: string;
  appliesToSpaces: string[];
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  defaultDuration: number | 'NEEDS_RESEARCH';
  minDuration: number | 'NEEDS_RESEARCH';
  maxDuration: number | 'NEEDS_RESEARCH';
  predecessors: string[];
  successors: string[];
  dependencies: ProcessDependency[];
};
```

## 6. 의존성 해석 순서

```text
1. 선택 공정 목록 생성
2. AUTO/CONDITIONAL 공정 보강
3. 각 공정의 dependencies 수집
4. hard dependency 우선 배치
5. curing/waiting lag 반영
6. materialLeadTime 반영
7. laborAvailability 반영
8. conflictRules 검사
9. diagnostics 생성
```

## 7. 그래프 관계 매핑

```text
ProcessDependency.fromProcessId -> PRECEDES
ProcessDependency.toProcessId -> FOLLOWS
required dependency -> DEPENDS_ON
curing dependency -> DEPENDS_ON + AFFECTS_DURATION
materialLeadTime -> DEPENDS_ON + REQUIRES
```

## 8. 승인 필요 항목

```text
공정 선후행 기준
dependencyType 분류
lagDays 기준
blockingIfUnmet 기준
diagnosticCode 기준
```

