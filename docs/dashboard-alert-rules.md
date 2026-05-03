# Dashboard Alert Rules

## 목적

Dashboard Alert는 대표가 즉시 판단해야 하는 위험과 승인 병목을 자동으로 분류한다.

알림은 네 단계로 구분한다.

```text
INFO
WARNING
BLOCKING
APPROVAL_REQUIRED
```

## 공통 알림 구조

```ts
type DashboardAlert = {
  alertId: string;
  alertName: string;
  severity: 'INFO' | 'WARNING' | 'BLOCKING' | 'APPROVAL_REQUIRED';
  sourceData: string[];
  triggerCondition: string;
  warningThreshold: string | number;
  blockingThreshold: string | number;
  approvalNeeded: boolean;
  owner: string;
  relatedDocument: string[];
  relatedProject: string | 'multiple' | 'none';
  actionButton: string[];
  escalationRule: string;
};
```

## 즉시 차단 알림

아래 알림은 대표 확인 전까지 관련 액션을 차단한다.

| alert | blocking condition | blocked action |
|---|---|---|
| waterproofAutoConfirmed | 방수 조건 확인 없이 자동 확정 | 견적 확정 |
| failedInspectionBeforeSuccessor | 검수 실패 후 후속 공정 착수 | 후속 공정 시작 |
| masterDbUpdateWithoutApproval | 승인 없는 Master DB 변경 | DB 반영 |
| dbChangeWithoutRollback | rollbackData 없는 DB 변경 | DB 반영 |
| paymentClaimBeforeCondition | 중도금/잔금 조건 미충족 청구 | 청구서 발행 |
| processDependencyConflict | 선후행 오류 | 공정 시작 |
| missingMinimumLaborCharge | 최소 품수 미적용 | 내부 원가 확정 |
| fullProcessFromPartialRepair | 부분공사인데 전체공정 생성 | 견적 확정 |
| mixedCustomerInternalOutput | 고객용/내부용 데이터 혼합 | 문서 출력 |

## 경고 알림

아래 알림은 작업을 멈추지는 않지만 대표 또는 담당자 확인을 요구한다.

| alert | warning condition | recommended action |
|---|---|---|
| orderLeadTimeRisk | 입고 예정일과 공정 시작일 사이 여유 부족 | 발주 우선순위 조정 |
| marginDropWarning | 예상 대비 실제 마진 하락 | 원인 분석 |
| repeatedPriceEdit | 같은 단가 반복 수정 | 단가 조사 요청 |
| missingDailyReport | 공사일보 미작성 | 현장관리자 확인 |
| receivableDelayWarning | 수금 예정일 초과 | 청구/입금 확인 |
| defectRiskWarning | 하자 위험 점수 상승 | 검수 강화 |

## 승인 요청 알림

아래 알림은 Approval Center로 이동한다.

| alert | approval reason | required approver |
|---|---|---|
| masterDbUpdateRequest | 단가/품수/공기/하자율 변경 | CEO |
| priceChangeRequest | 단가 변경 | CEO |
| brandChangeAfterEstimate | 브랜드 변경 | CEO 또는 COO |
| changeOrderApproval | 추가공사 반영 | CEO |
| defectReworkApproval | 하자 재시공 비용 반영 | CEO |
| highRiskExclusionApproval | 고위험 공정 제외 | CEO |
| exceptionRuleApproval | Rule Engine 예외 | CEO |

## Escalation Rules

1. WARNING 상태가 24시간 유지되면 담당자 재확인 요청을 생성한다.
2. WARNING 상태가 공정 시작일에 영향을 주면 BLOCKING으로 승격한다.
3. BLOCKING 상태는 대표 또는 권한자 액션 전까지 해제하지 않는다.
4. APPROVAL_REQUIRED 상태는 Approval Log가 생성되어야만 처리 가능하다.
5. Master DB 변경은 rollbackData 없이는 승인 요청 자체를 완료할 수 없다.
6. 고객용 출력에 내부 단가/마진이 포함되면 즉시 BLOCKING으로 처리한다.

## Dashboard 표시 우선순위

1. BLOCKING
2. APPROVAL_REQUIRED
3. WARNING
4. INFO

동일 단계에서는 아래 순서로 우선순위를 둔다.

1. 누수/하자/안전 리스크
2. 수금/현금흐름 리스크
3. 공정 지연 리스크
4. 발주 지연 리스크
5. 수익성 악화 리스크
6. 데이터 품질 리스크
