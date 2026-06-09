# RC-0.3.8 Unmatched Price Auto Recommendation Final Merge Report

## 병합 정보

- Source branch: `rc-0.3.8-unmatched-price-auto-recommendation`
- Base tags:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
  - `v0.3.2-rc`
  - `v0.3.2-rc-packaged`
  - `v0.3.3-rc`
  - `v0.3.3-rc-packaged`
  - `v0.3.4-rc`
  - `v0.3.4-rc-packaged`
  - `v0.3.5-rc`
  - `v0.3.5-rc-packaged`
  - `v0.3.6-rc`
  - `v0.3.6-rc-packaged`
  - `v0.3.7-rc`
  - `v0.3.7-rc-packaged`
- Merge date: 2026-06-09
- Merge commit: `4c5fa803827efe0959a38ce86f54668a8eb88993`
- Included commits:
  - `eea7e80 Start RC-0.3.8 unmatched price auto recommendation`
  - `288a34b Stabilize RC-0.3.8 unmatched price recommendation branch`

## 포함 화면과 서비스

- Screen: `UnmatchedPriceRecommendationCenterView`
- Service: `unmatchedPriceRecommendationService`
- IPC, preload, Electron type 연결
- CEO Dashboard, Drawer, Price Workbook Import, Real Price Calibration Workbench, Price Calibration Priority, Master Data의 6개 내부 진입점

## 추천 알고리즘 기준

- 품목명 정규화와 bigram 유사도
- 한글/영문 주요 품목 alias
- 분류와 적용 공정
- 단위 정규화
- 규격과 브랜드 token
- import 단가와 현재 단가 범위
- 과거 승인/반려 이력
- 동일 공급처 반복

## Confidence 결과

| Confidence | 점수 | 결과 |
| --- | ---: | --- |
| HIGH | 93 | PASSED |
| MEDIUM | 66 | PASSED |
| LOW | 54 | PASSED |
| NO_MATCH | 0 | PASSED |

## 추천 검토 결과

- 추천 승인 `APPROVED`: PASSED
- 추천 반려 `REJECTED`: PASSED
- 추천 보류 `DEFERRED`: PASSED
- 승인 추천의 Price Queue 연결: PASSED
- 추천 상태 `LINKED_TO_QUEUE`: PASSED
- 연결 Queue 상태 `PENDING_REVIEW`: PASSED

## Master Data 보호

- 추천 점수 계산만으로 Master Data 변경 없음: PASSED
- 추천 승인만으로 Master Data 변경 없음: PASSED
- Queue 연결만으로 Master Data 변경 없음: PASSED
- 최종 단가 반영은 기존 Workbench 승인, 백업, old/new history 절차를 거쳐야 함: PASSED

## Customer Safety

- 추천 점수와 confidence 비노출: PASSED
- import row 가격과 후보 Master Data 비노출: PASSED
- 현재/제안 단가, variance, Queue, 승인 상태 비노출: PASSED
- 내부 원가, 마진, PCE, 업체/노무/구매/입고 데이터 비노출: PASSED
- 고객 개인정보와 상세 주소 비노출: PASSED
- 고객용 화면에 추천 센터 진입점 없음: PASSED

## 검증 결과

- 병합 전 서비스 문법 검사: PASSED
- 병합 전 RC-0.3.8 및 기존 핵심 회귀: PASSED
- 병합 전 `build:ui`, `smoke:prod`, `smoke:release`: PASSED
- 병합 후 서비스 문법 검사: PASSED
- 병합 후 RC-0.3.8, 접수, 고객 안전성, LightBIM 회귀: PASSED
- 병합 후 `build:ui`, `smoke:prod`, `smoke:release`: PASSED

## Known Warnings

- Vite production bundle size warning
- Node SQLite experimental API warning
- electron-builder metadata warning when packaging is run
- Node DEP0190 warning or npm update notice when shown

## Deferred Items

- 추천 알고리즘 고도화
- 공급처별 매칭 가중치
- LightBIM 수량 검토 UX
- PCE 해석 안내
- CRM pipeline
- Address API
- Customer portal deployment
- Calendar integration
- Cloud sync
- Bundle optimization

## Final Decision

`RC-0.3.8 = 미매칭 단가 자동 추천 main 반영 완료 / v0.3.8-rc 생성 가능`

추천은 판단 보조이며 Master Data 변경은 기존 Queue, 승인, 백업, history 흐름 외에는 발생하지 않습니다.
