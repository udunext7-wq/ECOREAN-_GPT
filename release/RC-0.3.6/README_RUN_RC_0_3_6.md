# RC-0.3.6 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행 방법

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 렌더링되는지 확인합니다.

## 데이터 저장 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.3.6 추가 내용

- `단가 보정 우선순위 센터`
- Price readiness impact 결과를 보정 task로 연결
- 보정 task를 실제 단가 보정 price queue로 연결
- 승인 없는 Master Data 가격 직접 변경 방지
- 고객용 출력에 내부 단가, 리스크, queue, PCE, margin 비노출
- `smoke:release` 경로 안정화

## 단가 보정 우선순위 센터 사용 방법

1. 대시보드 또는 관련 센터에서 `단가 보정 우선순위`를 엽니다.
2. 견적 유형을 선택합니다.
3. READY / PARTIAL / NEEDS_UPDATE 상태와 리스크를 확인합니다.
4. 필요한 항목을 보정 task로 생성합니다.
5. task를 검토 완료 처리합니다.
6. 실제 단가 보정 price queue와 연결합니다.
7. 실제 단가 보정 센터에서 승인, 백업, 반영을 진행합니다.

## 우선순위 기준

- BATHROOM PARTIAL: `대표 검토 필요`
- KITCHEN PARTIAL: `견적 전 보정 권장`
- FULL_REMODELING PARTIAL: `견적 전 보정 권장`
- NEEDS_UPDATE: `즉시 보정 필요`
- READY: `확인 완료`

## 승인 / 백업 / 반영 원칙

- 보정 task 생성만으로 Master Data 가격은 변경되지 않습니다.
- price queue 연결만으로 승인 또는 반영되지 않습니다.
- Master Data 가격 변경은 반드시 기존 실제 단가 보정의 승인, 백업, 반영 흐름을 통과해야 합니다.

## 고객용 출력 비노출 원칙

고객용 화면과 payload에는 다음 정보가 노출되면 안 됩니다.

- 내부 단가
- 단가 보정 우선순위
- risk level
- PCE
- margin
- vendor / labor / purchase / receiving data
- approval queue
- internal / profit / risk_score

## 문제 발생 시 확인 순서

1. 백업 / 복구 센터 상태를 확인합니다.
2. 단가 보정 우선순위 센터에서 task 상태를 확인합니다.
3. 실제 단가 보정 센터에서 queue 상태가 `PENDING_REVIEW`인지 확인합니다.
4. Master Data 가격이 승인 없이 변경되지 않았는지 확인합니다.
5. 고객 안전성 회귀 테스트를 실행합니다.
