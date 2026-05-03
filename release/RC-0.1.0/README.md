# ECOREAN BOC MVP RC-0.1.0

This folder is the locked release candidate baseline.

Do not overwrite this folder during normal development.

## Structure

- `production/`: separated operating area for real project start.
- `development/`: snapshot of current development SQLite DBs.
- `backup/`: SQLite backup baseline with manifest and checksums.
- `export/`: reserved export area.
- `installer/`: Windows installer package.
- `win-unpacked/`: unpacked Electron executable package.

## Baseline Backup

Backup ID:

`BACKUP-2026-04-25T23-19-57-301Z`

Backup folder:

`release/RC-0.1.0/backup/BACKUP-2026-04-25T23-19-57-301Z/`

## Operating Rule

Production data must not be written into development DB snapshots. Start real operation from the production area and approved templates.

