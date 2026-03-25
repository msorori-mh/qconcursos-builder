import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEOHead
        title="الصفحة غير موجودة"
        description="الصفحة التي تبحث عنها غير موجودة. عد إلى الصفحة الرئيسية لمنصة تنوير التعليمية."
        noIndex
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">عذرًا! الصفحة غير موجودة</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          العودة للصفحة الرئيسية
        </a>
      </div>
    </div>
  );
};

export default NotFound;
