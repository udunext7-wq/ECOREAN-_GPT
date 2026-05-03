# Daily Site Report Schema

## 목적

공사일보는 공정 진행률, 인력 투입, 자재 입고, 현장 이슈를 Case Library로 되돌리는 핵심 문서다.

## 입력값

```text
projectId
reportDate
activeProcessIds
completedProcessIds
laborCrewIds
workerCount
workHours
materialsDelivered
materialsUsed
siteIssues
photos
progressRate
weather
clientRequests
```

## 자동 생성 조건

```text
공정표에 당일 예정 공정이 있을 때
인력 배정이 있을 때
자재 입고 또는 사용 기록이 있을 때
```

## 승인 조건

```text
공정 변경
추가공사 발생
하자/클레임 발생
예정 공정 미진행
사진 기록 누락
```

## 출력 형식

```text
HTML
PDF
XLSX
JSON
현장관리표
```

## 고객용/내부용 구분

```text
고객용: 요약 진행률, 사진 일부, 안내사항
내부용: 인력, 원가, 지연 사유, 리스크, 추가공사 후보
```

## 연결되는 공정

```text
당일 예정 공정
진행 중 공정
완료 공정
지연 공정
```

## 연결되는 결제 흐름

```text
공정률 누적 -> 중도금 청구 가능 여부 판단
완료 공정 누적 -> 잔금 청구 준비
```

## Master DB 반영 여부

```text
실제 생산성
실제 품수
공정 지연 요인
시공 난이도 보정 후보
```

## Case Library 반영 여부

```text
매일 진행률
인력 투입량
자재 사용량
현장 이슈
사진 기록
```

## 예상값 vs 실제값 비교 여부

```text
예정 공정 vs 실제 공정
예상 품수 vs 실제 품수
예상 공기 vs 실제 공기
예상 자재 사용량 vs 실제 사용량
```

