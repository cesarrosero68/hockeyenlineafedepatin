

## Problem

The `Teams.tsx` page queries `rosters` joined to `players` via the foreign key. However, the `players` table has **no public SELECT policy** — only an `admin_editor_all_players` policy. Anonymous users get empty player data, so the fallback "Name Last Name" placeholder is shown.

A `players_public` view already exists with columns `id, first_name, last_name, jersey_number, created_at` — but Supabase foreign key joins only work on actual tables, not views.

## Solution

Change the roster query in `Teams.tsx` to:
1. Query `rosters` as before (has public SELECT policy)
2. Collect the `player_id` values from the roster results
3. Do a second query on `players_public` view filtered by those IDs
4. Merge player names into the roster data client-side

This avoids needing to change RLS on the `players` table (which intentionally restricts `date_of_birth` from public access).

## Changes

**File: `src/pages/Teams.tsx`** — Update the `TeamCard` component's data fetching:

- Replace the single query with two queries: one for `rosters` (without the players join), one for `players_public` filtered by the collected player IDs.
- Merge the results in the `useMemo` block to produce the display roster with real names.

No database changes needed — the `players_public` view and `rosters` public SELECT policy already exist.

