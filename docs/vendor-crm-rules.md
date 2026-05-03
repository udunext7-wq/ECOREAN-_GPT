# Vendor CRM Rules

## Purpose

Vendor CRM manages supplier relationships as company assets.

It connects:

- vendor contact
- quote request
- supplier price comparison
- defect history
- payment condition
- reliability evaluation
- Living Master DB update requests

## Core Principles

1. 거래처는 자산이다.
2. 공급가는 반드시 기록한다.
3. 거래처 비교는 감이 아니라 데이터다.
4. 하자 대응이 단가보다 중요할 수 있다.
5. blacklist는 반드시 기록한다.
6. 대표 승인 없는 공급가 반영은 금지한다.

## Vendor Master

Vendor Master stores the latest approved vendor profile.

Required information:

- vendorId
- vendorName
- category
- contact person
- contact info
- region
- supply items
- main brands
- minimum order unit
- average lead time
- payment condition
- month-end settlement availability
- urgent order availability
- defect response level
- A/S response level
- reliability score
- price competitiveness score
- defect risk score
- recommendation status
- blacklist status
- notes

## Contact Log

Every phone call, KakaoTalk, meeting, or quote request must be logged.

Contact Log is evidence. If it is not recorded, it cannot be used for Master DB update.

## Approval Required Actions

CEO approval is required for:

- 신규 거래처 등록
- blacklist 등록
- 고액 거래처 변경
- Master DB 공급가 반영
- 거래 조건 변경

## Living Master DB Connection

Supplier data follows this path:

`Contact Log` -> `Vendor Comparison` -> `Vendor Evaluation` -> `MasterDbUpdateRequest` -> `CEO Approval` -> `Rollback Snapshot` -> `Living Master DB`

## Blacklist Rule

Blacklist is not emotional. It must be evidence-based.

Required evidence:

- contact log
- defect record
- missed lead time
- payment dispute
- client claim
- A/S failure
- manager note

## No Direct Price Update

Supplier price cannot update Master DB directly.

Every price update requires:

- source name
- source date
- evidence
- impact analysis
- rollback data
- CEO approval
