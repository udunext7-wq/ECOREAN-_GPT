# v0.5.0 Permission Matrix

`ALLOW`만 허용한다. 표에 없는 조합과 알 수 없는 permission key는 `DENY`다.

| 역할 | 주요 허용 범위 | 주요 차단 범위 |
|---|---|---|
| CEO | 모든 정의된 권한 | 없음 |
| ADMIN | 모든 정의된 권한 | 없음 |
| MANAGER | 프로젝트, 견적, 내부 원가/마진, 계약, 일정, 발주, 단가, CRM, 출력, 감사 | 시스템 설정 수정 |
| STAFF | 프로젝트/견적 편집, 계약/일정/발주 생성, CRM, 고객 출력 | 내부 원가, 마진, 협력업체 단가, 내부 출력, 감사, 설정 |
| SITE_CREW | 프로젝트 조회, 일정 조회/수정, 캘린더 조회, 현장조사 조회/동기화 | 견적 편집, 원가/마진, 계약/발주 생성, CRM, 출력, 설정 |
| CLIENT_VIEWER | 대시보드, 프로젝트, 견적, 계약, 일정, 고객 포털 미리보기 | 모든 편집/생성, 내부 원가/마진/PCE/단가, 감사, 설정 |
| READ_ONLY_AUDITOR | 업무 조회, 내부 원가/마진/단가 조회, 감사 로그, 설정 조회 | 모든 편집/생성/동기화/출력 |

## Permission Keys

- `dashboard.view`
- `project.view`, `project.edit`
- `estimate.view`, `estimate.edit`
- `estimate.internal_cost.view`, `estimate.margin.view`
- `contract.view`, `contract.create`
- `schedule.view`, `schedule.edit`
- `order.view`, `order.create`
- `vendor.view`, `vendor.price.view`
- `calendar.view`, `calendar.edit`, `calendar.conflict.view`
- `survey.view`, `survey.sync`
- `crm.view`, `crm.edit`
- `client_portal.preview`
- `customer_output.generate`, `internal_output.generate`
- `audit.view`
- `system.settings.view`, `system.settings.edit`

## Customer Data Guard

`CLIENT_VIEWER`와 고객용 출력에서는 다음 범주를 제거한다.

- 전화번호, 이메일, 상세주소, 고객 메모 원문
- internal/labor/purchase/receiving/actual cost
- margin, profit, PCE, risk score
- vendor/supplier price, variance, calibration, approval queue
- token, password, credential, secret, hash, provider payload

## Validation

- `CEO`: all defined permissions allowed.
- `ADMIN`: all defined permissions allowed.
- `MANAGER`: operational permissions allowed, `system.settings.edit` denied.
- `STAFF`: customer workflow permissions allowed, internal cost/margin/vendor price/internal output denied.
- `SITE_CREW`: field project/schedule/calendar/survey permissions allowed, estimate/vendor/margin denied.
- `CLIENT_VIEWER`: customer-safe view permissions allowed, all edit/create/internal permissions denied.
- `READ_ONLY_AUDITOR`: read/audit/settings-view allowed, mutation/output/sync permissions denied.
- Unknown roles and unknown permission keys: denied by default.
