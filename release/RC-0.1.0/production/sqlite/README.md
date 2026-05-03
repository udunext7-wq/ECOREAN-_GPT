# Production SQLite Area

This folder is reserved for real operating SQLite data.

Rules:

- Do not copy development smoke-test data here as operating truth.
- Initialize production DB before first real project.
- Keep production DB separate from `release/RC-0.1.0/development/`.
- Create a backup before any restore or migration.
- Master DB updates require representative approval and rollback snapshot.

