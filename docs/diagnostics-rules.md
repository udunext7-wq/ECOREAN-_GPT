# Diagnostics Rules

## Conditional Process Diagnostics

ECOREAN 자동견적 OS는 조건이 부족한 공정을 자동 포함하지 않는다.

Diagnostics must create warnings when:

- `NEEDS_CONFIRMATION` 상태의 공정이 있는데 견적 확정을 시도하는 경우
- 습식공간 타일이 있는데 방수 판단 기록이 없는 경우
- 배관 변경이 있는데 방수 검토가 없는 경우
- 철거가 있는데 폐기물/운반/보양 판단이 없는 경우
- 고위험 공정 제외에 승인 로그가 없는 경우
- 후속 공정이 있는데 필수 선행공정이 없는 경우
- 공정을 삭제했는데 견적서, 공정표, 발주표, 현금흐름표에 연결 레코드가 남아 있는 경우
- 추가공사 공정이 있는데 승인서와 결제조건이 없는 경우
- 최소 입력값이 부족한데 견적 확정을 시도하는 경우
- occupancyDeadline이 공정표상 불가능한데 고객 견적이 확정되는 경우
- 발주 리드타임이 입주일을 초과하는 경우
- budgetLevel과 finishGrade가 충돌하는 경우
- Preset Engine이 제안한 고위험 공정이 Rule Engine 판단 없이 제외된 경우

Required diagnostic output:

```json
{
  "warningId": "NEEDS_RESEARCH",
  "processId": "NEEDS_RESEARCH",
  "warningType": "MISSING_CONDITION | MISSING_PREDECESSOR | HIGH_RISK_EXCLUSION | ORPHANED_RECORD | NEEDS_CONFIRMATION",
  "severity": "LOW | MEDIUM | HIGH | BLOCKER",
  "customerVisible": true,
  "internalOnly": false,
  "recommendedAction": "NEEDS_RESEARCH",
  "approvalRequired": true
}
```

## 1. 목적

Diagnostics는 자동견적 OS의 오류 감지 계층이다.

공정 충돌, 순서 오류, 발주 누락, 최소 품수 누락, 승인 누락, 낮은 신뢰도 단가를 감지한다.

## 2. DiagnosticIssue

```ts
type DiagnosticIssue = {
  issueId: string;
  estimateId: string;
  processId?: string;
  scheduleId?: string;
  issueType:
    | 'missing_required_process'
    | 'dependency_error'
    | 'schedule_conflict'
    | 'material_order_missing'
    | 'lead_time_risk'
    | 'minimum_labor_missing'
    | 'labor_double_count'
    | 'mobilization_double_count'
    | 'low_confidence_price'
    | 'approval_required'
    | 'output_policy_violation';
  severity: 'info' | 'warning' | 'blocking';
  message: string;
  recommendedAction: string;
  needsApproval: boolean;
  relatedNodeIds?: string[];
  relatedRuleIds?: string[];
};
```

## 3. 필수 진단 항목

### 3.1 공정 누락

```text
타일 공정이 선택되었는데 방수 공정이 없으면 blocking.
도기 설치가 있는데 설비 공정이 없으면 warning 또는 blocking.
샤워부스가 있는데 타일 완료 조건이 없으면 blocking.
```

### 3.2 순서 오류

```text
타일이 방수보다 먼저 배치되면 blocking.
도기 설치가 타일보다 먼저 배치되면 blocking.
실리콘이 도기 설치보다 먼저 배치되면 warning.
```

### 3.3 발주 누락

```text
자재가 필요한 공정인데 materialOrderDateRule이 없으면 warning.
leadTimeDays가 NEEDS_RESEARCH인데 실제 일정 출력 시도 시 warning.
맞춤 제작품이 공정 시작일 이후 발주로 계산되면 blocking.
```

### 3.4 최소 품수 누락

```text
minimumLaborCharge.enabled == true인데 적용 결과가 없으면 warning.
소량 공정인데 minimumLaborCharge가 없으면 warning.
공간별로 최소 품수가 중복 적용되면 blocking.
```

### 3.5 인건비 중복

```text
같은 crewType이 같은 공정에서 공간별로 중복 계산되면 blocking.
mobilizationCost가 같은 crewVisit에 중복 적용되면 blocking.
```

### 3.6 단가 신뢰도

```text
confidenceLevel == low인 단가가 최종 견적에 사용되면 warning.
sourceType이 unknown이면 warning.
sourceDate가 오래되면 warning.
```

### 3.7 승인 필요

```text
AI/ML이 단가, 마진, defaultSpec, spaceFactor, minimumLaborCharge 변경을 제안하면 approval_required.
승인 전 자동 반영 시도는 blocking.
```

## 4. Diagnostics 실행 순서

```text
1. 선택 공정 검증
2. AUTO/CONDITIONAL 누락 검증
3. dependency 검증
4. schedule conflict 검증
5. material order 검증
6. labor allocation 검증
7. minimum labor 검증
8. price source 검증
9. output policy 검증
10. approval log 검증
```

## 5. 출력 연결

Diagnostics 결과는 다음에 표시한다.

```text
내부 원가표
공정표
현장 관리표
리스크 진단
승인 대기 화면
```

고객용 견적서에는 내부 진단 상세를 노출하지 않는다.
