
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- divisions
DROP POLICY IF EXISTS "Admin manage divisions" ON public.divisions;
DROP POLICY IF EXISTS "Public read divisions" ON public.divisions;
CREATE POLICY "Public read divisions" ON public.divisions FOR SELECT USING (true);
CREATE POLICY "Admin manage divisions" ON public.divisions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- categories
DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- clubs
DROP POLICY IF EXISTS "Admin manage clubs" ON public.clubs;
DROP POLICY IF EXISTS "Public read clubs" ON public.clubs;
CREATE POLICY "Public read clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Admin manage clubs" ON public.clubs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- teams
DROP POLICY IF EXISTS "Admin manage teams" ON public.teams;
DROP POLICY IF EXISTS "Public read teams" ON public.teams;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Admin manage teams" ON public.teams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- matches
DROP POLICY IF EXISTS "Admin/Editor manage matches" ON public.matches;
DROP POLICY IF EXISTS "Public read matches" ON public.matches;
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage matches" ON public.matches FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- match_teams
DROP POLICY IF EXISTS "Admin/Editor manage match_teams" ON public.match_teams;
DROP POLICY IF EXISTS "Public read match_teams" ON public.match_teams;
CREATE POLICY "Public read match_teams" ON public.match_teams FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage match_teams" ON public.match_teams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- goal_events
DROP POLICY IF EXISTS "Admin/Editor manage goal_events" ON public.goal_events;
DROP POLICY IF EXISTS "Public read goal_events" ON public.goal_events;
CREATE POLICY "Public read goal_events" ON public.goal_events FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage goal_events" ON public.goal_events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- penalties
DROP POLICY IF EXISTS "Admin/Editor manage penalties" ON public.penalties;
DROP POLICY IF EXISTS "Public read penalties" ON public.penalties;
CREATE POLICY "Public read penalties" ON public.penalties FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage penalties" ON public.penalties FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- standings_aggregate
DROP POLICY IF EXISTS "System manage standings" ON public.standings_aggregate;
DROP POLICY IF EXISTS "Public read standings" ON public.standings_aggregate;
CREATE POLICY "Public read standings" ON public.standings_aggregate FOR SELECT USING (true);
CREATE POLICY "System manage standings" ON public.standings_aggregate FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- fair_play_aggregate
DROP POLICY IF EXISTS "System manage fair_play" ON public.fair_play_aggregate;
DROP POLICY IF EXISTS "Public read fair_play" ON public.fair_play_aggregate;
CREATE POLICY "Public read fair_play" ON public.fair_play_aggregate FOR SELECT USING (true);
CREATE POLICY "System manage fair_play" ON public.fair_play_aggregate FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- brackets
DROP POLICY IF EXISTS "Admin manage brackets" ON public.brackets;
DROP POLICY IF EXISTS "Public read brackets" ON public.brackets;
CREATE POLICY "Public read brackets" ON public.brackets FOR SELECT USING (true);
CREATE POLICY "Admin manage brackets" ON public.brackets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- playoff_bracket
DROP POLICY IF EXISTS "Admin manage playoff_bracket" ON public.playoff_bracket;
DROP POLICY IF EXISTS "Public read playoff_bracket" ON public.playoff_bracket;
CREATE POLICY "Public read playoff_bracket" ON public.playoff_bracket FOR SELECT USING (true);
CREATE POLICY "Admin manage playoff_bracket" ON public.playoff_bracket FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- playoff_slots
DROP POLICY IF EXISTS "Admin manage playoff_slots" ON public.playoff_slots;
DROP POLICY IF EXISTS "Public read playoff_slots" ON public.playoff_slots;
CREATE POLICY "Public read playoff_slots" ON public.playoff_slots FOR SELECT USING (true);
CREATE POLICY "Admin manage playoff_slots" ON public.playoff_slots FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- rosters
DROP POLICY IF EXISTS "Admin manage rosters" ON public.rosters;
DROP POLICY IF EXISTS "Public read rosters" ON public.rosters;
CREATE POLICY "Public read rosters" ON public.rosters FOR SELECT USING (true);
CREATE POLICY "Admin manage rosters" ON public.rosters FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- match_import
DROP POLICY IF EXISTS "Admin manage match_import" ON public.match_import;
DROP POLICY IF EXISTS "Public read match_import" ON public.match_import;
CREATE POLICY "Public read match_import" ON public.match_import FOR SELECT USING (true);
CREATE POLICY "Admin manage match_import" ON public.match_import FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- audit_logs
DROP POLICY IF EXISTS "Admin read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin/Editor insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admin read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin/Editor insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin manage roles" ON public.user_roles;
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- players (admin/editor only, no public read)
DROP POLICY IF EXISTS "Admin manage players" ON public.players;
DROP POLICY IF EXISTS "Authenticated read players" ON public.players;
CREATE POLICY "Admin/Editor manage players" ON public.players FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
CREATE POLICY "Admin/Editor read players" ON public.players FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
