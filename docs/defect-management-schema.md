# Defect Management Schema

## 목적

하자관리표는 준공 이후에도 유지되는 운영 문서이며, 실제 원가와 Case Library에 연결된다.

## 입력값

```text
defectId
projectId
processId
spaceType
defectType
detectedDate
reportedBy
severity
cause
repairRequired
reworkRequired
estimatedRepairCost
actualRepairCost
responsibleParty
status
photoIds
clientConfirmation
```

## 자동 생성 조건

```text
검수 실패
고객 클레임 등록
준공 후 A/S 접수
공사일보에서 하자 후보 기록
```

## 승인 조건

```text
하자 처리비 발생
재시공 필요
책임 소재 불명확
외주팀 비용 청구
고객 보상 필요
```

## 출력 형식

```text
내부 하자관리표
고객 A/S 접수 확인서
JSON
사진 리포트
```

## 고객용/내부용 구분

```text
고객용: 접수 내용, 처리 예정일, 완료 확인
내부용: 원인, 책임, 비용, 마진 영향, 재발 방지
```

## 연결되는 공정

```text
하자가 발생한 모든 공정
```

## 연결되는 결제 흐름

```text
잔금 전 중요 하자 open -> 잔금 청구 blocking
하자 처리비 -> Cashflow outflow
외주 책임 하자 -> 외주 정산 차감 가능
```

## Master DB 반영 여부

```text
하자 발생률
riskFlags
completionCriteria
inspectionPoint
시공 난이도 보정 후보
```

## Case Library 반영 여부

```text
하자 유형
발생일
처리비
재시공 여부
책임 주체
클레임 기록
```

## 예상값 vs 실제값 비교 여부

```text
예상 하자 리스크 vs 실제 하자
예상 하자 비용 0 vs 실제 처리비
```

