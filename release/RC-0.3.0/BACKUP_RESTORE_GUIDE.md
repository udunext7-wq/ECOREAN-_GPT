# RC-0.3.0 백업 / 복구 안내

## 핵심 원칙

- GitHub에는 소스코드가 저장된다.
- 실제 운영 데이터는 Electron `userData`의 SQLite DB와 `export` 폴더에 저장된다.
- 따라서 운영 백업은 GitHub push만으로 끝나지 않는다.

## 백업 대상

1. SQLite DB 폴더
- `%APPDATA%/ecorean-boc-electron/storage/sqlite`
2. Export 폴더
- `%APPDATA%/ecorean-boc-electron/export`
3. 앱 내 백업 폴더
- `%APPDATA%/ecorean-boc-electron/backups`

앱에서 생성하는 백업은 다음 위치에 나뉘어 저장된다.

- `backups/db`: SQLite DB 백업
- `backups/export`: PDF, Excel, 제안서, LightBIM 산출물 백업
- `backups/full`: DB와 Export를 함께 포함하는 전체 백업
- `backups/manifests`: 백업 검증용 manifest JSON

## 앱 안에서 백업하는 방법

1. BOC를 실행한다.
2. `백업 / 복구 센터`를 연다.
   - 첫 진입 화면
   - CEO Dashboard
   - Drawer navigation
   - RC-0.3.0 사용자 테스트 화면에서 접근할 수 있다.
3. 필요한 작업을 선택한다.
   - `DB 백업 생성`
   - `Export 백업 생성`
   - `전체 백업 생성`
   - `업데이트 전 백업 생성`
4. 백업 생성 후 `백업 이력`에서 상태가 `정상`인지 확인한다.
5. `백업 검증` 또는 `현재 DB 무결성 검사`를 실행해 백업과 현재 DB 상태를 확인한다.

## 수동 백업 방법

1. 앱을 종료한다.
2. `storage/sqlite` 폴더 전체를 날짜가 포함된 백업 폴더로 복사한다.
3. `export` 폴더 전체를 같은 백업 폴더로 복사한다.
4. 백업 폴더 예시:
   - `BOC_BACKUP_2026-05-28/storage/sqlite`
   - `BOC_BACKUP_2026-05-28/export`

앱 내 백업 센터를 사용할 수 없는 상황에서만 수동 백업을 권장한다.

## 백업 Manifest

각 백업은 manifest JSON을 생성한다.

포함 정보:

- 백업 ID
- 앱 버전
- 백업 생성 시각
- 백업 유형: `DB`, `EXPORT`, `FULL`
- 원본 경로
- 백업 경로
- DB 파일 크기
- Export 파일 수
- 체크섬 placeholder
- 상태: `SUCCESS`, `FAILED`, `VERIFY_FAILED`
- 메모

Manifest는 백업 파일 자체가 아니라 백업이 어떤 데이터를 기준으로 만들어졌는지 확인하기 위한 감사 기록이다.

## 무결성 검사

`현재 DB 무결성 검사`는 다음을 확인한다.

- DB 파일 존재 여부
- DB 열기 가능 여부
- 주요 테이블 존재 여부
- SQLite `PRAGMA integrity_check` 결과
- 반복 실행 시 마이그레이션 오류 여부

결과는 다음 상태로 표시된다.

- `정상`
- `확인 필요`
- `오류`

## 복구 방법

현재 RC-0.3.0에서는 앱이 데이터를 조용히 덮어쓰지 않는다.

앱의 `복구 계획 보기`는 다음 정보를 제공한다.

- 어떤 백업을 복구할지
- 복구 전에 현재 데이터를 백업해야 한다는 경고
- 복구 대상 경로
- 확인 문구: `복구를 진행합니다`
- 수동 복구 단계

수동 복구 절차:

1. 앱을 종료한다.
2. 현재 `%APPDATA%/ecorean-boc-electron/storage/sqlite`와 `%APPDATA%/ecorean-boc-electron/export`를 별도 위치에 먼저 복사한다.
3. 선택한 백업의 `storage/sqlite`와 `export`를 원래 위치에 복사한다.
4. 앱을 다시 실행한다.
5. 프로젝트, 견적, LightBIM 가져오기 기록, PDF/Excel 출력 파일이 보이는지 확인한다.

주의: 복구는 현재 데이터를 바꾸는 작업이다. 복구 전 현재 데이터 백업을 생략하지 않는다.

## userData 위치 확인 방법

패키지 앱 기준 기본 위치:

`%APPDATA%/ecorean-boc-electron`

Windows 탐색기 주소창에 위 경로를 입력하면 실제 운영 데이터 폴더로 이동할 수 있다.

## 주의

- DB 파일을 앱 실행 중에 복사하면 일부 데이터가 누락될 수 있다.
- 소스코드 업데이트와 운영 데이터 복구는 별개의 작업이다.
- 고객용 출력물과 내부용 출력물은 모두 `export` 아래에 저장되므로 함께 백업한다.
- `backups` 폴더를 삭제하면 백업 이력과 복구 근거가 사라진다.
- GitHub에는 소스코드가 저장되고, 실제 운영 데이터는 `userData`의 SQLite DB와 `export` 폴더에 저장된다.
- 클라우드 백업, 외부 저장소 연동, 자동 원격 복구는 RC-0.3.0 범위에 포함되지 않는다.
