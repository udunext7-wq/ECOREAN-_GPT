# ECOREAN 자동견적 OS 아키텍처

## 1. 목표 아키텍처

초기 제품화는 Electron 기반 데스크톱 앱으로 진행한다.

단, Electron은 실행 컨테이너일 뿐이며 핵심 비즈니스 로직은 독립 모듈로 분리한다.

초기 스택:

```text
Electron
+ React
+ TypeScript
+ SQLite
+ HTML/PDF/XLSX Export
```

장기 확장:

```text
Electron Desktop
-> Electron + Cloud Sync
-> Web Dashboard + API Server
-> PostgreSQL 기반 BOC
-> AI Agent 운영 시스템
```

Electron은 최종 목적지가 아니라 1차 실행 컨테이너다.

핵심 비즈니스 로직은 향후 Web Dashboard, API Server, PostgreSQL, AI Agent 운영 시스템으로 이전 가능하도록 독립 모듈로 유지한다.

## 2. 폴더 구조

```text
ecorean-estimate-os/
  legacy/
    ECOREAN_original.html

  docs/

  electron/
    main.ts
    preload.ts

  src/
    master-db/
      schema.ts
      validators.ts
      seed/

    domain/
      project/
      estimate/
      schedule/
      output/

    estimate-engine/
      estimate-engine.ts
      quantity-engine.ts
      cost-engine.ts
      margin-engine.ts
      fee-engine.ts
      vat-engine.ts
      rule-engine.ts
      process-selector.ts
      diagnostics.ts

    schedule-engine/
      schedule-engine.ts
      dependency-resolver.ts
      duration-calculator.ts
      labor-allocation.ts
      material-order-timing.ts
      gantt-builder.ts

    outputs/
      customer/
      internal/

    storage/
      sqlite/
      local-project-store.ts
      project-repository.ts
      version-history.ts

    ui/
      components/
      pages/
      forms/
      tables/
      charts/
      styles/

    shared/
      money.ts
      units.ts
      date.ts
      ids.ts
      errors.ts
      types.ts

  tests/
    fixtures/
```

현재 루트 기준 1차 구조는 다음 폴더로 시작한다.

```text
legacy/
master-db/
estimate-engine/
schedule-engine/
outputs/customer/
outputs/internal/
storage/sqlite/
ui/
electron/
docs/
tests/
```

## 3. 모듈 책임

### legacy

기존 HTML 원본을 보존한다.

원본은 삭제하지 않는다.

### electron

Electron 메인 프로세스와 preload bridge를 담당한다.

담당:

- 앱 창 생성
- 로컬 파일 접근
- SQLite 접근 API 연결
- 출력 파일 저장 경로 선택

담당하지 않는 것:

- 견적 계산
- 단가 계산
- 공정표 계산
- Master DB 규칙

### ui

React 기반 화면 계층이다.

담당:

- 사용자 입력
- 결과 표시
- 버튼/폼/표/차트
- 엔진 호출

담당하지 않는 것:

- 최종 견적 계산
- 공정 자동 판단
- 단가 보정

### master-db

Master DB와 공정 온톨로지 기준을 담당한다.

담당:

- 공정 트리
- 기본 사양
- 옵션 그룹
- 가격 기준
- 온톨로지 관계
- 스키마 검증
- 버전 관리

### estimate-engine

견적 계산을 담당한다.

담당:

- 입력 정규화
- 트리거 판단
- 수량 산출
- 옵션 보정
- 원가 계산
- 마진 계산
- VAT 계산
- 견적 라인 생성
- 진단 생성

### schedule-engine

공정표와 운영 계획을 담당한다.

담당:

- 공정 순서 생성
- 선행/후행공정 계산
- 공기 계산
- 인력 투입 계산
- 자재 발주 시점 계산
- 일정 충돌 탐지

### outputs/customer

고객에게 보여주는 출력물을 담당한다.

내부 원가, 마진, 리스크는 노출하지 않는다.

### outputs/internal

내부 운영 출력물을 담당한다.

담당:

- 원가표
- 마진표
- 자재 발주표
- 인력표
- 공정표
- 현장관리표
- 리스크표

### storage

저장과 이력 관리를 담당한다.

초기:

- SQLite
- JSON export/import

장기:

- PostgreSQL
- Cloud Sync

## 4. 의존성 방향

의존성은 한 방향으로 흐른다.

```text
UI
-> Estimate Engine
-> Master DB

UI
-> Schedule Engine
-> Estimate Result

Outputs
-> Estimate Result
-> Schedule Result

Storage
-> Project Snapshot
-> Estimate Result
-> Actual Result
```

금지:

- Master DB가 UI에 의존하면 안 된다.
- Estimate Engine이 HTML 템플릿에 의존하면 안 된다.
- Schedule Engine이 화면 컴포넌트에 의존하면 안 된다.
- Customer Output이 내부 원가 데이터를 직접 노출하면 안 된다.

## 5. 데이터 흐름

```text
사용자 입력
-> 입력 정규화
-> Master DB 조회
-> 온톨로지 관계 탐색
-> triggerType 판단
-> 수량 산출
-> 옵션/난이도 보정
-> 견적 계산
-> 공정표 계산
-> 고객용 출력
-> 내부용 출력
-> 저장
-> 실제 결과 입력
-> 오차 분석
-> 피드백
```

## 6. 승인 필요 지점

다음 작업 전에는 대표님 승인 필요:

- DB 스키마 확정
- 공정 온톨로지 구조 변경
- 가격 계산 공식 확정
- 단가 변경
- 마진율 변경
- 표준 사양 변경
- 공정 자동 포함 규칙 변경
- 의존성 설치
