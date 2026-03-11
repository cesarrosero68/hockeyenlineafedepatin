
-- ============================================================
-- Fix ALL RLS policies: drop restrictive, recreate as permissive
-- Consolidate duplicates into 1 public SELECT + 1 admin ALL per table
-- ============================================================

-- DIVISIONS
DROP POLICY IF EXISTS "Admin manage divisions" ON divisions;
DROP POLICY IF EXISTS "Public read divisions" ON divisions;
DROP POLICY IF EXISTS "public read divisions" ON divisions;
DROP POLICY IF EXISTS "public_read_divisions" ON divisions;
CREATE POLICY "public_select_divisions" ON divisions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_divisions" ON divisions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CATEGORIES
DROP POLICY IF EXISTS "Admin manage categories" ON categories;
DROP POLICY IF EXISTS "Public read categories" ON categories;
DROP POLICY IF EXISTS "public read categories" ON categories;
DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_categories" ON categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CLUBS
DROP POLICY IF EXISTS "Admin manage clubs" ON clubs;
DROP POLICY IF EXISTS "Public read clubs" ON clubs;
DROP POLICY IF EXISTS "public read clubs" ON clubs;
DROP POLICY IF EXISTS "public_read_clubs" ON clubs;
CREATE POLICY "public_select_clubs" ON clubs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_clubs" ON clubs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- TEAMS
DROP POLICY IF EXISTS "Admin manage teams" ON teams;
DROP POLICY IF EXISTS "Public read teams" ON teams;
CREATE POLICY "public_select_teams" ON teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_teams" ON teams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- MATCHES
DROP POLICY IF EXISTS "Admin/Editor manage matches" ON matches;
DROP POLICY IF EXISTS "Public read matches" ON matches;
DROP POLICY IF EXISTS "admin_manage_matches" ON matches;
DROP POLICY IF EXISTS "public read matches" ON matches;
DROP POLICY IF EXISTS "public_read_matches" ON matches;
CREATE POLICY "public_select_matches" ON matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_editor_all_matches" ON matches FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- MATCH_TEAMS
DROP POLICY IF EXISTS "Admin/Editor manage match_teams" ON match_teams;
DROP POLICY IF EXISTS "Public read match_teams" ON match_teams;
DROP POLICY IF EXISTS "admin_manage_match_teams" ON match_teams;
DROP POLICY IF EXISTS "public read match_teams" ON match_teams;
DROP POLICY IF EXISTS "public_read_match_teams" ON match_teams;
CREATE POLICY "public_select_match_teams" ON match_teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_editor_all_match_teams" ON match_teams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- GOAL_EVENTS
DROP POLICY IF EXISTS "Admin/Editor manage goal_events" ON goal_events;
DROP POLICY IF EXISTS "Public read goal_events" ON goal_events;
DROP POLICY IF EXISTS "admin_manage_goal_events" ON goal_events;
DROP POLICY IF EXISTS "public read goal_events" ON goal_events;
DROP POLICY IF EXISTS "public_read_goal_events" ON goal_events;
CREATE POLICY "public_select_goal_events" ON goal_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_editor_all_goal_events" ON goal_events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- PENALTIES
DROP POLICY IF EXISTS "Admin/Editor manage penalties" ON penalties;
DROP POLICY IF EXISTS "Public read penalties" ON penalties;
DROP POLICY IF EXISTS "admin_manage_penalties" ON penalties;
DROP POLICY IF EXISTS "public read penalties" ON penalties;
DROP POLICY IF EXISTS "public_read_penalties" ON penalties;
CREATE POLICY "public_select_penalties" ON penalties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_editor_all_penalties" ON penalties FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- ROSTERS
DROP POLICY IF EXISTS "Admin manage rosters" ON rosters;
DROP POLICY IF EXISTS "Public read rosters" ON rosters;
CREATE POLICY "public_select_rosters" ON rosters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_editor_all_rosters" ON rosters FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- STANDINGS_AGGREGATE
DROP POLICY IF EXISTS "Public read standings" ON standings_aggregate;
DROP POLICY IF EXISTS "System manage standings" ON standings_aggregate;
DROP POLICY IF EXISTS "admin_update_standings" ON standings_aggregate;
DROP POLICY IF EXISTS "public read standings" ON standings_aggregate;
DROP POLICY IF EXISTS "public_read_standings" ON standings_aggregate;
CREATE POLICY "public_select_standings" ON standings_aggregate FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_standings" ON standings_aggregate FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- FAIR_PLAY_AGGREGATE
DROP POLICY IF EXISTS "Public read fair_play" ON fair_play_aggregate;
DROP POLICY IF EXISTS "System manage fair_play" ON fair_play_aggregate;
DROP POLICY IF EXISTS "admin_update_fairplay" ON fair_play_aggregate;
DROP POLICY IF EXISTS "public read fair_play" ON fair_play_aggregate;
DROP POLICY IF EXISTS "public_read_fair_play" ON fair_play_aggregate;
DROP POLICY IF EXISTS "public_read_fairplay" ON fair_play_aggregate;
CREATE POLICY "public_select_fair_play" ON fair_play_aggregate FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_fair_play" ON fair_play_aggregate FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PLAYERS (no public SELECT on base table — use players_public view)
DROP POLICY IF EXISTS "Admin/Editor manage players" ON players;
DROP POLICY IF EXISTS "Admin/Editor read players" ON players;
DROP POLICY IF EXISTS "admin_manage_players" ON players;
DROP POLICY IF EXISTS "public read players" ON players;
DROP POLICY IF EXISTS "public_read_players" ON players;
CREATE POLICY "admin_editor_all_players" ON players FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- BRACKETS
DROP POLICY IF EXISTS "Admin manage brackets" ON brackets;
DROP POLICY IF EXISTS "Public read brackets" ON brackets;
CREATE POLICY "public_select_brackets" ON brackets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_brackets" ON brackets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PLAYOFF_BRACKET
DROP POLICY IF EXISTS "Admin manage playoff_bracket" ON playoff_bracket;
DROP POLICY IF EXISTS "Public read playoff_bracket" ON playoff_bracket;
CREATE POLICY "public_select_playoff_bracket" ON playoff_bracket FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_playoff_bracket" ON playoff_bracket FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PLAYOFF_SLOTS
DROP POLICY IF EXISTS "Admin manage playoff_slots" ON playoff_slots;
DROP POLICY IF EXISTS "Public read playoff_slots" ON playoff_slots;
CREATE POLICY "public_select_playoff_slots" ON playoff_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_playoff_slots" ON playoff_slots FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- MATCH_IMPORT
DROP POLICY IF EXISTS "Admin manage match_import" ON match_import;
DROP POLICY IF EXISTS "Public read match_import" ON match_import;
CREATE POLICY "public_select_match_import" ON match_import FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_all_match_import" ON match_import FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- AUDIT_LOGS (no public read — admin only)
DROP POLICY IF EXISTS "Admin read audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Admin/Editor insert audit_logs" ON audit_logs;
CREATE POLICY "admin_select_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_editor_insert_audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- USER_ROLES
DROP POLICY IF EXISTS "Admin manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users read own role" ON user_roles;
CREATE POLICY "users_read_own_role" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin_all_user_roles" ON user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
