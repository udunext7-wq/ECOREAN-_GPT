# Brand Selection Rules

## Purpose

Brand selection rules define how brand choices change estimate price, internal cost, margin, procurement, schedule, defect risk, and output documents.

## Selection Flow

```text
Process selected
-> compatible brand categories loaded
-> default brand grade suggested
-> customer selects brand/model/grade
-> estimate recalculates
-> purchase order candidate created
-> schedule checks lead time
-> internal cost and margin table updates
-> Case Library stores actual outcome
```

## Selection Modes

| Mode | Description |
|---|---|
| DEFAULT | Standard grade product |
| CUSTOMER_SELECT | Customer chooses brand/model |
| INTERNAL_SUBSTITUTE | Internal equivalent product selected |
| UPGRADE | Higher grade selection |
| DOWNGRADE | Lower grade selection |
| EMERGENCY_REPLACEMENT | Replacement due to stock or lead-time issue |

## Price And Margin Logic

```text
Brand Price Impact =
selected brand price basis
- default brand price basis
+ brand-specific accessory delta
+ brand-specific labor difficulty delta
```

```text
Gross Margin =
customer sell price
- internalPrice
- laborCost
- accessoryCost
- deliveryCost
- defectRiskReserve
```

## Approval Required

Approval is required when AI changes selected brand, supplierPrice, internalPrice, marginPotential, warranty/A/S responsibility, product grade, or customer-facing amount after contract.

