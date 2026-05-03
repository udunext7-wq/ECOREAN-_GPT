# Purchase Order Rules

## 1. 목적

발주는 공정표와 분리하지 않는다.

자재 발주일은 공정 시작일과 납기 리드타임을 기준으로 자동 계산되어야 한다.

## 2. PurchaseOrder 스키마

```ts
type PurchaseOrder = {
  purchaseOrderId: string;
  projectId: string;
  processId: string;
  materialId: string;
  materialName: string;
  materialType: 'primary' | 'accessory' | 'consumable' | 'adhesive' | 'protection' | 'equipment';
  required: boolean;
  orderRequired: boolean;
  quantity: number | 'NEEDS_RESEARCH';
  unit: string;
  minimumOrderUnit: number | 'NEEDS_RESEARCH';
  wasteRate: number | 'NEEDS_RESEARCH';
  stockAvailable: boolean | 'UNKNOWN';
  alternativeMaterials: string[];
  leadTimeDays: number | 'NEEDS_RESEARCH';
  plannedOrderDate: string | 'NEEDS_RESEARCH';
  actualOrderDate?: string;
  expectedDeliveryDate: string | 'NEEDS_RESEARCH';
  actualDeliveryDate?: string;
  supplierId?: string;
  delayRisk: 'low' | 'medium' | 'high' | 'UNKNOWN';
  status: 'planned' | 'ordered' | 'delivered' | 'delayed' | 'cancelled';
};
```

## 3. 발주/자재 변수

```text
자재명
주자재/부자재/소모품 구분
발주 필요 여부
발주 리드타임
발주 예정일
실제 발주일
입고 예정일
실제 입고일
최소 발주 단위
손실률
재고 여부
대체 자재
납기 지연 리스크
```

## 4. 발주일 계산

```text
plannedOrderDate = processStartDate - leadTimeDays
expectedDeliveryDate <= processStartDate
```

발주가 늦으면 diagnostics에 기록한다.

```text
actualOrderDate > plannedOrderDate
expectedDeliveryDate > processStartDate
leadTimeDays == NEEDS_RESEARCH
stockAvailable == UNKNOWN
```

## 5. 그래프 관계

```text
Process REQUIRES_PURCHASE_ORDER PurchaseOrder
PurchaseOrder HAS_LEAD_TIME Delivery
Delivery DELIVERED_BEFORE Process
Material GENERATED_FROM PurchaseOrder
Risk HAS_RISK PurchaseOrder
```

