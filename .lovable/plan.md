

# Fix RLS Policies: RESTRICTIVE → PERMISSIVE

## Problem
Every RLS policy across all tables is set to RESTRICTIVE. In PostgreSQL, if there are zero PERMISSIVE policies on a table, access is **denied by default** — RESTRICTIVE policies can only narrow access, never grant it. This is why all queries return empty results and the UI shows infinite spinners.

## Solution
One database migration that drops all existing policies and recreates them as PERMISSIVE. This affects 16 tables. The policies themselves (expressions, roles, commands) stay identical — only the permissive/restrictive flag changes.

Additionally, duplicate/redundant policies will be consolidated. Many tables have 3-4 SELECT policies doing the same thing (e.g., `Public read X`, `public read X`, `public_read_X`). Each table will get exactly:
- **1 public SELECT** policy (roles: `anon, authenticated`, USING `true`) — for public data
- **1 admin/editor ALL** policy (roles: `authenticated`) — for mutations

## Tables affected
`divisions`, `categories`, `clubs`, `teams`, `matches`, `match_teams`, `goal_events`, `penalties`, `rosters`, `standings_aggregate`, `fair_play_aggregate`, `players`, `brackets`, `playoff_bracket`, `playoff_slots`, `match_import`, `audit_logs`, `user_roles`

## No code changes needed
The frontend queries are correct — they just get empty results because RLS blocks them. Once policies are permissive, existing code will work.

