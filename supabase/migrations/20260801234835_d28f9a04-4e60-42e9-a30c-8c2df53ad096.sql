CREATE TABLE public.sponsor_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid REFERENCES public.sponsors(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  device_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.sponsor_clicks DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.sponsor_clicks TO anon;
GRANT ALL ON public.sponsor_clicks TO authenticated;
GRANT ALL ON public.sponsor_clicks TO service_role;

CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  tournament_id uuid,
  device_type text,
  viewed_at timestamptz DEFAULT now()
);
ALTER TABLE public.page_views DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.page_views TO anon;
GRANT ALL ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

CREATE INDEX idx_sponsor_clicks_sponsor_date ON public.sponsor_clicks (sponsor_id, clicked_at);
CREATE INDEX idx_page_views_tournament_date ON public.page_views (tournament_id, viewed_at);