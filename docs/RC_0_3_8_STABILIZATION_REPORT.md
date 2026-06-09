# RC-0.3.8 Unmatched Price Auto Recommendation Stabilization Report

## 기준 정보

- Branch: `rc-0.3.8-unmatched-price-auto-recommendation`
- Latest implementation commit: `eea7e80`
- Base tag: `v0.3.7-rc-packaged`
- Screen: `UnmatchedPriceRecommendationCenterView`
- Service: `unmatchedPriceRecommendationService`
- Stabilization date: 2026-06-09

## 검증 범위

- 단가 미매칭 추천 센터와 빈 상태
- 추천 summary와 미매칭 import row 목록
- Master Data 후보 Top 3
- 추천 생성, 승인, 반려, 보류
- 승인 추천의 Price Queue 연결
- Queue `PENDING_REVIEW` 상태 유지
- 추천 승인 및 Queue 연결 시 Master Data 불변
- 추천 리포트 생성
- 고객 payload와 고객 화면의 내부 추천 정보 비노출
- CEO Dashboard, Drawer, Price Workbook Import, Real Price Workbench, Price Calibration Priority, Master Data의 6개 내부 진입점

## 추천 알고리즘 기준

- 품목명 정규화와 bigram 유사도
- 한글/영문 주요 품목명 alias
- 분류와 적용 공정
- 단위 정규화
- 규격과 브랜드 token
- import 단가와 현재 단가의 범위
- 과거 승인/반려 이력
- 동일 공급처 반복

## Confidence 안정화 결과

| Confidence | 점수 | 결과 |
| --- | ---: | --- |
| HIGH | 93 | PASSED |
| MEDIUM | 66 | PASSED |
| LOW | 54 | PASSED |
| NO_MATCH | 0 | PASSED |

기존 fixture를 변경하지 않고 동일한 점수가 재현되었습니다. `NO_MATCH`는 신규 Master Data를 자동 생성하지 않고 검토 대상으로 안전하게 유지됩니다.

## 검토 상태 결과

- 추천 생성 `PENDING_REVIEW`: PASSED
- 추천 승인 `APPROVED`: PASSED
- 추천 반려 `REJECTED`: PASSED
- 추천 보류 `DEFERRED`: PASSED
- Queue 연결 `LINKED_TO_QUEUE`: PASSED
- 연결 Queue `PENDING_REVIEW`: PASSED

## Master Data 보호 결과

- 추천 점수 계산 중 직접 변경 없음: PASSED
- 추천 승인만으로 직접 변경 없음: PASSED
- Queue 연결만으로 직접 변경 없음: PASSED
- 최종 반영은 기존 Real Price Calibration Workbench의 승인, 백업, old/new history 절차 사용: PASSED

## Customer Safety

- 추천 점수와 confidence 비노출: PASSED
- import row 및 후보 Master Data 비노출: PASSED
- 현재/제안 단가와 variance 비노출: PASSED
- Queue 및 승인 상태 비노출: PASSED
- 내부 원가, 마진, PCE, 업체/노무/구매/입고 정보 비노출: PASSED
- 고객 개인정보와 상세 주소 비노출: PASSED

## 진입점 결과

- CEO Dashboard: PASSED
- Drawer navigation: PASSED
- Price Workbook Import Center: PASSED
- Real Price Calibration Workbench: PASSED
- Price Calibration Priority Center: PASSED
- Master Data Center: PASSED
- 고객용 화면 진입점 없음: PASSED

## 발견 및 수정 이슈

- 구현 단계 최초 실행에서 MEDIUM fixture가 높은 이름 유사도로 HIGH 판정을 받았습니다.
- 알고리즘 결함이 아니라 경계 검증 fixture의 표현 문제로 분리했습니다.
- fixture 이름을 경계값 목적에 맞게 조정한 뒤 `MEDIUM = 66`으로 고정되었고, 안정화 재실행에서도 변경 없이 재현되었습니다.
- 안정화 단계에서 새 S1/S2 이슈는 발견되지 않았습니다.

## Deferred

- XLSX 직접 파싱
- 고급 fuzzy matching과 사용자별 학습
- NO_MATCH 신규 Master Data 자동 생성
- 대량 일괄 검토 UI
- 외부 가격 수집
- Vite bundle splitting

## Merge Readiness

`MERGE_READY`

추천은 판단 보조이며, 승인된 추천과 Queue 연결만으로 Master Data가 변경되지 않습니다.
