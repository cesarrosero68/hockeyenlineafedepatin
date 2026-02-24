-- Revoke direct API access to player_stats_aggregate table
-- The app accesses stats through player_stats_view, not directly
REVOKE ALL ON public.player_stats_aggregate FROM anon, authenticated;
