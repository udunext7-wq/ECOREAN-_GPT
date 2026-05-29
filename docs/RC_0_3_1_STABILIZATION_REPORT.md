# RC-0.3.1 Operational Data Onboarding Branch Stabilization Report

## 기본 정보

- Branch: `rc-0.3.1-operational-data-onboarding`
- Base tag: `v0.3.0-rc`
- RC-0.3.0 baseline commit: `d531d87`
- Stabilization date: 2026-05-29
- Latest included RC-0.3.1 commit before stabilization: `dfa0822`

## 포함된 RC-0.3.1 작업

- Operational Data Onboarding Flow
- First Operational Data Onboarding Test
- Price Import Manual Matching UX

## 안정화 검증 범위

검증한 흐름:

1. 운영 온보딩 실행 생성
2. 전체 백업 생성
3. 초기 기준 데이터 확인
4. 자재 CSV 가져오기
5. 노무 CSV 가져오기
6. 자동 매칭
7. 미매칭 행 수동 매칭
8. 제외 행 Queue 제외
9. 승인 Queue 생성
10. 단가 승인
11. 백업 후 Master Data 반영
12. LightBIM 첫 프로젝트 가져오기
13. 견적 생성
14. PCE 확인
15. 고객용/내부용 출력 분리
16. 고객 안전성 확인
17. 온보딩 결과 기록
18. 온보딩 리포트 생성

## 안정화 스모크 결과

- Test: `tests/rc-0-3-1-branch-stabilization.smoke.js`
- Result: PASSED
- Onboarding run ID: `OOR-1780063988857-78G5N9`
- Backup ID: `FULL-2026-05-29_231308`
- LightBIM import ID: `LIGHTBIM-IMPORT-1780063989018`
- Estimate ID: `RC031-STABILIZATION-FIRST-PROJECT`
- Queue created count: 2
- PCE decision: `SCALE`
- Customer safety: PASSED

## 이슈

### 발견

- S1: 없음
- S2: 없음
- S3: 없음
- S4: 기존 Vite bundle size warning은 비차단 경고로 유지

### 수정

- 안정화 스모크 작성 중 `applyApprovedPriceUpdate()` 반환 구조를 잘못 가정한 assertion을 Master Data 조회 방식으로 수정했습니다.

### 유예

- XLSX direct parsing
- advanced fuzzy matching
- unmatched row에서 신규 Master Data 자동 생성
- Vite bundle optimization
- packaged app metadata cleanup

## 고객 안전성

고객 화면에서 다음 정보가 노출되지 않음을 확인했습니다.

- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- actual used quantity
- variance
- calibration
- backup path
- onboarding issue details
- import rows
- manual matching logs
- approval queue
- internal
- profit
- risk_score

## Merge Readiness Decision

`MERGE_READY`

판정 근거:

- S1/S2 없음
- RC-0.3.1 핵심 스모크 통과
- 고객 안전성 통과
- build/prod/release smoke 통과
- 문서 업데이트 완료

RC-0.3.1은 아직 tag/release 단계가 아니며, main 병합은 별도 승인 후 진행합니다.
