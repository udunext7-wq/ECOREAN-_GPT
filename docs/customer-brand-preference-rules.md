# Customer Brand Preference Rules

## Purpose

Customer brand preference rules store which brands, grades, designs, prices, and warranty conditions customers prefer. This becomes the basis for future recommendation and ML correction.

## Preference Signals

- Consultation preference
- Estimate selection
- Contracted option
- Change order
- Customer rejection reason
- Completion satisfaction
- Defect/A/S outcome
- Repeat referral

## customerPreferenceScore

`customerPreferenceScore` must not be guessed. It starts as `NEEDS_RESEARCH`.

Future score inputs:

```text
selectionRate
+ contractConversionRate
+ upgradeAcceptanceRate
+ satisfactionScore
- defectComplaintRate
- deliveryDelayComplaintRate
- priceResistanceRate
```

## Required Case Feedback

Every completed project should store:

- selectedBrandId
- selectedModelName
- quotedPrice
- actualSupplierPrice
- actualInternalPrice
- customerSelected
- customerRejected
- rejectionReason
- defectOccurred
- asRequestOccurred
- satisfactionScore
- marginActual
- deliveryDelayDays

## Guardrails

AI may recommend a brand only when compatibility, source confidence, lead time, defect risk, margin potential, and customer budget are acceptable. Contract amount, margin, warranty, A/S, or grade changes require approval.

