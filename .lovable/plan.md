

# Plan: Admin Match Management — Create, Edit, Delete + Calendar Drag & Drop

## Overview

Extend `AdminMatches.tsx` with full CRUD capabilities and a calendar-based drag-and-drop scheduling view. No database schema changes needed — all tables already support the required operations via existing RLS policies.

## Changes

### 1. Database: Add CASCADE delete rule for match-related tables

**Migration** to add `ON DELETE CASCADE` to `goal_events`, `penalties`, and `match_teams` foreign keys referencing `matches.id`. This ensures deleting a match automatically cleans up all related records (no orphans). Also create a DB function `delete_match_and_recalc(p_match_id UUID)` that:
- Reads the match's `category_id` before deletion
- Deletes the match (cascades clean up events)
- Calls `recalc_standings_for_category`, `recalc_fair_play_for_category`, and `REFRESH MATERIALIZED VIEW player_stats_aggregate`

### 2. New Component: `CreateMatchDialog.tsx`

A dialog form with fields:
- Division (select) → filters categories
- Category (select, filtered by division)
- Phase (select: regular/playoff/final/third_place/ranking)
- Home team + Away team (selects, filtered by category)
- Date + Time (datetime-local input, Bogota timezone)
- Venue (text)
- Round number (number, optional)
- Status (select: scheduled/in_progress/closed)
- Notes (textarea, optional)

On submit:
1. Insert into `matches` table
2. Insert two rows into `match_teams` (home/away with score_regular=0)
3. Invalidate queries

### 3. New Component: `EditMatchDialog.tsx`

Same form as create, pre-populated with existing match data. On submit:
- Update `matches` row
- If teams changed: delete old `match_teams`, insert new ones (only if match has no goals/penalties)
- Invalidate queries

### 4. Delete Match

Add delete button on each match card (with confirmation AlertDialog). Calls the `delete_match_and_recalc` DB function via `supabase.rpc()`. Only available for non-locked matches.

### 5. Refactor `AdminMatches.tsx`

- Add "Crear Partido" button at the top
- Add Edit and Delete buttons per match card
- Integrate CreateMatchDialog and EditMatchDialog
- Add a toggle between "Lista" (current list view) and "Calendario" (new calendar view)

### 6. New Component: `AdminScheduleCalendar.tsx`

Calendar view for drag-and-drop scheduling:
- Monthly grid showing matches grouped by day
- Each match displayed as a draggable card (using native HTML drag-and-drop API — no external library needed)
- Drop targets on each calendar day cell
- On drop: update `match_date` preserving the original time, call `updateDateMutation`
- Division/status filters shared with list view
- Uses `toBogotaDate` for correct timezone display

Implementation uses `onDragStart`/`onDragOver`/`onDrop` native events (no complex DnD library), keeping it simple and reliable.

### 7. Statistics Recalculation

The existing trigger system (`on_match_status_change`) already handles recalculation when matches are closed. For delete, the new `delete_match_and_recalc` function handles it. For create/edit of match metadata (date, venue, teams), no recalculation is needed since stats only derive from closed/locked matches.

### Files to Create
- `src/pages/admin/CreateMatchDialog.tsx`
- `src/pages/admin/EditMatchDialog.tsx`
- `src/pages/admin/AdminScheduleCalendar.tsx`

### Files to Edit
- `src/pages/admin/AdminMatches.tsx` — add create/edit/delete buttons, calendar toggle

### Migration
- Add CASCADE deletes on FK constraints
- Create `delete_match_and_recalc` function

