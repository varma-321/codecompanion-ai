import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
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
import PerformanceDashboard from "./pages/PerformanceDashboard";
import AdaptiveLearningPath from "./pages/AdaptiveLearningPath";
import CodeReview from "./pages/CodeReview";
import DiscussionForum from "./pages/DiscussionForum";
import TodayReview from "./pages/TodayReview";
import GlobalSearch from "./pages/GlobalSearch";
import StreakCalendar from "./pages/StreakCalendar";
import BigOVisualizer from "./pages/BigOVisualizer";
import UserProfile from "./pages/UserProfile";
import SubmissionHistory from "./pages/SubmissionHistory";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSignup from "./pages/AdminSignup";
import AdminAgentDashboard from "./pages/AdminAgentDashboard";
import AppShell from "./components/AppShell";

const queryClient = new QueryClient();
const shell = (element: ReactNode, title?: string, subtitle?: string) => <AppShell title={title} subtitle={subtitle}>{element}</AppShell>;
const bareShell = (element: ReactNode) => <AppShell bare>{element}</AppShell>;

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
              <Route path="/contest" element={shell(<ContestMode />, "Contest Mode", "Timed Java practice rounds")} />
              <Route path="/review" element={shell(<SpacedRepetition />, "Spaced Repetition", "Review problems at the right interval")} />
              <Route path="/spaced-repetition" element={shell(<SpacedRepetition />, "Spaced Repetition", "Review problems at the right interval")} />
              <Route path="/patterns" element={shell(<PatternsLibrary />, "Patterns", "Reusable DSA pattern library")} />
              <Route path="/leaderboard" element={shell(<Leaderboard />, "Leaderboard", "Community progress and rankings")} />
              <Route path="/problem/:key" element={<ProblemWorkspace />} />
              <Route path="/analytics" element={shell(<StudyAnalytics />, "Study Analytics", "Practice insights and learning trends")} />
              <Route path="/generate" element={shell(<ProblemGenerator />, "Problem Generator", "Generate Java DSA drills")} />
              <Route path="/generator" element={shell(<ProblemGenerator />, "Problem Generator", "Generate Java DSA drills")} />
              <Route path="/achievements" element={shell(<Achievements />, "Achievements", "Milestones and unlocks")} />
              <Route path="/interview" element={shell(<InterviewSimulator />, "Interview Simulator", "Mock interview practice")} />
              <Route path="/create" element={shell(<CustomProblemCreator />, "Custom Problems", "Create and manage your own prompts")} />
              <Route path="/custom-problems" element={shell(<CustomProblemCreator />, "Custom Problems", "Create and manage your own prompts")} />
              <Route path="/community" element={shell(<CommunitySolutions />, "Community", "Shared Java solutions")} />
              <Route path="/flashcards" element={shell(<Flashcards />, "Flashcards", "Recall algorithms and patterns")} />
              <Route path="/companies" element={shell(<CompanyTags />, "Companies", "Practice by company tags")} />
              <Route path="/company-tags" element={shell(<CompanyTags />, "Companies", "Practice by company tags")} />
              <Route path="/goals" element={shell(<WeeklyGoals />, "Weekly Goals", "Plan your practice cadence")} />
              <Route path="/pomodoro" element={shell(<PomodoroTimer />, "Pomodoro", "Focused study sessions")} />
              <Route path="/bookmarks" element={shell(<Bookmarks />, "Bookmarks", "Saved problems")} />
              <Route path="/cheatsheet" element={shell(<CheatSheet />, "Cheat Sheet", "Quick Java DSA references")} />
              <Route path="/playground" element={shell(<CodePlayground />, "Code Playground", "Run Java experiments")} />
              <Route path="/export" element={shell(<ProgressExport />, "Export", "Download progress reports")} />
              <Route path="/learning" element={shell(<LearningMode />, "Learning Mode", "Guided algorithm lessons")} />
              <Route path="/study-planner" element={shell(<StudyPlanner />, "Study Planner", "Schedule your roadmap")} />
              <Route path="/weak-topics" element={shell(<WeakTopicAnalyzer />, "Weak Topics", "Find and fix gaps")} />
              <Route path="/complexity" element={shell(<ComplexityTracker />, "Complexity", "Track time and space complexity")} />
              <Route path="/reset-password" element={shell(<ResetPassword />, "Reset Password")} />
              <Route path="/dashboard" element={<PerformanceDashboard />} />
              <Route path="/learning-path" element={shell(<AdaptiveLearningPath />, "Adaptive Path", "Personalized Java DSA roadmap")} />
              <Route path="/code-review" element={shell(<CodeReview />, "Code Review", "AI-assisted Java review")} />
              <Route path="/discuss" element={shell(<DiscussionForum />, "Discussion", "Problem conversations")} />
              <Route path="/today-review" element={shell(<TodayReview />, "Today’s Review", "Due problems and revisions")} />
              <Route path="/search" element={shell(<GlobalSearch />, "Search", "Find problems, topics, and tools")} />
              <Route path="/streak-calendar" element={shell(<StreakCalendar />, "Activity Calendar", "Consistency and streaks")} />
              <Route path="/bigo" element={shell(<BigOVisualizer />, "Big-O Visualizer", "Explore complexity growth")} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/submissions" element={shell(<SubmissionHistory />, "Submissions", "Recent runs and attempts")} />
              <Route path="/admin-login" element={shell(<AdminLogin />, "Admin Login")} />
              <Route path="/admin/signup" element={shell(<AdminSignup />, "Admin Signup")} />
              <Route path="/admin" element={shell(<AdminDashboard />, "Admin", "Moderation and user approvals")} />
              <Route path="/admin/agent" element={<AdminAgentDashboard />} />
              <Route path="*" element={shell(<NotFound />, "Not Found")} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
