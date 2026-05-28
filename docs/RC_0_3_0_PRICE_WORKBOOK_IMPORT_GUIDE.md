# RC-0.3.0 Price Workbook Import Guide

## 목적

단가표 일괄 가져오기는 업체 견적 단가표, 자재 단가표, 실제 매입 단가표, 노무 단가표, 장비 단가표, 표준 견적 품목 단가표를 BOC에 한 번에 입력하기 위한 내부 운영 기능입니다.

가져온 단가는 바로 마스터 데이터에 반영되지 않습니다.

CSV/Excel price input → preview → match → variance → approval queue → backup → apply through Real Price Calibration workflow

## 지원 파일 형식

- CSV: RC-0.3.0 기본 지원
- XLSX/XLS: 앱에 XLSX 파서 의존성이 있을 때만 지원

Microsoft Excel 자동화는 사용하지 않습니다.

## CSV 템플릿

템플릿 위치:

- `templates/price-import/material_price_template.csv`
- `templates/price-import/vendor_quote_template.csv`
- `templates/price-import/actual_purchase_template.csv`
- `templates/price-import/labor_rate_template.csv`
- `templates/price-import/equipment_price_template.csv`
- `templates/price-import/standard_item_price_template.csv`

템플릿의 단가는 예시 단가입니다. 실제 업체 조건과 운영 단가로 수정해야 합니다.

## 가져오기 유형

- 자재 단가표: `MATERIAL_PRICE_LIST`
- 업체 견적 단가표: `VENDOR_QUOTE`
- 실제 매입 단가표: `ACTUAL_PURCHASE`
- 노무 단가표: `LABOR_RATE`
- 장비 단가표: `EQUIPMENT_PRICE`
- 표준 견적 품목 단가표: `STANDARD_ITEM_PRICE`

## 컬럼 매핑

BOC는 한국어/영문 컬럼명을 자동 추론합니다.

공통 필수 컬럼:

- 항목명 또는 자재명 또는 역할 또는 장비명
- 단위
- 단가

노무 단가표는 단위가 없으면 `일` 단위로 처리합니다.

컬럼 매핑이 부족하면 승인 대기 생성으로 진행하지 않습니다.

## 자동 매칭 기준

마스터 데이터 매칭 우선순위:

1. ID 일치
2. 항목명 + 단위 일치
3. 항목명 + 분류 일치
4. 공백/대소문자를 정리한 항목명 유사 일치
5. 규격/브랜드 보조 확인

결과:

- `MATCHED`: 승인 대기 생성 가능
- `MULTIPLE_MATCHES`: 사용자 확인 필요
- `UNMATCHED`: 마스터 데이터와 매칭되지 않음
- `INVALID`: 필수 데이터 오류

## 검증 메시지

- 항목명이 없습니다.
- 단가가 올바르지 않습니다.
- 단위가 없습니다.
- 마스터 데이터와 매칭되지 않았습니다.
- 여러 항목과 매칭되었습니다.
- 단가 차이가 큽니다.

## 차이율 분석

매칭된 행은 현재 마스터 단가와 가져온 단가를 비교합니다.

- 상승
- 하락
- 동일
- 신규 입력
- 확인 필요

차이율 절대값이 30%를 넘으면 우선 확인 대상으로 표시합니다.

## 승인 Queue 생성

미리보기에서 선택한 `MATCHED` + `VALID` 행만 `real_price_update_queue`에 `PENDING_REVIEW` 상태로 생성됩니다.

가져오기만으로 마스터 데이터는 변경되지 않습니다.

## 승인/반영 절차

1. 단가표 일괄 가져오기에서 승인 대기 생성
2. 실제 단가 보정 센터로 이동
3. 항목별 승인 또는 반려
4. 승인된 항목만 백업 후 반영
5. 다음 견적부터 승인 반영된 마스터 단가 사용

## 백업 원칙

단가표 가져오기 단계에서는 백업이 필요하지 않습니다. 마스터 데이터 반영 전에는 실제 단가 보정 센터에서 백업이 생성되어야 합니다.

## 고객 안전 원칙

고객 화면에는 다음 정보를 표시하지 않습니다.

- 업체 견적 상세
- 내부 단가
- 노무 단가
- 차이율
- 승인 대기
- 가져오기 이력
- 단가 보정 이력

고객 견적에는 최종 고객용 금액만 표시합니다.

## 한계

- 외부 시장 단가 자동 검증 없음
- 미매칭 항목의 신규 마스터 자동 생성 없음
- XLSX는 의존성이 있을 때만 지원
- 가져온 단가의 정확성은 사용자가 확인해야 함
