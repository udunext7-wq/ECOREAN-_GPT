# Handoff Summary

## Status

`v0.4.4` official operational baseline is released and accepted with warnings.

## What Was Verified

- Repository on `main`, clean and synced with origin.
- `v0.4.4` annotated official tag points to `36aaa3d98b26743a828a879d878b142e9e003905`.
- GitHub Release `v0.4.4` exists with EXE and checksum asset.
- Local EXE checksum matches release checksum.
- Packaged app launches without a dev server.
- Packaged app relaunch succeeds.
- Customer safety regression passes.
- Calendar/site survey sync smoke passes.
- Real project intake smoke passes.
- LightBIM BOC release flow passes.
- `build:ui` and `smoke:prod` pass.

## Warnings

- `npm run smoke:release` timed out at 120s and 300s without failure logs.
- Full visual click QA was not fully automated.
- PDF/Excel/print visual layout was not rendered and inspected in this run.

## Open Issues

- `V044-QA-P2-001`: release aggregate smoke timeout.
- `V044-QA-P3-001`: packaged visual click automation gap.
- `V044-QA-P3-002`: output artifact visual inspection gap.

## Next Version Recommendation

`v0.4.5` should be a focused QA and operational reliability release, not a feature expansion.

Recommended headline:

`v0.4.5 Visual Output QA Stabilization`

## Do Not Change

- Do not move `v0.4.4`.
- Do not move `v0.4.4-rc`.
- Do not move `v0.4.4-rc-packaged`.
- Do not commit userData, backups, exports, generated PDFs/Excels, SQLite runtime data, or packaged binaries.

