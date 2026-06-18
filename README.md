# ECOREAN BOC

Official operational baseline: `v0.4.4`

## Run

- Windows packaged app: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- App data: `%APPDATA%\ecorean-boc-electron`
- Database: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- Exports: `%APPDATA%\ecorean-boc-electron\export`
- Backups: `%APPDATA%\ecorean-boc-electron\backups`

## Release References

- Source RC tag: `v0.4.4-rc`
- Packaged baseline tag: `v0.4.4-rc-packaged`
- Official release tag: `v0.4.4`
- Release gate: `docs/V0_4_4_RELEASE_GATE.md`

## Operating Notes

- Internal Calendar is the single source of truth for RC-0.4.4/v0.4.4 calendar readiness.
- External Calendar providers, OAuth, invitations, and customer schedule messages remain disabled.
- Full visual click QA is not yet completed; source, smoke, archive, and packaged launch verification are the current baseline.
