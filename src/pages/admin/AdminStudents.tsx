import { useEffect, useState } from "react";
import { Search, UserCheck, UserX, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import PaginationControls from "@/components/admin/PaginationControls";

interface Student {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  subscription?: {
    id: string;
    status: string;
    starts_at: string | null;
    expires_at: string | null;
  } | null;
}

const PAGE_SIZE = 20;

const AdminStudents = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  useEffect(() => {
    loadStudents();
  }, [page, filter, search]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Load profiles
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
      }

      const { data: profiles, count } = await query;
      if (!profiles) {
        setStudents([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // Load subscriptions for these users
      const userIds = profiles.map((p) => p.user_id);
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, user_id, status, starts_at, expires_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      // Map latest subscription per user
      const subMap: Record<string, any> = {};
      (subs || []).forEach((s) => {
        if (!subMap[s.user_id]) subMap[s.user_id] = s;
      });

      let results: Student[] = profiles.map((p) => ({
        ...p,
        subscription: subMap[p.user_id] || null,
      }));

      // Client-side filter for subscription status
      if (filter === "active") {
        results = results.filter(
          (s) => s.subscription?.status === "active" &&
            (!s.subscription.expires_at || new Date(s.subscription.expires_at) > new Date())
        );
      } else if (filter === "inactive") {
        results = results.filter(
          (s) => !s.subscription || s.subscription.status !== "active" ||
            (s.subscription.expires_at && new Date(s.subscription.expires_at) <= new Date())
        );
      }

      setStudents(results);
      setTotalCount(filter === "all" ? (count || 0) : results.length);
    } catch {
      toast({ title: "خطأ في تحميل البيانات", variant: "destructive" });
    }
    setLoading(false);
  };

  const toggleSubscription = async (student: Student, activate: boolean) => {
    setProcessing(true);
    try {
      if (activate) {
        if (student.subscription) {
          // Update existing subscription
          const now = new Date();
          const expires = new Date(now);
          expires.setMonth(expires.getMonth() + 6);

          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              starts_at: now.toISOString(),
              expires_at: expires.toISOString(),
            })
            .eq("id", student.subscription.id);
          if (error) throw error;
        } else {
          // Create new subscription
          const now = new Date();
          const expires = new Date(now);
          expires.setMonth(expires.getMonth() + 6);

          const { error } = await supabase
            .from("subscriptions")
            .insert({
              user_id: student.user_id,
              status: "active",
              starts_at: now.toISOString(),
              expires_at: expires.toISOString(),
            });
          if (error) throw error;
        }

        // Send notification
        await supabase.from("notifications").insert({
          user_id: student.user_id,
          title: "تم تفعيل اشتراكك",
          message: "تم تفعيل اشتراكك بنجاح. يمكنك الآن الوصول لجميع الدروس المدفوعة.",
          type: "success",
        });

        toast({ title: "تم تفعيل الاشتراك بنجاح" });
      } else {
        if (student.subscription) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("id", student.subscription.id);
          if (error) throw error;

          await supabase.from("notifications").insert({
            user_id: student.user_id,
            title: "تم تعطيل اشتراكك",
            message: "تم تعطيل اشتراكك. تواصل مع الإدارة لمزيد من المعلومات.",
            type: "error",
          });

          toast({ title: "تم تعطيل الاشتراك" });
        }
      }

      setSelectedStudent(null);
      loadStudents();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const isActive = (student: Student) =>
    student.subscription?.status === "active" &&
    (!student.subscription.expires_at || new Date(student.subscription.expires_at) > new Date());

  const subscriptionBadge = (student: Student) => {
    if (isActive(student)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
          <UserCheck className="h-3.5 w-3.5" />
          مفعّل
        </span>
      );
    }
    if (student.subscription?.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
          معلّق
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        غير مشترك
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">إدارة الطلاب</h1>
        <p className="text-sm text-muted-foreground">{totalCount} طالب</p>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: "all", label: "الكل" },
            { key: "active", label: "مشتركين" },
            { key: "inactive", label: "غير مشتركين" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">
            {search ? "لا توجد نتائج مطابقة" : "لا يوجد طلاب بعد"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-card-foreground">
                        {student.full_name || "بدون اسم"}
                      </h3>
                      {subscriptionBadge(student)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {student.phone && <span>📱 {student.phone}</span>}
                      <span>انضم: {new Date(student.created_at).toLocaleDateString("ar-YE")}</span>
                      {student.subscription?.expires_at && isActive(student) && (
                        <span>
                          ينتهي: {new Date(student.subscription.expires_at).toLocaleDateString("ar-YE")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <Eye className="h-3.5 w-3.5 ml-1" />
                      إدارة
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
        </>
      )}

      {/* Student Management Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إدارة الطالب</DialogTitle>
            <DialogDescription>
              {selectedStudent?.full_name || "بدون اسم"}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الهاتف</span>
                  <span className="text-foreground font-medium">{selectedStudent.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ التسجيل</span>
                  <span className="text-foreground font-medium">
                    {new Date(selectedStudent.created_at).toLocaleDateString("ar-YE")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">حالة الاشتراك</span>
                  {subscriptionBadge(selectedStudent)}
                </div>
                {selectedStudent.subscription?.starts_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">بداية الاشتراك</span>
                    <span className="text-foreground font-medium">
                      {new Date(selectedStudent.subscription.starts_at).toLocaleDateString("ar-YE")}
                    </span>
                  </div>
                )}
                {selectedStudent.subscription?.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نهاية الاشتراك</span>
                    <span className="text-foreground font-medium">
                      {new Date(selectedStudent.subscription.expires_at).toLocaleDateString("ar-YE")}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {isActive(selectedStudent) ? (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={processing}
                    onClick={() => toggleSubscription(selectedStudent, false)}
                  >
                    <UserX className="h-4 w-4 ml-1" />
                    تعطيل الاشتراك
                  </Button>
                ) : (
                  <Button
                    variant="hero"
                    className="flex-1"
                    disabled={processing}
                    onClick={() => toggleSubscription(selectedStudent, true)}
                  >
                    <UserCheck className="h-4 w-4 ml-1" />
                    تفعيل الاشتراك (6 أشهر)
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudents;
