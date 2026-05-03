# First Project Template Guide

Version: `ECOREAN BOC MVP RC-0.1.0`

## Purpose

최초 운영 프로젝트는 자유 입력으로 시작하지 않고 템플릿 기반으로 시작합니다. 이렇게 해야 최소 입력값, 자동 생성 공정, NEEDS_CONFIRMATION, 예비 견적, 공정표 초안, 발주 초안, 수금 계획이 일관되게 생성됩니다.

## Available Templates

### 1. 아파트 전체 리모델링

Use when:

- 구축 아파트 전체 공사
- 욕실, 주방, 방, 발코니, 전기, 설비, 마감이 함께 포함됨
- 공정/수금/발주/현장관리 전체 흐름 검증 필요

Required confirmation:

- 철거 범위
- 방수 필요 여부
- 창호 부분/전체 교체 범위
- 배관 수정 범위
- 전기 증설 범위
- 결로/단열 보강 여부

### 2. 욕실 단독 리모델링

Use when:

- 욕실 1개 또는 다수 욕실 단독 공사
- 방수, 타일, 도기, 샤워부스, 환풍기 중심

Required confirmation:

- 바닥 철거 여부
- 기존 방수층 상태
- 배관 변경 여부
- 샤워부스/욕조 변경 여부
- 누수 이력

### 3. 주방 단독 리모델링

Use when:

- 싱크, 상판, 수전, 후드, 주방 벽타일 중심

Required confirmation:

- 주방 가구 전체 교체 여부
- 배관/전기 위치 변경 여부
- 타일 철거/덧방 여부
- 빌트인 가전 여부

### 4. 상가 인테리어

Use when:

- 상업공간 신규 또는 리뉴얼 공사
- 전기, 설비, 소방, 간판, 마감, 집기 흐름 필요

Required confirmation:

- 업종
- 영업허가 관련 조건
- 소방/환기 조건
- 야간 작업 가능 여부
- 건물 관리 규정

### 5. 원상복구 공사

Use when:

- 임대차 종료 원복
- 철거, 폐기물, 도장, 바닥, 전기 원복 중심

Required confirmation:

- 임대차 원상복구 기준
- 철거 범위
- 폐기물 반출 조건
- 관리사무소 작업 조건

## Template File

Operational template JSON:

`release/RC-0.1.0/production/project-templates/first-operating-project-templates.json`

