# Purchase Order Schema

## 목적

발주서는 견적 선택값과 공정표에서 자동 생성되는 내부 운영 문서다.

## 입력값

```text
projectId
estimateId
processId
materialId
materialName
materialType
quantity
unit
minimumOrderUnit
wasteRate
supplierId
leadTimeDays
scheduledProcessStartDate
stockAvailable
alternativeMaterials
```

## 자동 생성 조건

```text
선택 공정에 orderRequired == true 자재가 존재할 때
공정 시작일과 leadTimeDays가 존재할 때
자재/부자재/소모품 수량이 산출되었을 때
```

## 승인 조건

```text
고액 자재 발주
대체 자재 사용
leadTimeDays 미확정
supplierPrice 미확정
재고 여부 UNKNOWN
```

## 출력 형식

```text
HTML
PDF
XLSX
JSON
```

## 고객용/내부용 구분

```text
고객용: 원칙적으로 비노출
내부용: 거래처, 단가, 발주일, 입고일, 리스크 표시
```

## 연결되는 공정

```text
타일
도기 설치
샤워부스
천장
조명
환풍기
도어
창호
가구
마감
```

## 연결되는 결제 흐름

```text
고액 자재 발주 전 중도금 청구 가능 여부 확인
발주 확정 -> Cashflow outflow 생성
입고 완료 -> 공정 시작 가능 조건 충족
```

## Master DB 반영 여부

```text
supplier 단가
leadTimeDays
minimumOrderUnit
wasteRate
alternativeMaterials
```

## Case Library 반영 여부

```text
실제 발주일
실제 입고일
납기 지연
실제 구매가
대체 자재 사용 여부
```

## 예상값 vs 실제값 비교 여부

```text
예상 발주일 vs 실제 발주일
예상 입고일 vs 실제 입고일
예상 자재비 vs 실제 자재비
예상 손실률 vs 실제 손실률
```

