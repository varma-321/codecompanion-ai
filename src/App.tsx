import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/lib/user-context";
import { ThemeProvider } from "@/lib/theme-context";
import Index from "./pages/Index";
import LearningMode from "./pages/LearningMode";
import StudyAnalytics from "./pages/StudyAnalytics";
import ProblemGenerator from "./pages/ProblemGenerator";
import DSARoadmap from "./pages/DSARoadmap";
import StriverRoadmap from "./pages/StriverRoadmap";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/learn" element={<LearningMode />} />
              <Route path="/analytics" element={<StudyAnalytics />} />
              <Route path="/generate" element={<ProblemGenerator />} />
              <Route path="/roadmap" element={<DSARoadmap />} />
              <Route path="/striver" element={<StriverRoadmap />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
