import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import PaginationControls from "@/components/admin/PaginationControls";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  lesson_id: string | null;
  subject_id: string | null;
  question_type: string | null;
  sort_order: number;
  unit: string | null;
  semester: number | null;
  year: number | null;
  lessons?: { title: string } | null;
  subjects?: { name: string } | null;
}

interface Grade { id: string; name: string; }
interface Subject { id: string; name: string; grade_id: string; semester: number | null; }
interface Lesson { id: string; title: string; subject_id: string; semester: number | null; }

const PAGE_SIZE = 20;

const QUESTION_TYPES = [
  { value: "lesson", label: "سؤال درس" },
  { value: "exam", label: "اختبار شامل" },
  { value: "bank", label: "بنك أسئلة" },
];

const emptyForm = {
  question_text: "", options: ["", "", "", ""], correct_index: 0,
  explanation: "", lesson_id: "", subject_id: "", question_type: "lesson",
  sort_order: 0, unit: "", semester: "" as string, year: "" as string,
};

const AdminQuestions = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterLesson, setFilterLesson] = useState("");

  // Form cascading
  const [formGrade, setFormGrade] = useState("");

  // Import (independent filters)
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importGrade, setImportGrade] = useState("");
  const [importSemester, setImportSemester] = useState("");
  const [importSubject, setImportSubject] = useState("");
  const [importLesson, setImportLesson] = useState("");
  const [importType, setImportType] = useState("lesson");

  const importSubjects = importGrade ? allSubjects.filter(s => s.grade_id === importGrade) : [];
  const importLessons = importSubject ? allLessons.filter(l => l.subject_id === importSubject) : [];

  useEffect(() => { loadRefs(); }, []);
  useEffect(() => { loadQuestions(); }, [page, searchTerm, filterType, filterGrade, filterSubject, filterSemester, filterLesson]);

  const loadRefs = async () => {
    const [{ data: gData }, { data: sData }, { data: lData }] = await Promise.all([
      supabase.from("grades").select("id, name").order("sort_order"),
      supabase.from("subjects").select("id, name, grade_id, semester").order("sort_order"),
      supabase.from("lessons").select("id, title, subject_id, semester").order("sort_order"),
    ]);
    if (gData) setGrades(gData);
    if (sData) setAllSubjects(sData as Subject[]);
    if (lData) setAllLessons(lData as Lesson[]);
  };

  const loadQuestions = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("questions")
      .select("*, lessons(title), subjects(name)", { count: "exact" })
      .order("sort_order")
      .range(from, to);

    if (searchTerm.trim()) query = query.ilike("question_text", `%${searchTerm.trim()}%`);
    if (filterType) query = query.eq("question_type", filterType);
    if (filterSubject) query = query.eq("subject_id", filterSubject);
    if (filterLesson) query = query.eq("lesson_id", filterLesson);
    if (filterSemester) query = query.eq("semester", parseInt(filterSemester));

    // Grade filter: get subject IDs for that grade
    if (filterGrade && !filterSubject) {
      const gradeSubjectIds = allSubjects.filter(s => s.grade_id === filterGrade).map(s => s.id);
      if (gradeSubjectIds.length > 0) query = query.in("subject_id", gradeSubjectIds);
      else query = query.eq("subject_id", "00000000-0000-0000-0000-000000000000"); // no results
    }

    const { data, count } = await query;
    if (data) setQuestions(data as any);
    setTotalCount(count || 0);
    setLoading(false);
  };

  // Cascading helpers
  const filteredSubjects = filterGrade
    ? allSubjects.filter(s => s.grade_id === filterGrade)
    : allSubjects;
  const filteredLessons = filterSubject
    ? allLessons.filter(l => l.subject_id === filterSubject)
    : filterGrade
      ? allLessons.filter(l => filteredSubjects.some(s => s.id === l.subject_id))
      : allLessons;

  const formSubjects = formGrade
    ? allSubjects.filter(s => s.grade_id === formGrade)
    : allSubjects;
  const formLessons = form.subject_id
    ? allLessons.filter(l => l.subject_id === form.subject_id)
    : formGrade
      ? allLessons.filter(l => formSubjects.some(s => s.id === l.subject_id))
      : allLessons;

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormGrade("");
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    const opts = Array.isArray(q.options) ? [...q.options] : ["", "", "", ""];
    while (opts.length < 4) opts.push("");
    // Find grade from subject
    const subj = allSubjects.find(s => s.id === q.subject_id);
    setFormGrade(subj?.grade_id || "");
    setForm({
      question_text: q.question_text,
      options: opts as string[],
      correct_index: q.correct_index,
      explanation: q.explanation || "",
      lesson_id: q.lesson_id || "",
      subject_id: q.subject_id || "",
      question_type: q.question_type || "lesson",
      sort_order: q.sort_order,
      unit: q.unit || "",
      semester: q.semester?.toString() || "",
      year: q.year?.toString() || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.question_text || form.options.filter(Boolean).length < 2) {
      toast({ title: "يرجى ملء السؤال وخيارين على الأقل", variant: "destructive" });
      return;
    }
    const filteredOptions = form.options.filter(Boolean);
    const payload: any = {
      question_text: form.question_text,
      options: filteredOptions,
      correct_index: form.correct_index,
      explanation: form.explanation || null,
      lesson_id: form.lesson_id || null,
      subject_id: form.subject_id || null,
      question_type: form.question_type,
      sort_order: form.sort_order,
      unit: form.unit || null,
      semester: form.semester ? parseInt(form.semester) : null,
      year: form.year ? parseInt(form.year) : null,
    };
    if (editing) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("questions").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    loadQuestions();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف السؤال؟")) return;
    await supabase.from("questions").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    loadQuestions();
  };

  const updateOption = (index: number, value: string) => {
    const opts = [...form.options];
    opts[index] = value;
    setForm({ ...form, options: opts });
  };

  // ─── Excel Import ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportPreview(null);
    parseExcelPreview(file);
  };

  const parseExcelPreview = async (file: File) => {
    try {
      let rows: string[][] = [];

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        rows = jsonData.map(r => r.map(c => String(c).trim()));
      } else {
        const text = await file.text();
        rows = text.split("\n").map(r => r.split(/[,\t]/).map(c => c.replace(/^"|"$/g, "").trim()));
      }

      if (rows.length < 2) {
        toast({ title: "الملف فارغ أو لا يحتوي على بيانات كافية", variant: "destructive" });
        return;
      }
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const preview = rows.slice(1).filter(r => r.some(c => c)).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ""; });
        return obj;
      });
      setImportPreview(preview.slice(0, 100));
    } catch {
      toast({ title: "خطأ في قراءة الملف", variant: "destructive" });
    }
  };

  const processImport = async () => {
    if (!importPreview?.length) return;
    setImporting(true);

    try {
      // Map column names (Arabic or English)
      const colMap: Record<string, string[]> = {
        question_text: ["السؤال", "نص السؤال", "question", "question_text"],
        option1: ["الخيار 1", "الخيار الاول", "خيار 1", "option1", "option_1", "a"],
        option2: ["الخيار 2", "الخيار الثاني", "خيار 2", "option2", "option_2", "b"],
        option3: ["الخيار 3", "الخيار الثالث", "خيار 3", "option3", "option_3", "c"],
        option4: ["الخيار 4", "الخيار الرابع", "خيار 4", "option4", "option_4", "d"],
        correct: ["الإجابة الصحيحة", "الاجابة", "الإجابة", "correct", "correct_index", "answer"],
        explanation: ["الشرح", "التوضيح", "explanation"],
        unit: ["الوحدة", "unit"],
      };

      const findCol = (row: any, keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find(rk => rk === k || rk.includes(k));
          if (found && row[found]) return row[found];
        }
        return "";
      };

      const questionsToInsert: any[] = [];
      let skipped = 0;

      for (const row of importPreview) {
        const qText = findCol(row, colMap.question_text);
        if (!qText) { skipped++; continue; }

        const opts = [
          findCol(row, colMap.option1),
          findCol(row, colMap.option2),
          findCol(row, colMap.option3),
          findCol(row, colMap.option4),
        ].filter(Boolean);

        if (opts.length < 2) { skipped++; continue; }

        // Determine correct index
        let correctIndex = 0;
        const correctVal = findCol(row, colMap.correct);
        if (correctVal) {
          // Check if it's a number (1-based index)
          const num = parseInt(correctVal);
          if (!isNaN(num) && num >= 1 && num <= opts.length) {
            correctIndex = num - 1;
          } else {
            // Check Arabic letters
            const letterMap: Record<string, number> = { "أ": 0, "ا": 0, "ب": 1, "ت": 2, "ث": 3, "a": 0, "b": 1, "c": 2, "d": 3 };
            const idx = letterMap[correctVal.trim().toLowerCase()];
            if (idx !== undefined) correctIndex = idx;
            else {
              // Try matching option text
              const matchIdx = opts.findIndex(o => o === correctVal.trim());
              if (matchIdx >= 0) correctIndex = matchIdx;
            }
          }
        }

        questionsToInsert.push({
          question_text: qText,
          options: opts,
          correct_index: correctIndex,
          explanation: findCol(row, colMap.explanation) || null,
          unit: findCol(row, colMap.unit) || null,
          subject_id: importSubject || null,
          lesson_id: importLesson || null,
          semester: importSemester ? parseInt(importSemester) : null,
          question_type: importType || "lesson",
          sort_order: 0,
        });
      }

      if (questionsToInsert.length === 0) {
        toast({ title: "لم يتم العثور على أسئلة صالحة في الملف", variant: "destructive" });
        setImporting(false);
        return;
      }

      // Insert in batches of 50
      let inserted = 0;
      for (let i = 0; i < questionsToInsert.length; i += 50) {
        const batch = questionsToInsert.slice(i, i + 50);
        const { error } = await supabase.from("questions").insert(batch);
        if (error) {
          toast({ title: "خطأ في الاستيراد", description: error.message, variant: "destructive" });
          break;
        }
        inserted += batch.length;
      }

      toast({
        title: `تم استيراد ${inserted} سؤال`,
        description: skipped > 0 ? `تم تخطي ${skipped} صف غير صالح` : undefined,
      });
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview(null);
      loadQuestions();
    } catch (e: any) {
      toast({ title: "خطأ في الاستيراد", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const bom = "\uFEFF";
    const csv = bom + "السؤال,الخيار 1,الخيار 2,الخيار 3,الخيار 4,الإجابة الصحيحة,الشرح,الوحدة\n" +
      "ما عاصمة اليمن؟,صنعاء,عدن,تعز,حضرموت,1,صنعاء هي العاصمة الرسمية,الوحدة الأولى\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [exporting, setExporting] = useState(false);

  const exportQuestions = async (format: "csv" | "xlsx") => {
    setExporting(true);
    try {
      let query = supabase
        .from("questions")
        .select("*, lessons(title), subjects(name)")
        .order("sort_order");

      if (searchTerm.trim()) query = query.ilike("question_text", `%${searchTerm.trim()}%`);
      if (filterType) query = query.eq("question_type", filterType);
      if (filterSubject) query = query.eq("subject_id", filterSubject);
      if (filterLesson) query = query.eq("lesson_id", filterLesson);
      if (filterSemester) query = query.eq("semester", parseInt(filterSemester));
      if (filterGrade && !filterSubject) {
        const gradeSubjectIds = allSubjects.filter(s => s.grade_id === filterGrade).map(s => s.id);
        if (gradeSubjectIds.length > 0) query = query.in("subject_id", gradeSubjectIds);
        else { setExporting(false); return; }
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "لا توجد أسئلة للتصدير", variant: "destructive" });
        setExporting(false);
        return;
      }

      const arabicLabels = ["أ", "ب", "ت", "ث"];
      const headers = ["السؤال", "الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4", "الإجابة الصحيحة", "الشرح", "المادة", "الدرس", "النوع", "الوحدة", "الفصل", "السنة"];
      const typeLabels: Record<string, string> = { lesson: "سؤال درس", exam: "اختبار شامل", bank: "بنك أسئلة" };

      const rows = data.map((q: any) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        return [
          q.question_text || "",
          opts[0] || "", opts[1] || "", opts[2] || "", opts[3] || "",
          arabicLabels[q.correct_index] || String(q.correct_index + 1),
          q.explanation || "",
          q.subjects?.name || "",
          q.lessons?.title || "",
          typeLabels[q.question_type] || q.question_type || "",
          q.unit || "",
          q.semester ? `الفصل ${q.semester}` : "",
          q.year?.toString() || "",
        ];
      });

      const filterLabel = filterSubject
        ? allSubjects.find(s => s.id === filterSubject)?.name || "أسئلة"
        : filterGrade
          ? grades.find(g => g.id === filterGrade)?.name || "أسئلة"
          : "جميع_الأسئلة";
      const fileName = `${filterLabel}_${new Date().toISOString().slice(0, 10)}`;

      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Style: set column widths
        ws["!cols"] = headers.map((h) => ({ wch: h === "السؤال" || h === "الشرح" ? 40 : 18 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        const escapeCSV = (val: string) => {
          if (!val) return "";
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return '"' + val.replace(/"/g, '""') + '"';
          }
          return val;
        };
        const bom = "\uFEFF";
        const csvContent = bom + [headers, ...rows].map(r => r.map(escapeCSV).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: `تم تصدير ${data.length} سؤال بصيغة ${format.toUpperCase()} بنجاح` });
    } catch (e: any) {
      toast({ title: "خطأ في التصدير", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة الأسئلة</h1>
          <p className="text-sm text-muted-foreground">{totalCount} سؤال</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportQuestions("csv")} disabled={exporting} className="gap-1.5">
            <Download className="h-4 w-4" /> تصدير CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportQuestions("xlsx")} disabled={exporting} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" /> {exporting ? "جاري التصدير..." : "تصدير Excel"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setImportDialogOpen(true);
            setImportFile(null);
            setImportPreview(null);
            setImportGrade("");
            setImportSubject("");
            setImportLesson("");
            setImportSemester("");
            setImportType("lesson");
          }} className="gap-1.5">
            <Upload className="h-4 w-4" /> استيراد
          </Button>
          <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> إضافة سؤال
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
              placeholder="ابحث في الأسئلة..."
              className="pr-9"
            />
          </div>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل الأنواع</option>
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select value={filterSemester} onChange={(e) => { setFilterSemester(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل الفصول</option>
            <option value="1">الفصل الأول</option>
            <option value="2">الفصل الثاني</option>
          </select>
          <select value={filterGrade} onChange={(e) => {
            setFilterGrade(e.target.value); setFilterSubject(""); setFilterLesson(""); setPage(1);
          }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل الصفوف</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={filterSubject} onChange={(e) => {
            setFilterSubject(e.target.value); setFilterLesson(""); setPage(1);
          }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل المواد</option>
            {filteredSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterLesson} onChange={(e) => { setFilterLesson(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">كل الدروس</option>
            {filteredLessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد أسئلة بعد</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="flex items-start justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-card-foreground line-clamp-2">{q.question_text}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {q.lessons?.title && (
                      <span className="text-[11px] bg-primary/10 text-primary rounded-full px-2 py-0.5">{q.lessons.title}</span>
                    )}
                    {q.subjects?.name && (
                      <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">{q.subjects.name}</span>
                    )}
                    {q.unit && (
                      <span className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">{q.unit}</span>
                    )}
                    {q.semester && (
                      <span className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">ف{q.semester}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || "سؤال درس"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mr-3 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? "تعديل السؤال" : "إضافة سؤال"}</DialogTitle>
            <DialogDescription>أدخل بيانات السؤال</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">نص السؤال</label>
              <textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الخيارات</label>
              {form.options.map((opt, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <input type="radio" name="correct" checked={form.correct_index === i}
                    onChange={() => setForm({ ...form, correct_index: i })}
                    className="h-4 w-4 accent-primary" />
                  <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`الخيار ${i + 1}`} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">حدد الإجابة الصحيحة بالنقر على الدائرة</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الشرح (اختياري)</label>
              <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">نوع السؤال</label>
                <select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">الفصل الدراسي</label>
                <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون تحديد</option>
                  <option value="1">الفصل الأول</option>
                  <option value="2">الفصل الثاني</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">الصف</label>
                <select value={formGrade} onChange={(e) => {
                  setFormGrade(e.target.value);
                  setForm({ ...form, subject_id: "", lesson_id: "" });
                }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر الصف</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">المادة</label>
                <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value, lesson_id: "" })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون مادة</option>
                  {formSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.question_type === "lesson" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">الدرس</label>
                  <select value={form.lesson_id} onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">بدون درس</option>
                    {formLessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">الوحدة</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="مثال: الوحدة الأولى" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">السنة (اختياري)</label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="مثال: 2024" />
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
              استيراد الأسئلة من ملف
            </DialogTitle>
            <DialogDescription>ارفع ملف CSV أو TXT يحتوي على الأسئلة والإجابات</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Target filters */}
            <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">إضافة الأسئلة المستوردة إلى:</p>
              <div className="grid grid-cols-2 gap-3">
                <select value={importSemester} onChange={(e) => setImportSemester(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون فصل</option>
                  <option value="1">الفصل الأول</option>
                  <option value="2">الفصل الثاني</option>
                </select>
                <select value={importType} onChange={(e) => setImportType(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select value={importGrade} onChange={(e) => {
                  setImportGrade(e.target.value); setImportSubject(""); setImportLesson("");
                }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر الصف</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={importSubject} onChange={(e) => { setImportSubject(e.target.value); setImportLesson(""); }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!importGrade}>
                  <option value="">اختر المادة</option>
                  {importSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={importLesson} onChange={(e) => setImportLesson(e.target.value)}
                  className="col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!importSubject}>
                  <option value="">بدون درس</option>
                  {importLessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              {!importSubject && (
                <p className="text-xs text-destructive/80">⚠️ يُفضل تحديد الصف والمادة قبل الاستيراد</p>
              )}
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition-colors hover:border-primary/50">
                    <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      {importFile ? importFile.name : "اضغط لرفع ملف CSV أو TXT"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">يدعم ملفات Excel (.xlsx) و CSV و TXT</p>
                  </div>
                  <input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> تحميل قالب نموذجي
              </Button>
            </div>

            {/* Preview */}
            {importPreview && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  معاينة: {importPreview.length} سؤال
                </p>
                <div className="max-h-[250px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">السؤال</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">الخيارات</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">الإجابة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((row, i) => {
                        const headers = Object.keys(row);
                        const qText = row[headers.find(h =>
                          ["السؤال", "نص السؤال", "question", "question_text"].some(k => h.includes(k))
                        ) || headers[0]] || "";
                        const opts = headers.slice(1, 5).map(h => row[h]).filter(Boolean);
                        const correct = row[headers.find(h =>
                          ["الإجابة", "الاجابة", "correct", "answer"].some(k => h.includes(k))
                        ) || ""] || "";

                        return (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate">{qText}</td>
                            <td className="px-3 py-2 text-muted-foreground">{opts.length} خيارات</td>
                            <td className="px-3 py-2">{correct}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Button variant="hero" className="w-full gap-2" onClick={processImport} disabled={importing}>
                  {importing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {importing ? "جاري الاستيراد..." : `استيراد ${importPreview.length} سؤال`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuestions;
