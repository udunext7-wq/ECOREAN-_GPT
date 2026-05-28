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

## 백업 방법

1. 앱을 종료한다.
2. `storage/sqlite` 폴더 전체를 날짜가 포함된 백업 폴더로 복사한다.
3. `export` 폴더 전체를 같은 백업 폴더로 복사한다.
4. 백업 폴더 예시:
   - `BOC_BACKUP_2026-05-28/storage/sqlite`
   - `BOC_BACKUP_2026-05-28/export`

## 복구 방법

1. 앱을 종료한다.
2. 현재 `userData/storage/sqlite`와 `userData/export`를 별도 보관한다.
3. 백업된 `storage/sqlite`와 `export`를 원래 위치에 복사한다.
4. 앱을 다시 실행해 프로젝트, 견적, 출력 파일이 보이는지 확인한다.

## userData 위치 확인 방법

패키지 앱 기준 기본 위치:

`%APPDATA%/ecorean-boc-electron`

Windows 탐색기 주소창에 위 경로를 입력하면 실제 운영 데이터 폴더로 이동할 수 있다.

## 주의

- DB 파일을 앱 실행 중에 복사하면 일부 데이터가 누락될 수 있다.
- 소스코드 업데이트와 운영 데이터 복구는 별개의 작업이다.
- 고객용 출력물과 내부용 출력물은 모두 `export` 아래에 저장되므로 함께 백업한다.
