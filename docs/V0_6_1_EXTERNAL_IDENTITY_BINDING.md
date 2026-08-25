# v0.6.1 External Identity Binding

## 모델

로컬 `logs.db`의 `external_identity_bindings`가 Supabase provider user와 기존 ECOREAN Identity를 연결한다.

- `binding_id`
- `provider_type`
- `provider_user_id`: service 내부 exact lookup 전용
- `provider_user_fingerprint`: 목록/감사 표시용 SHA-256 지문
- `identity_id`
- `status`: `ACTIVE`, `REVOKED`
- 생성/해제 Identity 및 시각
- 해제 사유와 optimistic version

활성 `(provider_type, provider_user_id)`는 partial unique index로 한 건만 허용한다. 마이그레이션 버전은 `v0.6.1-external-identity-binding-1`이며 반복 실행해도 기존 Identity, 역할 할당, 세션 이력을 삭제하지 않는다.

## 최초 연결

1. 앱을 기본 `LOCAL` 모드로 실행한다.
2. `system.settings.edit` 권한이 있는 기존 CEO/Admin 세션을 확인한다.
3. 사용자 역할 및 권한 센터의 `External Identity Binding Admin`에서 Supabase 사용자 ID와 활성 ECOREAN Identity를 연결한다.
4. 목록에는 원문 provider user ID 대신 안전한 지문 라벨만 표시된다.
5. 이후 `SUPABASE` 모드로 전환해 해당 사용자가 로그인한다.

인증된 미연결 사용자는 스스로 연결할 수 없다. renderer가 actor Identity, role 또는 session을 주장해도 연결 권한의 근거로 사용하지 않는다.

## 해제

- 현재 검증된 CEO/Admin 세션과 `system.settings.edit` 권한이 필요하다.
- 해제는 row를 삭제하지 않고 `REVOKED`로 전환해 이력을 보존한다.
- 재시도는 이미 해제된 상태를 안전하게 반환한다.
- 감사 로그에는 provider type, 짧은 지문, ECOREAN Identity만 기록하며 원문 provider ID는 기록하지 않는다.

## Supabase DB / RLS

이 구현은 provider binding을 로컬 SQLite에만 저장하며 Supabase Database 테이블을 생성하지 않는다. 따라서 이번 범위에 추가 RLS migration은 없다. 향후 binding을 Supabase Database로 이전할 경우 public schema RLS와 server-side 정책 검증을 별도 릴리스에서 필수로 적용해야 한다.

## 권한 결론

Authentication과 Authorization은 분리된다. 활성 binding이 있어도 Identity, membership, role assignment, scope 중 하나가 비활성이면 업무 접근은 `DENY`다.
