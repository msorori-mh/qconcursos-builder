
CREATE POLICY "Service role can insert AI logs"
  ON public.ai_usage_logs FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');
