# Bathroom Fixtures Price Research Rules

## Purpose

This document defines the second real pricing research table for `PRJ-REAL-APT-0001`.

The scope is bathroom fixtures, bathroom furniture and mirrors, shower booth and partitions, and bathroom accessories.

## Brand Candidates

The first research pass must compare these brands:

- 대림바스
- 이누스
- 계림
- 아메리칸스탠다드
- TOTO
- Grohe
- Hansgrohe
- 한샘

Not every brand applies to every item. Each item includes `brandCandidates` for relevant brands only.

## Price Separation

The following prices must be kept separate:

- `officialPrice`: official reference price where available.
- `marketPrice`: online or visible market price.
- `dealerPrice`: brand dealer quotation.
- `supplierPrice`: real supplier or partner price.
- `internalPrice`: ECOREAN actual purchase price after transaction.

No price can be copied into another price field without source trace.

## Required Research Data

For each item, collect:

- brand and model
- dealer price
- supplier price
- actual internal purchase price
- lead time
- minimum order unit
- payment condition
- warranty period
- A/S policy
- installation difficulty
- preferred installer or supplier
- common defect risk

## Approval Rule

Research values do not update the Master DB directly.

Workflow:

1. Fill research table.
2. Mark item `READY_FOR_APPROVAL`.
3. Create `MasterDbUpdateRequest`.
4. CEO reviews margin impact, defect risk, lead time, and rollback data.
5. Approved values can be reflected in Master DB.
6. Rejected values return to `NEEDS_RESEARCH`.

## CEO Direct Questions

The CEO should ask suppliers and dealers:

- What is the real dealer price and supplier price by model?
- Is there a project discount for package purchase?
- What is the lead time by brand?
- Is stock held domestically or ordered after request?
- What warranty period applies?
- Who handles A/S: dealer, brand, supplier, or installer?
- What are frequent defect claims?
- Which brand does the installer prefer?
- What accessories are included or excluded?
- Are delivery, carrying, installation, and disposal separate?

## Risk Notes

Bathroom fixtures have a high customer-facing impact. A low purchase price is not enough.

Compare:

- defect frequency
- A/S speed
- installation ease
- availability
- customer preference
- margin potential

## Project Link

Every item must include:

- `projectId`: `PRJ-REAL-APT-0001`
- `approvalFlow`
- `sourceCandidates`

This keeps the research connected to the first operating project and prevents unapproved Living Master DB changes.
