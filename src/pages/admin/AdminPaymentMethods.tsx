import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  account_name: string | null;
  account_number: string | null;
  details: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = { type: "bank" as string, name: "", account_name: "", account_number: "", details: "", is_active: true, sort_order: 0 };

const AdminPaymentMethods = () => {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("sort_order");
    if (data) setMethods(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: methods.length });
    setDialogOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setForm({
      type: m.type, name: m.name, account_name: m.account_name || "",
      account_number: m.account_number || "", details: m.details || "",
      is_active: m.is_active, sort_order: m.sort_order,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name) { toast({ title: "يرجى إدخال الاسم", variant: "destructive" }); return; }
    const payload = {
      ...form,
      account_name: form.account_name || null,
      account_number: form.account_number || null,
      details: form.details || null,
    };
    if (editing) {
      const { error } = await supabase.from("payment_methods").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("payment_methods").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">إدارة طرق الدفع</h1>
        <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> إضافة طريقة دفع
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : methods.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد طرق دفع بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.type === "bank" ? "bg-primary/10" : "bg-accent/10"}`}>
                  {m.type === "bank" ? <Building2 className="h-5 w-5 text-primary" /> : <Wallet className="h-5 w-5 text-accent" />}
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{m.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {m.type === "bank" ? "بنك" : "صرافة"}
                    {m.account_number && ` • ${m.account_number}`}
                    {!m.is_active && " • معطل"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}</DialogTitle>
            <DialogDescription>أدخل بيانات البنك أو شركة الصرافة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="bank">بنك</option>
                <option value="exchange">شركة صرافة</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الاسم</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="بنك اليمن والكويت" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">اسم الحساب</label>
              <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">رقم الحساب</label>
              <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">تفاصيل إضافية</label>
              <Input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="الفرع، ملاحظات..." />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-input" />
              مفعّل (يظهر للطلاب)
            </label>
            <Button variant="hero" className="w-full" onClick={save}>{editing ? "حفظ" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentMethods;
