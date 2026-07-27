CREATE POLICY "admins manage club logos" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'club-logos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'club-logos' AND public.has_role(auth.uid(), 'admin'));