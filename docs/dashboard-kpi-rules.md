# Dashboard KPI Rules

## 목적

BOC Dashboard의 KPI는 단순 숫자가 아니라 대표가 실행할 수 있는 판단 단위로 관리한다.

모든 KPI는 다음 중 하나 이상의 결과를 만들어야 한다.

```text
approve
block
requestRevision
requestResearch
requestInspection
prioritize
open3DGraph
```

## KPI 공통 구조

```ts
type DashboardKpi = {
  kpiId: string;
  kpiName: string;
  dashboardSection: string;
  sourceData: string[];
  calculationRule: string;
  updateFrequency: 'realTime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  owner: string;
  warningThreshold: string | number;
  blockingThreshold: string | number;
  approvalNeeded: boolean;
  relatedDocument: string[];
  relatedProject: string | 'multiple' | 'none';
  actionButton: string[];
};
```

## 1. Today Overview KPI

| KPI | source data | update frequency | warning threshold | blocking threshold | action |
|---|---|---|---|---|---|
| depositDueToday | PaymentMilestone, Cashflow | daily | 예정일 당일 미입금 | 착수 조건인데 미입금 | 입금 확인, 착수 보류 |
| progressPaymentBillableToday | Inspection, Schedule, PaymentMilestone | daily | 청구 가능 후 1일 미청구 | 청구 가능 후 3일 미청구 | 청구 승인 |
| finalPaymentBillableToday | Completion, Inspection, Cashflow | daily | 준공검수 완료 후 미청구 | 인도 완료 후 미청구 | 잔금 청구 승인 |
| purchaseOrdersDueToday | PurchaseOrder, Schedule, Material | daily | 발주 예정일 당일 미발주 | 납기상 공정 지연 발생 | 발주 승인 |
| delayedProjectsToday | Schedule, DailyReport | hourly | 예정 공정 1일 지연 | 후속 공정 영향 발생 | 우선순위 조정 |
| inspectionsDueToday | Inspection, Process | daily | 검수 예정일 미수행 | 검수 실패 후 후속 공정 예정 | 검수 요청 |
| approvalsDueToday | ApprovalLog, MasterDbUpdateRequest | daily | 승인 대기 1일 초과 | 공정/발주/청구 차단 중 | 승인/반려 |

## 2. Profit Dashboard KPI

| KPI | source data | warning threshold | blocking threshold | action |
|---|---|---|---|---|
| estimatedVsActualMargin | Estimate, CompletionReport | 실제 마진 -3%p 이하 | 실제 마진 -7%p 이하 | 원인 분석 |
| projectProfitRate | InternalCost, Revenue | 목표 마진 하회 | 손실 발생 | 현장 점검 |
| processProfitRate | ProcessCost, CaseLibrary | 반복 2회 손실 | 반복 3회 손실 | 단가/품수 보정 요청 |
| brandMargin | BrandDB, InternalCost | 목표 마진 하회 | 하자/마진 동시 악화 | 브랜드 교체 검토 |
| subcontractOverrun | SubcontractSettlement | 예상 대비 10% 초과 | 예상 대비 20% 초과 | 정산 보류 |
| repeatedLossProcess | CaseLibrary | 2회 반복 손실 | 3회 반복 손실 | Master DB update request |

## 3. Risk Dashboard KPI

| KPI | source data | warning threshold | blocking threshold | action |
|---|---|---|---|---|
| defectRiskScore | Defect, Inspection, CaseLibrary | riskScore 70 이상 | riskScore 85 이상 | 재검수 요청 |
| leakRiskScore | Waterproof, Plumbing, Inspection | 누수 관련 조건 미확인 | 방수 검수 실패 후 후속 공정 | 후속 공정 차단 |
| condensationRiskScore | Window, Insulation, Ventilation | 결로 일부 있음 | 원인 미확인 상태 마감 착수 | 확인 요청 |
| orderDelayRisk | PurchaseOrder, Schedule | 납기 여유 2일 미만 | 입고일이 공정 시작일 이후 | 발주 우선순위 변경 |
| inspectionFailureRisk | Inspection, Process | 검수 지연 | 검수 실패 후 후속 공정 | 후속 공정 차단 |
| claimRiskScore | ChangeOrder, DailyReport, ClientFeedback | 미승인 변경 발생 | 미승인 변경 고객 청구 | 청구 차단 |
| receivableRisk | PaymentMilestone, Cashflow | 예정일 초과 | 7일 이상 미수 | 대표 확인 |

## 4. Process Dashboard KPI

| KPI | source data | warning threshold | blocking threshold | action |
|---|---|---|---|---|
| activeProcessStatus | Schedule, DailyReport | 진행률 미입력 | 상태 미확인 2일 이상 | 현장 확인 |
| processConflictCount | DependencyResolver | 충돌 1건 | 충돌 후 공정 시작 예정 | 일정 차단 |
| dependencyErrorCount | ProcessGraph | 선후행 오류 1건 | 후속 공정 착수 예정 | 공정 차단 |
| waterproofInspectionFailed | Inspection | 실패 기록 | 타일/마감 착수 예정 | 후속 공정 차단 |
| missingPurchaseOrder | MaterialOrderTiming | 발주 필요 항목 미생성 | 공정 시작 전 미발주 | 발주 생성 |
| missingConfirmation | Diagnostics | NEEDS_CONFIRMATION 1건 | 필수 확인 누락 후 견적 확정 | 견적 확정 차단 |

## 5. Approval Center KPI

| KPI | source data | warning threshold | blocking threshold | action |
|---|---|---|---|---|
| masterDbUpdateRequests | MasterDbUpdateRequest | 승인 대기 1건 | 승인 없이 반영 시도 | 승인/반려 |
| priceChangeRequests | PriceRecord, ApprovalLog | 단가 변경 요청 | 무승인 단가 반영 | 승인 차단 |
| brandChangeRequests | BrandDB, PurchaseOrder | 브랜드 변경 요청 | 발주 이후 미승인 변경 | 승인/대체 요청 |
| changeOrderApprovals | ChangeOrder | 추가공사 요청 | 승인 없이 시공 진행 | 추가공사 차단 |
| defectReworkApprovals | Defect | 재시공 요청 | 비용 반영 전 승인 누락 | 승인 요청 |
| exceptionApprovals | RuleEngine, ApprovalLog | 예외 요청 | 고위험 예외 무승인 | 예외 차단 |

## 6. Learning Dashboard KPI

| KPI | source data | warning threshold | blocking threshold | action |
|---|---|---|---|---|
| topCostVarianceItems | EstimateVsActual | 오차 10% 초과 | 반복 오차 3회 | 보정 후보 생성 |
| topDurationVarianceItems | ScheduleVsActual | 공기 오차 2일 초과 | 반복 오차 3회 | 공기 기준 보정 |
| topDefectItems | Defect, CaseLibrary | 반복 2회 | 반복 3회 | 시공 기준 수정 |
| topClaimItems | ClientFeedback, ChangeOrder | 반복 2회 | 반복 3회 | 고객 안내/계약 문구 수정 |
| frequentlyEditedPrices | PriceRecord | 2회 수정 | 3회 수정 | 단가 조사 요청 |
| frequentlyApprovedExceptions | ApprovalLog | 2회 승인 | 3회 승인 | 룰 재검토 |

## 수익성에 큰 영향을 주는 KPI 우선순위

1. 실제 마진 이탈
2. 외주비 초과
3. 반복 손실 공정
4. 브랜드별 마진과 하자율
5. 발주 지연으로 인한 일정 비용 증가
6. 미수금과 잔금 청구 지연
7. 하자 재시공 비용
8. 단가 수정 빈도
