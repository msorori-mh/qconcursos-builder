import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Menu, X, LogOut, User, BarChart3 } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, profile, isAdmin } = useAuth();

  const gradesHref = !isAdmin && profile?.grade_id
    ? `/grades/${profile.grade_id}/subjects`
    : "/grades";

  const links = [
    { href: "/", label: "الرئيسية" },
    { href: gradesHref, label: isAdmin ? "الصفوف الدراسية" : "المواد الدراسية" },
    ...(!user ? [
      { href: "/about", label: "من نحن" },
      { href: "/contact", label: "تواصل معنا" },
    ] : []),
    ...(user && !isAdmin ? [
      { href: "/reports", label: "تقاريري" },
      { href: "/schedule", label: "جدولي" },
      { href: "/study-plan", label: "المساعد الذكي" },
    ] : []),
    ...(isAdmin ? [{ href: "/admin", label: "لوحة التحكم" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hero-gradient">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">تنوير</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <NotificationBell />
              <Link to="/profile" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <User className="h-4 w-4" />
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "طالب"}
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                خروج
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/auth">
                <Button variant="hero" size="sm">ابدأ التعلم</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground active:bg-muted transition-colors md:hidden">
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden safe-bottom animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-colors active:bg-muted ${
                  location.pathname === link.href ? "text-primary bg-primary/5" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground active:bg-muted">
                  <User className="h-4 w-4" /> ملفي الشخصي
                </Link>
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <ThemeToggle />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 py-5" onClick={() => { handleSignOut(); setIsOpen(false); }}>
                  <LogOut className="h-3.5 w-3.5" />
                  تسجيل خروج
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="hero" size="sm" className="mt-2 w-full py-5">ابدأ التعلم</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
