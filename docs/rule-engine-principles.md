# Rule Engine Principles

## 1. 목적

Rule Engine은 AI가 임의로 판단하지 못하게 하는 견적 통제 장치다.

온톨로지가 관계를 정의한다면, Rule Engine은 반드시 지켜야 할 규칙을 강제한다.

## 2. Rule Engine 역할

```text
필수 공정 자동 포함
누락 공정 탐지
공정 선후행 강제
최소 품수 적용
공정별 통합 계산 강제
고객용/내부용 출력 분리
승인 없는 단가/마진 변경 차단
낮은 신뢰도 단가 경고
리스크 조건 경고
```

## 3. Rule 스키마

```ts
type EstimateRule = {
  ruleId: string;
  name: string;
  ruleType:
    | 'inclusion'
    | 'exclusion'
    | 'dependency'
    | 'aggregation'
    | 'minimumLabor'
    | 'priceValidation'
    | 'approval'
    | 'outputPolicy'
    | 'riskDetection';
  conditionExpression: string;
  action:
    | 'includeProcess'
    | 'excludeProcess'
    | 'requireApproval'
    | 'raiseWarning'
    | 'applyMinimumLabor'
    | 'aggregateLabor'
    | 'blockChange'
    | 'hideFromCustomer'
    | 'showInternalRisk';
  targetIds: string[];
  severity: 'info' | 'warning' | 'blocking';
  enabled: boolean;
  version: string;
  needsApprovalForChange: boolean;
};
```

## 4. 핵심 규칙

### 4.1 방수 누락 방지

```text
욕실 타일이 포함되면 욕실 방수는 반드시 포함한다.
```

### 4.2 타일 인건비 통합

```text
욕실, 주방, 현관, 발코니, 다용도실의 타일은 같은 TILE_CREW_STANDARD로 묶어 인건비를 통합 계산한다.
```

### 4.3 최소 품수 적용

```text
공정 총량이 최소 기준 이하이면 minimumLaborCharge를 적용한다.
```

### 4.4 고객용/내부용 분리

```text
내부 원가, 마진, 거래처 단가, 승인 대기 항목은 고객용 견적서에 노출하지 않는다.
```

### 4.5 승인 없는 변경 차단

```text
AI 또는 ML은 단가, 마진, 표준사양, spaceFactor, minimumLaborCharge를 직접 변경할 수 없다.
```

## 5. 승인 로그 규칙

다음 변경은 무조건 ApprovalLog를 생성한다.

```text
단가 변경
마진 변경
defaultSpec 변경
optionGroups 변경
spaceFactor 변경
minimumLaborCharge 변경
자동 포함 규칙 변경
ML 보정값 적용
```

## 6. Rule과 Graph 연결

Rule은 Graph Edge와 연결될 수 있다.

예:

```text
Rule: 욕실 타일 포함 시 방수 필수
Graph Edge: BATH_TILE DEPENDS_ON BATH_WATERPROOF
Action: includeProcess 또는 raiseWarning
```

## 7. Rule 실행 순서

```text
1. 입력 정규화
2. 선택 공정 확인
3. triggerType 판단
4. 온톨로지 관계 탐색
5. inclusion/dependency rule 실행
6. aggregation rule 실행
7. minimumLabor rule 실행
8. priceValidation rule 실행
9. outputPolicy rule 실행
10. approval rule 실행
```

## 8. Rule 결과 스키마

```ts
type RuleExecutionResult = {
  ruleId: string;
  estimateId: string;
  triggered: boolean;
  actionTaken: string;
  affectedProcessCodes: string[];
  warnings: string[];
  blockingIssues: string[];
  approvalRequired: boolean;
};
```

