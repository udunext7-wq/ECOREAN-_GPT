# v0.5.0 사용자 역할 및 권한 가이드

## 목적

v0.5.0은 외부 로그인 시스템을 도입하지 않고 BOC 내부 업무의 역할 경계를 먼저 고정한다.
권한 평가는 기본 차단이며, 명시적으로 허용된 역할과 권한 조합만 실행할 수 있다.

## 역할

- `CEO`: 전체 운영, 최종 승인, 내부 원가, 마진, 시스템 설정
- `ADMIN`: 전체 관리자 권한
- `MANAGER`: 프로젝트, 견적, 계약, 일정, 발주, 내부 출력
- `STAFF`: 프로젝트와 고객 업무 입력, 고객용 출력
- `SITE_CREW`: 현장 프로젝트, 일정, 현장조사
- `CLIENT_VIEWER`: 고객 승인 정보만 열람
- `READ_ONLY_AUDITOR`: 변경 없이 운영 및 감사 정보 조회

## 운영 방법

1. 대시보드의 현재 역할 배지 또는 `역할 / 권한`을 연다.
2. 로컬 테스트 역할을 선택한다.
3. 허용 권한과 차단 권한을 확인한다.
4. 차단된 화면은 `권한 없음` 화면으로 전환되는지 확인한다.
5. 최근 권한 감사 로그에서 허용, 차단, 역할 변경 기록을 확인한다.

## 보안 원칙

- 알 수 없는 역할과 권한은 항상 차단한다.
- 고객 열람 역할은 내부 원가, 마진, PCE, 협력업체 단가, 승인 Queue를 받지 않는다.
- 고객 출력은 생성 권한과 데이터 필터를 각각 통과해야 한다.
- 토큰, 비밀번호, credential, hash, provider payload는 모든 역할의 일반 payload에서 제거한다.
- 권한 감사 로그는 전화번호, 이메일, 상세주소, 고객 메모를 redaction 처리한다.
- 외부 로그인, OAuth, 공개 고객 인증은 `DISABLED`이다.

## 장애 확인 순서

1. 현재 역할 확인
2. 필요한 permission key 확인
3. route permission map 확인
4. 최근 `PERMISSION_DENIED` 감사 로그 확인
5. 고객 출력이면 output permission과 customer sanitizer를 함께 확인

## 검증 상태

- 7 roles / 28 permissions: `PASSED`
- Default deny / unknown role deny / missing role deny: `PASSED`
- Route guard / menu guard / output guard: `PASSED`
- Customer data sanitizer / audit redaction: `PASSED`
- External auth provider: `DISABLED`
- Customer safety regression: `PASSED`
- Final decision: `MERGE_READY`
