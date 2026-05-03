# Bathroom Pricing Standard V2

## Purpose

Bathroom Pricing Standard V2 prevents low-margin bathroom remodeling contracts.

The decision is no longer:

```text
Can we win this contract?
```

The decision becomes:

```text
Can we safely accept this contract?
```

## Source Evidence

Source project: `PRJ-PROD-BATH-0001`

- Customer price: 5,490,000원
- Recovered actual cost baseline: 5,070,000원
- Actual margin: 420,000원
- Actual margin rate: 7.65%

Conclusion:

The V1 customer-price-first model must be discarded for standalone bathroom remodeling.

## Margin Tiers

| Tier | Margin Rule | Decision |
| --- | --- | --- |
| Below 20% | Block | CEO approval cannot bypass without explicit exception log |
| 20~25% | CEO approval required | Low-margin review |
| 25%+ | Acceptable | Standard target |
| 30%+ | Preferred | Premium target |

## V2 Package Prices

| Package | Cost Floor | Minimum Allowed | Recommended Price | Target Margin |
| --- | ---: | ---: | ---: | ---: |
| Basic | 4,420,000원 | 5,530,000원 | 5,900,000원 | 25% |
| Standard | 5,070,000원 | 6,760,000원 | 6,800,000원 | 25% |
| Premium | 5,070,000원 | 7,250,000원 | 7,300,000원 | 30% |

Basic uses only verified excluded costs from the completed project:

- Shower booth removed: 300,000원
- Zendai removed: 350,000원

Unverified supplier-price differences are not used to lower the cost floor.

## Upsell-Only Options

The following must not be included in the base package:

- Shower booth / partition
- Zendai + marble finish
- 600각 polishing tile
- Imported or premium fixtures
- Epoxy grout
- Jolly cut

## Installation Method Separation

- Bond method: base installation method.
- Floating mortar method: separate option, minimum sale price 670,000원.

## Quote Guard

Any bathroom quote must evaluate:

- Package code
- Offer price
- Cost floor
- Margin amount
- Margin rate
- Approval requirement
- Blocking status

If the offer price is below the package minimum or margin is below 20%, the system blocks the order.
