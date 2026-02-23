
-- 1. Fix player DOB public exposure: restrict table, create safe view
DROP POLICY IF EXISTS "Public read players" ON public.players;
CREATE POLICY "Authenticated read players" ON public.players
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE OR REPLACE VIEW public.players_public AS
  SELECT id, first_name, last_name, jersey_number, created_at
  FROM public.players;

GRANT SELECT ON public.players_public TO anon, authenticated;

-- 2. Fix function search path on recalc_player_stats
CREATE OR REPLACE FUNCTION public.recalc_player_stats()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW player_stats_aggregate;
END;
$function$;

-- 3. Fix function search path on generate_playoffs
CREATE OR REPLACE FUNCTION public.generate_playoffs(
  p_division_name text,
  p_category_name text,
  p_start_date timestamp with time zone,
  p_interval_minutes integer DEFAULT 90
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
DECLARE
    v_division_id UUID;
    v_category_id UUID;
    teams_ranked UUID[];
    t1 UUID; t2 UUID; t3 UUID; t4 UUID;
    t5 UUID; t6 UUID; t7 UUID; t8 UUID;
    match_time TIMESTAMPTZ := p_start_date;
BEGIN
    SELECT id INTO v_division_id FROM divisions WHERE name = p_division_name;
    SELECT id INTO v_category_id FROM categories WHERE name = p_category_name AND division_id = v_division_id;

    SELECT array_agg(team_id ORDER BY rank_position)
    INTO teams_ranked
    FROM standings_aggregate
    WHERE division_id = v_division_id AND category_id = v_category_id;

    t1 := teams_ranked[1]; t2 := teams_ranked[2];
    t3 := teams_ranked[3]; t4 := teams_ranked[4];
    t5 := teams_ranked[5]; t6 := teams_ranked[6];
    t7 := teams_ranked[7]; t8 := teams_ranked[8];

    IF p_category_name IN ('Sub-8','Sub-12') THEN
        INSERT INTO matches (id, division_id, category_id, home_team_id, away_team_id, phase, round, match_datetime, status)
        VALUES (gen_random_uuid(), v_division_id, v_category_id, t1, t2, 'FINAL', 1, match_time, 'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches (id, division_id, category_id, home_team_id, away_team_id, phase, round, match_datetime, status)
        VALUES (gen_random_uuid(), v_division_id, v_category_id, t3, t4, 'THIRD_PLACE', 1, match_time, 'scheduled');

    ELSIF p_category_name IN ('Sub-10','Sub-14','Juvenil') THEN
        INSERT INTO matches (id, division_id, category_id, home_team_id, away_team_id, phase, round, match_datetime, status)
        VALUES (gen_random_uuid(), v_division_id, v_category_id, t4, t5, 'PLAYIN', 1, match_time, 'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches (id, division_id, category_id, home_team_id, away_team_id, phase, round, match_datetime, status)
        VALUES (gen_random_uuid(), v_division_id, v_category_id, t1, NULL, 'SEMIFINAL', 1, match_time, 'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches (id, division_id, category_id, home_team_id, away_team_id, phase, round, match_datetime, status)
        VALUES (gen_random_uuid(), v_division_id, v_category_id, t2, t3, 'SEMIFINAL', 2, match_time, 'scheduled');

    ELSIF p_category_name = 'Sub-16 Mixto' THEN
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, t1, t8, 'QUARTERFINAL',1,match_time,'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, t2, t7, 'QUARTERFINAL',2,match_time,'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, t3, t6, 'QUARTERFINAL',3,match_time,'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, t4, t5, 'QUARTERFINAL',4,match_time,'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, NULL, NULL, 'SEMIFINAL',1,match_time,'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, NULL, NULL, 'SEMIFINAL',2,match_time,'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, NULL, NULL, 'PLACEMENT',1,match_time,'scheduled');
        match_time := match_time + (p_interval_minutes || ' minutes')::interval;
        INSERT INTO matches VALUES (gen_random_uuid(), v_division_id, v_category_id, NULL, NULL, 'PLACEMENT',2,match_time,'scheduled');
    END IF;
END;
$function$;

-- 4. Revoke anon direct access to materialized view
REVOKE SELECT ON public.player_stats_aggregate FROM anon;
