# RC-0.3.1 First Real Project Run Report

## 기본 정보

- Date: 2026-05-30
- App version: RC-0.3.1
- Tag: `v0.3.1-rc`
- Commit: `aedf30c Build RC-0.3.1 desktop release package`
- Branch: `main`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Production data path: `%APPDATA%\ecorean-boc-electron`
- Project name: `RC-0.3.1 첫 실제 운영 테스트 프로젝트`
- Estimate type: `FULL_REMODELING`

## 패키지 앱 실행 결과

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- Fatal launch error: none

## 운영 데이터 경로 확인

- userData: `%APPDATA%\ecorean-boc-electron` - 확인
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite` - 확인
- export: `%APPDATA%\ecorean-boc-electron\export` - 확인
- backups: `%APPDATA%\ecorean-boc-electron\backups` - 확인

Export folders:

- estimates: 확인
- contracts: 확인
- schedules: 확인
- purchase-orders: 확인
- visualizations: 확인
- boards: 확인
- reports: 확인
- lightbim: 확인

Backup folders:

- db: 확인
- export: 확인
- full: 확인
- manifests: 확인

## 백업 결과

- Backup result: PASSED
- Automated run backup ID: `FULL-2026-05-30_114041`
- Backup rule: 단가 반영 전 백업 후 적용 확인
- Backup failure: none

## Master Data 상태

- Process master: 확인
- Material master: 확인
- Labor master: 확인
- Standard estimate items: 확인
- Estimate default packages: 확인
- Price status: `NEEDS_UPDATE` / `CONFIRMED` / `UPDATED` 흐름 확인

## 단가표 가져오기 / 승인 / 반영

Material CSV:

- Rows: 7
- Valid: 7
- Matched: 6
- Unmatched: 1
- High variance: 1

Labor CSV:

- Rows: 5
- Valid: 5
- Matched: 5
- Unmatched: 0

Approval/apply:

- Queue created: 확인
- Approved queue applied after backup: 확인
- Applied queue IDs:
  - `RPUQ-1780108841766-C6759R`
  - `RPUQ-1780108841837-8E2Q9Y`
- Price applied before approval: no
- Backup skipped before apply: no

## LightBIM 도면 가져오기

- LightBIM import result: PASSED
- Import ID: `LIGHTBIM-IMPORT-1780108841950`
- Estimate draft/project: `RC031-FIRST-OPERATIONAL-PROJECT`
- Suggested estimate type: `FULL_REMODELING`
- Quantity/PCE flow: PASSED

## 견적 / PCE

- Estimate generation: PASSED
- PCE decision: `SCALE`
- Missing total: none
- Crash: none
- Updated master price or fallback behavior: 확인

## 고객용 / 내부용 출력

- Customer estimate PDF readiness/file generation: PASSED
- Internal cost Excel readiness/file generation: PASSED
- Customer/internal split: PASSED

Customer payload safety checked:

- customer estimate
- client portal
- customer proposal map
- proposal board payload
- contract customer section

Forbidden internal data exposure: none

## 계약 / 공정표 / 발주서

- Contract generation: PASSED
- Schedule generation: PASSED
- Purchase order quantity binding: PASSED
- Schedule/purchase smoke:
  - schedule item count: 9
  - purchase order item count: 23
  - tile order quantity: 32.34
  - receiving source: `USER_REVIEW`

## 고객 제안 / 디자인 보드

- Customer proposal map safety: PASSED
- Proposal board customer payload safety: PASSED
- Approved images: no new real images provided; safe empty/design payload behavior remains acceptable.

## 이슈

### S1

- 없음

### S2

- 없음

### S3

- 실제 고객 데이터가 아직 제공되지 않아 이번 run은 안전한 테스트 데이터 기반으로 검증했습니다.
- 미매칭 단가 행은 수동 매칭 또는 제외 판단이 필요합니다.

### S4

- Vite bundle size warning remains non-blocking.
- SQLite experimental warning remains non-blocking.

## 실행한 검증

- Packaged app launch check: PASSED
- `node tests/rc-0-3-1-first-operational-onboarding.smoke.js`: PASSED
- `node tests/rc-0-3-1-packaged-release.smoke.js`: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED
- `node tests/lightbim-boc-release-flow.smoke.js`: PASSED
- `node tests/lightbim-schedule-purchase-binding.smoke.js`: PASSED
- `node --check electron/services/*.js`: PASSED
- `node tests/rc-0-3-1-branch-stabilization.smoke.js`: PASSED
- `node tests/price-import-manual-matching.smoke.js`: PASSED
- `node tests/operational-data-onboarding.smoke.js`: PASSED
- `node tests/price-workbook-import.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## 최종 판정

`첫 실제 프로젝트 운영 가능`

판정 근거:

- S1/S2 없음
- 백업 경로와 백업 흐름 확인
- 견적/PCE 동작
- 고객/내부 데이터 분리 통과
- 고객용 출력 안전성 통과
- 계약/공정표/발주 수량 연결 회귀 통과

주의:

- 실제 고객명, 실제 현장정보, 실제 업체 견적 파일은 아직 제공되지 않았으므로 이번 run은 RC-0.3.1 안전 테스트 데이터 기반의 첫 운영 검증입니다.
- 실제 운영 투입 전에는 동일 절차로 전체 백업을 만들고, 실제 단가표를 가져온 뒤 고객용 출력 안전성을 다시 확인해야 합니다.
