import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Grade {
  id: string;
  name: string;
  slug: string;
  category: string;
  sort_order: number;
}

const AdminGrades = () => {
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", category: "إعدادي", sort_order: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("grades").select("*").order("sort_order");
    if (data) setGrades(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "", category: "إعدادي", sort_order: grades.length });
    setDialogOpen(true);
  };

  const openEdit = (g: Grade) => {
    setEditing(g);
    setForm({ name: g.name, slug: g.slug, category: g.category, sort_order: g.sort_order });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.slug) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    if (editing) {
      const { error } = await supabase.from("grades").update(form).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("grades").insert(form);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from("grades").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم الحذف" });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">إدارة الصفوف</h1>
        <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> إضافة صف
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : grades.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد صفوف بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div>
                <h3 className="font-semibold text-card-foreground">{g.name}</h3>
                <p className="text-sm text-muted-foreground">{g.category} • /{g.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(g)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => remove(g.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الصف" : "إضافة صف جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات الصف الدراسي</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">اسم الصف</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الصف الأول" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">الرابط (slug)</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="grade-1" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">التصنيف</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>إعدادي</option>
                <option>ثانوي</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">الترتيب</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
            </div>
            <Button variant="hero" className="w-full" onClick={save}>
              {editing ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGrades;
