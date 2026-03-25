import { BookOpen, Video, FileText, HelpCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Video,
    title: "شرح فيديو",
    description: "دروس مصورة بجودة عالية لكل درس في المنهج الدراسي",
  },
  {
    icon: FileText,
    title: "ملخصات ومذكرات",
    description: "محتوى مكتوب وملفات PDF لمراجعة سريعة وفعالة",
  },
  {
    icon: HelpCircle,
    title: "بنك أسئلة",
    description: "أسئلة مراجعة لكل درس مع إجابات نموذجية وتوضيحات",
  },
  {
    icon: BookOpen,
    title: "اختبارات تجريبية",
    description: "محاكاة للاختبارات النهائية مع توقيت ونتائج فورية",
  },
];

const grades = [
  { id: "7", name: "الصف السابع", color: "from-primary to-primary/80" },
  { id: "8", name: "الصف الثامن", color: "from-primary/90 to-primary/70" },
  { id: "9", name: "الصف التاسع", color: "from-primary/80 to-primary/60" },
  { id: "10", name: "الصف الأول الثانوي", color: "from-accent to-accent/80" },
  { id: "11", name: "الصف الثاني الثانوي", color: "from-accent/90 to-accent/70" },
  { id: "12", name: "الصف الثالث الثانوي", color: "from-accent/80 to-accent/60" },
];

const stats = [
  { value: "+500", label: "درس مصور" },
  { value: "+2000", label: "سؤال مراجعة" },
  { value: "+50", label: "اختبار تجريبي" },
  { value: "24/7", label: "متاح دائماً" },
];

const HeroSection = () => (
  <section className="relative overflow-hidden bg-hero-gradient px-4 py-16 md:py-24">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-accent blur-3xl" />
      <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-primary-foreground blur-3xl" />
    </div>
    <div className="container relative mx-auto text-center">
      <h1 className="mb-6 text-3xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl animate-fade-in-up">
        تعليم أفضل لكل
        <span className="block mt-2">طالب في اليمن 🇾🇪</span>
      </h1>
      <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-primary-foreground/85 md:text-lg opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        منصة تنوير توفر لك شروحات فيديو، ملخصات، وبنك أسئلة شامل لجميع المواد الدراسية. تعلّم في أي وقت ومن أي مكان.
      </p>
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row opacity-0 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
        <Link to="/grades">
          <Button variant="accent" size="lg" className="gap-2 text-base px-8 py-6">
            <BookOpen className="h-5 w-5" />
            اختر صفك الدراسي
          </Button>
        </Link>
        <Link to="/about">
          <Button variant="outline" size="lg" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-base px-8 py-6">
            تعرف على المنصة
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-primary-foreground/10 backdrop-blur-sm px-4 py-5">
            <div className="text-2xl font-extrabold text-primary-foreground md:text-3xl">{stat.value}</div>
            <div className="mt-1 text-sm text-primary-foreground/75">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FeaturesSection = () => (
  <section className="px-4 py-16 md:py-20">
    <div className="container mx-auto">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">كل ما تحتاجه في مكان واحد</h2>
        <p className="text-muted-foreground">أدوات تعليمية متكاملة مصممة خصيصاً للمنهج اليمني</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-card-foreground">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const GradesPreview = () => (
  <section className="bg-secondary/50 px-4 py-16 md:py-20">
    <div className="container mx-auto">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">اختر صفك الدراسي</h2>
        <p className="text-muted-foreground">محتوى تعليمي مخصص لكل مرحلة دراسية</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grades.map((grade, i) => (
          <Link
            key={grade.id}
            to={`/grades/${grade.id}/subjects`}
            className="group opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">{grade.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">جميع المواد الدراسية</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <ArrowLeft className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = () => (
  <section className="px-4 py-16 md:py-20">
    <div className="container mx-auto">
      <div className="rounded-3xl bg-hero-gradient p-8 text-center md:p-16">
        <h2 className="mb-4 text-2xl font-bold text-primary-foreground md:text-3xl">
          ابدأ رحلتك التعليمية اليوم
        </h2>
        <p className="mx-auto mb-8 max-w-lg text-primary-foreground/80">
          انضم لآلاف الطلاب الذين يستخدمون تنوير لتحقيق التفوق الدراسي
        </p>
        <Link to="/grades">
          <Button variant="accent" size="lg" className="px-10 py-6 text-base">
            ابدأ الآن مجاناً
          </Button>
        </Link>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-border bg-card px-4 py-8">
    <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hero-gradient">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">تنوير</span>
      </div>
      <p className="text-sm text-muted-foreground">© 2024 تنوير — جميع الحقوق محفوظة</p>
    </div>
  </footer>
);

const LandingPage = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <GradesPreview />
      <CTASection />
      <Footer />
    </>
  );
};

export default LandingPage;
