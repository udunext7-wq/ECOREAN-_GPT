# v0.5.1 RBAC UX & Audit Viewer Guide

## 기준선

- Official base: `v0.5.0`
- Official tag target: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- GitHub Release: `https://github.com/udunext7-wq/ECOREAN-_GPT/releases/tag/v0.5.0`
- v0.5.1 branch: `v0.5.1-rbac-ux-audit-viewer`
- Scope: RBAC 운영 확인 UX와 감사 로그 조회 안정화

## 역할 관리 UX

- `사용자 역할 및 권한 센터`에서 현재 로컬 역할을 확인한다.
- 7개 역할별 허용/차단/제한 권한 수를 비교한다.
- 역할 전환은 실제 외부 계정 변경이 아니라 로컬 내부 시뮬레이션이다.
- 역할 전환 전 경고를 표시하고, 전환 후 `ACTIVE_ROLE_CHANGED` 감사 로그를 남긴다.
- `CLIENT_VIEWER`와 `SITE_CREW`처럼 제한이 큰 역할은 차단 필드와 위험 권한 차이가 보이도록 한다.

## 권한 센터 UX

- 7 roles / 28 permissions matrix를 표시한다.
- 권한 검색과 역할 필터를 지원한다.
- 상태는 `허용`, `차단`, `제한`으로 구분한다.
- 위험 권한은 다음 항목을 강조한다.
  - `estimate.internal_cost.view`
  - `estimate.margin.view`
  - `vendor.price.view`
  - `internal_output.generate`
  - `audit.view`
  - `system.settings.edit`

## Permission Audit Viewer

- 다음 이벤트 유형을 조회한다.
  - `PERMISSION_DENIED`
  - `ACTIVE_ROLE_CHANGED`
  - `INTERNAL_COST_ACCESSED`
  - `MARGIN_VIEWED`
  - `CUSTOMER_OUTPUT_GENERATED`
  - `INTERNAL_OUTPUT_GENERATED`
- 역할 필터를 적용할 수 있다.
- 감사 payload는 원문 전화번호, 이메일, 상세주소, token, provider payload를 표시하지 않는다.

## Access Denied Safe Reason

- 권한 없는 route 접근 시 안전한 한국어 사유를 표시한다.
- 고객 역할에는 내부 route, 파일명, DB path, token, provider payload를 표시하지 않는다.
- 권한이 필요한 경우 관리자에게 역할 또는 업무 범위 확인을 요청하도록 안내한다.

## Customer/Internal Visibility Preview

- 같은 테스트 프로젝트 payload를 역할별로 sanitizer에 통과시켜 표시한다.
- `CLIENT_VIEWER` 관점에서는 내부 원가, 마진, PCE, vendor price, queue, 연락처, 상세주소, 메모 원문을 제거한다.
- `CEO`와 `MANAGER` 관점에서는 내부 권한 범위가 다르게 보인다.
- 출력 guard와 같은 sanitizer를 사용한다.

## 외부 인증

- OAuth, Auth0, Firebase, Supabase, Kakao/Google login은 구현하지 않는다.
- External auth/provider status: `DISABLED`

## 운영 순서

1. `사용자 역할 및 권한 센터`를 연다.
2. 역할 요약에서 현재 운영 역할과 제한 역할 차이를 확인한다.
3. 권한 matrix에서 위험 권한을 검색한다.
4. 역할 전환이 필요한 경우 경고를 확인한 뒤 로컬 시뮬레이션을 실행한다.
5. Permission Audit Viewer에서 차단/전환/출력 이벤트를 확인한다.
6. Visibility Preview에서 고객 역할 payload가 내부 정보를 숨기는지 확인한다.
7. Access Denied 화면이 안전한 이유만 표시하는지 확인한다.

## 최종 판정

`v0.5.1 RBAC UX & Audit Viewer implementation pushed, MERGE_READY`
