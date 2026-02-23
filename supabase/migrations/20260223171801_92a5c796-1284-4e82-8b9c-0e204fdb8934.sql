
-- Enable RLS on all three tables
ALTER TABLE public.match_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_bracket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_slots ENABLE ROW LEVEL SECURITY;

-- match_import: admin-only management, public read
CREATE POLICY "Public read match_import" ON public.match_import FOR SELECT USING (true);
CREATE POLICY "Admin manage match_import" ON public.match_import FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- playoff_bracket: admin-only management, public read
CREATE POLICY "Public read playoff_bracket" ON public.playoff_bracket FOR SELECT USING (true);
CREATE POLICY "Admin manage playoff_bracket" ON public.playoff_bracket FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- playoff_slots: admin-only management, public read
CREATE POLICY "Public read playoff_slots" ON public.playoff_slots FOR SELECT USING (true);
CREATE POLICY "Admin manage playoff_slots" ON public.playoff_slots FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
