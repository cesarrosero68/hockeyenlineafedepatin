
CREATE OR REPLACE FUNCTION public._resolve_bracket_slot(
  p_match_id uuid,
  p_side text,
  p_token text,
  p_category_id uuid,
  p_division_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_seed int;
  v_num text;
  v_round int;
  v_kind text;
  v_src_match_id uuid;
  v_norm text;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN RETURN; END IF;

  -- skip if already assigned for this side
  IF EXISTS (SELECT 1 FROM match_teams WHERE match_id = p_match_id AND side = p_side) THEN
    RETURN;
  END IF;

  v_norm := upper(btrim(p_token));
  v_norm := regexp_replace(v_norm, '\s+', ' ', 'g');

  -- SEED N
  IF v_norm ~ '^SEED\s*\d+$' THEN
    v_seed := (regexp_match(v_norm, '(\d+)'))[1]::int;
    SELECT team_id INTO v_team_id
    FROM standings_aggregate
    WHERE category_id = p_category_id AND rank = v_seed
    LIMIT 1;

  -- WINNER/WIN/LOSER SUBxx-nn (con o sin espacios)
  ELSIF v_norm ~ '^(WINNER|WIN|LOSER)\s*SUB\s*\d+\s*-\s*\d+$' THEN
    v_kind := (regexp_match(v_norm, '^(WINNER|WIN|LOSER)'))[1];
    v_num := (regexp_match(v_norm, 'SUB\s*(\d+)'))[1];
    v_round := ((regexp_match(v_norm, '-\s*(\d+)$'))[1])::int;

    SELECT m.id INTO v_src_match_id
    FROM matches m
    JOIN categories c ON c.id = m.category_id
    WHERE c.division_id = p_division_id
      AND c.name ILIKE 'Sub-' || v_num || '%'
      AND m.round_number = v_round
      AND m.status IN ('closed'::match_status, 'locked'::match_status)
    ORDER BY m.match_date ASC NULLS LAST
    LIMIT 1;

    IF v_src_match_id IS NULL THEN RETURN; END IF;

    IF v_kind IN ('WINNER', 'WIN') THEN
      SELECT team_id INTO v_team_id
      FROM match_teams
      WHERE match_id = v_src_match_id AND is_winner IS TRUE
      LIMIT 1;
    ELSE
      SELECT team_id INTO v_team_id
      FROM match_teams
      WHERE match_id = v_src_match_id AND COALESCE(is_winner, false) = false
      LIMIT 1;
    END IF;
  END IF;

  IF v_team_id IS NULL THEN RETURN; END IF;

  INSERT INTO match_teams (match_id, team_id, side, score_regular)
  VALUES (p_match_id, v_team_id, p_side, 0)
  ON CONFLICT DO NOTHING;
END;
$$;


CREATE OR REPLACE FUNCTION public.trg_bracket_progression_from_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_local text;
  v_visit text;
BEGIN
  IF NEW.status NOT IN ('closed'::match_status, 'locked'::match_status) THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Skip regular phase matches (no progression rules)
  IF NEW.phase = 'regular'::match_phase THEN
    -- still continue: a regular match closing may unlock bracket slots downstream
    NULL;
  END IF;

  -- Iterate over all bracket matches still pending team assignments
  FOR r IN
    SELECT m.id, m.category_id, m.notes, c.division_id
    FROM matches m
    JOIN categories c ON c.id = m.category_id
    WHERE m.phase IN ('playoff'::match_phase, 'semifinal'::match_phase,
                      'final'::match_phase, 'third_place'::match_phase)
      AND m.notes IS NOT NULL
      AND btrim(m.notes) <> ''
      AND m.status NOT IN ('closed'::match_status, 'locked'::match_status)
  LOOP
    v_local := btrim(substring(r.notes from 'Local:\s*([^|]+?)(?:\s*\||\s*$)'));
    v_visit := btrim(substring(r.notes from 'Visitante:\s*(.+?)\s*$'));

    PERFORM public._resolve_bracket_slot(r.id, 'home', v_local, r.category_id, r.division_id);
    PERFORM public._resolve_bracket_slot(r.id, 'away', v_visit, r.category_id, r.division_id);
  END LOOP;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_bracket_progression_from_notes ON public.matches;
CREATE TRIGGER trg_bracket_progression_from_notes
AFTER UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_bracket_progression_from_notes();
