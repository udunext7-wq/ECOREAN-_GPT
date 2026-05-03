# ECOREAN 자동견적 OS 개발 계획

## 1. 개발 방식

ECOREAN 자동견적 OS는 Auto-Pilot 방식으로 개발한다.

각 작업은 다음 순서로 진행한다.

```text
PLAN -> BUILD -> TEST -> REPORT -> WAIT APPROVAL
```

단, 다음 변경은 반드시 대표님 승인 후 진행한다.

- 전체 구조 변경
- DB 스키마 변경
- Master DB 기준 변경
- 단가 변경
- 마진율 변경
- 표준 사양 변경
- 공정 트리 구조 변경
- 자동 포함 규칙 변경

다음 작업은 자동 진행 가능하다.

- 폴더 생성
- 단순 파일 생성
- 문서 작성
- 테스트 파일 생성
- 기존 설계 문서 정리
- 기존 HTML 분석
- 기존 HTML 보존 복사

## 2. 현재 목표

현재 목표는 기존 단일 HTML 프로토타입을 보존하면서, ECOREAN 자동견적 OS를 Electron + React + TypeScript 기반의 모듈형 시스템으로 재구성하는 것이다.

핵심 목표:

- 기존 ECOREAN HTML을 `legacy/`에 보존
- Electron + React + TypeScript 프로젝트 구조 생성
- Master DB 분리
- Estimate Engine 분리
- Schedule Engine 분리
- Customer Output / Internal Output 분리
- Storage 분리
- UI 분리
- 모든 공정에 트리 구조, 온톨로지, 옵션 가격 조정 구조 적용
- `defaultSpec`과 `optionGroups` 기반으로 견적 금액이 변하도록 설계
- `AUTO`, `SELECT`, `QTY`, `CONDITIONAL` 트리거 적용
- 고객용 견적서, 내부 원가표, 공정별 마진표, 자재 발주표, 공정표, 인력 투입표, 일정표, 현장 관리표, 현금 흐름표, 리스크 및 누락 공정 진단 자동 생성 구조 설계

## 3. 개발 단계

### Phase 0: 기준 문서 생성

상태: 진행 중

목표:

- `PLAN.md`
- `SPEC.md`
- `ARCHITECTURE.md`
- `MASTER_DB_SCHEMA.md`
- `TASKS.md`
- `TEST_PLAN.md`
- `CHANGELOG.md`

산출물을 생성한다.

### Phase 1: Legacy 보존

목표:

- 기존 HTML 파일을 삭제하지 않는다.
- 기존 HTML 파일을 `legacy/ECOREAN_original.html`로 복사한다.
- 원본 경로와 복사 시점을 기록한다.
- Legacy 파일은 기준 구현체로 취급한다.

승인 필요 여부:

- 단순 복사이므로 자동 진행 가능
- 삭제, 이동, 원본 수정은 금지

### Phase 2: 프로젝트 구조 생성

목표:

- Electron + React + TypeScript 기반 폴더 구조 생성
- 기능 구현 없이 모듈 경계만 생성
- 각 모듈의 `README.md` 또는 placeholder 문서 생성

승인 필요 여부:

- 폴더/파일 생성은 자동 진행 가능
- 빌드 도구 선택 또는 의존성 설치 전에는 승인 필요

### Phase 3: Master DB 스키마 확정

목표:

- 공정 트리 구조 확정
- `defaultSpec` 구조 확정
- `optionGroups` 구조 확정
- `ontologyRelation` 구조 확정
- `triggerType` 구조 확정
- `priceLogic` 구조 확정

승인 필요 여부:

- 스키마 변경이므로 대표님 승인 필요

### Phase 4: 기존 HTML DB 분석 및 변환 계획

목표:

- 기존 HTML의 `DB` 객체 분석
- 기존 필드와 신규 스키마 매핑
- 변환 불가능하거나 보강이 필요한 필드 식별
- 변환용 샘플 공정 3개 작성

승인 필요 여부:

- 분석은 자동 진행 가능
- 실제 변환 규칙 확정은 승인 필요

### Phase 5: 견적 엔진 설계

목표:

- 입력값 정규화
- 공정 트리 탐색
- 트리거 판단
- 수량 산출
- 옵션 보정
- 난이도 보정
- 최종 단가 계산
- 견적 라인 생성
- 고객용/내부용 데이터 분리

승인 필요 여부:

- 계산 공식 확정 전 승인 필요

### Phase 6: 공정표 엔진 설계

목표:

- 선행공정/후행공정 관계 적용
- 공정 기간 계산
- 인력 투입 계산
- 자재 발주 시점 계산
- 충돌 공정 탐지

승인 필요 여부:

- 공정 순서/의존성 규칙 확정 전 승인 필요

### Phase 7: 출력 모듈 설계

목표:

- 고객용 견적서
- 내부 원가표
- 공정별 마진표
- 자재 발주표
- 인력 투입표
- 현장 관리표
- 공정표

승인 필요 여부:

- 출력 항목 노출 정책 확정 전 승인 필요

## 4. 중단 조건

다음 상황에서는 작업을 멈추고 대표님 승인을 기다린다.

- 기존 HTML을 수정해야 하는 경우
- 기존 HTML을 이동/삭제해야 하는 경우
- DB 스키마 변경이 필요한 경우
- 단가 기준을 변경해야 하는 경우
- 마진율 기준을 변경해야 하는 경우
- 표준 사양을 바꿔야 하는 경우
- 공정 자동 포함 규칙을 바꿔야 하는 경우
- 의존성 설치가 필요한 경우
- 외부 네트워크 접근이 필요한 경우

## 5. 다음 단계 제안

현재 문서 생성 완료 후 다음 단계는 다음과 같다.

```text
Phase 1: 기존 HTML을 legacy 폴더에 보존 복사
```
