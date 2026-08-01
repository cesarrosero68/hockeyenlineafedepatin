CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website_url text,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  speed text DEFAULT 'medium' CHECK (speed IN ('slow','medium','fast')),
  click_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.sponsors TO anon;
GRANT ALL ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

ALTER TABLE public.sponsors DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sponsors_enabled boolean DEFAULT true;