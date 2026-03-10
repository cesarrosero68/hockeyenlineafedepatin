
-- =============================================
-- FIX 1: Recreate players_public WITHOUT security_invoker
-- so public users can read player names
-- =============================================
DROP VIEW IF EXISTS public.player_stats_view;
DROP VIEW IF EXISTS public.players_public;

CREATE VIEW public.players_public AS
  SELECT id, first_name, last_name, jersey_number, created_at
  FROM public.players;

-- Recreate player_stats_view (depends on player_stats_aggregate matview)
CREATE VIEW public.player_stats_view AS
  SELECT player_id, goles, asistencias, puntos
  FROM public.player_stats_aggregate;

-- =============================================
-- FIX 2: Create standings recalculation function
-- =============================================
CREATE OR REPLACE FUNCTION public.recalc_standings_for_category(p_category_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM standings_aggregate WHERE category_id = p_category_id;

  INSERT INTO standings_aggregate (category_id, team_id, played, wins, draws, losses, goals_for, goals_against, goal_diff, points, rank)
  SELECT
    p_category_id,
    mt.team_id,
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE mt.score_regular > opp.score_regular)::int,
    COUNT(*) FILTER (WHERE mt.score_regular = opp.score_regular)::int,
    COUNT(*) FILTER (WHERE mt.score_regular < opp.score_regular)::int,
    COALESCE(SUM(mt.score_regular), 0)::int,
    COALESCE(SUM(opp.score_regular), 0)::int,
    COALESCE(SUM(mt.score_regular - opp.score_regular), 0)::int,
    (COUNT(*) FILTER (WHERE mt.score_regular > opp.score_regular) * 3 +
     COUNT(*) FILTER (WHERE mt.score_regular = opp.score_regular))::int,
    NULL
  FROM match_teams mt
  JOIN matches m ON m.id = mt.match_id
  JOIN match_teams opp ON opp.match_id = mt.match_id AND opp.side <> mt.side
  WHERE m.category_id = p_category_id
    AND m.status IN ('closed', 'locked')
    AND m.phase = 'regular'
  GROUP BY mt.team_id;

  -- Update ranks
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC, goal_diff DESC, goals_for DESC) AS rn
    FROM standings_aggregate
    WHERE category_id = p_category_id
  )
  UPDATE standings_aggregate sa SET rank = ranked.rn::int
  FROM ranked WHERE sa.id = ranked.id;
END;
$$;

-- =============================================
-- FIX 3: Create fair play recalculation function
-- =============================================
CREATE OR REPLACE FUNCTION public.recalc_fair_play_for_category(p_category_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM fair_play_aggregate WHERE category_id = p_category_id;

  INSERT INTO fair_play_aggregate (category_id, team_id, total_penalties, total_penalty_minutes)
  SELECT
    p_category_id,
    pen.team_id,
    COUNT(*)::int,
    COALESCE(SUM(pen.penalty_minutes), 0)::int
  FROM penalties pen
  JOIN matches m ON m.id = pen.match_id
  WHERE m.category_id = p_category_id
  GROUP BY pen.team_id;
END;
$$;

-- =============================================
-- FIX 4: Trigger on match status change → recalc standings + fair play + player stats
-- =============================================
CREATE OR REPLACE FUNCTION public.trg_match_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('closed', 'locked') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM recalc_standings_for_category(NEW.category_id);
    PERFORM recalc_fair_play_for_category(NEW.category_id);
    REFRESH MATERIALIZED VIEW player_stats_aggregate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_status_change
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_match_status_change();

-- =============================================
-- FIX 5: Trigger on goal_events → refresh player stats matview
-- =============================================
CREATE OR REPLACE FUNCTION public.trg_goal_event_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW player_stats_aggregate;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_goal_event_changed
AFTER INSERT OR UPDATE OR DELETE ON public.goal_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_goal_event_changed();

-- =============================================
-- FIX 6: Trigger on penalties → recalc fair play
-- =============================================
CREATE OR REPLACE FUNCTION public.trg_penalty_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match_id UUID;
  v_category_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_match_id := OLD.match_id;
  ELSE
    v_match_id := NEW.match_id;
  END IF;
  SELECT m.category_id INTO v_category_id FROM matches m WHERE m.id = v_match_id;
  IF v_category_id IS NOT NULL THEN
    PERFORM recalc_fair_play_for_category(v_category_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_penalty_changed
AFTER INSERT OR UPDATE OR DELETE ON public.penalties
FOR EACH ROW
EXECUTE FUNCTION public.trg_penalty_changed();

-- =============================================
-- FIX 7: Add indexes for common query patterns
-- =============================================
CREATE INDEX IF NOT EXISTS idx_match_teams_match_id ON public.match_teams(match_id);
CREATE INDEX IF NOT EXISTS idx_match_teams_team_id ON public.match_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_category_id ON public.matches(category_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_goal_events_match_id ON public.goal_events(match_id);
CREATE INDEX IF NOT EXISTS idx_goal_events_scorer ON public.goal_events(scorer_player_id);
CREATE INDEX IF NOT EXISTS idx_penalties_match_id ON public.penalties(match_id);
CREATE INDEX IF NOT EXISTS idx_rosters_team_id ON public.rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player_id ON public.rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_standings_category_id ON public.standings_aggregate(category_id);
CREATE INDEX IF NOT EXISTS idx_fair_play_category_id ON public.fair_play_aggregate(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_division_id ON public.categories(division_id);
CREATE INDEX IF NOT EXISTS idx_teams_category_id ON public.teams(category_id);
