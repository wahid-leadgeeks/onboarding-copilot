# ADR-0006: Database Working Copy and Sync Conflict Rules

**Status:** Proposed
**Date:** 2026-10-03
**Deciders:** Engineering, Product

> This ADR is a proposal. It is not accepted, and nothing in the codebase may rely on it until the status changes to Accepted.

---

## Context

[ADR-0001](0001-google-sheets-as-source-of-truth.md) makes Google Sheets the source of truth and states: "No separate persistent database will be introduced without a new ADR explicitly approving it" (ADR-0001, line 31). [ADR-0005](0005-learning-records-and-ai-provider-chain.md) repeats that no database is introduced.

A PostgreSQL mode was added anyway, without an ADR. It is switched on by `DATABASE_URL` (`isDbConfigured()` in `lib/db/index.ts`), has a schema in `lib/db/schema.ts`, and is now managed by drizzle migrations (`drizzle/`, `docs/DATABASE.md`). In that mode the app reads the schedule from the database first (`readSchedule` in `lib/sheets/client.ts`) and pushes some edits from the database back to the spreadsheet. The repository rule "Do not introduce a database without a corresponding ADR" (AGENTS.md, line 44) is therefore currently violated, and the rules for keeping the two stores consistent are implicit and differ per route.

This ADR approves the database in a deliberately narrow role and defines how rows are matched and how conflicts are handled. It does not change code.

### Current behavior (verified against the code on 2026-10-03)

Every write below uses the Google Sheets values API with `valueInputOption=USER_ENTERED`: `updateSheetRange` (`lib/sheets/extractor.ts`, lines 559 and 562) and `batchUpdateSheetRanges` (`lib/sheets/extractor.ts`, line 656). User text that starts with `=`, `+`, `-` or `@` is therefore parsed as a formula by Sheets. None of the writers below reads the target cells before writing.

**Schedule sync, `POST /api/schedule/sync`** (`app/api/schedule/sync/route.ts`):
- Source rows are the request body, else `activities` ordered by `row_number` when the database is configured, else the catalog (`OFFICIAL_SCHEDULE_ACTIVITIES`). A database read error falls back to the catalog with only a `console.warn`.
- Matching is by `rowNumber` only. `groupScheduleActivitiesIntoChunks` (`lib/schedule-catalog.ts`, line 951) sorts by `rowNumber`, groups contiguous rows, and emits one `'Schedule'!G{start}:L{end}` range per chunk (duration, start, end, progress, materials link, notes).
- It never checks that the label columns of the target sheet row (the catalog columns left of G) match the activity it is writing. It does not read the sheet at all.
- Empty database values are written as empty strings, so a chunk write clears any cell in G:L that the database holds as empty, including cells a person filled in by hand.
- If `batchUpdateSheetRanges` fails, the route retries each chunk with `updateSheetRange`, so a failure can leave some chunks written and others not.

**Diary sync, `POST /api/diary/sync`** (`app/api/diary/sync/route.ts`):
- Matching is by the catalog `rowNumber` of `OFFICIAL_DIARY_TOPICS`. Values come from the catalog defaults, overlaid by `diary_entries` (when the database is configured), overlaid by `body.entries`.
- It writes one block, `'Onboarding Diary'!G2:H{maxRow}` (`maxRow` defaults to 25, or 29 for scope `all`), in a single `updateSheetRange` call. It does not check the label columns of the sheet and does not read the sheet.
- A fail-closed check in the same file makes it fail closed with HTTP 409 and zero Sheets calls when `values.length !== maxRow - 1`, when topic row numbers are not `2..maxRow` in order, or when any row has an empty (trimmed) learned or notes value.
- Each overlay uses `e.learned || existing.learned` and `e.notes || existing.notes`. An empty value in the database or in the request therefore never replaces a non-empty catalog default or earlier value, so a user cannot intentionally clear a cell through this route.
- The fail-closed check only guards against blanks. It does not detect that a person edited G or H since the app last wrote, so the whole block is overwritten.

**Single-cell and row updates, `POST /api/sheets/update-cell`** (`app/api/sheets/update-cell/route.ts`):
- Schedule matches by `row_number`: in database mode `db.update(schema.activities)...where(rowNumber = row)` (lines 132-147), then the sheet range `'Schedule'!G{row}:L{row}` (lines 152-163). In database mode the row number is not range-checked, the number of matched database rows is not checked, and `materialsLink` is written to the sheet but is not in the database `.set(...)`. In non-DB mode the row must be 2..200 (lines 375-378). Absent `startTime`, `endTime`, `materialsLink` and `notes` are written to the sheet as `''`.
- Diary matches by `row_number` (id `entry-${row}`, `ON CONFLICT` on `row_number`, lines 330-346) and writes `'Onboarding Diary'!G{row}:H{row}` with `body.learned ?? ''` and `body.notes ?? ''` (lines 353-355, and 512-514 in non-DB mode). A request that sends only one of the two fields clears the other cell in the sheet.
- Feedback matches by a `row-${n}` session id (line 255, with the database id `fb-row-${n}`) and writes `'Feedback Sheet'!A{row}:M{row}` or `'Feedback'!A{row}:M{row}` (lines 230, 305, 474). The first three values of that row come from `formatFeedbackRowValues` (`lib/feedback.ts`, line 554): date, PIC and topic. Columns A to C are label columns in the sheet and are overwritten. In the non-DB branch, `body.values[0]` replaces the generated row wholesale (lines 457-458). The non-DB row range is 3..50 (lines 450-454).
- Non-DB mode also accepts an arbitrary caller-supplied `range` with `values` (lines 525-532) and a single `value` with an arbitrary `range`, defaulting to `'Onboarding Diary'!H15` (lines 536-537). Any authenticated session can write any range of the configured spreadsheet through these two branches.

**Session writes, `writeSession`** (`lib/sheets/client.ts`, line 85, called from `app/api/session/route.ts` line 20 and `app/api/session/retry/route.ts` line 18):
- In database mode it matches by `activities.id` (`where id = activityId`), sets `actual_start`, `actual_end`, `duration_minutes` and `progress = 'Done'`, and inserts a `session_logs` row. It does not write to the spreadsheet. Without a database it posts to the `SHEETS_WRITE_URL` proxy.
- The other routes above match activities by `row_number`, so the same activity is addressed by two different keys.

**JSON-to-database scripts** (`scripts/sync-schedule-to-remote-db.ts`, `scripts/sync-diary-to-remote-db.ts`, planning in `scripts/lib/sync-schedule.ts`, `scripts/lib/sync-diary.ts`, shared flags in `scripts/lib/sync-common.ts`):
- Schedule rows are matched by id `sched-row-${rowNumber}`. Diary topics are matched by id `row-${rowNumber}` and `diary_entries` by `row_number` (id `entry-${rowNumber}`, `ON CONFLICT (row_number)`).
- They run as a dry run by default and write only with `--apply`. Rejected rows are reported with their file position and row number.
- Protected working fields (`duration_minutes`, `start_time`, `end_time`, `progress`, `materials_link`, `notes` on activities; `learned`, `notes` on diary entries) abort the run on a conflict unless `--force` is given. `actual_start`, `actual_end` and `created_at` are never written (header of `scripts/lib/sync-schedule.ts`).
- Pruning is opt-in (`--prune`), refuses an empty file, never deletes an activity referenced by `session_logs.activity_id`, and leaves diary entries that contain text alone unless `--force-prune` is given (`scripts/lib/sync-schedule.ts`, `scripts/lib/sync-diary.ts`).
- These scripts write to the database only. They never write to the spreadsheet.

### Summary of the gap

The database holds edits the spreadsheet does not (timer data, notes, learnings), and the app pushes database values into the spreadsheet by row number with whole-range writes and no read-before-write. A person editing the sheet directly, which ADR-0001 explicitly wants to keep working, can be silently overwritten, and the database can silently overwrite the sheet with stale or empty values. The routes also disagree on the key (`id` versus `row_number`) and on which cells they own.

---

## Decision

**1. This ADR proposes approving the database as a single-user working copy.** It is a working store for one onboarding employee: it holds session timing, notes and staged edits (as the current code does). It is not a second source of truth and does not enable multi-user use. ADR-0001's single-user assumption and its revisit conditions still apply.

**2. The spreadsheet remains the source of truth.** When the database and the sheet disagree and the sheet cell was changed by a person, the sheet wins unless the user explicitly chooses otherwise.

**3. Database-to-sheet writes touch only mapped cells.** They never write label columns (for example the catalog columns of Schedule, columns A to C of Feedback, and the topic label columns of Onboarding Diary), and never write a wholesale block or range wider than the cells that changed. Each target cell is addressed individually, not as part of a contiguous block.

**4. Rows are matched by a stable id and verified before writing.** The write path resolves the sheet row for a database row, reads that row's label column (or columns) from the sheet, and compares it to the label stored in the database row. A missing row, a duplicate label, or a mismatch fails closed with zero writes for that row. Row numbers alone are never trusted.

**5. A cell a person edited since the app's last write is never overwritten.** Before each write, the app reads the cell and compares it with the value it last wrote. If they differ, the write is a conflict. This needs a per-row sheet-sync marker (the value last written and when), which does not exist today and requires a future migration. Until that marker exists, decision 5 is not enforceable and the bulk sync routes must be treated as unsafe for sheets people also edit.

**6. Conflicts are surfaced to the user.** A conflict is reported with the sheet name, cell, the value in the sheet, and the value the app wanted to write, and the user chooses per conflict: keep the sheet value or overwrite. Nothing is overwritten implicitly and nothing is dropped silently. Intentional clearing of a cell is allowed when the user chooses it, and is distinct from "empty because never filled".

**7. User-typed text is written as text.** Learned, notes and other free text must not be parsed as a formula by Sheets (see the follow-up on `valueInputOption`).

**8. JSON-to-database scripts never clobber app edits without `--force`.** The existing behavior (dry run by default, protected working fields, guarded prune, never touching `actual_start`, `actual_end` or `created_at`) is adopted as the rule. `--force` overwrites only protected-field conflicts. It never overrides the `session_logs` prune blocker.

**9. Schema changes go through managed migrations.** Schema changes use `drizzle/` migrations as described in `docs/DATABASE.md`. Ad-hoc DDL in scripts is not allowed.

### Amendment to ADR-0001

If accepted, this ADR amends ADR-0001 only as follows: a single-user database working copy is approved under the rules above; the spreadsheet stays the source of truth; the "Revisit When" conditions of ADR-0001 are unchanged. ADR-0001 stays Accepted and carries a pointer ("Amendment proposed in ADR-0006"). This ADR does not supersede it.

---

## Consequences

### Positive

- The undocumented database mode gets an explicit scope, and AGENTS.md's database rule can be satisfied once this ADR is accepted.
- People can keep editing the spreadsheet by hand without the app silently overwriting them.
- One matching rule (stable id plus label verification) replaces three (`row_number`, `row-${n}`, `activities.id`).
- Re-running the JSON-to-database scripts cannot destroy edits made in the app.

### Negative

- Per-row read-compare-write needs at least one extra Sheets read per sync and is slower than the current single block write.
- The sheet-sync marker needs a schema migration, and columns or a table in the database to store it.
- Label verification fails closed, so a renamed or reordered sheet row blocks sync for that row until someone fixes it.
- The decision cannot be fully enforced until the follow-ups are done. Until then the current routes behave as described under Context.

### Follow-ups (mirrored in `docs/TODO.md`)

1. Add sheet-sync marker columns (last value written and when, per synced row or cell) through a drizzle migration.
2. Replace the whole-block and chunk writes in `/api/diary/sync` and `/api/schedule/sync` with per-row read-compare-write: verify the label column, compare with the marker, skip and report conflicts, and allow intentional clearing (today `e.learned || existing` cannot clear a cell).
3. Remove the arbitrary `range` and `values` and single-`value` passthrough in `/api/sheets/update-cell`, and restrict feedback writes to columns D to M so columns A to C are never overwritten.
4. Unify activity matching on `activities.id` across `update-cell`, the sync routes and `writeSession`.
5. Write user-typed learned and notes with `valueInputOption=RAW` instead of `USER_ENTERED` (`lib/sheets/extractor.ts`, lines 559, 562 and 656), or escape leading `=`, `+`, `-`, `@`, to remove the formula-injection risk. Keep formulas out of mapped cells.
6. Fix the recorded bugs, each tracked separately in `docs/TODO.md`: logout absolute redirect; login `returnTo` check misses `/\evil.example` (`app/api/auth/login/route.ts`, line 35); `redirect_uri` passthrough (`app/api/auth/login/route.ts`, line 13); trusted `x-forwarded-host` (`lib/auth/config.ts`, line 38); `writeDiary` is a no-op in database mode (`lib/sheets/client.ts`, lines 132-135); `/api/diary` returns 400 on a database failure (`app/api/diary/route.ts`, lines 98-106); `/api/sheets/extract` fabricates an identity in database mode; `/api/diary/sync` writes a whole block with no read-before-write.

### Mitigations

- Until the follow-ups land, run the bulk sync routes only against a copy of the workbook, and keep the dry-run-by-default behavior of the scripts.
- Unit-test label verification, marker comparison and conflict reporting against fixtures that mirror the real workbook structure.

---

## Revisit When

- More than one employee needs to use the app, or the database must be shared. That requires a new ADR superseding ADR-0001 rather than extending this one.
- The sheet-sync marker proves too coarse (for example cell-level conflicts need history).
- The spreadsheet structure changes enough that label verification is no longer reliable.
- Write-through to Sheets is dropped, which would make the database the source of truth and require a new ADR.
