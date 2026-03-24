
-- Create storage buckets for lesson videos and PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-videos', 'lesson-videos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-pdfs', 'lesson-pdfs', true) ON CONFLICT DO NOTHING;

-- RLS policies for lesson-videos bucket
CREATE POLICY "Admins can upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view videos" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-videos');

-- RLS policies for lesson-pdfs bucket
CREATE POLICY "Admins can upload pdfs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pdfs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'lesson-pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pdfs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lesson-pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view pdfs" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-pdfs');
