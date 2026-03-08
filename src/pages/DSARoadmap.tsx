import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Map, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

const ROADMAP_TOPICS = [
  { name: 'Arrays & Strings', icon: '📊', problems: ['Two Sum', 'Best Time to Buy Stock', 'Contains Duplicate', 'Product of Array Except Self', 'Maximum Subarray'], target: 5 },
  { name: 'Two Pointers', icon: '👆', problems: ['Valid Palindrome', 'Two Sum II', '3Sum', 'Container With Most Water', 'Trapping Rain Water'], target: 5 },
  { name: 'Sliding Window', icon: '🪟', problems: ['Best Time to Buy Stock', 'Longest Substring', 'Min Window Substring', 'Sliding Window Maximum'], target: 4 },
  { name: 'Hash Maps', icon: '🗂️', problems: ['Two Sum', 'Group Anagrams', 'Valid Anagram', 'Top K Frequent Elements'], target: 4 },
  { name: 'Binary Search', icon: '🔍', problems: ['Binary Search', 'Search Rotated Array', 'Find Minimum Rotated', 'Median of Two Arrays'], target: 4 },
  { name: 'Linked Lists', icon: '🔗', problems: ['Reverse Linked List', 'Merge Two Lists', 'Linked List Cycle', 'Remove Nth Node'], target: 4 },
  { name: 'Stacks', icon: '📚', problems: ['Valid Parentheses', 'Min Stack', 'Evaluate RPN', 'Daily Temperatures'], target: 4 },
  { name: 'Trees', icon: '🌳', problems: ['Invert Binary Tree', 'Max Depth', 'Level Order Traversal', 'Validate BST', 'Lowest Common Ancestor'], target: 5 },
  { name: 'Graphs', icon: '🕸️', problems: ['Number of Islands', 'Clone Graph', 'Course Schedule', 'Pacific Atlantic Water'], target: 4 },
  { name: 'Dynamic Programming', icon: '💡', problems: ['Climbing Stairs', 'Coin Change', 'Longest Increasing Subsequence', 'House Robber', '0/1 Knapsack'], target: 5 },
  { name: 'Recursion & Backtracking', icon: '🔄', problems: ['Subsets', 'Permutations', 'Combination Sum', 'N-Queens'], target: 4 },
  { name: 'Greedy', icon: '🎯', problems: ['Jump Game', 'Gas Station', 'Task Scheduler', 'Merge Intervals'], target: 4 },
];

const DSARoadmap = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('problems')
        .select('topic, solved')
        .eq('user_id', authUser.id);

      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const topic = p.topic || 'general';
        if (p.solved) counts[topic] = (counts[topic] || 0) + 1;
      });
      setProgress(counts);
      setLoading(false);
    };
    load();
  }, [authUser]);

  const totalSolved = Object.values(progress).reduce((a, b) => a + b, 0);
  const totalTarget = ROADMAP_TOPICS.reduce((a, t) => a + t.target, 0);

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back to IDE
        </Button>
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">DSA Roadmap</span>
        </div>
        <Badge variant="secondary" className="text-xs">{totalSolved}/{totalTarget} completed</Badge>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              {/* Overall progress */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-bold text-primary">{Math.round((totalSolved / totalTarget) * 100)}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-secondary">
                    <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${(totalSolved / totalTarget) * 100}%` }} />
                  </div>
                </CardContent>
              </Card>

              {/* Topic cards */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {ROADMAP_TOPICS.map(topic => {
                  const solved = progress[topic.name] || 0;
                  const pct = Math.min(100, (solved / topic.target) * 100);
                  const mastered = pct >= 80;

                  return (
                    <Card key={topic.name} className={`transition-all ${mastered ? 'border-success/30' : ''}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span>{topic.icon}</span>
                            <span>{topic.name}</span>
                          </span>
                          <Badge variant={mastered ? 'default' : 'secondary'} className={`text-[10px] ${mastered ? 'bg-success' : ''}`}>
                            {mastered ? 'Mastered' : `${solved}/${topic.target}`}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-2 w-full rounded-full bg-secondary mb-2">
                          <div className={`h-2 rounded-full transition-all ${mastered ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {topic.problems.map((prob, idx) => (
                            <span key={prob} className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              {idx < solved ? (
                                <CheckCircle2 className="h-3 w-3 text-success" />
                              ) : (
                                <Circle className="h-3 w-3" />
                              )}
                              {prob}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DSARoadmap;
