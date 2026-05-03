import { ReactNode, useMemo } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  Home, Map, Code2, BookOpen, Brain, Trophy, Calendar, Target, Sparkles, Search,
  User, Users, LogOut, Settings, Moon, Sun, BarChart3, Layers, GraduationCap, Clock,
  Building2, MessageSquare, Award, Bookmark, FileSpreadsheet, Activity, Flame,
  Plus, Dices, Zap, Timer, Share2, AlertTriangle, RotateCcw, TrendingUp, Shield,
  Mail,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/lib/theme-context';
import { useUser } from '@/lib/user-context';
import { signOut } from '@/lib/supabase';
import { ReportIssueDialog } from './ReportIssueDialog';

interface NavItem { title: string; url: string; icon: React.ComponentType<{ className?: string }>; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Home', url: '/', icon: Home },
      { title: 'All Modules', url: '/modules', icon: Layers },
      { title: 'Mailbox', url: '/mailbox', icon: Mail },
      { title: 'Search', url: '/search', icon: Search },
    ],
  },
  {
    label: 'Roadmaps',
    items: [
      { title: 'Striver SDE', url: '/striver', icon: Map },
      { title: 'NeetCode 150', url: '/neetcode', icon: Code2 },
      { title: 'LeetCode Top 150', url: '/leetcode150', icon: BookOpen },
      { title: 'Adaptive Path', url: '/learning-path', icon: Brain },
    ],
  },
  {
    label: 'Practice',
    items: [
      { title: 'Contest Mode', url: '/contest', icon: Timer },
      { title: 'Mock Interview', url: '/interview', icon: MessageSquare },
      { title: 'Playground', url: '/playground', icon: Zap },
      { title: 'Generator', url: '/generator', icon: Dices },
      { title: 'Custom Problems', url: '/custom-problems', icon: Plus },
      { title: 'Code Review', url: '/code-review', icon: Sparkles },
    ],
  },
  {
    label: 'Study',
    items: [
      { title: 'Flashcards', url: '/flashcards', icon: Layers },
      { title: 'Cheat Sheet', url: '/cheatsheet', icon: BookOpen },
      { title: 'Patterns', url: '/patterns', icon: GraduationCap },
      { title: 'Learning Mode', url: '/learning', icon: Brain },
      { title: 'Spaced Repetition', url: '/spaced-repetition', icon: Clock },
      { title: 'Today’s Review', url: '/today-review', icon: RotateCcw },
      { title: 'Companies', url: '/company-tags', icon: Building2 },
      { title: 'Big-O Visualizer', url: '/bigo', icon: BarChart3 },
    ],
  },
  {
    label: 'Progress',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: TrendingUp },
      { title: 'Analytics', url: '/analytics', icon: BarChart3 },
      { title: 'Achievements', url: '/achievements', icon: Award },
      { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
      { title: 'Activity Calendar', url: '/streak-calendar', icon: Calendar },
      { title: 'Submissions', url: '/submissions', icon: Code2 },
      { title: 'Weak Topics', url: '/weak-topics', icon: AlertTriangle },
      { title: 'Complexity', url: '/complexity', icon: Activity },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'Goals', url: '/goals', icon: Target },
      { title: 'Pomodoro', url: '/pomodoro', icon: Clock },
      { title: 'Bookmarks', url: '/bookmarks', icon: Bookmark },
      { title: 'Export', url: '/export', icon: FileSpreadsheet },
      { title: 'Discussion', url: '/discuss', icon: MessageSquare },
      { title: 'Community', url: '/community', icon: Share2 },
    ],
  },
];

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, isAdmin } = useUser();

  const initials = useMemo(() => {
    const name = (authUser?.email || 'You').split('@')[0];
    return name.slice(0, 2).toUpperCase();
  }, [authUser]);

  const navGroups = useMemo(() => {
    if (!isAdmin) return NAV_GROUPS;
    return [
      ...NAV_GROUPS,
      {
        label: 'Admin',
        items: [
          { title: 'Dashboard', url: '/admin', icon: Shield },
        ],
      }
    ];
  }, [isAdmin]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 flex flex-row items-center px-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
          aria-label="Home"
        >
          <div className="h-8 w-8 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0 shadow-xs">
            <Code2 className="h-4 w-4" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="text-left">
              <div className="text-sm font-semibold tracking-tight leading-none">DSA Lab</div>
              <div className="text-[10px] text-muted-foreground leading-none mt-1">Practice Studio</div>
            </div>
          )}
        </button>
      </SidebarHeader>

      <SidebarContent className="px-1.5 py-2">
        {navGroups.map(group => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 px-2 mb-0.5">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} className="h-8 rounded-md data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium">
                        <NavLink to={item.url} end className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="text-[13px]">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-sidebar-accent transition-colors w-full"
        >
          <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-semibold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <div className="text-[12px] font-medium truncate">{authUser?.email?.split('@')[0] || 'Guest'}</div>
              <div className="text-[10px] text-muted-foreground truncate">{authUser?.email || 'Sign in'}</div>
            </div>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Hide the default topbar (page provides its own). */
  bare?: boolean;
}

function Topbar({ title, subtitle, actions }: { title?: string; subtitle?: string; actions?: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border glass">
      <SidebarTrigger className="h-8 w-8 -ml-1" />
      <div className="h-5 w-px bg-border" />
      {(title || subtitle) && (
        <div className="min-w-0 flex-1">
          {title && <div className="text-[13px] font-semibold tracking-tight truncate leading-none">{title}</div>}
          {subtitle && <div className="text-[11px] text-muted-foreground truncate mt-1 leading-none">{subtitle}</div>}
        </div>
      )}
      {!title && !subtitle && (
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search problems, topics…"
              className="h-8 pl-8 text-[12px] bg-secondary/60 border-transparent focus-visible:bg-background focus-visible:border-border"
              onFocus={() => navigate('/search')}
              readOnly
            />
          </div>
        </div>
      )}
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        <ReportIssueDialog pageTitle={title} />
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="h-8 w-8" aria-label="Profile">
          <User className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

export default function AppShell({ children, title, subtitle, actions, bare = false }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          {!bare && <Topbar title={title} subtitle={subtitle} actions={actions} />}
          <main className="app-shell-main flex-1 min-w-0 overflow-auto relative">
            {bare ? (
              <div className="h-full w-full animate-in-up">
                {children}
              </div>
            ) : (
              <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 animate-in-up">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
