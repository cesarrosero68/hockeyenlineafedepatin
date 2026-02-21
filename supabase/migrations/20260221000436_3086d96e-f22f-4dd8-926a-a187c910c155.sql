
-- =============================================
-- FASE 1: ESQUEMA COMPLETO TORNEO HOCKEY EN LÍNEA
-- =============================================

-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

-- Enum para estado de partido
CREATE TYPE public.match_status AS ENUM ('scheduled', 'in_progress', 'closed', 'locked');

-- Enum para fase
CREATE TYPE public.match_phase AS ENUM ('regular', 'playoff');

-- Enum para tipo de resultado extra
CREATE TYPE public.extra_time_type AS ENUM ('none', 'ot', 'so');

-- =============================================
-- TABLAS CORE
-- =============================================

-- Divisiones
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorías
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rr_rounds INT NOT NULL DEFAULT 1,
  playoff_format TEXT DEFAULT 'single_elimination',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(division_id, name)
);

-- Clubes
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipos
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, category_id, name)
);

-- Jugadores
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  jersey_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roster (jugador <-> equipo por temporada)
CREATE TABLE public.rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season TEXT NOT NULL DEFAULT '2025',
  jersey_number INT,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, team_id, season)
);

-- Partidos
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  phase match_phase NOT NULL DEFAULT 'regular',
  status match_status NOT NULL DEFAULT 'scheduled',
  match_date TIMESTAMPTZ,
  venue TEXT,
  round_number INT,
  extra_time extra_time_type NOT NULL DEFAULT 'none',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipos por partido (home/away con marcador)
CREATE TABLE public.match_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('home', 'away')),
  score_regular INT NOT NULL DEFAULT 0,
  score_extra INT,
  is_winner BOOLEAN DEFAULT false,
  is_forfeit BOOLEAN DEFAULT false,
  UNIQUE(match_id, side)
);

-- Eventos de gol
CREATE TABLE public.goal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scorer_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  assist_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  period INT NOT NULL CHECK (period BETWEEN 1 AND 4),
  game_time TEXT,
  is_overtime BOOLEAN NOT NULL DEFAULT false,
  is_shootout BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penalizaciones
CREATE TABLE public.penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  penalty_code TEXT NOT NULL,
  penalty_description TEXT NOT NULL,
  penalty_minutes INT NOT NULL DEFAULT 2,
  period INT NOT NULL,
  game_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLAS AGREGADAS (materialized snapshots)
-- =============================================

CREATE TABLE public.standings_aggregate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  played INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  goals_for INT NOT NULL DEFAULT 0,
  goals_against INT NOT NULL DEFAULT 0,
  goal_diff INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  rank INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, team_id)
);

CREATE TABLE public.player_stats_aggregate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  penalty_minutes INT NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, category_id)
);

CREATE TABLE public.fair_play_aggregate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  total_penalty_minutes INT NOT NULL DEFAULT 0,
  total_penalties INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, team_id)
);

-- Brackets (playoffs)
CREATE TABLE public.brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  team_a_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team_b_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  placement INT,
  next_bracket_id UUID REFERENCES public.brackets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ROLES Y AUDITORÍA
-- =============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FUNCIÓN SEGURA PARA VERIFICAR ROL
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- TRIGGER PARA updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Public read tables (everyone can see)
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read divisions" ON public.divisions FOR SELECT USING (true);
CREATE POLICY "Admin manage divisions" ON public.divisions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Admin manage clubs" ON public.clubs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Admin manage teams" ON public.teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admin manage players" ON public.players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rosters" ON public.rosters FOR SELECT USING (true);
CREATE POLICY "Admin manage rosters" ON public.rosters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

ALTER TABLE public.match_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read match_teams" ON public.match_teams FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage match_teams" ON public.match_teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

ALTER TABLE public.goal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read goal_events" ON public.goal_events FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage goal_events" ON public.goal_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read penalties" ON public.penalties FOR SELECT USING (true);
CREATE POLICY "Admin/Editor manage penalties" ON public.penalties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

ALTER TABLE public.standings_aggregate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read standings" ON public.standings_aggregate FOR SELECT USING (true);
CREATE POLICY "System manage standings" ON public.standings_aggregate FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.player_stats_aggregate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read player_stats" ON public.player_stats_aggregate FOR SELECT USING (true);
CREATE POLICY "System manage player_stats" ON public.player_stats_aggregate FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.fair_play_aggregate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fair_play" ON public.fair_play_aggregate FOR SELECT USING (true);
CREATE POLICY "System manage fair_play" ON public.fair_play_aggregate FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read brackets" ON public.brackets FOR SELECT USING (true);
CREATE POLICY "Admin manage brackets" ON public.brackets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_teams_category ON public.teams(category_id);
CREATE INDEX idx_teams_club ON public.teams(club_id);
CREATE INDEX idx_matches_category ON public.matches(category_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_match_teams_match ON public.match_teams(match_id);
CREATE INDEX idx_match_teams_team ON public.match_teams(team_id);
CREATE INDEX idx_goal_events_match ON public.goal_events(match_id);
CREATE INDEX idx_goal_events_scorer ON public.goal_events(scorer_player_id);
CREATE INDEX idx_penalties_match ON public.penalties(match_id);
CREATE INDEX idx_rosters_team ON public.rosters(team_id);
CREATE INDEX idx_rosters_player ON public.rosters(player_id);
CREATE INDEX idx_standings_category ON public.standings_aggregate(category_id);
CREATE INDEX idx_player_stats_category ON public.player_stats_aggregate(category_id);
CREATE INDEX idx_brackets_category ON public.brackets(category_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
