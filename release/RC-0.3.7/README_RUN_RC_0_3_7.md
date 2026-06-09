# RC-0.3.7 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행 방법

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 렌더링되는지 확인합니다.
4. 실제 데이터를 입력하기 전에 백업 / 복구 센터에서 전체 백업 상태를 확인합니다.

## 데이터 저장 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.3.7 추가 내용

- `실제 단가 보정 워크벤치`
- Queue summary, 목록, 상세 조회
- 승인 / 반려 / 보류 및 사유 기록
- 승인 및 백업 전 Master Data 가격 보호
- 백업 성공 후 단가 반영
- Old/new 가격과 backup id history 기록
- Linked priority task 상태 갱신
- 고객용 payload에서 queue와 내부 가격 정보 필터링

## 실제 단가 보정 워크벤치 사용 방법

1. CEO Dashboard 또는 관련 단가 화면에서 `실제 단가 보정 워크벤치`를 엽니다.
2. 상태, 리스크, 대상 유형 필터로 검토할 queue를 찾습니다.
3. 현재 단가, 제안 단가, 차이율, 증빙 메모와 연결 task를 확인합니다.
4. 대표가 승인, 반려, 보류 중 하나를 선택하고 사유를 기록합니다.
5. 승인된 항목만 `백업 후 반영`으로 Master Data에 반영합니다.
6. 반영 후 history와 backup id를 확인합니다.

## Queue 상태 의미

- `PENDING_REVIEW`: 승인 대기. Master Data 변경 불가.
- `APPROVED`: 대표 승인 완료. 백업 전에는 Master Data 미변경.
- `REJECTED`: 반려. 반영 대상 아님.
- `DEFERRED`: 보류. 추가 확인 전 반영 대상 아님.
- `APPLIED`: 백업 성공 후 Master Data 반영 완료.

## 승인 / 반려 / 보류 기준

- 승인: 증빙, 단위, 대상 항목과 제안 단가를 확인한 경우
- 반려: 증빙 부족, 잘못된 대상, 잘못된 단가인 경우
- 보류: 업체 재확인, 단위 재확인, 추가 견적이 필요한 경우

## 백업 후 반영 원칙

- `PENDING_REVIEW`는 바로 반영할 수 없습니다.
- 승인만으로 Master Data 가격은 변경되지 않습니다.
- 백업 실패 시 단가 반영을 중단합니다.
- 백업 성공 후에만 queue가 `APPLIED`로 변경됩니다.

## History 기록 원칙

반영 시 queue id, 대상 항목, old/new 가격, 적용자, source, backup id와 생성 시간이 history에 기록되어야 합니다.

## Master Data 직접 변경 방지

워크벤치와 price queue는 Master Data를 직접 수정하지 않습니다. 기존 실제 단가 보정 서비스의 승인, 백업, 반영 경로만 사용합니다.

## 고객용 출력 비노출 원칙

고객용 화면과 payload에는 workbench, queue, current/proposed price, variance, risk, priority task, approval status, backup id, internal cost, margin, PCE, vendor/labor/purchase/receiving 정보가 노출되면 안 됩니다.

## 문제 발생 시 확인 순서

1. Queue 상태와 승인/반려/보류 사유를 확인합니다.
2. 백업 / 복구 센터 상태를 확인합니다.
3. Master Data가 승인 전에 변경되지 않았는지 확인합니다.
4. 반영 history에 old/new 가격과 backup id가 있는지 확인합니다.
5. Customer safety regression을 실행합니다.
