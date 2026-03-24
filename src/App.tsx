import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import GradesPage from "./pages/GradesPage.tsx";
import SubjectsPage from "./pages/SubjectsPage.tsx";
import LessonsPage from "./pages/LessonsPage.tsx";
import LessonPage from "./pages/LessonPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/grades/:gradeId/subjects" element={<SubjectsPage />} />
          <Route path="/grades/:gradeId/subjects/:subjectId/lessons" element={<LessonsPage />} />
          <Route path="/grades/:gradeId/subjects/:subjectId/lessons/:lessonId" element={<LessonPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
