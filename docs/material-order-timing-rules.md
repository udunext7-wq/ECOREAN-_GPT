# Material Order Timing Rules

## 1. 목적

자재 발주 시점은 공정표와 분리하지 않는다.

공정이 생성되면 필요한 자재, 부자재, 소모품, 장비, 발주 리드타임이 함께 생성되어야 한다.

## 2. MaterialOrderTiming

```ts
type MaterialOrderTiming = {
  orderTimingId: string;
  processId: string;
  materialId: string;
  materialName: string;
  materialType:
    | 'primary'
    | 'accessory'
    | 'adhesive'
    | 'consumable'
    | 'protection'
    | 'equipment'
    | 'waste';
  quantityFormula: string;
  orderUnit: string;
  leadTimeDays: number | 'NEEDS_RESEARCH';
  materialOrderDateRule: string;
  requiredBeforeProcessStart: boolean;
  supplierType: 'official' | 'supplier' | 'market' | 'internal' | 'unknown';
  orderRiskFlags: string[];
};
```

## 3. 발주일 계산 원칙

```text
materialOrderDate = scheduledProcessStartDate - leadTimeDays
```

단, 다음 조건을 고려한다.

```text
주말/공휴일
맞춤 제작품
수입 자재
최소 주문 수량
현장 보관 가능 여부
양중 예약
엘리베이터 사용 가능 시간
```

## 4. 자재 유형별 기준

| 자재 유형 | 예시 | 발주 기준 |
|---|---|---|
| primary | 타일, 도기, 천장재, 도어 | 공정 시작 전 입고 필수 |
| accessory | 코너비드, 스페이서, 앙카 | 주자재와 함께 발주 |
| adhesive | 압착시멘트, 본드, 프라이머 | 공정 시작 전 입고 |
| consumable | 커팅날, 마스킹테이프 | 공정 전 또는 현장 상시 |
| protection | 보양재 | 철거 전 입고 |
| equipment | 사다리차, 양중 장비 | 일정 예약 필요 |
| waste | 폐기물 마대, 차량 | 철거 전 예약 |

## 5. 욕실 타일 예시

```json
{
  "processId": "BATH_TILE",
  "materials": [
    {
      "materialName": "타일",
      "materialType": "primary",
      "quantityFormula": "sum(tileAreaBySpace) * (1 + wasteRate)",
      "leadTimeDays": "NEEDS_RESEARCH",
      "materialOrderDateRule": "BATH_TILE.startDate - leadTimeDays",
      "requiredBeforeProcessStart": true
    },
    {
      "materialName": "압착시멘트",
      "materialType": "adhesive",
      "quantityFormula": "ceil(totalTileArea / coveragePerBag)",
      "leadTimeDays": "NEEDS_RESEARCH",
      "materialOrderDateRule": "BATH_TILE.startDate - leadTimeDays",
      "requiredBeforeProcessStart": true
    },
    {
      "materialName": "레벨링 클립",
      "materialType": "accessory",
      "quantityFormula": "totalTileArea * clipCountPerM2",
      "leadTimeDays": "NEEDS_RESEARCH",
      "materialOrderDateRule": "BATH_TILE.startDate - leadTimeDays",
      "requiredBeforeProcessStart": true
    }
  ]
}
```

## 6. 발주 누락 diagnostics

다음 경우 경고한다.

```text
공정 시작일이 있는데 materialOrderDate가 없음
leadTimeDays가 NEEDS_RESEARCH인데 실제 일정 생성 시도
맞춤 제작품인데 발주일이 공정 시작일보다 늦음
자재 수량이 0인데 공정은 선택됨
자재 sourceType이 unknown 또는 confidenceLevel low
```

## 7. 출력 연결

자재 발주 시점 데이터는 다음 출력으로 연결된다.

```text
자재 발주표
공정표
Calendar
현장관리표
리스크 진단
```

