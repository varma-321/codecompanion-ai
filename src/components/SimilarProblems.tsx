import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];
const ALL_PROBLEMS = ALL_ROADMAPS.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name })));

interface SimilarProblemsProps {
  currentProblemKey: string;
  solvedKeys?: Set<string>;
  maxItems?: number;
}

const SimilarProblems = ({ currentProblemKey, solvedKeys = new Set(), maxItems = 5 }: SimilarProblemsProps) => {
  const navigate = useNavigate();

  const similar = useMemo(() => {
    const current = ALL_PROBLEMS.find(p => p.key === currentProblemKey);
    if (!current) return [];

    // Score by: same topic (3pts), same difficulty (1pt), not solved (1pt), not self (required)
    return ALL_PROBLEMS
      .filter(p => p.key !== currentProblemKey)
      .map(p => {
        let score = 0;
        if (p.topic === current.topic) score += 3;
        if (p.difficulty === current.difficulty) score += 1;
        if (!solvedKeys.has(p.key)) score += 1;
        return { ...p, score };
      })
      .filter(p => p.score >= 3)
      .sort((a, b) => b.score - a.score || Math.random() - 0.5)
      .slice(0, maxItems);
  }, [currentProblemKey, solvedKeys, maxItems]);

  if (similar.length === 0) return null;

  const diffColor = (d: string) =>
    d === 'Easy' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
    d === 'Hard' ? 'bg-destructive/10 text-destructive border-destructive/20' :
    'bg-amber-500/10 text-amber-500 border-amber-500/20';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Sparkles className="h-3 w-3" /> Similar Problems
      </div>
      <div className="space-y-1">
        {similar.map(p => (
          <button
            key={p.key}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors group"
            onClick={() => navigate(`/problem/${p.key}`)}
          >
            <span className="flex-1 font-medium text-foreground truncate">{p.title}</span>
            <Badge variant="outline" className={`text-[9px] shrink-0 ${diffColor(p.difficulty || 'Medium')}`}>
              {p.difficulty || 'Medium'}
            </Badge>
            {solvedKeys.has(p.key) && <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Solved</Badge>}
            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimilarProblems;
