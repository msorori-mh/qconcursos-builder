import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller with their JWT
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "صلاحيات غير كافية" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...body } = await req.json();

    // ── CREATE USER ──
    if (action === "create") {
      const { email, password, full_name, role } = body;

      if (!email || !password || !role) {
        return new Response(
          JSON.stringify({ error: "البريد وكلمة المرور والدور مطلوبة" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!["admin", "moderator"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "الدور غير صالح" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user via admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Assign role
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });

      if (roleError) {
        return new Response(
          JSON.stringify({ error: "تم إنشاء المستخدم لكن فشل تعيين الدور: " + roleError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LIST ADMIN USERS ──
    if (action === "list") {
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);

      if (!roles || roles.length === 0) {
        return new Response(
          JSON.stringify({ users: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userIds = roles.map((r) => r.user_id);

      // Get profiles
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Get emails from auth
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      });

      const userMap = new Map<string, any>();
      for (const r of roles) {
        userMap.set(r.user_id, { user_id: r.user_id, role: r.role });
      }

      for (const p of profiles || []) {
        const u = userMap.get(p.user_id);
        if (u) u.full_name = p.full_name;
      }

      for (const au of authUsers || []) {
        const u = userMap.get(au.id);
        if (u) {
          u.email = au.email;
          u.created_at = au.created_at;
        }
      }

      return new Response(
        JSON.stringify({ users: Array.from(userMap.values()) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── REMOVE ROLE ──
    if (action === "remove_role") {
      const { user_id } = body;

      if (user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "لا يمكنك إزالة صلاحياتك الخاصة" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .in("role", ["admin", "moderator"]);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CHANGE ROLE ──
    if (action === "change_role") {
      const { user_id, new_role } = body;

      if (user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "لا يمكنك تغيير دورك الخاص" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete old roles, insert new
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .in("role", ["admin", "moderator"]);

      const { error } = await adminClient
        .from("user_roles")
        .insert({ user_id, role: new_role });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "إجراء غير معروف" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
