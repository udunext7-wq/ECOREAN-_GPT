# Operation Start Checklist

Version: `ECOREAN BOC MVP RC-0.1.0`

## Before First Real Project

| Check | Status | Required Action |
|---|---|---|
| RC baseline exists | READY | Confirm `release/RC-0.1.0/` exists |
| SQLite baseline backup exists | READY | Confirm backup folder exists |
| Installer exists | READY | Keep installer copy unchanged |
| win-unpacked exists | READY | Keep executable folder unchanged |
| Development DB separated | READY | Do not use as production data source |
| Production DB area exists | READY | Start real operation separately |
| First project templates exist | READY | Choose one template |
| Real price data | PENDING | Enter later through approval flow |
| Real vendor data | PENDING | Enter later through Vendor CRM |
| Master DB direct edit | BLOCKED | Use update request only |

## Operating Start Rule

1. Create or initialize production DB separately from development DB.
2. Select a first project template.
3. Enter minimum input only.
4. Save as PRELIMINARY estimate.
5. Resolve NEEDS_CONFIRMATION items in Approval Center.
6. Keep UNKNOWN / NEEDS_RESEARCH prices until verified.
7. Convert to FINAL_ESTIMATE only after representative approval.

## Stop Conditions

Do not start real operation if:

- RC baseline backup is missing.
- Production and development DB are not separated.
- First project does not use a template.
- Master DB change is attempted without approval.
- Restore is attempted without representative approval.

## First Real Action

대표님은 먼저 `아파트 전체 리모델링` 템플릿으로 첫 운영 프로젝트를 생성하고, 실제 단가 입력이 아니라 NEEDS_CONFIRMATION 항목 정리부터 시작합니다.

