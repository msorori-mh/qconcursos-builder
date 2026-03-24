import { useEffect, useState } from "react";
import { GraduationCap, BookOpen, FileText, Users, CreditCard, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    grades: 0,
    subjects: 0,
    lessons: 0,
    questions: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [grades, subjects, lessons, questions, payments] = await Promise.all([
      supabase.from("grades").select("id", { count: "exact", head: true }),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("lessons").select("id", { count: "exact", head: true }),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setStats({
      grades: grades.count || 0,
      subjects: subjects.count || 0,
      lessons: lessons.count || 0,
      questions: questions.count || 0,
      pendingPayments: payments.count || 0,
    });
  };

  const cards = [
    { label: "الصفوف", value: stats.grades, icon: GraduationCap, color: "text-primary", bg: "bg-primary/10" },
    { label: "المواد", value: stats.subjects, icon: BookOpen, color: "text-accent", bg: "bg-accent/10" },
    { label: "الدروس", value: stats.lessons, icon: FileText, color: "text-success", bg: "bg-success/10" },
    { label: "الأسئلة", value: stats.questions, icon: HelpCircle, color: "text-primary", bg: "bg-primary/10" },
    { label: "طلبات دفع معلقة", value: stats.pendingPayments, icon: CreditCard, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-foreground">نظرة عامة</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
