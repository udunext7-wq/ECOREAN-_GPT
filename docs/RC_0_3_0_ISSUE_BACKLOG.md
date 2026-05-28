# RC-0.3.0 Issue Backlog

## Must Fix Before Use

현재 남아 있는 S1/S2 이슈 없음. 패키지 실사용 테스트 중 발견된 S1은 즉시 수정 후 재검증 완료.

| Issue ID | Severity | Screen | Description | Reproduction Steps | Decision | Fix Status | Target Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RC030-S1-001 | S1 | Packaged App / SQLite Startup | 동일 userData DB에서 packaged service를 반복 초기화하면 `company_cashflow_forecast.forecast_id` 중복으로 SQLite 제약 오류가 발생 | packaged real-use smoke를 기존 userData에서 반복 실행 | 즉시 수정 | FIXED | RC-0.3.0 |

## Fix Soon

| Issue ID | Severity | Screen | Description | Reproduction Steps | Decision | Fix Status | Target Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RC030-S3-001 | S3 | RC-0.3.0 사용자 테스트 | 테스트 회차에 시나리오명이 별도 데이터로 저장/표시되지 않아 사용자 테스트 보고 맥락이 약함 | 사용자 테스트 센터에서 새 회차 시작 화면 확인 | 즉시 수정 | FIXED | RC-0.3.0 |

## Later Improvement

| Issue ID | Severity | Screen | Description | Reproduction Steps | Decision | Fix Status | Target Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RC030-S4-001 | S4 | UI Build | Vite 번들 크기 경고가 남아 있음. 기능 차단은 없고 릴리스 노트에 비차단 경고로 기록됨 | `npm run build:ui` 실행 | 후속 성능 최적화 | DEFERRED | RC-0.4.0 |
| RC030-S4-002 | S4 | LightBIM / MiniCAD | 외부 DWG/DXF 자동 파싱과 전체 BIM object editor는 아직 지원하지 않음 | 외부 CAD 파일 자동 가져오기 시도 | 제품 범위 밖, 로드맵 관리 | DEFERRED | Future |
