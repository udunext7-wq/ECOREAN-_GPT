# RC-0.3.1 실행 안내

## 실행 파일 위치

실행 파일:

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

RC-0.3.1 패키지는 `npm run dist`로 생성된 `win-unpacked` 데스크톱 앱입니다.

## 최초 실행 방법

1. 위 실행 파일을 더블 클릭합니다.
2. 첫 화면이 열리면 `CEO Control Tower`, `RC-0.3.1 운영 데이터 입력`, `단가표 일괄 가져오기`, `백업 / 복구 센터` 진입이 가능한지 확인합니다.
3. 최초 실제 프로젝트 입력 전에는 반드시 전체 백업을 생성합니다.

## 데이터 저장 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

GitHub에는 소스코드가 저장됩니다. 실제 운영 데이터는 위 userData 경로의 SQLite DB와 export/backups 폴더에 저장됩니다.

## RC-0.3.1에서 추가된 것

- RC-0.3.1 운영 데이터 입력 흐름
- 첫 운영 데이터 입력 테스트
- 단가표 미매칭/다중 매칭 행 수동 매칭
- Master Data 후보 검색
- Queue 생성 가능 여부 확인
- RC-0.3.1 안정화 및 main 병합

## 운영 데이터 입력 방법

1. `RC-0.3.1 운영 데이터 입력`을 엽니다.
2. 새 운영 데이터 입력 run을 생성합니다.
3. 12단계 체크리스트를 순서대로 진행합니다.
4. 업체 정보, 자재 단가표, 노무 단가표를 입력합니다.
5. 단가 승인 및 Master Data 반영은 백업 후 진행합니다.
6. 첫 실제 프로젝트와 LightBIM 도면을 가져온 뒤 견적/PCE를 확인합니다.

## 단가표 미매칭 수동 매칭 방법

1. `단가표 일괄 가져오기`에서 CSV를 가져옵니다.
2. 미매칭 또는 다중 매칭 항목을 확인합니다.
3. `마스터 데이터 검색`에서 기존 Master Data 후보를 찾습니다.
4. 적절한 후보를 선택하고 `수동 매칭 저장`을 실행합니다.
5. 차이율과 Queue 생성 가능 여부를 확인합니다.
6. 승인 Queue 생성 후 `실제 단가 보정` 센터에서 승인/반영합니다.

미매칭 행은 자동으로 Master Data를 만들지 않습니다. 신규 Master Data 생성은 후속 개선 항목입니다.

## 고객 안전성 확인 방법

고객용 화면과 고객용 출력에는 다음 정보가 노출되면 안 됩니다.

- 내부 원가
- 마진
- PCE
- 업체/노무 단가
- 발주/입고 정보
- 실제 사용량
- 차이율
- 보정 이력
- 백업 경로
- 온보딩 이슈
- import row
- 수동 매칭 로그
- approval queue

문제가 의심되면 `node tests/lightbim-customer-safety-regression.smoke.js`를 실행합니다.

## 문제 발생 시 확인 순서

1. 앱이 실행되는지 확인합니다.
2. `%APPDATA%\ecorean-boc-electron` 폴더가 생성되었는지 확인합니다.
3. DB/export/backups 폴더가 있는지 확인합니다.
4. `백업 / 복구 센터`에서 DB 무결성 검사를 실행합니다.
5. 단가 반영 전 백업이 만들어졌는지 확인합니다.
6. 고객용 출력 전 고객 안전성 검사를 실행합니다.

## 알려진 비차단 경고

- Vite bundle size warning
- SQLite experimental warning
- electron-builder description/author metadata warning
- electron-builder DEP0190 warning
