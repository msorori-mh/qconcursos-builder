import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://studentamkeen.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date().toISOString().split("T")[0];

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/contact", priority: "0.6", changefreq: "monthly" },
    { loc: "/grades", priority: "0.9", changefreq: "weekly" },
  ];

  // Fetch dynamic data
  const [gradesRes, subjectsRes] = await Promise.all([
    supabase.from("grades").select("id, slug"),
    supabase.from("subjects").select("id, slug, grade_id"),
  ]);

  const grades = gradesRes.data || [];
  const subjects = subjectsRes.data || [];

  // Grade pages
  const gradePages = grades.map((g: any) => ({
    loc: `/grades/${g.id}/subjects`,
    priority: "0.8",
    changefreq: "weekly",
  }));

  // Subject lesson pages
  const subjectPages = subjects.map((s: any) => ({
    loc: `/grades/${s.grade_id}/subjects/${s.id}/lessons`,
    priority: "0.7",
    changefreq: "weekly",
  }));

  const allPages = [...staticPages, ...gradePages, ...subjectPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
