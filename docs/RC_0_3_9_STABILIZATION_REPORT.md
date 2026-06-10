# RC-0.3.9 추천 점수 고도화 안정화 보고서

- 작업 날짜: 2026-06-10
- 브랜치: `rc-0.3.9-recommendation-scoring-enhancement`
- 안정화 시작 커밋: `18f38d4`
- 기준 태그: `v0.3.8-rc-packaged`
- 구현 서비스: `recommendationScoringService`
- 구현 화면: `추천 점수 규칙 센터`

## 점수 계산 기준

- 품목명 유사도: 30%
- 공정/분류 유사도: 20%
- 단위 유사도: 15%
- 규격/브랜드 유사도: 15%
- 공급처 가중치: 10%
- 승인/반려 이력: 5%
- 가격 차이율: 5%

## 안정화 결과

- 품목명 정규화: PASSED
- 단위 및 활성 단위 alias 정규화: PASSED
- 규격 정규화: PASSED
- score breakdown 생성: PASSED
- HIGH: 93
- MEDIUM: 66
- LOW: 54
- NO_MATCH: 0
- 공급처 일치 점수: 100
- 공급처 미입력 중립 점수: 50
- 공급처만 일치하는 약한 후보: NO_MATCH
- 승인 이력 점수: 80
- 중립 이력 점수: 50
- 반려 이력 점수: 10

## 안전 검증

- 추천 점수 계산만으로 Master Data 변경 없음: PASSED
- 추천 규칙 저장 및 활성/비활성만으로 Master Data 변경 없음: PASSED
- 추천 승인만으로 Master Data 변경 없음: PASSED
- Queue 연결만으로 Master Data 변경 없음: PASSED
- 연결된 Queue `PENDING_REVIEW` 유지: PASSED
- 실제 가격 반영은 Workbench 승인, 백업, apply, history 경계 유지: PASSED
- 고객 payload의 scoring, recommendation, queue, 내부 가격 및 개인정보 비노출: PASSED

## 진입점

- CEO Dashboard: PASSED
- Drawer navigation: PASSED
- Unmatched Price Recommendation Center: PASSED
- Master Data Center: PASSED
- Real Price Calibration Workbench: PASSED
- 고객 화면 진입점 없음: PASSED
- 규칙 데이터가 없을 때 empty state: PASSED

## 수정 이슈 재검증

- UI 브리지 타입 오류: `window.ecorean.bocDb` 사용 확인, 재발 없음
- 동일 문자열 유사도 1/100 오류: 동일 정규화 문자열 100점 확인, 재발 없음
- 테스트 DB 필수 컬럼 누락: 실제 Master Data 스키마 기반 픽스처 통과, 재발 없음

## 발견 및 수정 이슈

- 안정화 단계에서 새 S1/S2 이슈 없음.
- 추가 기능 또는 업무 로직 변경 없음.

## 후속 항목

- 실제 업체 데이터 기반 동의어 및 공급처 패턴 축적
- 규칙 변경 전후 추천 정확도 비교 리포트
- 대량 규칙 관리 UX
- 고급 fuzzy matching

## 병합 준비 판정

`MERGE_READY`

RC-0.3.9는 추천 판단 보조 계층으로 main 병합 가능하다. 가격 변경은 기존 Queue, 승인, 백업, history 흐름 밖에서 수행되지 않는다.
