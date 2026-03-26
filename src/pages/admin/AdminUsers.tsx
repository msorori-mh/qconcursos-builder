import { useEffect, useState } from "react";
import { UserPlus, Shield, ShieldCheck, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface AdminUser {
  user_id: string;
  email?: string;
  full_name?: string;
  role: string;
  created_at?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مشرف رئيسي",
  moderator: "مشرف مساعد",
};

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "moderator" as "admin" | "moderator",
  });

  const callApi = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("غير مسجل الدخول");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "حدث خطأ");
    return result;
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await callApi({ action: "list" });
      setUsers(result.users || []);
    } catch (e: any) {
      toast({ title: "خطأ في تحميل المستخدمين", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    if (!form.email || !form.password) {
      toast({ title: "البريد وكلمة المرور مطلوبان", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await callApi({ action: "create", ...form });
      toast({ title: "تم إنشاء المستخدم الإداري بنجاح ✅" });
      setDialogOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "moderator" });
      loadUsers();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      await callApi({ action: "change_role", user_id: userId, new_role: newRole });
      toast({ title: "تم تغيير الدور بنجاح" });
      loadUsers();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const removeRole = async (userId: string, email?: string) => {
    if (!confirm(`هل تريد إزالة صلاحيات الإدارة من ${email || "هذا المستخدم"}؟`)) return;
    try {
      await callApi({ action: "remove_role", user_id: userId });
      toast({ title: "تم إزالة الصلاحيات" });
      loadUsers();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة المستخدمين الإداريين</h1>
          <p className="text-sm text-muted-foreground">{users.length} مستخدم إداري</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button variant="hero" size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" /> إضافة مستخدم إداري
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد مستخدمون إداريون بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                  u.role === "admin" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent-foreground"
                }`}>
                  {u.role === "admin" ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-card-foreground truncate">
                    {u.full_name || u.email || "بدون اسم"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground" dir="ltr">{u.email}</span>
                    <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${
                      u.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mr-3 shrink-0">
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.user_id, e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="admin">مشرف رئيسي</option>
                  <option value="moderator">مشرف مساعد</option>
                </select>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => removeRole(u.user_id, u.email)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              إنشاء مستخدم إداري جديد
            </DialogTitle>
            <DialogDescription>أدخل بيانات المستخدم الإداري الجديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">الاسم الكامل</label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="مثال: أحمد محمد"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">البريد الإلكتروني *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">كلمة المرور *</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="6 أحرف على الأقل"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الدور</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "moderator" })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="admin">مشرف رئيسي — صلاحيات كاملة</option>
                <option value="moderator">مشرف مساعد — صلاحيات كاملة</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">كلا الدورين يمنحان صلاحيات إدارية كاملة</p>
            </div>
            <Button
              variant="hero"
              className="w-full"
              onClick={createUser}
              disabled={creating}
            >
              {creating ? "جاري الإنشاء..." : "إنشاء المستخدم الإداري"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
