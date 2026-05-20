CREATE OR REPLACE FUNCTION public.trg_playoff_winner_to_semifinal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_winner_team_id uuid;
  v_loser_team_id uuid;
  v_target_match_id uuid;
  v_has_home boolean;
  v_has_away boolean;
BEGIN
  IF NEW.phase NOT IN ('playoff'::match_phase, 'semifinal'::match_phase) THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('closed'::match_status, 'locked'::match_status) THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT team_id INTO v_winner_team_id
  FROM match_teams
  WHERE match_id = NEW.id AND is_winner = true
  LIMIT 1;

  IF v_winner_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT team_id INTO v_loser_team_id
  FROM match_teams
  WHERE match_id = NEW.id AND team_id <> v_winner_team_id
  LIMIT 1;

  IF NEW.phase = 'playoff'::match_phase THEN
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

    IF v_target_match_id IS NOT NULL THEN
      INSERT INTO match_teams (match_id, team_id, side, score_regular)
      VALUES (v_target_match_id, v_winner_team_id, 'away', 0);
    END IF;

    RETURN NEW;
  END IF;

  -- semifinal: winner -> final, loser -> third_place
  SELECT m.id INTO v_target_match_id
  FROM matches m
  WHERE m.category_id = NEW.category_id
    AND m.phase = 'final'::match_phase
  ORDER BY COALESCE(m.match_date, m.created_at) ASC
  LIMIT 1;

  IF v_target_match_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM match_teams WHERE match_id = v_target_match_id AND side = 'home'),
           EXISTS(SELECT 1 FROM match_teams WHERE match_id = v_target_match_id AND side = 'away')
      INTO v_has_home, v_has_away;
    IF NOT v_has_home THEN
      INSERT INTO match_teams (match_id, team_id, side, score_regular)
      VALUES (v_target_match_id, v_winner_team_id, 'home', 0);
    ELSIF NOT v_has_away THEN
      INSERT INTO match_teams (match_id, team_id, side, score_regular)
      VALUES (v_target_match_id, v_winner_team_id, 'away', 0);
    END IF;
  END IF;

  IF v_loser_team_id IS NOT NULL THEN
    SELECT m.id INTO v_target_match_id
    FROM matches m
    WHERE m.category_id = NEW.category_id
      AND m.phase = 'third_place'::match_phase
    ORDER BY COALESCE(m.match_date, m.created_at) ASC
    LIMIT 1;

    IF v_target_match_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM match_teams WHERE match_id = v_target_match_id AND side = 'home'),
             EXISTS(SELECT 1 FROM match_teams WHERE match_id = v_target_match_id AND side = 'away')
        INTO v_has_home, v_has_away;
      IF NOT v_has_home THEN
        INSERT INTO match_teams (match_id, team_id, side, score_regular)
        VALUES (v_target_match_id, v_loser_team_id, 'home', 0);
      ELSIF NOT v_has_away THEN
        INSERT INTO match_teams (match_id, team_id, side, score_regular)
        VALUES (v_target_match_id, v_loser_team_id, 'away', 0);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_playoff_winner_to_semifinal ON public.matches;
CREATE TRIGGER trg_playoff_winner_to_semifinal
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_playoff_winner_to_semifinal();