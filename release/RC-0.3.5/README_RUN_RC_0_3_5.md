# RC-0.3.5 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행 방법

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 렌더링되는지 확인합니다.
4. 실제 운영 데이터 입력 전 백업 / 복구 센터에서 전체 백업을 생성합니다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.3.5 추가 내용

- 단가 준비 상태가 견적/PCE/마진 판단에 주는 영향 분석
- `READY` / `PARTIAL` / `NEEDS_UPDATE` 리스크 분류
- 욕실 / 주방 / 전체 리모델링별 리스크 기준
- fallback line item count 계산
- confirmed line item count 계산
- margin impact 계산
- PCE decision 연결
- 대표 확인 필요 여부 판단
- 고객용 payload 내부정보 비노출 검증

## READY / PARTIAL / NEEDS_UPDATE 의미

| 상태 | 의미 | 운영 판단 |
| --- | --- | --- |
| `READY` | 주요 단가가 확인되어 견적 진행 가능 | 고객 견적 진행 가능 |
| `PARTIAL` | 일부 단가가 추정값 또는 보정 필요 상태 | 대표 검토 또는 단가 보정 후 진행 |
| `NEEDS_UPDATE` | 단가 보정 필요 항목이 핵심 견적 판단을 막는 상태 | 고객 출력 차단 |

## 욕실 / 주방 / 전체 리모델링별 리스크 기준

| 견적 유형 | READY | PARTIAL | NEEDS_UPDATE |
| --- | --- | --- | --- |
| 욕실 / `BATHROOM` | `LOW` | `MEDIUM` | `BLOCKING` |
| 주방 / `KITCHEN` | `LOW` | `HIGH` | `BLOCKING` |
| 전체 리모델링 / `FULL_REMODELING` | `LOW` | `HIGH` | `BLOCKING` |

## PARTIAL 상태에서 대표 검토 기준

- 욕실 PARTIAL은 비교적 범위가 작아 대표 검토 후 진행할 수 있습니다.
- 주방 PARTIAL은 가구, 상판, 싱크, 후드 등 단가 영향이 커서 단가 보정 후 진행을 권장합니다.
- 전체 리모델링 PARTIAL은 공정과 수량 연동 범위가 넓어 단가 보정 후 진행을 권장합니다.
- PARTIAL 상태에서는 fallback line item count와 margin impact를 반드시 확인합니다.

## NEEDS_UPDATE 차단 기준

`NEEDS_UPDATE` 상태는 고객용 견적 출력 전에 차단합니다. 핵심 자재, 노무, 표준 견적 품목 중 보정 필요 단가가 남아 있으면 실제 단가 보정 센터에서 승인/백업/반영 후 다시 견적을 확인합니다.

## 고객용 출력 비노출 원칙

고객용 화면과 출력물에는 다음 정보를 노출하지 않습니다.

- price readiness impact
- risk_level
- fallback price
- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- variance
- calibration
- approval queue
- internal
- profit
- risk_score
- detailed address, customer phone/email, memo 원문

## 문제 발생 시 확인 순서

1. 백업 / 복구 센터에서 최근 백업 상태를 확인합니다.
2. 단가 준비 상태가 `READY`, `PARTIAL`, `NEEDS_UPDATE` 중 무엇인지 확인합니다.
3. `PARTIAL`이면 fallback/confirmed line item count와 margin impact를 확인합니다.
4. `NEEDS_UPDATE`이면 고객 출력 전 실제 단가 보정을 먼저 진행합니다.
5. 고객 안전성 검사에서 내부정보 노출이 발견되면 즉시 고객 출력을 중단합니다.
6. LightBIM 수량 검토와 PCE 결과가 서로 충돌하면 내부 검토를 먼저 완료합니다.
