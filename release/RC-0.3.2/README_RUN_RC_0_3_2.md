# RC-0.3.2 실행 안내

## 실행 파일 위치

실행 파일:

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

RC-0.3.2 패키지는 `npm run dist`로 생성된 `win-unpacked` 데스크톱 앱입니다.

## 최초 실행 방법

1. 위 실행 파일을 더블 클릭합니다.
2. 첫 화면이 열리면 `실제 프로젝트 접수`, `LightBIM 도면 가져오기`, `단가표 일괄 가져오기`, `백업 / 복구 센터`, `자동견적 시작` 진입이 가능한지 확인합니다.
3. 실제 고객/현장 정보를 입력하기 전에는 반드시 전체 백업을 생성합니다.
4. 테스트 입력에는 익명/테스트 고객명을 사용합니다.

## 데이터 저장 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

GitHub에는 소스코드가 저장됩니다. 실제 운영 데이터는 위 userData 경로의 SQLite DB와 export/backups 폴더에 저장됩니다.

## RC-0.3.2에서 추가된 것

- 실제 프로젝트 접수 센터
- 고객/현장/공사 유형/면적/범위/예산/일정 입력
- 필수값 검증 후 견적 생성
- LightBIM 도면을 접수 정보에 연결
- 단가 준비 상태 확인
- 접수 기반 견적/PCE 생성
- 고객용 출력 전 안전성 검사
- 상세주소, 전화, 이메일, 메모 등 민감 정보 보호

## 실제 프로젝트 접수 방법

1. `실제 프로젝트 접수`를 엽니다.
2. `새 프로젝트 접수`로 초안을 생성합니다.
3. 고객명 또는 테스트 고객명, 현장명, 견적 유형, 면적, 공사 범위, 예산 등급 또는 예산 금액을 입력합니다.
4. `접수 정보 검증`을 실행합니다.
5. `견적 생성 가능` 상태가 되면 다음 단계로 진행합니다.

## LightBIM 연결 방법

1. 접수 화면에서 기존 LightBIM import ID를 연결하거나 `LightBIM 도면 가져오기`로 이동합니다.
2. LightBIM JSON을 가져옵니다.
3. 프로젝트명, 공간 수, 총 면적, 추천 견적 유형, 경고 수를 확인합니다.
4. 선택한 견적 유형과 LightBIM 추천 유형이 다르면 경고를 확인하고 사용자 선택을 유지할지 결정합니다.

## 단가 준비 상태 확인 방법

1. `단가 준비 상태 확인`을 실행합니다.
2. 결과가 `단가 준비 완료`, `일부 단가 확인 필요`, `단가 보정 필요` 중 무엇인지 확인합니다.
3. `일부 단가 확인 필요`는 견적 생성을 막지 않지만, 실제 고객 제출 전에는 단가 보정을 권장합니다.

## 견적/PCE 생성 방법

1. 접수 필수값 검증을 통과합니다.
2. LightBIM이 있으면 연결된 수량을 사용하고, 없으면 수동 견적 경로를 사용합니다.
3. `견적 생성`을 실행합니다.
4. `PCE 실행` 후 GO / MODIFY / SCALE / BLOCK 판정을 확인합니다.

## 고객용 출력 전 안전성 검사 방법

고객용 출력 전 `고객 안전성 검사`를 실행합니다.

고객용 화면과 출력에는 다음 정보가 노출되면 안 됩니다.

- 상세주소
- 고객 전화 / 이메일
- 메모
- 내부 원가
- 마진
- PCE
- 업체/노무/발주/입고 정보
- 실제 사용량
- 차이율
- 보정 이력
- 백업 경로
- 온보딩/가져오기/수동 매칭/approval queue 데이터
- internal / profit / risk_score

안전성 검사 실패 시 고객용 출력을 진행하지 않습니다.

## 문제 발생 시 확인 순서

1. 앱이 실행되는지 확인합니다.
2. `%APPDATA%\ecorean-boc-electron` 폴더가 생성되었는지 확인합니다.
3. DB/export/backups 폴더가 있는지 확인합니다.
4. `백업 / 복구 센터`에서 DB 무결성 검사를 실행합니다.
5. 접수 필수값 검증 결과를 확인합니다.
6. LightBIM 연결 상태와 단가 준비 상태를 확인합니다.
7. 고객용 출력 전 고객 안전성 검사를 다시 실행합니다.

## 알려진 비차단 경고

- Vite bundle size warning
- SQLite experimental warning
- electron-builder description/author metadata warning
- electron-builder DEP0190 warning
