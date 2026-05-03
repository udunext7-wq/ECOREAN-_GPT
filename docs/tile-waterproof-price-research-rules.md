# Tile Waterproof Price Research Rules

## Purpose

This document defines the first real pricing research structure for `PRJ-REAL-APT-0001`.

The target scope is tile, tile accessory materials, and waterproof materials. The goal is to convert `UNKNOWN` and `NEEDS_RESEARCH` cost fields into a controlled research workflow without directly updating the Master DB.

## Core Rule

Research data is not Master DB data.

Collected prices must first become a `MasterDbUpdateRequest`. The Master DB can only be updated after CEO approval and rollback data creation.

## Project Link

Every research item must include:

- `projectId`: `PRJ-REAL-APT-0001`
- `itemId`
- `estimateVsActualLink`
- `approvalFlow`

This allows the first project estimate to be compared with actual purchase price, actual labor cost, actual waste rate, actual defect rate, and actual lead time.

## Price Types

- `officialPrice`: official reference price from standard cost sources.
- `marketPrice`: visible market price from online material stores or public wholesale channels.
- `supplierPrice`: real supplier or dealer quotation.
- `internalPrice`: ECOREAN actual purchase price after transaction.

These values must remain separate. Do not overwrite one with another.

## Required Research Sources

Official sources:

- Standard construction cost references
- Standard market unit price references
- Public procurement price information

Supplier sources:

- Tile distributors
- Tile accessory suppliers
- Waterproof material dealers
- Brand agencies
- Specialist subcontractors

Market sources:

- Online tile stores
- Online construction material stores
- Wholesale material platforms

Internal sources:

- ECOREAN actual purchase records
- ECOREAN site cost records
- Defect management records
- Estimate vs actual reports

## Approval Flow

1. Researcher fills `officialPrice`, `marketPrice`, `supplierPrice`, and source fields.
2. Site manager or estimator checks quantity basis, waste rate, lead time, and payment condition.
3. Internal purchase value is added only after actual transaction.
4. The item changes from `NEEDS_RESEARCH` to `READY_FOR_APPROVAL`.
5. A `MasterDbUpdateRequest` is created.
6. CEO reviews price basis, margin impact, risk impact, and rollback data.
7. If approved, the value can be reflected in Master DB.
8. If rejected, the item returns to research state.

## Master DB Safety

The following are prohibited:

- Direct Master DB update from research table.
- Updating supplier price without source name and source date.
- Updating internal price without actual transaction evidence.
- Updating waterproof-related data without defect risk review.
- Updating labor cost without crew productivity or minimum labor charge review.
- Applying a price to customer estimate before approval when confidence is low.

## Estimate vs Actual

Each item must be usable in variance analysis.

Required comparison fields:

- estimated supplier price vs actual purchase price
- estimated labor cost vs actual labor cost
- estimated waste rate vs actual waste rate
- estimated lead time vs actual lead time
- estimated defect risk vs actual defect record

## CEO Direct Questions

The CEO should directly confirm the following with suppliers or crews:

- Supplier price and internal purchase discount.
- Minimum order unit.
- Lead time and stock status.
- Payment condition.
- Return or breakage policy.
- Preferred installer material.
- Warranty or defect response policy.

## Output Use

Customer-facing estimates must use approved price basis only.

Internal cost sheets may show researched but unapproved values, but they must be marked as `PENDING_CEO_APPROVAL` or `NEEDS_RESEARCH`.

## Initial Status

All prices in this first sample remain:

- `UNKNOWN`
- `NEEDS_RESEARCH`

No actual price is estimated or inserted in this step.
