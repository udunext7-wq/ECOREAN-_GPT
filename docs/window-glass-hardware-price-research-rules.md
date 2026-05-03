# Window Glass Hardware Price Research Rules

## Purpose

This document defines the third real price research table for `PRJ-REAL-APT-0001`.

The scope is window, glass, hardware, silicone, urethane foam, and condensation reinforcement materials.

## Core Rule

Window pricing cannot be managed as one flat line item.

Every window-related estimate must separate:

- frame
- glass
- hardware
- sealing
- insulation
- demolition
- carrying or lifting
- installation labor
- warranty and A/S

## Partial vs Full Replacement

Every item includes `replacementScope`.

Allowed states:

- `partial`
- `full`
- `conditional`
- `NEEDS_CONFIRMATION`

For `PRJ-REAL-APT-0001`, window replacement scope is partial. Therefore full replacement cannot be auto-confirmed without CEO approval.

## Condensation Risk

Every item includes `condensationRisk`.

High-risk items:

- 발코니 창호
- 시스템창호
- 일반 알루미늄 창호
- 단창
- 폴딩도어
- 우레탄폼
- 결로 보강 단열재

Condensation-related choices must be linked to client explanation, defect risk, and claim risk.

## Price Separation

The following must remain separate:

- `officialPrice`
- `marketPrice`
- `dealerPrice`
- `supplierPrice`
- `internalPrice`
- `laborCost`
- `accessoryCost`

Do not mix dealer price and supplier price. Do not use online price as supplier price.

## Required Source Data

Collect from:

- window brand dealers
- local window fabrication shops
- glass suppliers
- hardware suppliers
- sealing and caulking crews
- insulation material suppliers
- ECOREAN actual defect and claim records

## CEO Direct Questions

The CEO should directly confirm:

- Is the scope partial replacement or full replacement?
- Which openings are being replaced?
- What are exact measured dimensions?
- Is demolition included?
- Is carrying or lifting included?
- What glass specification is included?
- Is LOW-E glass included or optional?
- What hardware is included?
- What silicone/sealing material is used?
- Is condensation covered by warranty?
- Who handles A/S?
- What is the lead time after measurement?
- What is the payment condition?
- Which brand does the installer prefer?

## Approval Flow

Research values do not update Master DB directly.

Workflow:

1. Fill research table.
2. Mark item `READY_FOR_APPROVAL`.
3. Create `MasterDbUpdateRequest`.
4. CEO reviews price, condensation risk, defect risk, lead time, and rollback data.
5. Approved values can be reflected in Master DB.
6. Rejected values return to `NEEDS_RESEARCH`.

## Customer Explanation

Customer-facing estimates must explain why a higher window specification may be required.

Examples:

- Existing condensation history.
- Balcony exposure.
- Single window risk.
- Frame and glass mismatch.
- Partial replacement limitations.

## Master DB Safety

Direct updates are prohibited.

Master DB update requires:

- source name
- source date
- supplier or dealer evidence
- defect risk review
- rollback snapshot
- CEO approval
