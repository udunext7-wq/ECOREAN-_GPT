# Supplier Contact Priority List

## Purpose

This is the first real supplier contact execution list for `PRJ-REAL-APT-0001`.

The goal is to secure real supplier price, real payment conditions, real lead time, A/S responsibility, defect response, and urgent order capability.

## Core Principle

DB follows real suppliers.

Internet prices are only reference data. ECOREAN competitiveness comes from real supplier price, payment terms, delivery reliability, and defect responsibility.

## This Week TOP 10 Contact List

| Rank | Vendor Slot | Category | First Contact | Why First |
|---:|---|---|---|---|
| 1 | Tile Main Supplier A | 타일 거래처 | 전화 후 카톡 견적 요청 | 타일은 면적이 크고 마진/품수/부자재에 직접 영향 |
| 2 | Tile Accessory Supplier A | 타일 부자재 | 카톡 품목표 요청 | 압착시멘트, 접착재, 줄눈, 레벨링 누락 방지 |
| 3 | Waterproof Dealer A | 방수재 대리점 | 전화 후 제품별 단가표 요청 | 방수 하자는 손실과 클레임이 가장 큼 |
| 4 | Bathroom Fixture Supplier A | 욕실 도기 공급처 | 카톡 모델별 공급가 요청 | 양변기/세면기/수전은 고객 체감이 큼 |
| 5 | Bathroom Cabinet/Shower Booth Supplier A | 욕실장/샤워부스 | 전화 후 실측/납기 확인 | 제작 리드타임과 하자 책임이 중요 |
| 6 | Window Fabrication Company A | 창호 업체 | 전화 미팅 예약 | 결로 일부 있음 프로젝트의 핵심 리스크 |
| 7 | Glass Supplier A | 유리 업체 | 전화 후 규격별 견적 요청 | 로이/복층/강화 유리 선택이 결로와 금액에 영향 |
| 8 | Sealant/Caulking Crew A | 실란트/코킹 업체 | 전화 후 시공 단가 확인 | 누수/결로/실리콘 하자 리스크 감소 |
| 9 | Electrical Material Supplier A | 전기 자재 업체 | 카톡 단가표 요청 | 증설/조명/환풍기 자재 단가 확보 |
| 10 | Waste Disposal Company A | 폐기물 처리 업체 | 전화 후 차수/톤/마대 견적 요청 | 철거 초기 현금 지출과 민원 리스크 영향 |

## Priority Logic

1. 타일 and 타일 부자재 decide large surface cost and minimum labor charge.
2. 방수 decides defect risk and downstream process blocking.
3. 욕실 도기 and 욕실장 decide customer-facing satisfaction.
4. 창호 and 유리 decide condensation and claim risk.
5. 실란트 and 코킹 decide leakage and finish quality.
6. 전기 and 폐기물 decide early project execution cost.

## Contact Method Rule

Use this sequence:

1. Phone call to confirm the right person.
2. KakaoTalk to send item list and project summary.
3. Ask for written quotation.
4. Ask for payment terms separately.
5. Ask for defect responsibility separately.
6. Record all answers in vendor DB.

## Project Summary To Send

Project:

- 24평 구축 아파트 전체 리모델링
- 예산 6,000만 원
- 욕실 1개
- 주방 1개
- 방 2개
- 발코니 1개
- 창호 부분 교체
- 배관 부분 수정
- 전기 일부 증설
- 결로 일부 있음
- 누수 없음
- 입주 예정일 90일 후

Message:

> 24평 구축 아파트 전체 리모델링 견적용 공급가 확인 중입니다. 소비자가 말고 실제 공급가, 최소 발주 단위, 납기, 결제 조건, 하자 발생 시 책임 범위를 확인 부탁드립니다.

## Must Record

- supplier price
- dealer price
- internal purchase price
- minimum order unit
- lead time
- payment condition
- urgent order possibility
- defect responsibility
- exchange policy
- preferred installer brand
- A/S policy
- source date
- confidence level

## Approval Rule

Supplier answers do not update Master DB directly.

After research:

`Supplier Answer` -> `Supplier Comparison` -> `MasterDbUpdateRequest` -> `CEO Approval` -> `Rollback Snapshot` -> `Master DB Update`
