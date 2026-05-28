# RC-0.3.0 Packaged App Real Use Test Report

## 테스트 정보

| 항목 | 내용 |
| --- | --- |
| 테스트 일자 | 2026-05-28 |
| 테스터 | Codex packaged release validation |
| 버전 | RC-0.3.0 |
| 기준 커밋 | 08d9b76 Build RC-0.3.0 desktop release package |
| 패키지 실행 파일 | `C:/Users/udune/Documents/Codex/2026-04-25/new-chat-2/electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe` |
| userData 경로 | `%APPDATA%/ecorean-boc-electron` |
| 최종 판정 | 패키지 실사용 가능 |

## 실행 확인

- 패키지 exe 실행: PASSED
- 창 제목: `ECOREAN BOC CEO Dashboard`
- dev server 필요 여부: 필요 없음
- 프로덕션 로딩 방식: packaged `dist/index.html`
- 치명 오류: 없음

## DB / userData 확인

- SQLite DB 위치: `%APPDATA%/ecorean-boc-electron/storage/sqlite`
- `project.db`, `master.db`, `approval.db`, `logs.db` 생성 확인
- 개발 DB 경로 의존성: 발견 없음
- 서비스 재초기화 후 저장 견적 재조회/export: PASSED

## Export 폴더 확인

`%APPDATA%/ecorean-boc-electron/export` 아래 다음 폴더가 생성되었다.

- `estimates`
- `contracts`
- `schedules`
- `purchase-orders`
- `visualizations`
- `boards`
- `reports`
- `lightbim`

## LightBIM / Estimate / PCE 결과

- 사용 fixture: `tests/fixtures/lightbim/real-minicad-export.lightbim.json`
- 생성 견적 ID: `FULL-PACKAGED-REAL-USE-1779965007473`
- 감지 견적 유형: `FULL_REMODELING`
- LightBIM 수량 출처 내부 line item 확인: PASSED
- PCE 결과: `SCALE`
- 계약, 공정표, 발주 생성: PASSED

## Export 결과

실제 파일 생성 확인:

- 고객 견적 PDF: `%APPDATA%/ecorean-boc-electron/export/estimates/estimate_FULL-PACKAGED-REAL-USE-1779965007473_customer.pdf`
- 내부 견적 Excel: `%APPDATA%/ecorean-boc-electron/export/estimates/estimate_FULL-PACKAGED-REAL-USE-1779965007473_internal.xlsx`
- 제안 보드 PDF: `%APPDATA%/ecorean-boc-electron/export/boards/proposal_board_FULL-PACKAGED-REAL-USE-1779965007473_1779965007900.pdf`

현재 공정표/발주서 export는 생성 객체와 export 폴더 readiness를 확인했다. 전용 PDF/Excel export 함수가 있는 견적/계약/보드는 실제 파일 생성을 확인했다.

## 재시작 / Persistence 결과

- packaged service 재초기화 후 동일 견적 ID로 고객 견적 PDF 재생성: PASSED
- DB reset 없음: PASSED
- export 파일 유지: PASSED

## 고객 안전성 결과

검사 대상:

- Customer Estimate
- Client Portal payload
- Customer Proposal Map
- Proposal Board customer PDF payload
- Contract customer section payload

금지 키 검사 결과: PASSED

금지 항목:

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
- red_alert
- internal
- profit
- risk_score

## 발견 이슈

| 이슈 ID | 심각도 | 내용 | 처리 |
| --- | --- | --- | --- |
| RC030-S1-001 | S1 | 동일 userData DB에서 packaged service 반복 초기화 시 `company_cashflow_forecast.forecast_id` 중복으로 SQLite 제약 오류 발생 | `forecast_id LIKE CFF-월-%` 기준 재생성으로 수정, `packaged-real-use` 재통과 |

## 보류 항목

| 항목 | 심각도 | 판단 |
| --- | --- | --- |
| Vite bundle size warning | S4 | 비차단, 후속 최적화 |
| electron-builder description/author warning | S4 | 비차단, 패키징 polishing 항목 |
| code signing / installer polishing | S4 | RC-0.3.0 범위 밖 |

## 최종 판정

`패키지 실사용 가능`

근거:

- 패키지 exe 실행 통과
- dev server 불필요
- userData SQLite / export 생성 통과
- LightBIM import, 견적, PCE, export 통과
- 재시작 후 persistence 통과
- packaged DB 반복 초기화 오류 수정 및 재검증 통과
- 고객/내부 데이터 분리 통과
