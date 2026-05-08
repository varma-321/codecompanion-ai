import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Sparkles, Brain, Timer, Trophy, Zap, 
  MessageCircle, Target, CheckCircle2, XCircle, 
  ChevronRight, Smartphone, RefreshCw, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

const MOCK_MCQS: MCQ[] = [
  {
    id: '1',
    question: 'What is the time complexity of searching for an element in a balanced Binary Search Tree (BST)?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    correct: 1,
    explanation: 'In a balanced BST, the height is log N, so searching takes logarithmic time.',
    difficulty: 'easy',
    topic: 'Trees'
  },
  {
    id: '2',
    question: 'Which data structure uses the LIFO (Last In First Out) principle?',
    options: ['Queue', 'Linked List', 'Stack', 'Heap'],
    correct: 2,
    explanation: 'A Stack follows LIFO, where the last element added is the first one removed.',
    difficulty: 'easy',
    topic: 'Stacks'
  },
  {
    id: '3',
    question: 'In Java, which of these is NOT a valid access modifier?',
    options: ['public', 'private', 'protected', 'internal'],
    correct: 3,
    explanation: 'Java has public, private, protected, and default (no modifier). "internal" is a Kotlin/C# modifier.',
    difficulty: 'medium',
    topic: 'Java Basics'
  }
];

const QuickPractice = () => {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameOver, setIsGameOver] = useState(false);

  const current = MOCK_MCQS[currentIdx];

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered && !isGameOver) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isAnswered) {
      handleAnswer(-1); // Timeout
    }
  }, [timeLeft, isAnswered, isGameOver]);

  const handleAnswer = (idx: number) => {
    setSelected(idx);
    setIsAnswered(true);
    if (idx === current.correct) {
      setScore(prev => prev + 10 + (timeLeft > 15 ? 5 : 0));
      setStreak(prev => prev + 1);
      toast.success('Correct! +' + (timeLeft > 15 ? '15' : '10') + ' Points');
    } else {
      setStreak(0);
      toast.error('Wrong! The correct answer was: ' + current.options[current.correct]);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < MOCK_MCQS.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setIsAnswered(false);
      setTimeLeft(30);
    } else {
      setIsGameOver(true);
    }
  };

  const resetGame = () => {
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setIsGameOver(false);
    setSelected(null);
    setIsAnswered(false);
    setTimeLeft(30);
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="flex items-center gap-1 sm:gap-3 border-b border-panel-border bg-ide-toolbar px-3 sm:px-4 py-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1.5 text-xs font-medium rounded-lg">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Exit</span>
        </Button>
        <div className="h-4 w-px bg-border shrink-0" />
        <Zap className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-bold truncate">Quick Practice</span>
        
        <div className="ml-auto flex items-center gap-2 sm:gap-4 shrink-0">
           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
             <Zap className="h-3 w-3 fill-warning" />
             <span className="text-[10px] font-black">{streak}</span>
           </div>
           <Badge variant="outline" className="gap-1.5 font-bold h-7 rounded-lg">
             <Timer className={`h-3.5 w-3.5 ${timeLeft < 10 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
             <span className="tabular-nums">{timeLeft}s</span>
           </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center">
        <div className="w-full max-w-lg space-y-6 flex-1">
          {isGameOver ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <Card className="w-full animate-in fade-in zoom-in duration-300 border-2 border-primary/20 bg-card/50 backdrop-blur-xl rounded-3xl">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto bg-primary/10 w-20 h-20 rounded-3xl flex items-center justify-center mb-4 rotate-6 shadow-xl shadow-primary/10">
                    <Trophy className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-black">Session Complete!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 p-6 text-center">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-secondary/30 border border-border/50">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Total Score</p>
                      <p className="text-3xl font-black text-foreground tracking-tighter">{score}</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-secondary/30 border border-border/50">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Accuracy</p>
                      <p className="text-3xl font-black text-foreground tracking-tighter">
                        {Math.round((score / (MOCK_MCQS.length * 15)) * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button onClick={resetGame} className="w-full gap-2 h-14 text-md font-black rounded-2xl shadow-lg shadow-primary/20">
                      <RefreshCw className="h-5 w-5" /> Try Again
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/modules')} className="w-full h-14 text-md font-black rounded-2xl border-2">
                      Return to Modules
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="space-y-3 bg-secondary/20 p-4 rounded-3xl border border-border/50 backdrop-blur-sm">
                <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                  <span>Question {currentIdx + 1} / {MOCK_MCQS.length}</span>
                  <span className="text-primary">Score: {score}</span>
                </div>
                <Progress value={((currentIdx + 1) / MOCK_MCQS.length) * 100} className="h-2 rounded-full" />
              </div>

            {/* Question Card */}
            <Card className="border-none shadow-2xl bg-gradient-to-b from-card to-secondary/20">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[9px] uppercase">{current.topic}</Badge>
                  <Badge variant="outline" className="text-[9px] uppercase">{current.difficulty}</Badge>
                </div>
                <CardTitle className="text-lg leading-relaxed">{current.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {current.options.map((option, i) => (
                  <button
                    key={i}
                    disabled={isAnswered}
                    onClick={() => handleAnswer(i)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group
                      ${isAnswered 
                        ? i === current.correct 
                          ? 'border-success bg-success/10 text-success' 
                          : selected === i 
                            ? 'border-destructive bg-destructive/10 text-destructive'
                            : 'border-border opacity-50'
                        : 'border-border hover:border-primary hover:bg-primary/5 active:scale-[0.98]'
                      }
                    `}
                  >
                    <span className="text-sm font-medium">{option}</span>
                    {isAnswered && i === current.correct && <CheckCircle2 className="h-5 w-5 shrink-0" />}
                    {isAnswered && selected === i && i !== current.correct && <XCircle className="h-5 w-5 shrink-0" />}
                  </button>
                ))}

                {isAnswered && (
                  <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Explanation</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {current.explanation}
                    </p>
                    <Button onClick={nextQuestion} className="w-full mt-4 gap-2 font-bold shadow-lg shadow-primary/20">
                      {currentIdx < MOCK_MCQS.length - 1 ? 'Next Question' : 'Finish Session'}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hint / Tip */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary/30 border border-border/50">
              <Smartphone className="h-5 w-5 text-muted-foreground/50" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                Quick sessions are great for commuting or breaks. They keep your <span className="text-foreground font-bold">streak</span> alive!
              </p>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default QuickPractice;
