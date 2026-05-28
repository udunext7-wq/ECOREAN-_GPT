# RC-0.3.0 User Test Report

## 테스트 회차 정보

| 항목 | 내용 |
| --- | --- |
| 릴리스 버전 | RC-0.3.0 |
| 기준 커밋 | c039669 Add RC-0.3.0 user test package |
| 테스트 회차 ID | UTRUN-RC030-1779961488230-1035 |
| 시나리오 | 전체 사용자 테스트 |
| 테스터 | CEO 사용자 테스트 |
| 환경 | Windows Desktop / Local DB / RC-0.3.0 |
| 테스트 일자 | 2026-05-28 |
| 최종 판정 | 실사용 가능 |

## 검증 범위

이번 사용자 테스트는 `MiniCAD / LightBIM -> BOC Import -> Quantity Review -> Estimate / PCE -> Schedule / Purchase -> Execution Feedback -> Traceability / Space Map -> Customer Proposal / Export -> Closing / Calibration` 흐름을 검증했다.

## 단계 결과

| 단계 | 검증 영역 | 결과 | 결함 ID | 증빙/비고 |
| --- | --- | --- | --- | --- |
| UT-01 | 욕실 단독 리모델링 / MiniCAD LightBIM 내보내기 | PASSED | - | LightBIM JSON 내보내기 및 욕실 견적 스모크 통과 |
| UT-02 | 주방 리모델링 / LightBIM 가져오기 | PASSED | - | 주방 견적 및 LightBIM 가져오기 스모크 통과 |
| UT-03 | 전체 리모델링 / 수량 검토 및 수정 | PASSED | - | 수량 검토, 사용자 수정, 재계산 검증 통과 |
| UT-04 | 견적 계산 / PCE | PASSED | - | 견적 생성 및 PCE `GO`/`SCALE` 결과 확인 |
| UT-05 | 계약서 / 공정표 | PASSED | - | 계약 초안과 수량 기반 공정표 생성 확인 |
| UT-06 | 발주서 / 자재입고 | PASSED | - | 타일 29.4㎡ -> 10% 할증 -> 32.34㎡ 발주량 확인 |
| UT-07 | 실행 피드백 | PASSED | - | 실제 사용량 입력, 차이율, 보정 후보 생성 확인 |
| UT-08 | LightBIM 추적 보기 / 공간 맵 | PASSED | - | traceability, 내부 공간 맵 데이터 로드 확인 |
| UT-09 | 고객용 공간 제안 맵 | PASSED | - | 고객용 맵 payload와 제안 보드 section 확인 |
| UT-10 | 디자인 보드 / 제안서 PDF / 출력 | PASSED | - | 고객/내부 견적 PDF/XLSX 및 보드 payload 확인 |
| UT-11 | 고객 포털 안전성 | PASSED | - | 고객 포털, 견적, 계약, 고객 맵, 제안 보드 금지 키 검사 통과 |
| UT-12 | 마감 / 보정 후보 | PASSED | - | 프로젝트 마감과 LightBIM 피드백 summary 연결 확인 |

## 결함 요약

| 심각도 | 발생 수 | 수정 수 | 미해결 수 | 비고 |
| --- | ---: | ---: | ---: | --- |
| S1 치명 | 0 | 0 | 0 | 앱 크래시, PCE 실패, 고객 내부정보 노출 없음 |
| S2 높음 | 0 | 0 | 0 | 계약/공정표/발주/제안 보드 차단 없음 |
| S3 보통 | 1 | 1 | 0 | 테스트 회차에 시나리오명이 저장/표시되지 않아 개선 |
| S4 낮음 | 1 | 0 | 1 | Vite bundle size warning은 비차단 최적화 대상 |

## 수정한 이슈

| 이슈 ID | 심각도 | 화면 | 내용 | 조치 |
| --- | --- | --- | --- | --- |
| RC030-S3-001 | S3 | RC-0.3.0 사용자 테스트 | 회차 생성 시 `전체 사용자 테스트` 시나리오가 별도 필드로 저장되지 않음 | `test_scenario` 컬럼, IPC 타입, UI 입력/표시, 스모크 검증 추가 |

## 고객 안전 점검

- 고객 포털 내부정보 노출: 통과
- 고객 견적 / 계약 고객 section 내부정보 노출: 통과
- 고객 공간 제안 맵 내부정보 노출: 통과
- 제안 보드/PDF payload 내부정보 노출: 통과
- 금지 항목: cost, margin, pce, vendor, labor, purchase, receiving, actual_used, variance, calibration, red_alert, internal, profit, risk_score

## 검증 명령 결과

- `Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }`: PASSED
- `node tests/rc-0-3-0-user-test-package.smoke.js`: PASSED
- `node tests/lightbim-boc-release-flow.smoke.js`: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## 최종 결론

- 승인 여부: 실사용 가능
- 잔여 조치: S4 번들 크기 경고는 후속 최적화 항목으로 관리
- 재테스트 필요 여부: S3 수정 후 전체 스모크 재실행 완료
- 대표 확인: RC-0.3.0 사용자 흐름 기준 통과
