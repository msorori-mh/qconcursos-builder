import { useEffect, useState } from "react";
import { Search, UserCheck, UserX, Eye, MapPin, School, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import PaginationControls from "@/components/admin/PaginationControls";

const YEMEN_GOVERNORATES = [
  "أمانة العاصمة", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حجة", "صعدة",
  "صنعاء", "عمران", "المحويت", "ريمة", "البيضاء", "لحج", "أبين", "الضالع",
  "شبوة", "حضرموت", "المهرة", "سقطرى", "مأرب", "الجوف",
];

interface Student {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  governorate: string | null;
  school_name: string | null;
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
  const [governorateFilter, setGovernorateFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState<string>("6");
  const [sortBy, setSortBy] = useState<"date" | "name" | "governorate">("date");

  useEffect(() => {
    setPage(1);
  }, [search, filter, governorateFilter, schoolFilter, sortBy]);

  useEffect(() => {
    loadStudents();
  }, [page, filter, search, governorateFilter, schoolFilter, sortBy]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, governorate, school_name, created_at", { count: "exact" })
        .range(from, to);

      // Sorting
      if (sortBy === "name") {
        query = query.order("full_name", { ascending: true, nullsFirst: false });
      } else if (sortBy === "governorate") {
        query = query.order("governorate", { ascending: true, nullsFirst: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
      }

      if (governorateFilter && governorateFilter !== "all") {
        query = query.eq("governorate", governorateFilter);
      }

      if (schoolFilter.trim()) {
        query = query.ilike("school_name", `%${schoolFilter.trim()}%`);
      }

      const { data: profiles, count } = await query;
      if (!profiles) {
        setStudents([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const userIds = profiles.map((p) => p.user_id);
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, user_id, status, starts_at, expires_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      const subMap: Record<string, any> = {};
      (subs || []).forEach((s) => {
        if (!subMap[s.user_id]) subMap[s.user_id] = s;
      });

      let results: Student[] = profiles.map((p) => ({
        ...p,
        subscription: subMap[p.user_id] || null,
      }));

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
        const months = parseInt(duration);
        const now = new Date();
        const expires = new Date(now);
        expires.setMonth(expires.getMonth() + months);

        if (student.subscription) {
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

        await supabase.from("notifications").insert({
          user_id: student.user_id,
          title: "تم تفعيل اشتراكك",
          message: "تم تفعيل اشتراكك بنجاح. يمكنك الآن الوصول لجميع الدروس المدفوعة.",
          type: "success",
        });

        try {
          const { data: emailData } = await supabase.rpc("get_user_email", { _user_id: student.user_id });
          if (emailData) {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "subscription-activation",
                recipientEmail: emailData,
                idempotencyKey: `sub-activation-${student.user_id}-${Date.now()}`,
                templateData: {
                  name: student.full_name || undefined,
                  expiresAt: expires.toLocaleDateString("ar-YE"),
                },
              },
            });
          }
        } catch (e) {
          console.error("Failed to send activation email:", e);
        }

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

  const activeFiltersCount = [
    governorateFilter !== "all",
    schoolFilter.trim() !== "",
    sortBy !== "date",
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">إدارة الطلاب</h1>
        <p className="text-sm text-muted-foreground">{totalCount} طالب</p>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              showFilters || activeFiltersCount > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 inline ml-1" />
            فلاتر
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-sm">المحافظة</Label>
              <Select value={governorateFilter} onValueChange={setGovernorateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع المحافظات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المحافظات</SelectItem>
                  {YEMEN_GOVERNORATES.map((gov) => (
                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">المدرسة</Label>
              <Input
                placeholder="بحث باسم المدرسة..."
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">ترتيب حسب</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">تاريخ التسجيل</SelectItem>
                  <SelectItem value="name">الاسم</SelectItem>
                  <SelectItem value="governorate">المحافظة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => { setGovernorateFilter("all"); setSchoolFilter(""); setSortBy("date"); }}
            >
              مسح الفلاتر
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">
            {search || governorateFilter !== "all" || schoolFilter ? "لا توجد نتائج مطابقة" : "لا يوجد طلاب بعد"}
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
                      {student.governorate && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {student.governorate}
                        </span>
                      )}
                      {student.school_name && (
                        <span className="inline-flex items-center gap-1">
                          <School className="h-3.5 w-3.5" />
                          {student.school_name}
                        </span>
                      )}
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
                  <span className="text-muted-foreground">المحافظة</span>
                  <span className="text-foreground font-medium">{selectedStudent.governorate || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المدرسة</span>
                  <span className="text-foreground font-medium">{selectedStudent.school_name || "—"}</span>
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

              <div className="space-y-3">
                {!isActive(selectedStudent) && (
                  <div className="space-y-2">
                    <Label>مدة الاشتراك</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">شهر واحد</SelectItem>
                        <SelectItem value="3">3 أشهر</SelectItem>
                        <SelectItem value="6">6 أشهر</SelectItem>
                        <SelectItem value="12">سنة كاملة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                      تفعيل الاشتراك
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudents;
