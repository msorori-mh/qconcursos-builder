import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import GradesPage from "./pages/GradesPage.tsx";
import SubjectsPage from "./pages/SubjectsPage.tsx";
import LessonsPage from "./pages/LessonsPage.tsx";
import LessonPage from "./pages/LessonPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import SubscribePage from "./pages/SubscribePage.tsx";
import NotFound from "./pages/NotFound.tsx";

import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminGrades from "./pages/admin/AdminGrades.tsx";
import AdminSubjects from "./pages/admin/AdminSubjects.tsx";
import AdminLessons from "./pages/admin/AdminLessons.tsx";
import AdminQuestions from "./pages/admin/AdminQuestions.tsx";
import AdminPayments from "./pages/admin/AdminPayments.tsx";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
            <Route path="/grades/:gradeId/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
            <Route path="/grades/:gradeId/subjects/:subjectId/lessons" element={<ProtectedRoute><LessonsPage /></ProtectedRoute>} />
            <Route path="/grades/:gradeId/subjects/:subjectId/lessons/:lessonId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
            <Route path="/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="grades" element={<AdminGrades />} />
              <Route path="subjects" element={<AdminSubjects />} />
              <Route path="lessons" element={<AdminLessons />} />
              <Route path="questions" element={<AdminQuestions />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="payment-methods" element={<AdminPaymentMethods />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
