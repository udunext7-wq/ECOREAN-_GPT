# Inspection and Defect Rules

## 1. 목적

검수와 하자는 공정의 마지막 메모가 아니라 수금, 잔금, 하자 비용, 실제 마진과 연결되는 운영 데이터다.

## 2. Inspection 스키마

```ts
type Inspection = {
  inspectionId: string;
  projectId: string;
  processId?: string;
  inspectionType: 'intermediate' | 'completion' | 'clientHandover' | 'defectFollowUp';
  inspectionPoint: string;
  scheduledDate: string | 'NEEDS_RESEARCH';
  actualDate?: string;
  inspector: string;
  clientConfirmed: boolean;
  photoRequired: boolean;
  photoRecordIds: string[];
  result: 'pending' | 'passed' | 'failed' | 'needsRepair';
  linkedPaymentMilestoneIds: string[];
  notes?: string;
};
```

## 3. Defect 스키마

```ts
type Defect = {
  defectId: string;
  projectId: string;
  processId?: string;
  spaceType?: string;
  defectType: string;
  detectedDate: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cause:
    | 'workmanship'
    | 'material'
    | 'siteCondition'
    | 'design'
    | 'clientUse'
    | 'unknown';
  repairRequired: boolean;
  reworkRequired: boolean;
  estimatedRepairCost: number | 'NEEDS_RESEARCH';
  actualRepairCost?: number;
  responsibleParty: 'ecorean' | 'subcontractor' | 'supplier' | 'client' | 'unknown';
  status: 'open' | 'scheduled' | 'repaired' | 'closed' | 'disputed';
};
```

## 4. 검수/하자 변수

```text
중간 검수 시점
완료 검수 시점
고객 확인 여부
사진 기록
하자 가능성
하자 발생일
하자 처리비
재시공 여부
클레임 기록
```

## 5. 잔금 연결

```text
Completion Inspection passed
-> Client Handover confirmed
-> Final Payment billable
```

잔금 청구 전 blocking 조건:

```text
준공검수 미완료
고객 확인 미완료
중요 하자 open
사진 기록 누락
```

## 6. 그래프 관계

```text
Process NEEDS_INSPECTION Inspection
Inspection CAN_BILL_AFTER PaymentMilestone
Defect CAUSES_COST_CHANGE Cost
Defect AFFECTS_CASHFLOW Cashflow
Defect HAS_RISK Risk
```

