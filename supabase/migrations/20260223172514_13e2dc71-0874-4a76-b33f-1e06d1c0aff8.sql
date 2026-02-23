
-- Fix security definer view: set security_invoker
ALTER VIEW public.players_public SET (security_invoker = true);

-- Move materialized view out of public API by revoking from all API roles
REVOKE ALL ON public.player_stats_aggregate FROM anon, authenticated;

-- Create a regular view that wraps the materialized view for authenticated access
CREATE OR REPLACE VIEW public.player_stats_view AS
  SELECT * FROM public.player_stats_aggregate;

ALTER VIEW public.player_stats_view SET (security_invoker = true);
GRANT SELECT ON public.player_stats_view TO anon, authenticated;
