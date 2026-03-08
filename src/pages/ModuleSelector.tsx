import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, Map, Code2, BookOpen, TrendingUp, Trophy, Timer, Brain, Target,
  Bookmark, Award, Share2, Plus, MessageSquare, Layers, Building2, Clock,
  FileSpreadsheet, Zap, BarChart3, GraduationCap, Dices, Flame, Calendar,
  AlertTriangle, Activity, Search, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getTotalProblems } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP, getNeetcodeTotalProblems } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP, getLeetcodeTop150TotalProblems } from '@/lib/leetcode-top150-data';

interface ModuleCard {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  category: 'roadmap' | 'practice' | 'study' | 'social' | 'tools';
  accent: string;
}

const MODULES: ModuleCard[] = [
  // Roadmaps
  { id: 'striver', title: 'Striver SDE Sheet', subtitle: '454 curated problems', icon: <Map className="h-5 w-5" />, route: '/striver', category: 'roadmap', accent: 'text-primary' },
  { id: 'neetcode', title: 'NeetCode 150', subtitle: '150 essential problems', icon: <Code2 className="h-5 w-5" />, route: '/neetcode', category: 'roadmap', accent: 'text-emerald-500' },
  { id: 'leetcode150', title: 'LeetCode Top 150', subtitle: '150 must-do problems', icon: <BookOpen className="h-5 w-5" />, route: '/leetcode150', category: 'roadmap', accent: 'text-amber-500' },
  { id: 'learning-path', title: 'Adaptive Learning Path', subtitle: 'AI-personalized roadmap', icon: <Brain className="h-5 w-5" />, route: '/learning-path', category: 'roadmap', accent: 'text-violet-500' },
  // Practice
  { id: 'contest', title: 'Contest Mode', subtitle: 'Timed problem solving', icon: <Timer className="h-5 w-5" />, route: '/contest', category: 'practice', accent: 'text-red-500' },
  { id: 'interview', title: 'Mock Interview', subtitle: 'Simulate real interviews', icon: <MessageSquare className="h-5 w-5" />, route: '/interview', category: 'practice', accent: 'text-violet-500' },
  { id: 'playground', title: 'Code Playground', subtitle: 'Free-form Java sandbox', icon: <Zap className="h-5 w-5" />, route: '/playground', category: 'practice', accent: 'text-cyan-500' },
  { id: 'generator', title: 'Problem Generator', subtitle: 'AI-generated challenges', icon: <Dices className="h-5 w-5" />, route: '/generator', category: 'practice', accent: 'text-pink-500' },
  { id: 'custom', title: 'Custom Problems', subtitle: 'Create your own problems', icon: <Plus className="h-5 w-5" />, route: '/custom-problems', category: 'practice', accent: 'text-indigo-500' },
  { id: 'code-review', title: 'AI Code Review', subtitle: 'Quality & best practices', icon: <Zap className="h-5 w-5" />, route: '/code-review', category: 'practice', accent: 'text-amber-500' },
  // Study
  { id: 'flashcards', title: 'Flashcards', subtitle: '30+ DSA concept cards', icon: <Layers className="h-5 w-5" />, route: '/flashcards', category: 'study', accent: 'text-orange-500' },
  { id: 'cheatsheet', title: 'Cheat Sheet', subtitle: 'Quick algorithm reference', icon: <BookOpen className="h-5 w-5" />, route: '/cheatsheet', category: 'study', accent: 'text-teal-500' },
  { id: 'patterns', title: 'Patterns Library', subtitle: 'Common coding patterns', icon: <GraduationCap className="h-5 w-5" />, route: '/patterns', category: 'study', accent: 'text-blue-500' },
  { id: 'learning', title: 'Learning Mode', subtitle: 'Interactive algorithm lessons', icon: <Brain className="h-5 w-5" />, route: '/learning', category: 'study', accent: 'text-purple-500' },
  { id: 'spaced', title: 'Spaced Repetition', subtitle: 'SM-2 review scheduling', icon: <Clock className="h-5 w-5" />, route: '/spaced-repetition', category: 'study', accent: 'text-rose-500' },
  { id: 'company', title: 'Company Tags', subtitle: '20 companies, 400+ mappings', icon: <Building2 className="h-5 w-5" />, route: '/company-tags', category: 'study', accent: 'text-sky-500' },
  // Social & Gamification
  { id: 'achievements', title: 'Achievements', subtitle: 'XP, levels & badges', icon: <Award className="h-5 w-5" />, route: '/achievements', category: 'social', accent: 'text-yellow-500' },
  { id: 'leaderboard', title: 'Leaderboard', subtitle: 'Compete with others', icon: <Trophy className="h-5 w-5" />, route: '/leaderboard', category: 'social', accent: 'text-amber-500' },
  { id: 'community', title: 'Community Solutions', subtitle: 'Share & learn from others', icon: <Share2 className="h-5 w-5" />, route: '/community', category: 'social', accent: 'text-green-500' },
  { id: 'discuss', title: 'Discussion Forum', subtitle: 'Per-problem discussions', icon: <MessageSquare className="h-5 w-5" />, route: '/discuss', category: 'social', accent: 'text-blue-500' },
  // Tools & Productivity
  { id: 'planner', title: 'Study Planner', subtitle: 'Daily goals & streaks', icon: <Calendar className="h-5 w-5" />, route: '/study-planner', category: 'tools', accent: 'text-primary' },
  { id: 'weak-topics', title: 'Weak Topic Analyzer', subtitle: 'Find & fix weak areas', icon: <AlertTriangle className="h-5 w-5" />, route: '/weak-topics', category: 'tools', accent: 'text-destructive' },
  { id: 'complexity', title: 'Complexity Tracker', subtitle: 'Track execution trends', icon: <Activity className="h-5 w-5" />, route: '/complexity', category: 'tools', accent: 'text-emerald-500' },
  { id: 'goals', title: 'Weekly Goals', subtitle: 'Track weekly targets', icon: <Target className="h-5 w-5" />, route: '/goals', category: 'tools', accent: 'text-lime-500' },
  { id: 'pomodoro', title: 'Pomodoro Timer', subtitle: 'Focus & break cycles', icon: <Clock className="h-5 w-5" />, route: '/pomodoro', category: 'tools', accent: 'text-red-400' },
  { id: 'bookmarks', title: 'Bookmarks', subtitle: 'Saved for revision', icon: <Bookmark className="h-5 w-5" />, route: '/bookmarks', category: 'tools', accent: 'text-blue-400' },
  { id: 'export', title: 'Progress Export', subtitle: 'CSV & JSON export', icon: <FileSpreadsheet className="h-5 w-5" />, route: '/export', category: 'tools', accent: 'text-gray-500' },
  { id: 'analytics', title: 'Study Analytics', subtitle: 'Visualize your progress', icon: <BarChart3 className="h-5 w-5" />, route: '/analytics', category: 'tools', accent: 'text-indigo-400' },
  { id: 'dashboard', title: 'Performance Dashboard', subtitle: 'Unified overview', icon: <TrendingUp className="h-5 w-5" />, route: '/dashboard', category: 'tools', accent: 'text-primary' },
];

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode }> = {
  roadmap: { label: '📚 Problem Roadmaps', icon: <Map className="h-4 w-4" /> },
  practice: { label: '⚡ Practice & Challenges', icon: <Zap className="h-4 w-4" /> },
  study: { label: '🧠 Study & Learn', icon: <Brain className="h-4 w-4" /> },
  social: { label: '🏆 Social & Gamification', icon: <Trophy className="h-4 w-4" /> },
  tools: { label: '🛠️ Tools & Utilities', icon: <Target className="h-4 w-4" /> },
};

const ModuleSelector = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [solvedCount, setSolvedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalProblems] = useState(getTotalProblems() + getNeetcodeTotalProblems() + getLeetcodeTop150TotalProblems());

  useEffect(() => {
    if (!authUser) return;
    supabase.from('user_problem_progress').select('problem_key, solved, last_attempted')
      .eq('user_id', authUser.id).eq('solved', true)
      .then(({ data }) => {
        setSolvedCount((data || []).length);
        // Streak calculation
        const dates = (data || []).filter((p: any) => p.last_attempted)
          .map((p: any) => new Date(p.last_attempted).toDateString());
        const unique = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        let s = 0;
        const today = new Date();
        for (let i = 0; i < unique.length; i++) {
          const expected = new Date(today);
          expected.setDate(expected.getDate() - i);
          if (unique[i] === expected.toDateString()) s++; else break;
        }
        setStreak(s);
      });
  }, [authUser]);

  const categories = ['roadmap', 'practice', 'study', 'social', 'tools'];

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3 overflow-x-auto scrollbar-none">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 gap-1.5 text-xs font-medium rounded-lg shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back to IDE</span><span className="sm:hidden">Back</span>
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 shrink-0">
          <TrendingUp className="h-4 w-4 text-foreground" />
          <span className="text-sm font-semibold tracking-tight">Feature Hub</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10">
          {/* Hero Stats */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end gap-4 sm:gap-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">{MODULES.length} modules · {categories.length} categories</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-4 sm:gap-5">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{solvedCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Solved</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{totalProblems}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center flex flex-col items-center">
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{streak}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-0.5"><Flame className="h-3 w-3" /> Streak</p>
              </div>
            </div>
          </div>

          {solvedCount > 0 && (
            <Progress value={(solvedCount / totalProblems) * 100} className="h-1.5 rounded-full" />
          )}

          {/* Categories */}
          {categories.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{CATEGORY_INFO[cat].label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                {MODULES.filter(m => m.category === cat).map(mod => (
                  <div
                    key={mod.id}
                    className="card-interactive cursor-pointer rounded-xl border border-border bg-card p-4 flex items-start gap-3.5 group"
                    onClick={() => navigate(mod.route)}
                  >
                    <div className="p-2 rounded-lg bg-secondary text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                      {mod.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{mod.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{mod.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModuleSelector;
