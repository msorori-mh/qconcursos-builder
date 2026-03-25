import Navbar from "@/components/Navbar";
import { BookOpen, Target, Users, Award, Heart, Lightbulb } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const team = [
  { name: "أ. محمد العمري", role: "المؤسس والمدير التنفيذي", icon: Lightbulb },
  { name: "أ. أحمد السعيدي", role: "مدير المحتوى التعليمي", icon: BookOpen },
  { name: "أ. سارة الحسني", role: "مصممة تجربة المستخدم", icon: Heart },
];

const values = [
  {
    icon: Target,
    title: "رؤيتنا",
    description:
      "أن نكون المنصة التعليمية الرائدة التي توفر تعليمًا عالي الجودة لكل طالب، بغض النظر عن موقعه الجغرافي أو ظروفه الاقتصادية.",
  },
  {
    icon: BookOpen,
    title: "رسالتنا",
    description:
      "تقديم محتوى تعليمي متميز ومبسّط يساعد الطلاب على فهم المواد الدراسية وتحقيق التفوق الأكاديمي من خلال دروس تفاعلية واختبارات ذكية.",
  },
  {
    icon: Award,
    title: "قيمنا",
    description:
      "الجودة والتميز في المحتوى، الشفافية مع طلابنا وأولياء الأمور، والابتكار المستمر لتوفير أفضل تجربة تعليمية ممكنة.",
  },
];

const stats = [
  { value: "+500", label: "طالب مسجل" },
  { value: "+200", label: "درس تعليمي" },
  { value: "+50", label: "مادة دراسية" },
  { value: "24/7", label: "متاح دائمًا" },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="من نحن"
        description="تعرف على منصة تنوير التعليمية، فريق العمل، رؤيتنا ورسالتنا في تقديم تعليم عالي الجودة لطلاب اليمن."
        canonical="/about"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient py-20 text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="mb-4 text-3xl font-extrabold sm:text-4xl">من نحن</h1>
          <p className="mx-auto max-w-2xl text-lg text-primary-foreground/85">
            منصة تعليمية يمنية تهدف إلى تمكين الطلاب من التفوق الأكاديمي
            عبر محتوى تعليمي مبسّط وعالي الجودة.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card py-10">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-primary sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision / Mission / Values */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground">ما الذي يميّزنا</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-border bg-card p-8 shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <v.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-card-foreground">{v.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-border bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground">فريق العمل</h2>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
            {team.map((m) => (
              <div
                key={m.name}
                className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-hero-gradient text-primary-foreground">
                  <m.icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-card-foreground">{m.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">انضم إلينا اليوم</h2>
          <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
            ابدأ رحلتك التعليمية معنا واستفد من مئات الدروس والاختبارات المصممة لتساعدك على التفوق.
          </p>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-8 py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            سجّل الآن
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} طالب مكين. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
