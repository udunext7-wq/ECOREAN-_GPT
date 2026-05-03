# Closed Loop Operating System

## 목적

ECOREAN BOC는 Closed Loop Operating System으로 설계한다.

현장 결과가 다시 Master DB, Rule Engine, Case Library, ML 보정 구조로 돌아와 다음 견적 정확도를 높여야 한다.

## 운영 루프

```text
고객 상담
-> 실측 / 현장 분석
-> 자동 견적 생성
-> 계약 / 수금 계획
-> 발주 / 자재 준비
-> 공정표 자동 생성
-> 현장 시공
-> 공사일보 기록
-> 검수 / 추가공사
-> 준공 / 잔금
-> 하자 / A/S
-> 실제 원가 분석
-> 예상 vs 실제 오차 분석
-> 단가 보정
-> Master DB 업데이트
-> 다음 견적 정확도 상승
-> 다시 고객 상담
```

## 입력값

```text
모든 운영 문서의 입력값
견적 입력
현장 기록
실제 원가
실제 일정
하자 기록
고객 피드백
```

## 자동 생성 조건

```text
프로젝트 생성
견적 생성
계약 체결
공정 진행
준공
정산 완료
Case Library 저장
```

## 승인 조건

```text
Master DB 변경
단가 보정
품수 보정
공기 보정
하자 발생률 보정
Rule 변경
ML 제안 반영
```

## 출력 형식

```text
운영 대시보드
Case Report
Variance Report
Master DB Update Proposal
JSON Graph
```

## 고객용/내부용 구분

```text
고객용: 공사진행, 청구, 인도, A/S
내부용: 원가, 마진, 오차, 보정, 승인, 학습 데이터
```

## 연결되는 공정

```text
프로젝트의 모든 공정
```

## 연결되는 결제 흐름

```text
계약금
중도금
잔금
추가공사
외주비
자재비
하자비
```

## Master DB 반영 여부

```text
단가
품수
공기
손실률
spaceFactor
minimumLaborCharge
leadTimeDays
하자 리스크
```

## Case Library 반영 여부

```text
프로젝트 전체 결과 저장
```

## 예상값 vs 실제값 비교 여부

```text
모든 주요 예상값과 실제값을 비교한다.
```

