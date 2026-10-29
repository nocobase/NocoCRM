# Changelog

## Unreleased

- Keep demo mailbox cleanup retry-safe when removal is already in progress or
  the fictional provider has been disabled. Report Mail background removal
  failures and pending account IDs on timeout before regenerating addresses.
- Bound demo conversation/file cleanup and generated-record tracking to batches
  of 200 without changing the dataset or preserving stale business rows.
- Add real application lifecycle coverage and an opt-in five-round reset
  resource gate with isolated SQLite/storage, fixed Node, explicit budgets,
  session/account integrity assertions and reproducible baseline comparison.
- Separate reset measurement from verification, add opt-in allocation/CPU/Intl
  diagnostics, and retain rejected memory candidates without claiming an
  unproven peak-memory reduction.
