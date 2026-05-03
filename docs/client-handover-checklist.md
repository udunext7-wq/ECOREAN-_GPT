# Client Handover Checklist

## 목적

고객 인도 체크리스트는 준공, 잔금, 하자 시작 기준을 연결한다.

## 입력값

```text
handoverId
projectId
clientId
handoverDate
completedProcesses
inspectionResults
openDefects
clientConfirmed
photoRecords
manualsDelivered
keysDelivered
finalPaymentMilestoneId
```

## 자동 생성 조건

```text
준공검수 완료
중요 하자 없음
청소 완료
고객 인도 일정 확정
```

## 승인 조건

```text
open defect 존재
고객 미확인
잔금 전 인도
사진 기록 누락
```

## 출력 형식

```text
고객용 인도 확인서
내부 인도 체크리스트
PDF
JSON
```

## 고객용/내부용 구분

```text
고객용: 완료 항목, 사용 안내, A/S 안내, 서명
내부용: 미결 항목, 잔금 조건, 하자 리스크, 사진 기록
```

## 연결되는 공정

```text
준공청소
검수
잔손보기
하자 처리
```

## 연결되는 결제 흐름

```text
고객 인도 확인 -> 잔금 청구 가능
잔금 입금 -> 프로젝트 정산 단계 이동
```

## Master DB 반영 여부

```text
직접 반영하지 않음
단, 하자/검수 기준 개선 데이터로 활용
```

## Case Library 반영 여부

```text
고객 인도일
잔금 청구 가능일
고객 확인 여부
인도 시 open defect
```

## 예상값 vs 실제값 비교 여부

```text
예상 인도일 vs 실제 인도일
예상 open defect 0 vs 실제 open defect
```

