# RC-0.3.1 Final Merge Report

## 기본 정보

- Source branch: `rc-0.3.1-operational-data-onboarding`
- Target branch: `main`
- Base tag: `v0.3.0-rc`
- Merge date: 2026-05-29
- Merge commit: `0da5513`
- Final decision: `RC-0.3.1 = main 반영 가능 / 운영 데이터 입력 개선 완료`

## 포함된 커밋

- `bb7417d` Start RC-0.3.1 operational data onboarding flow
- `c8213d6` Run RC-0.3.1 first operational data onboarding test
- `dfa0822` Improve RC-0.3.1 price import manual matching UX
- `214cc03` Stabilize RC-0.3.1 operational data onboarding branch
- `0da5513` Merge RC-0.3.1 operational data onboarding branch

## 포함된 개선

- RC-0.3.1 운영 데이터 입력 센터
- 운영 시작 12단계 체크리스트
- 첫 운영 데이터 입력 테스트 데이터와 리포트
- 단가표 미매칭/다중 매칭 행 수동 매칭
- Master Data 후보 검색
- 수동 매칭 저장, 해제, 행 제외
- Queue 생성 가능 여부 요약
- 수동 매칭 로그
- RC-0.3.1 브랜치 안정화 스모크
- release smoke 내 RC-0.3.1 대표 체크

## 병합 전 테스트

- Service syntax check: PASSED
- `rc-0-3-1-branch-stabilization.smoke.js`: PASSED
- `price-import-manual-matching.smoke.js`: PASSED
- `rc-0-3-1-first-operational-onboarding.smoke.js`: PASSED
- `operational-data-onboarding.smoke.js`: PASSED
- `real-price-import-user-test.smoke.js`: PASSED
- `price-workbook-import.smoke.js`: PASSED
- `real-price-calibration.smoke.js`: PASSED
- `backup-restore-data-safety.smoke.js`: PASSED
- `lightbim-boc-release-flow.smoke.js`: PASSED
- `lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## 병합 후 main 테스트

- Service syntax check: PASSED
- `rc-0-3-1-branch-stabilization.smoke.js`: PASSED
- `price-import-manual-matching.smoke.js`: PASSED
- `rc-0-3-1-first-operational-onboarding.smoke.js`: PASSED
- `operational-data-onboarding.smoke.js`: PASSED
- `real-price-import-user-test.smoke.js`: PASSED
- `price-workbook-import.smoke.js`: PASSED
- `lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## 고객 안전성

고객 화면 및 고객용 payload에서 다음 정보가 노출되지 않음을 확인했습니다.

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

## 유예 항목

- XLSX direct parsing
- advanced fuzzy matching
- unmatched row new Master Data auto-create
- Vite bundle optimization
- package metadata cleanup

## 최종 병합 판정

`MERGE_READY`

RC-0.3.1은 main에 반영되었으며, 별도 태그 `v0.3.1-rc` 생성 대상으로 확정되었습니다.
