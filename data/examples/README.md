# Example data fixtures

Obviously fake rows in the same shape as the private working copies. Safe to commit.

- `diary.example.json` and `schedule.example.json` use the format `{ "version": 1, "rows": [...] }`.
- Row numbers 190-192 are deliberately far from real sheet rows. Ids follow the real schemes: diary `row-<n>`, schedule `sched-row-<n>`.
- Real data lives in the gitignored `data/private/{diary,schedule}.json`. Never copy private content into this directory.
- Use these with the sync scripts via `--file`, for example `pnpm sync:diary -- --file data/examples/diary.example.json`. Scripts are dry-run by default; only point `--apply` at a local throwaway database.
