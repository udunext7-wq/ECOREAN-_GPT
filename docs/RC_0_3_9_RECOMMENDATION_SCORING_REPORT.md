# RC-0.3.9 추천 점수 고도화 보고서

- 작업 날짜: 2026-06-09
- 브랜치: `rc-0.3.9-recommendation-scoring-enhancement`
- 기준 태그: `v0.3.8-rc-packaged`
- 구현 화면: `추천 점수 규칙 센터`
- 구현 서비스: `recommendationScoringService`

## 구현 결과

- 품목명 동의어 정규화: 구현
- 단위 및 규격 정규화: 구현
- 브랜드/재질/모델 식별 요소 분리: 구현
- 공급처별 가중치: 구현
- 승인/반려 이력 점수: 구현
- 가격 차이율 안전 점수: 구현
- 규칙 활성/비활성 및 리포트: 구현
- 기존 미매칭 추천 서비스 score breakdown 연동: 구현

## 점수 기준

- 품목명 30%
- 공정/분류 20%
- 단위 15%
- 규격/브랜드 15%
- 공급처 10%
- 승인/반려 이력 5%
- 가격 차이율 5%

## 신뢰도 회귀 결과

- HIGH: 93
- MEDIUM: 66
- LOW: 54
- NO_MATCH: 0

기존 RC-0.3.8 기준값은 변경하지 않았다.

## 안전 검증

- score breakdown 생성: PASSED
- 공급처가 없을 때 중립 점수 적용: PASSED
- 공급처 일치 가중치: PASSED
- 공급처 단독 HIGH 승격 방지: PASSED
- 승인 이력 가산 / 반려 이력 감산: PASSED
- 추천 규칙 변경만으로 Master Data 변경 없음: PASSED
- 추천 승인만으로 Master Data 변경 없음: PASSED
- Queue 연결만으로 Master Data 변경 없음: PASSED
- Queue `PENDING_REVIEW` 유지: PASSED
- 고객 payload scoring/internal data 비노출: PASSED

## 발견 이슈

- UI 브리지 래퍼가 프로젝트 표준 `window.ecorean.bocDb` 대신 다른 전역 이름을 사용해 초기 TypeScript 빌드가 실패했다.
- 기존 브리지 패턴으로 수정 후 빌드가 통과했다.
- 미해결 S1/S2: 없음.

## 최종 판정

`MERGE_READY`

RC-0.3.9 추천 점수는 판단 보조로 사용할 수 있다. Master Data 반영은 기존 Queue, 승인, 백업, history 흐름으로만 수행한다.

## 안정화 결과

- 안정화 날짜: 2026-06-10
- 안정화 스모크: PASSED
- 5개 내부 진입점: PASSED
- UI bridge 회귀: PASSED
- 동일 문자열 유사도 회귀: PASSED
- 테스트 DB 스키마 회귀: PASSED
- 전체 가격/접수/LightBIM/고객 안전 회귀: PASSED
- 미해결 S1/S2: 없음
- 병합 준비 판정: `MERGE_READY`
