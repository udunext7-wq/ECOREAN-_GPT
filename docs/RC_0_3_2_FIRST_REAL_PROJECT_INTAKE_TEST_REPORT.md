# RC-0.3.2 첫 실제 프로젝트 접수 테스트 리포트

## 테스트 정보

- 테스트 일자: 2026-05-30
- 브랜치: `rc-0.3.2-real-project-intake`
- 기준 커밋: `6b3860f Start RC-0.3.2 real project intake package`
- 테스트 ID: `RPI-RC032-FIRST-TEST`
- 테스트 데이터:
  - `tests/user-test-data/rc-0.3.2/real-project-intake/first-real-project-intake.sample.json`
  - `tests/user-test-data/rc-0.3.2/real-project-intake/first-real-project-intake-lightbim.sample.json`
  - `tests/user-test-data/rc-0.3.2/real-project-intake/first-real-project-intake-expected-results.json`

## 고객 / 현장 데이터

- 고객명: 테스트 고객
- 고객 유형: TEST
- 현장명: RC-0.3.2 실제 접수 테스트 현장
- 주소: 서울 / 익명 테스트 현장
- 상세주소: 입력하지 않음
- 공사 유형: FULL_REMODELING
- 면적: 84㎡
- 예산 등급: STANDARD
- 공사 범위: demolition / bathroom / kitchen / flooring / wallpaper / lighting

## 테스트 결과

- 초안 생성: PASSED
- 불완전 접수 검증 차단: PASSED
- 필수 항목 완성 후 `READY_FOR_ESTIMATE`: PASSED
- 단가 준비 상태: `PARTIAL`
- LightBIM 연결: PASSED
- 견적 생성: PASSED
- 견적 ID: `INTAKE-FULL_REMODELING-*`
- PCE 결과: `SCALE`
- 고객 안전성 검사: PASSED
- 상세주소 / 내부 원가 / 마진 / PCE leak 주입 차단: PASSED
- S1 이슈 기록: PASSED
- 접수 리포트 생성: PASSED
- 목록 조회: PASSED

## 발견 이슈

### S1

- 없음

### S2

- 없음

### S3

- 없음

### S4

- SQLite experimental warning은 기존 비차단 경고입니다.
- Vite bundle size warning은 기존 비차단 경고입니다.

## 수정 사항

- 고객 출력 안전성 검사에 `detailed_address` / `detailed address` 금지 키를 추가했습니다.
- 익명화된 RC-0.3.2 접수 fixture와 전용 smoke test를 추가했습니다.

## 최종 판정

`접수 흐름 사용 가능`

근거:

- 필수 항목 검증이 견적 생성을 올바르게 차단합니다.
- 완성된 접수는 LightBIM 연결 후 견적/PCE까지 생성됩니다.
- 고객 payload는 상세주소와 내부정보를 노출하지 않습니다.
- 내부정보 leak 주입 시 S1 이슈를 만들고 고객 출력을 차단합니다.
