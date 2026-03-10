
-- Drop existing FK constraints and re-add with CASCADE
ALTER TABLE public.goal_events DROP CONSTRAINT IF EXISTS goal_events_match_id_fkey;
ALTER TABLE public.goal_events ADD CONSTRAINT goal_events_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

ALTER TABLE public.penalties DROP CONSTRAINT IF EXISTS penalties_match_id_fkey;
ALTER TABLE public.penalties ADD CONSTRAINT penalties_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

ALTER TABLE public.match_teams DROP CONSTRAINT IF EXISTS match_teams_match_id_fkey;
ALTER TABLE public.match_teams ADD CONSTRAINT match_teams_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

-- Function to delete a match and recalculate stats
CREATE OR REPLACE FUNCTION public.delete_match_and_recalc(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  SELECT category_id INTO v_category_id FROM matches WHERE id = p_match_id;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;

  DELETE FROM matches WHERE id = p_match_id;

  PERFORM recalc_standings_for_category(v_category_id);
  PERFORM recalc_fair_play_for_category(v_category_id);
  REFRESH MATERIALIZED VIEW player_stats_aggregate;
END;
$$;
