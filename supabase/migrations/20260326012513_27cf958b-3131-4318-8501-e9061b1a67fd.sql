
DROP POLICY "Service role can insert AI logs" ON public.ai_usage_logs;
CREATE POLICY "Authenticated can insert own AI logs"
  ON public.ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
