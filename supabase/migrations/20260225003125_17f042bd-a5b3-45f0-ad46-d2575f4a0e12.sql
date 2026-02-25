
-- Fix all public read policies to be PERMISSIVE instead of RESTRICTIVE

DROP POLICY IF EXISTS "Public read divisions" ON public.divisions;
CREATE POLICY "Public read divisions" ON public.divisions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read clubs" ON public.clubs;
CREATE POLICY "Public read clubs" ON public.clubs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read teams" ON public.teams;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read matches" ON public.matches;
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read match_teams" ON public.match_teams;
CREATE POLICY "Public read match_teams" ON public.match_teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read goal_events" ON public.goal_events;
CREATE POLICY "Public read goal_events" ON public.goal_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read penalties" ON public.penalties;
CREATE POLICY "Public read penalties" ON public.penalties FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read standings" ON public.standings_aggregate;
CREATE POLICY "Public read standings" ON public.standings_aggregate FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read fair_play" ON public.fair_play_aggregate;
CREATE POLICY "Public read fair_play" ON public.fair_play_aggregate FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read brackets" ON public.brackets;
CREATE POLICY "Public read brackets" ON public.brackets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read playoff_bracket" ON public.playoff_bracket;
CREATE POLICY "Public read playoff_bracket" ON public.playoff_bracket FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read playoff_slots" ON public.playoff_slots;
CREATE POLICY "Public read playoff_slots" ON public.playoff_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read rosters" ON public.rosters;
CREATE POLICY "Public read rosters" ON public.rosters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read match_import" ON public.match_import;
CREATE POLICY "Public read match_import" ON public.match_import FOR SELECT USING (true);
