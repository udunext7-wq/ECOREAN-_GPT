# v0.4.6 Final Merge Report

## Merge Identity

- Source branch: `v0.4.6-packaged-visual-click-output-typography-qa`
- Base official version: `v0.4.5`
- Official `v0.4.5` tag target: `abe9094a8f09776a0960f0e65550bf301c5b8c55`
- Implementation commit: `318c3d9b7f173960034d948819805519ecb702d0`
- Merge commit: `016b50a27d5744fb5557c382cc0766975815d2d9`
- Post-merge smoke context commit: `f22874e029d28ff7dd8a1eadf1084135c4ddd510`
- Merge conflicts: none
- Merge date: `2026-06-24`

## Packaged Visual Click

- Result: `PASSED`
- LightBIM click: `PASSED`
- CRM click: `PASSED`
- Client Portal click: `PASSED`
- Pixel change:
  - LightBIM: `65.4%`
  - CRM: `51.5%`
  - Client Portal: `45.3%`
- Layout bounds: `PASSED`

## Safe Screenshot

- App viewport-only capture: `PASSED`
- Capture method: `CDP_PAGE_VIEWPORT`
- Isolated synthetic userData: `PASSED`
- Full desktop capture: `REJECTED`
- Sensitive DOM/customer capture: `REJECTED`
- Real customer or employee fixture used: no

## Output Typography

- Korean Type0 font embedding: `PASSED`
- `FontFile2`: `PASSED`
- `Identity-H`: `PASSED`
- `ToUnicode`: `PASSED`
- Korean CID width correction: `PASSED`
- Long-line wrapping: `PASSED`
- Poppler raster rendering: `PASSED`
- Customer PDF: 1 page, visible content, `PASSED`
- Internal PDF: 2 pages, visible content on both pages, `PASSED`
- Excel OpenXML render structure: `PASSED`
- Print pagination/layout guards: `PASSED`

The previous PDF warning was a real ASCII replacement issue, not only a parser limitation. The generator now embeds a Windows Korean TTF at runtime without committing font files. Raw byte parsing remains secondary to the embedded font structure and Poppler render result.

## Customer Safety

- Customer/internal PDF separation: `PASSED`
- Customer/internal Excel separation: `PASSED`
- Print customer safety: `PASSED`
- LightBIM customer safety regression: `PASSED`
- Customer payload internal-field filtering: `PASSED`

## Validation

### Before Merge

- v0.4.6 smoke suite: `PASSED`
- v0.4.5 package/visual/output regressions: `PASSED`
- RC-0.4.4 regressions: `PASSED`
- Real Project Intake: `PASSED`
- LightBIM customer safety and release flow: `PASSED`
- `npm run build:ui`: `PASSED`
- `npm run smoke:prod`: `PASSED`
- `npm run smoke:release:diagnose`: `PASSED`
- `npm run smoke:release`: `PASSED`
- Timed out tests: none
- Failed tests: none
- Remaining processes: none

### After Merge

- v0.4.6 smoke suite: `PASSED`
- Requested legacy regressions: `PASSED`
- `npm run build:ui`: `PASSED`
- `npm run smoke:prod`: `PASSED`
- `npm run smoke:release:diagnose`: `PASSED`
- `npm run smoke:release`: `PASSED`
- Timed out tests: none
- Failed tests: none
- Remaining processes: none

The stabilization smoke originally accepted only the source branch name. Commit `f22874e` adds merged `main` as a valid regression context without changing product behavior.

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - Excel native viewer pixel automation
  - OS print dialog click automation

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- npm update notice when shown

## Deferred Items

- Native Excel viewer pixel comparison
- Operating-system print dialog automation
- User Roles & Permissions
- External provider activation
- Public customer portal deployment

## Tag Policy

`v0.4.6-rc` must be an annotated tag pointing to the final merge documentation commit that contains this report and the matching release notes. This is an RC tag, not the official `v0.4.6` release tag.

## Final Decision

`v0.4.6 Packaged Visual Click & Output Typography QA main 반영 완료, MERGE_READY`
