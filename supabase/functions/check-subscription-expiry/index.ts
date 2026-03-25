import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    // 1. Find subscriptions expiring within 7 days that haven't been notified yet
    const { data: expiringSoon } = await supabase
      .from("subscriptions")
      .select("id, user_id, expires_at")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", in7Days.toISOString());

    let notifiedExpiring = 0;
    for (const sub of expiringSoon || []) {
      // Check if we already sent this warning
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", sub.user_id)
        .eq("type", "warning")
        .ilike("title", "%اشتراكك على وشك الانتهاء%")
        .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if ((count || 0) === 0) {
        const expiresDate = new Date(sub.expires_at!).toLocaleDateString("ar-YE");
        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          title: "اشتراكك على وشك الانتهاء",
          message: `ينتهي اشتراكك بتاريخ ${expiresDate}. قم بتجديده للاستمرار في الوصول لجميع الدروس.`,
          type: "warning",
        });
        notifiedExpiring++;
      }
    }

    // 2. Find subscriptions that just expired (status still "active" but expires_at < now)
    const { data: justExpired } = await supabase
      .from("subscriptions")
      .select("id, user_id, expires_at")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lt("expires_at", now.toISOString());

    let notifiedExpired = 0;
    for (const sub of justExpired || []) {
      // Mark as expired
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", sub.id);

      // Send notification
      await supabase.from("notifications").insert({
        user_id: sub.user_id,
        title: "انتهى اشتراكك",
        message: "انتهت صلاحية اشتراكك. قم بتجديده للوصول إلى الدروس المدفوعة.",
        type: "error",
      });
      notifiedExpired++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiring_warned: notifiedExpiring,
        expired_processed: notifiedExpired,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking subscriptions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
