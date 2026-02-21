
-- Fix permissive audit_logs INSERT policy
DROP POLICY "System insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admin/Editor insert audit_logs" ON public.audit_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
