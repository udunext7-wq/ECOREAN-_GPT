# Master DB Update Policy

## 목적

Master DB는 AI나 현장 데이터에 의해 자동으로 바뀌지 않는다.

모든 변경은 승인 로그를 거쳐야 한다.

## 입력값

```text
correctionCandidateId
targetType
targetId
currentValue
suggestedValue
evidenceCaseIds
reason
requestedBy
```

## 자동 생성 조건

```text
단가 오차 반복
품수 오차 반복
공기 오차 반복
하자 발생률 증가
납기 지연 반복
```

## 승인 조건

```text
대표님 또는 권한 있는 관리자 승인
변경 사유 기록
적용 시작일 기록
이전 버전 보존
```

## 출력 형식

```text
Master DB Update Proposal
ApprovalLog
Version History
JSON Patch
```

## 고객용/내부용 구분

```text
고객용: 비노출
내부용: 변경 후보, 승인 상태, 영향 범위 표시
```

## 연결되는 공정

```text
변경 대상 공정 또는 자재
```

## 연결되는 결제 흐름

```text
직접 연결 없음
단, 마진/현금흐름 영향 분석에 연결
```

## Master DB 반영 여부

```text
승인 후 새 버전으로 반영
```

## Case Library 반영 여부

```text
근거 Case와 연결
```

## 예상값 vs 실제값 비교 여부

```text
반복 오차를 근거로 사용
```

