
-- ============ 1) Tournaments table ============
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer,
  semester text,
  season text,
  status text NOT NULL DEFAULT 'active',
  primary_color text,
  header_color text,
  footer_color text,
  bg_color text,
  title_color text,
  text_color text,
  font_family text,
  font_size text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT ALL ON public.tournaments TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_select" ON public.tournaments AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "admin_all" ON public.tournaments AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

-- Seed the current tournament
INSERT INTO public.tournaments (name, year, semester, status)
VALUES ('Copa 2026', 2026, '2026-I', 'active');

-- ============ 2) category_awards ============
CREATE TABLE public.category_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  award_type text NOT NULL, -- 'mvp' | 'best_goalkeeper'
  player_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, tournament_id, award_type)
);
GRANT SELECT ON public.category_awards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_awards TO authenticated;
GRANT ALL ON public.category_awards TO service_role;
ALTER TABLE public.category_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_select" ON public.category_awards AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "admin_all" ON public.category_awards AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

-- ============ 3) Add tournament_id to existing tables ============
DO $$
DECLARE
  v_tid uuid;
  t text;
  tables text[] := ARRAY[
    'matches','categories','divisions','teams','players','rosters',
    'standings_aggregate','goal_events','penalties','brackets',
    'playoff_slots','fair_play_aggregate'
  ];
BEGIN
  SELECT id INTO v_tid FROM public.tournaments WHERE status = 'active' LIMIT 1;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL', t);
    EXECUTE format('UPDATE public.%I SET tournament_id = %L WHERE tournament_id IS NULL', t, v_tid);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tournament_id)', 'idx_'||t||'_tournament_id', t);
  END LOOP;
END $$;
