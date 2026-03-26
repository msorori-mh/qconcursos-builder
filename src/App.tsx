import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Eager load: landing + auth (critical path)
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";

// Lazy load everything else
const GradesPage = lazy(() => import("./pages/GradesPage.tsx"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage.tsx"));
const LessonsPage = lazy(() => import("./pages/LessonsPage.tsx"));
const LessonPage = lazy(() => import("./pages/LessonPage.tsx"));
const SubjectExamPage = lazy(() => import("./pages/SubjectExamPage.tsx"));
const QuestionBankPage = lazy(() => import("./pages/QuestionBankPage.tsx"));
const SubscribePage = lazy(() => import("./pages/SubscribePage.tsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const StudentReportsPage = lazy(() => import("./pages/StudentReportsPage.tsx"));
const SchedulePage = lazy(() => import("./pages/SchedulePage.tsx"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage.tsx"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage.tsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.tsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.tsx"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminGrades = lazy(() => import("./pages/admin/AdminGrades.tsx"));
const AdminSubjects = lazy(() => import("./pages/admin/AdminSubjects.tsx"));
const AdminLessons = lazy(() => import("./pages/admin/AdminLessons.tsx"));
const AdminQuestions = lazy(() => import("./pages/admin/AdminQuestions.tsx"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments.tsx"));
const AdminPaymentMethods = lazy(() => import("./pages/admin/AdminPaymentMethods.tsx"));
const AdminSubscriptionPlans = lazy(() => import("./pages/admin/AdminSubscriptionPlans.tsx"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents.tsx"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports.tsx"));
const AdminContactMessages = lazy(() => import("./pages/admin/AdminContactMessages.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="masar-theme">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
              <Route path="/grades/:gradeId/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
              <Route path="/grades/:gradeId/subjects/:subjectId/lessons" element={<ProtectedRoute><LessonsPage /></ProtectedRoute>} />
              <Route path="/grades/:gradeId/subjects/:subjectId/lessons/:lessonId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
              <Route path="/grades/:gradeId/subjects/:subjectId/exam" element={<ProtectedRoute><SubjectExamPage /></ProtectedRoute>} />
              <Route path="/grades/:gradeId/subjects/:subjectId/quiz" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
              <Route path="/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><StudentReportsPage /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
              <Route path="/study-plan" element={<ProtectedRoute><StudyPlanPage /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="grades" element={<AdminGrades />} />
                <Route path="subjects" element={<AdminSubjects />} />
                <Route path="lessons" element={<AdminLessons />} />
                <Route path="questions" element={<AdminQuestions />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="payment-methods" element={<AdminPaymentMethods />} />
                <Route path="subscription-plans" element={<AdminSubscriptionPlans />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="messages" element={<AdminContactMessages />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
