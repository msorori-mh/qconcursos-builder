import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Plan {
  id: string;
  name: string;
  duration_type: string;
  duration_months: number;
  price: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

const AdminSubscriptionPlans = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: "",
    duration_type: "semester" as "semester" | "annual",
    duration_months: 5,
    price: 0,
    currency: "YER",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sort_order");
    if (data) setPlans(data as any);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", duration_type: "semester", duration_months: 5, price: 0, currency: "YER", is_active: true, sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      name: p.name,
      duration_type: p.duration_type as any,
      duration_months: p.duration_months,
      price: p.price,
      currency: p.currency,
      is_active: p.is_active,
      sort_order: p.sort_order,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.price) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    const payload = { ...form };
    if (editing) {
      const { error } = await supabase.from("subscription_plans").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("subscription_plans").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم الحذف" });
    load();
  };

  const durationLabel = (type: string) => type === "semester" ? "فصل دراسي" : "سنة كاملة";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">خطط الاشتراك</h1>
        <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> إضافة خطة
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد خطط اشتراك بعد. أضف خطة جديدة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${p.duration_type === "annual" ? "bg-primary/10" : "bg-accent/10"}`}>
                  {p.duration_type === "annual" ? "📅" : "📆"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-card-foreground">{p.name}</h3>
                    {!p.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">معطّل</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {durationLabel(p.duration_type)} • {p.duration_months} شهر • {p.price.toLocaleString("ar-YE")} {p.currency}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الخطة" : "إضافة خطة جديدة"}</DialogTitle>
            <DialogDescription>حدد تفاصيل خطة الاشتراك</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">اسم الخطة</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اشتراك فصلي" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">نوع المدة</label>
              <select
                value={form.duration_type}
                onChange={(e) => {
                  const type = e.target.value as "semester" | "annual";
                  setForm({ ...form, duration_type: type, duration_months: type === "semester" ? 5 : 10 });
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="semester">فصل دراسي</option>
                <option value="annual">سنة كاملة</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">المدة (بالأشهر)</label>
                <Input type="number" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: +e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">الترتيب</label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">السعر</label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} placeholder="5000" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">العملة</label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="YER" dir="ltr" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-input"
                id="is_active"
              />
              <label htmlFor="is_active" className="text-sm font-medium">مفعّلة</label>
            </div>
            <Button variant="hero" className="w-full" onClick={save}>{editing ? "حفظ" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionPlans;
