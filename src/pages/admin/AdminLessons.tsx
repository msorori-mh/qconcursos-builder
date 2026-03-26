import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import PaginationControls from "@/components/admin/PaginationControls";
import FileUpload from "@/components/admin/FileUpload";

interface Lesson {
  id: string;
  title: string;
  slug: string;
  subject_id: string;
  duration: string | null;
  is_free: boolean | null;
  video_url: string | null;
  content_text: string | null;
  content_pdf_url: string | null;
  sort_order: number;
  semester: number | null;
  subjects?: { name: string; grades?: { name: string } };
}

interface Grade { id: string; name: string; }
interface Subject { id: string; name: string; grade_id: string; semester: number | null; grades?: { name: string } }

const PAGE_SIZE = 20;

const emptyForm = {
  title: "", slug: "", subject_id: "", duration: "", is_free: true,
  video_url: "", content_text: "", content_pdf_url: "", sort_order: 0,
  semester: "" as string | number,
};

const AdminLessons = () => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // Form grade
  const [formGrade, setFormGrade] = useState("");

  // Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { loadLessons(); }, [page, filterGrade, filterSemester, filterSubject, searchTerm]);

  const loadRefs = async () => {
    const [{ data: gData }, { data: sData }] = await Promise.all([
      supabase.from("grades").select("id, name").order("sort_order"),
      supabase.from("subjects").select("id, name, grade_id, semester, grades(name)").order("sort_order"),
    ]);
    if (gData) setGrades(gData);
    if (sData) setAllSubjects(sData as any);
  };

  const loadLessons = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("lessons")
      .select("*, subjects(name, grades(name))", { count: "exact" })
      .order("sort_order")
      .range(from, to);

    if (filterSubject) query = query.eq("subject_id", filterSubject);
    if (filterSemester) query = query.eq("semester", parseInt(filterSemester));
    if (searchTerm.trim()) query = query.ilike("title", `%${searchTerm.trim()}%`);

    // Grade filter via subject IDs
    if (filterGrade && !filterSubject) {
      const gradeSubjectIds = allSubjects.filter(s => s.grade_id === filterGrade).map(s => s.id);
      if (gradeSubjectIds.length > 0) query = query.in("subject_id", gradeSubjectIds);
      else query = query.eq("subject_id", "00000000-0000-0000-0000-000000000000");
    }

    const { data, count } = await query;
    if (data) setLessons(data as any);
    setTotalCount(count || 0);
    setLoading(false);
  };

  // Cascading filter helpers
  const filteredSubjects = filterGrade
    ? allSubjects.filter(s => s.grade_id === filterGrade)
    : allSubjects;

  const formSubjects = formGrade
    ? allSubjects.filter(s => s.grade_id === formGrade)
    : allSubjects;

  const openNew = async () => {
    setEditing(null);
    const selectedSubject = filterSubject || "";
    let defaultFree = true;
    if (selectedSubject) {
      const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("subject_id", selectedSubject);
      defaultFree = (count || 0) === 0;
    }
    // Pre-fill grade from filter
    const subj = allSubjects.find(s => s.id === selectedSubject);
    setFormGrade(filterGrade || subj?.grade_id || "");
    setForm({
      ...emptyForm,
      subject_id: selectedSubject,
      is_free: defaultFree,
      semester: filterSemester || "",
    });
    setDialogOpen(true);
  };

  const openEdit = (l: Lesson) => {
    setEditing(l);
    const subj = allSubjects.find(s => s.id === l.subject_id);
    setFormGrade(subj?.grade_id || "");
    setForm({
      title: l.title, slug: l.slug, subject_id: l.subject_id,
      duration: l.duration || "", is_free: l.is_free ?? true,
      video_url: l.video_url || "", content_text: l.content_text || "",
      content_pdf_url: l.content_pdf_url || "", sort_order: l.sort_order,
      semester: l.semester ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.slug || !form.subject_id) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title, slug: form.slug, subject_id: form.subject_id,
      duration: form.duration || null, is_free: form.is_free,
      video_url: form.video_url || null, content_text: form.content_text || null,
      content_pdf_url: form.content_pdf_url || null, sort_order: form.sort_order,
      semester: form.semester === "" ? null : Number(form.semester),
    };
    if (editing) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    loadLessons();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم الحذف" });
    loadLessons();
  };

  // ─── Excel Import ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportPreview(null);
    parsePreview(file);
  };

  const parsePreview = async (file: File) => {
    try {
      const text = await file.text();
      const rows = text.split("\n").map(r => r.split(/[,\t]/).map(c => c.replace(/^"|"$/g, "").trim()));
      if (rows.length < 2) {
        toast({ title: "الملف فارغ", variant: "destructive" });
        return;
      }
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const preview = rows.slice(1).filter(r => r.some(c => c)).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ""; });
        return obj;
      });
      setImportPreview(preview.slice(0, 200));
    } catch {
      toast({ title: "خطأ في قراءة الملف", variant: "destructive" });
    }
  };

  const processImport = async () => {
    if (!importPreview?.length || !filterSubject) {
      toast({ title: "يرجى اختيار المادة أولاً", variant: "destructive" });
      return;
    }
    setImporting(true);

    try {
      const colMap: Record<string, string[]> = {
        title: ["العنوان", "عنوان الدرس", "الدرس", "title", "lesson"],
        slug: ["الرابط", "slug", "url"],
        duration: ["المدة", "duration", "time"],
        is_free: ["مجاني", "free", "is_free"],
        semester: ["الفصل", "الفصل الدراسي", "semester"],
        sort_order: ["الترتيب", "sort", "order", "sort_order"],
      };

      const findCol = (row: any, keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find(rk => rk === k || rk.includes(k));
          if (found && row[found]) return row[found];
        }
        return "";
      };

      const lessonsToInsert: any[] = [];
      let skipped = 0;

      for (let i = 0; i < importPreview.length; i++) {
        const row = importPreview[i];
        const title = findCol(row, colMap.title);
        if (!title) { skipped++; continue; }

        let slug = findCol(row, colMap.slug);
        if (!slug) {
          slug = title.replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "").toLowerCase() || `lesson-${i + 1}`;
        }

        const freeVal = findCol(row, colMap.is_free);
        const isFree = freeVal ? ["نعم", "true", "1", "yes", "مجاني"].includes(freeVal.toLowerCase()) : (lessonsToInsert.length === 0);

        const semVal = findCol(row, colMap.semester);
        const semester = semVal ? parseInt(semVal) : (filterSemester ? parseInt(filterSemester) : null);

        const sortVal = findCol(row, colMap.sort_order);
        const sort_order = sortVal ? parseInt(sortVal) : (i + 1);

        lessonsToInsert.push({
          title,
          slug,
          subject_id: filterSubject,
          duration: findCol(row, colMap.duration) || null,
          is_free: isFree,
          semester: isNaN(semester as number) ? null : semester,
          sort_order,
          video_url: null,
          content_text: null,
          content_pdf_url: null,
        });
      }

      if (lessonsToInsert.length === 0) {
        toast({ title: "لم يتم العثور على دروس صالحة", variant: "destructive" });
        setImporting(false);
        return;
      }

      let inserted = 0;
      for (let i = 0; i < lessonsToInsert.length; i += 50) {
        const batch = lessonsToInsert.slice(i, i + 50);
        const { error } = await supabase.from("lessons").insert(batch);
        if (error) {
          toast({ title: "خطأ في الاستيراد", description: error.message, variant: "destructive" });
          break;
        }
        inserted += batch.length;
      }

      toast({
        title: `تم استيراد ${inserted} درس`,
        description: skipped > 0 ? `تم تخطي ${skipped} صف غير صالح` : undefined,
      });
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview(null);
      loadLessons();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const bom = "\uFEFF";
    const csv = bom + "العنوان,الرابط,المدة,مجاني,الفصل الدراسي,الترتيب\n" +
      "مقدمة في الجبر,intro-algebra,15 دقيقة,نعم,1,1\n" +
      "المعادلات الخطية,linear-equations,20 دقيقة,لا,1,2\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lessons_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة الدروس</h1>
          <p className="text-sm text-muted-foreground">{totalCount} درس</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> استيراد
          </Button>
          <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> إضافة درس
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="ابحث في الدروس..."
              className="pr-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select value={filterGrade} onChange={(e) => {
            setFilterGrade(e.target.value); setFilterSubject(""); setPage(1);
          }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل الصفوف</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={filterSemester} onChange={(e) => { setFilterSemester(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل الفصول</option>
            <option value="1">الفصل الأول</option>
            <option value="2">الفصل الثاني</option>
          </select>
          <select value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل المواد</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>{(s as any).grades?.name} — {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد دروس</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {lessons.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
                <div>
                  <h3 className="font-semibold text-card-foreground">{l.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {(l as any).subjects?.grades?.name} — {(l as any).subjects?.name}
                    </span>
                    {l.duration && <span className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">{l.duration}</span>}
                    {l.semester && <span className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">ف{l.semester}</span>}
                    <span className={`text-[11px] rounded-full px-2 py-0.5 ${l.is_free ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"}`}>
                      {l.is_free ? "مجاني" : "مدفوع"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الدرس" : "إضافة درس جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات الدرس</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">الصف</label>
                <select value={formGrade} onChange={(e) => {
                  setFormGrade(e.target.value);
                  setForm({ ...form, subject_id: "" });
                }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر الصف</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">المادة</label>
                <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر المادة</option>
                  {formSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">عنوان الدرس</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الرابط (slug)</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">المدة</label>
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="15 دقيقة" />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.is_free as boolean} onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
                    className="h-4 w-4 rounded border-input" />
                  مجاني
                </label>
              </div>
            </div>
            <FileUpload
              bucket="lesson-videos"
              accept="video/mp4,video/webm,video/ogg"
              label="رفع فيديو"
              icon="video"
              maxSizeMB={500}
              value={form.video_url}
              onChange={(url) => setForm({ ...form, video_url: url })}
            />
            <p className="text-xs text-muted-foreground">أو أدخل رابط خارجي (YouTube مثلاً):</p>
            <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} dir="ltr" placeholder="https://..." />
            <FileUpload
              bucket="lesson-pdfs"
              accept="application/pdf"
              label="رفع ملف PDF"
              icon="pdf"
              maxSizeMB={50}
              value={form.content_pdf_url}
              onChange={(url) => setForm({ ...form, content_pdf_url: url })}
            />
            <p className="text-xs text-muted-foreground">أو أدخل رابط خارجي:</p>
            <Input value={form.content_pdf_url} onChange={(e) => setForm({ ...form, content_pdf_url: e.target.value })} dir="ltr" placeholder="https://..." />
            <div>
              <label className="mb-1 block text-sm font-medium">محتوى نصي</label>
              <textarea value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">الفصل الدراسي</label>
                <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">كلا الفصلين</option>
                  <option value="1">الفصل الأول</option>
                  <option value="2">الفصل الثاني</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">الترتيب</label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
              </div>
            </div>
            <Button variant="hero" className="w-full" onClick={save}>{editing ? "حفظ" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              استيراد الدروس من ملف
            </DialogTitle>
            <DialogDescription>ارفع ملف CSV أو TXT يحتوي على بيانات الدروس</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Target filters */}
            <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">إضافة الدروس المستوردة إلى:</p>
              <div className="grid grid-cols-3 gap-3">
                <select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setFilterSubject(""); }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر الصف</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون فصل</option>
                  <option value="1">الفصل الأول</option>
                  <option value="2">الفصل الثاني</option>
                </select>
                <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر المادة *</option>
                  {filteredSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {!filterSubject && (
                <p className="text-xs text-destructive">⚠️ يجب اختيار المادة قبل الاستيراد</p>
              )}
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <label className="cursor-pointer block">
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition-colors hover:border-primary/50">
                  <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {importFile ? importFile.name : "اضغط لرفع ملف CSV أو TXT"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">يدعم ملفات CSV و TXT مفصولة بفواصل أو Tab</p>
                </div>
                <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileChange} className="hidden" />
              </label>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> تحميل قالب نموذجي
              </Button>
            </div>

            {/* Preview */}
            {importPreview && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">معاينة: {importPreview.length} درس</p>
                <div className="max-h-[250px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">العنوان</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">المدة</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">مجاني</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 30).map((row, i) => {
                        const headers = Object.keys(row);
                        const title = row[headers.find(h =>
                          ["العنوان", "عنوان الدرس", "الدرس", "title", "lesson"].some(k => h.includes(k))
                        ) || headers[0]] || "";
                        const duration = row[headers.find(h =>
                          ["المدة", "duration"].some(k => h.includes(k))
                        ) || ""] || "";
                        const free = row[headers.find(h =>
                          ["مجاني", "free"].some(k => h.includes(k))
                        ) || ""] || "";
                        return (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate">{title}</td>
                            <td className="px-3 py-2 text-muted-foreground">{duration}</td>
                            <td className="px-3 py-2">{free}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Button variant="hero" className="w-full gap-2" onClick={processImport}
                  disabled={importing || !filterSubject}>
                  {importing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {importing ? "جاري الاستيراد..." : `استيراد ${importPreview.length} درس`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLessons;
