import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import LandingPage from "@/components/LandingPage";
import SEOHead, { websiteJsonLd, educationalOrgJsonLd } from "@/components/SEOHead";

const Index = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) return; // show landing page for guests

    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else if (profile?.grade_id) {
      navigate(`/grades/${profile.grade_id}/subjects`, { replace: true });
    } else {
      navigate("/grades", { replace: true });
    }
  }, [user, profile, loading, isAdmin, navigate]);

  // Show landing page while loading or for guests
  if (loading || user) {
    return loading ? (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ) : null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="تنوير — منصة تعليمية لطلاب اليمن"
        description="منصة تنوير التعليمية تقدم شروحات فيديو ودروس تفاعلية واختبارات لطلاب المرحلة الإعدادية والثانوية في اليمن. ابدأ رحلتك التعليمية الآن!"
        canonical="/"
        jsonLd={{ "@context": "https://schema.org", "@graph": [websiteJsonLd(), educationalOrgJsonLd()] }}
      />
      <Navbar />
      <LandingPage />
    </div>
  );
};

export default Index;
