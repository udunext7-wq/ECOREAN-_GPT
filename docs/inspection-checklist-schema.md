# Inspection Checklist Schema

## 목적

검수 체크리스트는 공정 완료, 중도금/잔금 청구 가능 여부, 하자 예방을 연결한다.

## 입력값

```text
inspectionId
projectId
processId
spaceType
inspectionType
checkItems
photoRequired
clientConfirmationRequired
inspector
inspectionDate
result
defectCandidates
```

## 자동 생성 조건

```text
공정 완료 예정일 도래
중도금/잔금 청구 기준 공정 도달
하자 리스크 공정 완료
```

## 승인 조건

```text
검수 실패
고객 확인 필요
중요 사진 누락
하자 후보 발생
잔금 청구 전 필수 검수
```

## 출력 형식

```text
PDF
모바일 체크리스트
JSON
현장관리표
```

## 고객용/내부용 구분

```text
고객용: 인수 확인용 체크리스트
내부용: 상세 검수 항목, 사진, 하자 후보, 책임 공정
```

## 연결되는 공정

```text
방수
타일
설비
전기
도기 설치
샤워부스
도어
준공청소
```

## 연결되는 결제 흐름

```text
중간 검수 통과 -> 중도금 청구 가능
준공 검수 통과 + 고객 인도 -> 잔금 청구 가능
```

## Master DB 반영 여부

```text
하자 빈도
검수 실패율
리스크 플래그
공정 완료 기준
```

## Case Library 반영 여부

```text
검수 결과
사진 기록
고객 확인 여부
하자 후보
재검수 여부
```

## 예상값 vs 실제값 비교 여부

```text
예상 완료 기준 vs 실제 검수 결과
예상 하자 리스크 vs 실제 하자 후보
```

