# RC-0.3.0 Final Run Guide

## 실행 파일 위치

패키지 실행 파일:

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 처음 실행하는 방법

1. 실행 파일을 연다.
2. 첫 화면이 보이는지 확인한다.
3. `백업 / 복구 센터`를 연다.
4. DB 무결성 검사를 실행한다.
5. 전체 백업을 생성한다.

## 데이터 저장 위치

운영 데이터는 GitHub가 아니라 Electron userData에 저장된다.

- userData: `%APPDATA%\ecorean-boc-electron`
- SQLite DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## 백업하는 방법

1. `백업 / 복구 센터`를 연다.
2. `현재 DB 무결성 검사`를 실행한다.
3. `전체 백업 생성`을 실행한다.
4. 백업 이력에 성공 기록이 남았는지 확인한다.

실제 프로젝트 데이터를 입력하기 전에는 반드시 전체 백업을 생성한다.

## LightBIM 도면 가져오기

1. MiniCAD에서 `LightBIM JSON 내보내기`를 실행한다.
2. BOC에서 `LightBIM 도면 가져오기`를 연다.
3. JSON 파일을 선택한다.
4. 프로젝트명, 공간 수, 총 면적, 추천 견적 유형, 수량 요약을 확인한다.
5. 견적 초안을 생성한다.
6. 수량 검토 후 견적/PCE를 실행한다.

## 단가표 가져오기

1. `단가표 일괄 가져오기`를 연다.
2. 가져오기 유형을 선택한다.
3. CSV 파일을 선택한다.
4. 컬럼 매핑과 자동 매칭 결과를 확인한다.
5. 미매칭/invalid 행을 확인한다.
6. 승인 queue를 생성한다.
7. `실제 단가 보정`에서 승인한다.
8. 백업 후 반영한다.

가져오기만으로 마스터 데이터는 변경되지 않는다.

## 견적 출력 방법

1. 욕실/주방/전체 리모델링 견적을 생성한다.
2. PCE 결과를 확인한다.
3. 고객 견적 PDF를 출력한다.
4. 내부 견적 Excel을 출력한다.
5. 고객용/내부용 파일이 각각 올바른 export 폴더에 생성되는지 확인한다.

## 고객용 / 내부용 구분

고객용 화면에는 아래 정보가 노출되면 안 된다.

- 내부 원가
- 마진
- PCE
- 업체 견적
- 노무 단가
- 구매/입고 상세
- 실제 사용량 차이
- 캘리브레이션 이력

내부 운영 화면에서는 원가, 단가 출처, 수량 출처, 검토/피드백/추적 데이터를 확인할 수 있다.

## 문제 발생 시 확인 순서

1. 앱 재실행
2. DB 무결성 검사
3. 최근 백업 이력 확인
4. export 폴더 권한 확인
5. 고객/내부 출력 분리 확인
6. `RELEASE_NOTES.md`와 `docs/RC_0_3_0_KNOWN_ISSUES.md` 확인
7. 재현 가능한 경우 RC-0.3.1 issue로 기록
