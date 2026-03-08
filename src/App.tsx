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
import Flashcards from "./pages/Flashcards";
import CompanyTags from "./pages/CompanyTags";
import WeeklyGoals from "./pages/WeeklyGoals";
import PomodoroTimer from "./pages/PomodoroTimer";
import Bookmarks from "./pages/Bookmarks";
import CheatSheet from "./pages/CheatSheet";
import CodePlayground from "./pages/CodePlayground";
import ProgressExport from "./pages/ProgressExport";
import LearningMode from "./pages/LearningMode";
import StudyPlanner from "./pages/StudyPlanner";
import WeakTopicAnalyzer from "./pages/WeakTopicAnalyzer";
import ComplexityTracker from "./pages/ComplexityTracker";
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
              <Route path="/spaced-repetition" element={<SpacedRepetition />} />
              <Route path="/patterns" element={<PatternsLibrary />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/problem/:key" element={<ProblemWorkspace />} />
              <Route path="/analytics" element={<StudyAnalytics />} />
              <Route path="/generate" element={<ProblemGenerator />} />
              <Route path="/generator" element={<ProblemGenerator />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/interview" element={<InterviewSimulator />} />
              <Route path="/create" element={<CustomProblemCreator />} />
              <Route path="/custom-problems" element={<CustomProblemCreator />} />
              <Route path="/community" element={<CommunitySolutions />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/companies" element={<CompanyTags />} />
              <Route path="/company-tags" element={<CompanyTags />} />
              <Route path="/goals" element={<WeeklyGoals />} />
              <Route path="/pomodoro" element={<PomodoroTimer />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/cheatsheet" element={<CheatSheet />} />
              <Route path="/playground" element={<CodePlayground />} />
              <Route path="/export" element={<ProgressExport />} />
              <Route path="/learning" element={<LearningMode />} />
              <Route path="/study-planner" element={<StudyPlanner />} />
              <Route path="/weak-topics" element={<WeakTopicAnalyzer />} />
              <Route path="/complexity" element={<ComplexityTracker />} />
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
