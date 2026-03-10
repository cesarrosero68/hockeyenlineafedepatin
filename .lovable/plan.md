

# Plan: Fix Admin Panel Freezing and Tab-Switch Disconnection

## Problem Root Causes

1. **Realtime channel lacks reconnection logic.** When the browser throttles the tab (background), the websocket silently disconnects. On return, no reconnection occurs — the channel stays dead, and no query invalidations fire.

2. **`refetchOnWindowFocus: false` globally.** When the admin returns to the tab, React Query does NOT refetch stale data. The MatchLivePanel shows stale match/roster data, and buttons that depend on this data (e.g., team selectors empty → goal button stays disabled) remain frozen.

3. **No visibility-change handler.** There is no mechanism to detect tab return and force a reconnection or data refresh for the active panel.

## Changes

### 1. Edit `src/hooks/use-realtime.ts` — Add reconnection on visibility change

- Listen to `document.visibilitychange` events
- When the tab becomes visible again, remove the old channel and create a fresh one
- This ensures the websocket subscription is always alive when the admin is actively using the app
- Keep the 250ms debounce logic intact

### 2. Edit `src/pages/admin/MatchLivePanel.tsx` — Refetch on tab return + reduce stale sensitivity

- Add a `useEffect` that listens to `visibilitychange` and calls `queryClient.invalidateQueries` for the panel's active queries (`live-match-detail`, `live-match-rosters`, `match-goals`, `match-penalties`) when the tab regains focus
- This ensures when the admin alt-tabs back, the panel immediately refreshes its data so team/player selectors repopulate and buttons enable correctly
- Lower `staleTime` on `live-match-detail` from 30s to 10s so it's more responsive during active scoring

### 3. Edit `src/App.tsx` — Enable `refetchOnReconnect`

- Add `refetchOnReconnect: true` to the QueryClient default options (it's true by default, but being explicit ensures it's not accidentally overridden)
- Keep `refetchOnWindowFocus: false` globally to avoid unnecessary fetches on public pages — the targeted visibility handler in MatchLivePanel handles the admin case specifically

## Files to Edit
- `src/hooks/use-realtime.ts`
- `src/pages/admin/MatchLivePanel.tsx`
- `src/App.tsx`

## No database changes required.

