# ECOREAN 단가 출처 및 가격 기준 정책

## 1. 목적

ECOREAN Master DB는 현재 한국 실내건축/건설 단가 기준을 반영해야 한다.

단, 단가는 하나의 숫자로만 관리하지 않는다.

공식 기준, 공급가, 시장가, 내부 실적가를 분리해서 관리하고, 최종 견적에는 어떤 기준 가격을 사용했는지 반드시 기록한다.

이 구조의 목적은 다음과 같다.

- 단가 출처 추적
- 공식 단가와 시장 단가 분리
- 실제 현장 데이터 기반 보정
- 견적 신뢰도 관리
- 단가 업데이트 주기 관리
- 향후 AI 학습용 가격 데이터 축적

## 2. 단가 출처 4단계

### 2.1 official

공식 기준 단가다.

예:

```text
표준품셈
표준시장단가
조달청 가격정보
대한건설협회 시중노임단가
```

용도:

- 기준 단가 검증
- 공공 기준 비교
- 노무비 기준 확인
- 내부 단가의 과소/과대 여부 검토

주의:

```text
official 단가는 실제 인테리어 현장 체감 단가와 다를 수 있다.
따라서 최종 견적에 바로 쓰기보다 기준선/검증선으로 사용하는 것이 원칙이다.
```

### 2.2 supplier

실제 공급처 기반 단가다.

예:

```text
실제 자재상 견적
브랜드 대리점 단가
거래처 공급가
시공팀 공급 단가
```

용도:

- 실제 자재 발주 기준
- 원가표 작성
- 거래처별 단가 비교
- 공급가 변동 추적

### 2.3 market

일반 시장 기준 단가다.

예:

```text
온라인 자재몰
도매가
일반 시장가
오픈마켓 참고가
```

용도:

- 시장가 비교
- 고객 설명용 기준
- 공급가 이상 여부 확인
- 신규 자재 가격 참고

주의:

```text
market 단가는 배송비, 부가세, 최소 주문 수량, 시공 현장 반입 조건이 다를 수 있다.
```

### 2.4 internal

ECOREAN 실제 현장 데이터 기반 단가다.

예:

```text
실제 계약금액
실제 자재비
실제 노무비
실제 외주비
실제 마진
실제 폐기물비
실제 운반비
실제 추가비
```

용도:

- 최종 견적 보정
- AI 학습 데이터
- 내부 마진 관리
- 현장별 오차 분석
- 반복 발생하는 누락 비용 보정

원칙:

```text
장기적으로 ECOREAN에서 가장 중요한 단가는 internalPrice다.
officialPrice는 기준이고, marketPrice는 비교값이며, internalPrice는 실제 운영 진실이다.
```

## 3. 필수 단가 데이터 필드

모든 단가 데이터에는 다음 필드를 포함한다.

```ts
type PriceRecord = {
  priceId: string;
  itemId: string;
  itemName: string;
  unit: string;
  basePrice: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  accessoryCost: number;
  wasteRate: number;
  sourceType: PriceSourceType;
  sourceName: string;
  sourceDate: string;
  confidenceLevel: ConfidenceLevel;
  updateCycle: UpdateCycle;
  notes?: string;
};
```

## 4. sourceType

```ts
type PriceSourceType =
  | 'official'
  | 'supplier'
  | 'market'
  | 'internal';
```

## 5. confidenceLevel

단가 신뢰도다.

```ts
type ConfidenceLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'verified';
```

기준:

```text
low:
출처는 있으나 현장 적용성이 낮거나 오래된 가격

medium:
시장 참고가 또는 단일 공급처 견적

high:
최근 견적, 반복 확인된 공급가, 현장 적용 가능성이 높은 가격

verified:
실제 발주/계약/시공 결과로 검증된 내부 가격
```

## 6. updateCycle

단가 업데이트 주기다.

```ts
type UpdateCycle =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semiAnnual'
  | 'annual'
  | 'perProject'
  | 'onChange';
```

권장 기준:

| sourceType | 권장 updateCycle |
|---|---|
| official | semiAnnual 또는 annual |
| supplier | monthly 또는 onChange |
| market | monthly |
| internal | perProject |

## 7. 가격 기준 분리 구조

하나의 공정 또는 자재 항목은 여러 가격 기준을 가질 수 있다.

```ts
type ItemPriceSet = {
  itemId: string;
  itemName: string;
  unit: string;
  officialPrice?: PriceRecord;
  supplierPrices?: PriceRecord[];
  marketPrice?: PriceRecord;
  internalPrice?: PriceRecord;
  recommendedPriceBasis: PriceBasis;
};
```

```ts
type PriceBasis =
  | 'officialPrice'
  | 'supplierPrice'
  | 'marketPrice'
  | 'internalPrice'
  | 'manualOverride';
```

## 8. 최종 견적 가격 선택 기록

최종 견적에는 어떤 가격 기준을 사용했는지 반드시 기록한다.

```ts
type EstimatePriceBasisSnapshot = {
  estimateId: string;
  masterDbVersion: string;
  selectedPriceBasis: PriceBasis;
  selectedPriceId: string;
  selectedSourceType: PriceSourceType;
  selectedSourceName: string;
  selectedSourceDate: string;
  confidenceLevel: ConfidenceLevel;
  reason: string;
};
```

견적 라인에도 가격 기준을 남긴다.

```ts
type EstimateLinePriceTrace = {
  estimateLineId: string;
  processCode: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  appliedUnitPrice: number;
  appliedLaborCost: number;
  appliedMaterialCost: number;
  appliedEquipmentCost: number;
  appliedAccessoryCost: number;
  appliedWasteRate: number;
  selectedPriceBasis: PriceBasis;
  selectedPriceId: string;
  sourceType: PriceSourceType;
  sourceName: string;
  sourceDate: string;
  confidenceLevel: ConfidenceLevel;
};
```

## 9. 가격 선택 원칙

초기 권장 원칙:

```text
1. internalPrice가 verified이면 internalPrice 우선
2. internalPrice가 없으면 supplierPrice 중 최신 high 이상 사용
3. supplierPrice가 없으면 marketPrice 사용
4. officialPrice는 기준 검증 및 노무/공공 기준 비교에 사용
5. 대표님 또는 관리자 승인 시 manualOverride 허용
```

견적 엔진은 최종적으로 다음 질문에 답할 수 있어야 한다.

```text
이 단가는 어디서 왔는가?
언제 기준인가?
얼마나 신뢰할 수 있는가?
공식 기준과 얼마나 차이나는가?
시장가와 얼마나 차이나는가?
ECOREAN 실제 현장가와 얼마나 차이나는가?
```

## 10. 가격 비교 구조

공식가, 시장가, 내부가의 차이를 비교하기 위한 구조다.

```ts
type PriceComparison = {
  itemId: string;
  itemName: string;
  unit: string;
  officialBasePrice?: number;
  marketBasePrice?: number;
  internalBasePrice?: number;
  selectedBasePrice: number;
  officialToSelectedRate?: number;
  marketToSelectedRate?: number;
  internalToSelectedRate?: number;
  warningFlags: PriceWarningFlag[];
};
```

```ts
type PriceWarningFlag =
  | 'official_price_missing'
  | 'market_price_missing'
  | 'internal_price_missing'
  | 'selected_price_too_low'
  | 'selected_price_too_high'
  | 'price_outdated'
  | 'low_confidence';
```

## 11. 저장 위치

권장 파일 구조:

```text
src/master-db/price-sources/
  official/
    labor-rates.json
    standard-market-prices.json
    public-procurement-prices.json
  supplier/
    supplier-quotes.json
    dealer-prices.json
  market/
    online-market-prices.json
    wholesale-prices.json
  internal/
    actual-project-prices.json
    actual-labor-costs.json
    actual-material-costs.json
```

장기 DB 테이블:

```text
price_records
item_price_sets
estimate_price_basis_snapshots
estimate_line_price_traces
price_comparisons
```

## 12. 공식 단가 수집 원칙

official 단가는 반드시 출처명과 기준일을 기록한다.

예:

```text
sourceType: official
sourceName: 대한건설협회 시중노임단가
sourceDate: 2026-01-01
confidenceLevel: high
updateCycle: semiAnnual
```

공식 단가를 가져올 때는 다음을 기록한다.

- 기준 연도
- 반기/월
- 지역 구분 여부
- 직종명
- 단위
- 부가세 포함 여부
- 적용 제한

## 13. supplier 단가 수집 원칙

supplier 단가는 거래처별로 분리한다.

기록 항목:

- 거래처명
- 브랜드
- 견적일
- 유효기간
- 최소 주문 수량
- 배송비 포함 여부
- 부가세 포함 여부
- 현장 반입 포함 여부

## 14. market 단가 수집 원칙

market 단가는 기준 비교용이다.

기록 항목:

- 판매처
- 상품명
- 기준일
- 배송비
- 부가세
- 묶음 수량
- 링크 또는 캡처 보관 여부

## 15. internal 단가 수집 원칙

internal 단가는 실제 현장 결과에서 생성한다.

기록 항목:

- 프로젝트 ID
- 견적 ID
- 공정 코드
- 실제 구매처
- 실제 구매 금액
- 실제 노무비
- 실제 외주비
- 실제 폐기물비
- 실제 운반비
- 실제 마진
- 오차 원인

## 16. AI 학습 관점

단가 출처를 분리하면 AI는 다음 판단을 할 수 있다.

```text
이 단가는 공식 기준보다 낮다.
이 단가는 시장가보다 높다.
이 단가는 내부 실적가보다 낮아 마진 위험이 있다.
이 공급처 단가는 최근 3개월 동안 12% 상승했다.
이 공정은 폐기물/양중비 누락 가능성이 높다.
이 견적은 confidenceLevel이 낮은 단가가 많다.
```

## 17. 승인 필요 항목

다음 항목은 실제 Master DB 반영 전 대표님 승인 필요:

```text
PriceRecord 스키마
PriceBasis 선택 우선순위
official/supplier/market/internal 저장 위치
confidenceLevel 기준
updateCycle 기준
최종 견적에 표시할 가격 추적 필드
manualOverride 허용 범위
```

