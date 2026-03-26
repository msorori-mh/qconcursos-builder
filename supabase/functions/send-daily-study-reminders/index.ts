import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().getDay(); // 0=Sun, 1=Mon, ...

    // Get all users who have schedule entries for today
    const { data: scheduleEntries, error: scheduleError } = await supabase
      .from("weekly_schedule")
      .select("user_id, subject_name, period_number")
      .eq("day_of_week", today)
      .order("period_number");

    if (scheduleError) throw scheduleError;
    if (!scheduleEntries || scheduleEntries.length === 0) {
      return new Response(JSON.stringify({ message: "No schedules for today", count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Group by user
    const userSchedules = new Map<string, string[]>();
    for (const entry of scheduleEntries) {
      const subjects = userSchedules.get(entry.user_id) || [];
      if (!subjects.includes(entry.subject_name)) {
        subjects.push(entry.subject_name);
      }
      userSchedules.set(entry.user_id, subjects);
    }

    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const dayName = dayNames[today];

    // Insert notifications for each user
    const notifications = Array.from(userSchedules.entries()).map(([userId, subjects]) => ({
      user_id: userId,
      title: `📚 تذكير مراجعة يوم ${dayName}`,
      message: `لديك اليوم حصص في: ${subjects.join("، ")}. لا تنسَ مراجعة دروسك! افتح المساعد الذكي لخطة مراجعة مخصصة.`,
      type: "info",
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) throw insertError;

    console.log(`Sent ${notifications.length} daily study reminders`);

    return new Response(JSON.stringify({ success: true, count: notifications.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-daily-study-reminders error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
