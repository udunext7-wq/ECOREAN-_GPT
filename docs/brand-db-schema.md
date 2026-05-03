# ECOREAN Brand DB Schema

## Purpose

Brand DB manages real brands, product lines, models, specs, supply price, lead time, warranty, A/S, installation difficulty, defect rate, customer preference, and margin potential.

Process DB answers `what work is required`. Brand DB answers `which real product will be used`.

## Required Fields

Every brand product record must include:

| Field | Description |
|---|---|
| brandId | Stable brand/product identifier |
| brandName | Brand name |
| category | Major category |
| subcategory | Product category |
| productLine | Product line or collection |
| modelName | Model name or model code |
| standardSpec | Size, material, finish, grade, performance spec |
| unit | EA, SET, m2, m, box, roll, sheet |
| officialPrice | Official/list price. Use NEEDS_RESEARCH until verified |
| dealerPrice | Dealer or agency price |
| supplierPrice | Actual supplier quote |
| internalPrice | ECOREAN actual field purchase price |
| leadTimeDays | Procurement lead time |
| warrantyPeriod | Warranty period |
| asPolicy | A/S policy and responsible party |
| commonDefectRate | Defect rate from Case Library |
| preferredInstaller | Preferred installer or crew type |
| installationDifficulty | LOW, MEDIUM, HIGH, SPECIALIST, or measured score |
| compatibility | Compatible processes, spaces, materials, accessories |
| alternativeBrands | Replaceable brand/product candidates |
| customerPreferenceScore | Preference score from consultation/case data |
| marginPotential | Gross margin potential by price basis |
| sourceType | official, dealer, supplier, market, internal |
| sourceName | Source name |
| sourceDate | YYYY-MM-DD or NEEDS_RESEARCH |
| confidenceLevel | LOW, MEDIUM, HIGH, VERIFIED |
| updateCycle | monthly, quarterly, semiannual, annual, onChange |
| notes | Research memo |

## Category Scope

- Bathroom: toilet, basin, faucet, shower, shower booth, bathroom cabinet, mirror, accessories
- Tile: porcelain, large format tile, wall tile, floor tile, grout, adhesive, Ardex-grade materials
- Window: system window, general window, glass, hardware
- Kitchen: sink, countertop, faucet, hood, built-in appliance
- Finish: wallpaper, film, flooring, paint, molding

## Estimate Connection

```text
Selected Process
-> Compatible Brand Product
-> Selected Price Basis
-> Customer Estimate
-> Internal Cost Table
-> Purchase Order
-> Case Library Feedback
```

Customer output may show brand, model, grade, spec, and warranty. Internal output must additionally show supplier price, internal price, margin potential, source, lead time, preferred installer, defect risk, and approval status.

## Approval Policy

AI may recommend a brand, but may not directly change supplierPrice, internalPrice, marginPotential, A/S policy, or defect rate. These changes require ApprovalLog.

