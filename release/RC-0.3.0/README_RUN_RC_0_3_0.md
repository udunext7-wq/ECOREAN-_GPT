# RC-0.3.0 실행 안내

## 실행 방법

1. 패키징 산출물 폴더를 연다.
   - 기본 산출물: `electron/release/win-unpacked`
2. `ECOREAN BOC CEO Dashboard.exe`를 실행한다.
3. 첫 화면에서 `CEO Dashboard`, `LightBIM 도면 가져오기`, `RC-0.3.0 사용자 테스트` 진입이 보이는지 확인한다.

## 최초 실행 시 생성되는 데이터 위치

패키지 앱은 개발 폴더가 아니라 Electron `userData` 경로에 운영 데이터를 만든다.

- SQLite DB: `%APPDATA%/ecorean-boc-electron/storage/sqlite`
- Export 폴더: `%APPDATA%/ecorean-boc-electron/export`

## Export 파일 위치

패키지 앱 최초 실행 시 아래 폴더가 자동 생성된다.

- `export/estimates`
- `export/contracts`
- `export/schedules`
- `export/purchase-orders`
- `export/visualizations`
- `export/boards`
- `export/reports`
- `export/lightbim`

## LightBIM JSON 가져오기

1. 앱에서 `LightBIM 도면 가져오기`를 연다.
2. MiniCAD에서 내보낸 `ECOREAN.LightBIM.v0.1` JSON 파일을 선택한다.
3. 공간 목록, 수량 요약, 추천 견적 유형을 확인한다.
4. 견적 초안 생성 후 수량 검토, PCE, 공정표, 발주 흐름을 진행한다.

## 고객용 / 내부용 출력

- 고객용 견적/제안 자료에는 원가, 마진, PCE, 발주, 입고, 실사용 차이 정보가 노출되지 않아야 한다.
- 내부용 견적/추적/실행 피드백 화면에는 수량 출처와 검토 정보가 표시될 수 있다.

## ComfyUI 사용 시 주의

AI 투시도 생성에서 ComfyUI를 사용하려면 로컬 ComfyUI 서버가 별도로 실행되어 있어야 한다. 서버가 꺼져 있어도 앱은 안전하게 오프라인 상태를 표시한다.

## 문제가 생겼을 때 확인할 것

- 앱이 열리지 않음: `electron/release/win-unpacked` 안의 실행 파일을 직접 실행했는지 확인한다.
- 빈 화면: 패키지 안에 `resources/app.asar`와 UI dist가 포함되어 있는지 확인한다.
- 데이터가 보이지 않음: GitHub 소스가 아니라 `userData` SQLite DB가 실제 운영 데이터 저장 위치임을 확인한다.
- 출력 파일이 없음: `userData/export` 하위 폴더를 확인한다.
