# RC-0.3.1 첫 운영 데이터 입력 테스트 리포트

## 기본 정보

- 테스트 일자: 2026-05-29
- 브랜치: `rc-0.3.1-operational-data-onboarding`
- 기준선 태그: `v0.3.0-rc`
- 기준선 커밋: `d531d87`
- 테스트 커밋 기준: `bb7417d` 이후 RC-0.3.1 브랜치 변경
- 온보딩 실행 ID: `OOR-1780056032648-BDE1Y6`
- 시나리오: `첫 운영 데이터 입력 테스트`

## 사용 데이터

- `tests/user-test-data/rc-0.3.1/first-operational-onboarding/vendor-first-onboarding.sample.json`
- `tests/user-test-data/rc-0.3.1/first-operational-onboarding/material-price-first-onboarding.csv`
- `tests/user-test-data/rc-0.3.1/first-operational-onboarding/labor-rate-first-onboarding.csv`
- `tests/user-test-data/rc-0.3.1/first-operational-onboarding/first-project-lightbim.sample.json`
- `tests/user-test-data/rc-0.3.1/first-operational-onboarding/first-operational-onboarding-expected-results.json`

모든 단가는 RC-0.3.1 운영 입력 테스트용이며 실제 운영 전 수정이 필요합니다.

## 백업 결과

- 결과: 통과
- 백업 ID: `FULL-2026-05-29_210032`
- 확인 내용:
  - 전체 백업 생성
  - manifest 생성
  - 백업 경로가 `userData/backups` 하위임을 확인

## Master Data 결과

- 결과: 통과
- 확인 내용:
  - 공정 마스터 존재
  - 자재 마스터 존재
  - 노무 마스터 존재
  - 표준 견적 품목 존재
  - 기본 패키지 존재
  - NEEDS_UPDATE 단가 항목 표시 확인

## 단가표 가져오기 / 반영 결과

- 자재 CSV:
  - 전체 7행
  - 정상 7행
  - 매칭 6행
  - 미매칭 1행
  - 차이율 주의 1행
- 노무 CSV:
  - 전체 5행
  - 정상 5행
  - 매칭 5행
  - 미매칭 0행
- 승인/반영:
  - 적용 queue: `RPUQ-1780056034297-ZD384S`, `RPUQ-1780056034428-SHDLOZ`
  - 승인 전에는 Master Data 가격이 변경되지 않음
  - 승인 후 백업과 함께 Master Data 가격 변경 확인

## 첫 프로젝트 / LightBIM 결과

- 결과: 통과
- LightBIM import ID: `LIGHTBIM-IMPORT-1780056034605`
- 견적 ID: `RC031-FIRST-OPERATIONAL-PROJECT`
- 견적 유형: `FULL_REMODELING`
- 수량 검토 레코드 생성 확인

## 견적 / PCE / 출력 결과

- 결과: 통과
- PCE decision: `SCALE`
- 고객용 견적 PDF 출력 확인
- 내부 원가표 Excel 출력 확인
- 고객용/내부용 출력 분리 확인

## 고객 안전성 결과

- 결과: 통과
- 확인 화면:
  - Customer Estimate
  - Client Portal
  - Customer Proposal Map
  - Proposal Board payload
  - Contract customer section
- 내부정보 비노출 확인:
  - internal cost
  - margin
  - PCE
  - vendor
  - labor
  - purchase
  - receiving
  - actual_used
  - variance
  - calibration
  - backup path
  - onboarding issue details
  - internal
  - profit
  - risk_score

## 이슈

### 발견 / 기록

| ID | 심각도 | 화면 | 설명 | 결정 | 상태 |
| --- | --- | --- | --- | --- | --- |
| `OOI-1780056035811-S6CSRY` | S4 | 릴리스 검증 | Vite bundle size warning은 비차단 경고로 유지 | RC-0.3.1 이후 최적화 후보 | DEFERRED |

### 수정

- S1/S2 이슈 없음
- 코드 수정이 필요한 차단 이슈 없음

### 유예

- Vite bundle size warning: 비차단, 후속 최적화 후보
- 단가표 미매칭 1행: 의도된 테스트 행, 향후 수동 매칭 UX 개선 후보

## 최종 판정

`운영 시작 가능`

RC-0.3.1 첫 운영 데이터 입력 테스트는 백업, 초기 기준 데이터, 실제 단가 CSV, 승인/반영, 첫 LightBIM 프로젝트, 견적/PCE, 고객 안전성까지 통과했습니다.

