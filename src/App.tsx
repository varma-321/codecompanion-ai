import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/lib/user-context";
import { ThemeProvider } from "@/lib/theme-context";
import Index from "./pages/Index";
import StudyAnalytics from "./pages/StudyAnalytics";
import ProblemGenerator from "./pages/ProblemGenerator";
import StriverRoadmap from "./pages/StriverRoadmap";
import NeetCodeRoadmap from "./pages/NeetCodeRoadmap";
import LeetCodeTop150Roadmap from "./pages/LeetCodeTop150Roadmap";
import ModuleSelector from "./pages/ModuleSelector";
import ContestMode from "./pages/ContestMode";
import SpacedRepetition from "./pages/SpacedRepetition";
import PatternsLibrary from "./pages/PatternsLibrary";
import Leaderboard from "./pages/Leaderboard";
import ProblemWorkspace from "./pages/ProblemWorkspace";
import ResetPassword from "./pages/ResetPassword";
import Achievements from "./pages/Achievements";
import InterviewSimulator from "./pages/InterviewSimulator";
import CustomProblemCreator from "./pages/CustomProblemCreator";
import CommunitySolutions from "./pages/CommunitySolutions";
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
              <Route path="/modules" element={<ModuleSelector />} />
              <Route path="/striver" element={<StriverRoadmap />} />
              <Route path="/neetcode" element={<NeetCodeRoadmap />} />
              <Route path="/leetcode150" element={<LeetCodeTop150Roadmap />} />
              <Route path="/contest" element={<ContestMode />} />
              <Route path="/review" element={<SpacedRepetition />} />
              <Route path="/patterns" element={<PatternsLibrary />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/problem/:key" element={<ProblemWorkspace />} />
              <Route path="/analytics" element={<StudyAnalytics />} />
              <Route path="/generate" element={<ProblemGenerator />} />
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
