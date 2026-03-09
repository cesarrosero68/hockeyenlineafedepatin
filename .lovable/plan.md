

# Plan: Fix Schedule CSV Upload

## Root Cause Analysis

The schedule CSV upload has **3 bugs** preventing it from working:

### Bug 1: Phase enum case mismatch
The CSV uses uppercase values (`REGULAR`, `PLAYOFF`, `FINAL`, `THIRD_PLACE`) but the database enum `match_phase` only accepts lowercase (`regular`, `playoff`, `final`, `third_place`). The code passes the raw value without lowercasing, causing DB insert failures.

### Bug 2: Playoff placeholder teams not handled
Playoff/final/third-place matches use placeholder names like `SEED 1`, `WINNER SUB16-33`, `LOSER SUB14-22` instead of real team names. The code requires both teams to exist in the DB, so all these rows fail validation.

### Bug 3: Literal "NULL" string in ronda
The CSV has `NULL` as a text value for playoff rounds. `parseInt("NULL")` returns `NaN`, which correctly becomes `null` via `|| null`, so this one actually works. No fix needed.

## Changes

### File: `src/pages/admin/AdminUpload.tsx`

1. **Lowercase the phase value** before inserting into DB:
   - `fase.toLowerCase()` so `REGULAR` → `regular`, `PLAYOFF` → `playoff`, etc.

2. **Allow playoff matches with placeholder teams**:
   - Detect if a team name looks like a placeholder (starts with `SEED`, `WINNER`, `LOSER`, `WIN `)
   - If both teams are placeholders → create match with no `match_teams` entries (TBD match)
   - If one team is real and one is placeholder → create match with only the real team's `match_teams` entry
   - This allows the full schedule (regular + playoffs) to be loaded from a single CSV

3. **Insert the 148 matches from the uploaded CSV**, covering all divisions and categories including playoff brackets.

### Timezone
The CSV dates like `2026-02-14T07:00` are Bogota time. The existing code already appends `-05:00` offset correctly (line 126), so timezone handling is correct.

### Technical Details
- Phase enum values: `regular`, `playoff`, `final`, `third_place`, `ranking`
- Placeholder detection regex: `/^(seed|winner|loser|win\s)/i`
- No database migration needed

