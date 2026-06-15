# RC-0.4.2 실행 가이드

## 실행 파일

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 열리는지 확인합니다.
4. 실제 데이터를 입력하기 전에 백업 / 복구 센터에서 전체 백업을 생성합니다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

패키지와 운영 데이터는 서로 분리됩니다. 실행 파일을 다시 빌드해도 userData를 임의로 삭제하지 않습니다.

## 주소 정규화 센터 진입

다음 내부 화면에서 `주소 정규화 센터`를 열 수 있습니다.

- First Entry Panel
- CEO Dashboard
- Drawer
- CRM Pipeline Center
- 현장조사 상세
- 실제 프로젝트 접수

고객-facing 화면에는 주소 정규화 센터 진입점을 제공하지 않습니다.

## 주소 등록과 검토

1. source type과 연결 ID를 선택합니다.
2. 주소 요약과 내부 상세주소를 입력합니다.
3. 주소 유형, 구성요소, confidence와 구조 경고를 확인합니다.
4. 재정규화 후 승인, 반려 또는 보류합니다.
5. 필요하면 Lead, 현장조사 또는 프로젝트와 연결합니다.
6. 중복 후보와 변경 이력을 확인합니다.

지원 유형:

- `ROAD`
- `JIBUN`
- `MIXED`
- `UNKNOWN`

Confidence:

- `HIGH`
- `MEDIUM`
- `LOW`
- `INVALID`

## 원본 주소 보호

- 원본 주소와 정규화 결과는 별도 저장합니다.
- 정규화 요청과 승인만으로 CRM Lead, 현장조사, 프로젝트 원본 주소를 덮어쓰지 않습니다.
- 승인, 반려, 보류, 수정, 연결은 history에 남습니다.
- 중복은 경고만 제공하며 자동 병합하거나 삭제하지 않습니다.

## Provider 상태

RC-0.4.2의 provider adapter는 준비 interface만 제공합니다.

- 상태: `DISABLED`
- 외부 호출: 없음
- 주소 API/geocoding/좌표 조회: 없음
- API key/Authorization: 없음
- provider 원본 응답 저장: 없음

## Customer Safety

고객 payload에는 다음 정보를 포함하지 않습니다.

- 내부 상세주소와 정규화 상세주소
- canonical key와 fingerprint
- 중복 후보
- provider 설정, 응답, 오류
- 좌표, 위도, 경도
- 내부 검증 사유와 검토 메모
- 내부 연락처, 알림, 액션, 원가, 마진, PCE, Queue, scoring, risk score

## Empty State

- 주소가 없으면 등록된 주소가 없다는 안내를 표시합니다.
- PENDING 데이터나 중복 후보가 없어도 화면은 정상 유지됩니다.
- Provider가 `DISABLED`여도 오류 없이 내부 정규화 기능을 사용할 수 있습니다.

## 문제 발생 시 확인 순서

1. 앱을 종료하고 다시 실행합니다.
2. userData와 DB 경로 접근 여부를 확인합니다.
3. 최근 전체 백업이 있는지 확인합니다.
4. 원본 주소와 정규화 주소가 분리되어 있는지 확인합니다.
5. history에서 마지막 승인/반려/보류 사유를 확인합니다.
6. provider 상태가 `DISABLED`인지 확인합니다.
7. 고객 출력에 내부 상세주소나 hash가 포함되지 않았는지 검사합니다.
8. 개인정보 원문 없이 내부 이슈를 기록합니다.
