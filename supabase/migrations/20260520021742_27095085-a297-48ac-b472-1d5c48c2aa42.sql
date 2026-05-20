-- 1) Add 'semifinal' to match_phase enum
ALTER TYPE match_phase ADD VALUE IF NOT EXISTS 'semifinal';

-- 2) Trigger function: when a playoff match closes/locks, assign winner to next semifinal away slot
CREATE OR REPLACE FUNCTION public.trg_playoff_winner_to_semifinal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_team_id uuid;
  v_target_match_id uuid;
BEGIN
  IF NEW.phase <> 'playoff'::match_phase THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('closed'::match_status, 'locked'::match_status) THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine winner team for this playoff match
  SELECT team_id INTO v_winner_team_id
  FROM match_teams
  WHERE match_id = NEW.id AND is_winner = true
  LIMIT 1;

  IF v_winner_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find next semifinal match in same category with empty away slot
  SELECT m.id INTO v_target_match_id
  FROM matches m
  WHERE m.category_id = NEW.category_id
    AND m.phase = 'semifinal'::match_phase
    AND NOT EXISTS (
      SELECT 1 FROM match_teams mt
      WHERE mt.match_id = m.id AND mt.side = 'away'
    )
  ORDER BY COALESCE(m.match_date, m.created_at) ASC
  LIMIT 1;

  IF v_target_match_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO match_teams (match_id, team_id, side, score_regular)
  VALUES (v_target_match_id, v_winner_team_id, 'away', 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_playoff_winner_to_semifinal ON public.matches;
CREATE TRIGGER trg_playoff_winner_to_semifinal
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_playoff_winner_to_semifinal();