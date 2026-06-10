# RC-0.3.9 추천 점수 고도화 최종 병합 보고서

- 병합 날짜: 2026-06-10
- source branch: `rc-0.3.9-recommendation-scoring-enhancement`
- merge commit: `471c6c306904832529a1d9d6301f374fd6bdb063`
- included commits:
  - `18f38d4` Start RC-0.3.9 recommendation scoring enhancement
  - `ab3322f` Stabilize RC-0.3.9 recommendation scoring branch
- base tags:
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
  - `v0.3.8-rc`
  - `v0.3.8-rc-packaged`

## 포함 화면과 서비스

- `recommendationScoringService`
- `추천 점수 규칙 센터`
- Unmatched Price Recommendation Center score breakdown
- CEO Dashboard
- Drawer navigation
- Master Data Center
- Real Price Calibration Workbench

## 점수 계산 기준

- 품목명 유사도: 30%
- 공정/분류 유사도: 20%
- 단위 유사도: 15%
- 규격/브랜드 유사도: 15%
- 공급처 가중치: 10%
- 승인/반려 이력: 5%
- 가격 차이율: 5%

## 검증 결과

- HIGH: 93
- MEDIUM: 66
- LOW: 54
- NO_MATCH: 0
- score breakdown: PASSED
- 공급처 일치 점수: 100
- 공급처 미입력 중립 점수: 50
- 공급처만 일치하는 약한 후보의 HIGH 승격 방지: PASSED
- 승인 이력 80 / 중립 50 / 반려 이력 10: PASSED
- 품목명, 단위, 규격 정규화: PASSED
- 활성 단위 alias 적용: PASSED

## 가격 데이터 안전성

- 추천 점수 계산만으로 Master Data 변경 없음: PASSED
- 추천 규칙 저장 및 활성/비활성만으로 Master Data 변경 없음: PASSED
- 추천 승인만으로 Master Data 변경 없음: PASSED
- Queue 연결만으로 Master Data 변경 없음: PASSED
- 연결된 Queue `PENDING_REVIEW` 유지: PASSED
- Workbench 승인, 백업, apply, old/new history 경계 유지: PASSED

## 고객 안전성과 진입점

- 고객 payload scoring/internal data 비노출: PASSED
- CEO Dashboard: PASSED
- Drawer navigation: PASSED
- Unmatched Price Recommendation Center: PASSED
- Master Data Center: PASSED
- Real Price Calibration Workbench: PASSED
- 고객용 화면 진입점 없음: PASSED

## 테스트 결과

- 병합 전 전체 서비스 문법 및 요청된 회귀 테스트: PASSED
- 병합 전 `build:ui`, `smoke:prod`, `smoke:release`: PASSED
- 병합 후 main 핵심 회귀 테스트: PASSED
- 병합 후 `build:ui`, `smoke:prod`, `smoke:release`: PASSED
- 미해결 S1/S2: 없음

## 알려진 경고

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning이 packaging 시 표시될 수 있음
- Node DEP0190 및 npm update notice가 환경에 따라 표시될 수 있음

## 후속 항목

- 실제 운영 데이터 기반 추천 가중치 자동 튜닝
- 공급처별 alias 대량 관리
- LightBIM 수량 검토 UX
- PCE 해석 안내
- CRM pipeline
- address API
- customer portal deployment
- calendar integration
- cloud sync
- bundle optimization

## 최종 판정

`RC-0.3.9 = 추천 점수 고도화 main 반영 가능`

추천 점수는 판단 보조 계층이며, Master Data 변경은 기존 Queue, 승인, 백업, history 흐름으로만 수행한다.
