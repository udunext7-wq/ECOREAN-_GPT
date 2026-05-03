# Material Delivery Check Schema

## 목적

자재입고 확인서는 발주서, 배송, 공정 시작 가능 조건을 연결한다.

## 입력값

```text
purchaseOrderId
projectId
materialId
materialName
expectedDeliveryDate
actualDeliveryDate
orderedQuantity
deliveredQuantity
damagedQuantity
missingQuantity
deliveryPhotoIds
storageLocation
checkedBy
```

## 자동 생성 조건

```text
발주서가 생성되었을 때
입고 예정일이 도래했을 때
공정 시작 전 자재 입고 확인이 필요할 때
```

## 승인 조건

```text
수량 부족
파손 발생
대체 자재 입고
입고 지연
고객 선택 자재와 불일치
```

## 출력 형식

```text
PDF
XLSX
JSON
모바일 체크리스트
```

## 고객용/내부용 구분

```text
고객용: 선택 자재 입고 확인 요약 가능
내부용: 거래처, 수량, 파손, 보관 위치, 지연 리스크
```

## 연결되는 공정

```text
자재가 필요한 모든 공정
특히 타일, 도기, 샤워부스, 도어, 창호, 가구, 조명
```

## 연결되는 결제 흐름

```text
고액 자재 입고 확인 -> 중도금 청구 조건으로 사용 가능
입고 지연 -> 공정 지연 -> 현금흐름 지연 리스크
```

## Master DB 반영 여부

```text
leadTimeDays
supplier reliability
damageRate
minimumOrderUnit
```

## Case Library 반영 여부

```text
실제 입고일
입고 지연
파손률
수량 오차
대체 자재
```

## 예상값 vs 실제값 비교 여부

```text
예정 입고일 vs 실제 입고일
주문 수량 vs 입고 수량
예상 파손률 vs 실제 파손률
```

