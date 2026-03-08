import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const COMPLEXITIES = [
  { name: 'O(1)', fn: (_n: number) => 1, color: 'hsl(var(--primary))', desc: 'Constant - Hash lookups, array index' },
  { name: 'O(log n)', fn: (n: number) => Math.log2(Math.max(1, n)), color: '#22c55e', desc: 'Logarithmic - Binary search' },
  { name: 'O(n)', fn: (n: number) => n, color: '#3b82f6', desc: 'Linear - Single loop, linear search' },
  { name: 'O(n log n)', fn: (n: number) => n * Math.log2(Math.max(1, n)), color: '#f59e0b', desc: 'Linearithmic - Merge sort, heap sort' },
  { name: 'O(n²)', fn: (n: number) => n * n, color: '#ef4444', desc: 'Quadratic - Nested loops, bubble sort' },
  { name: 'O(2ⁿ)', fn: (n: number) => Math.pow(2, Math.min(n, 25)), color: '#a855f7', desc: 'Exponential - Recursive subsets' },
];

const REFERENCE_STRUCTURES: { name: string; operations: { op: string; time: string; space: string }[] }[] = [
  { name: 'Array', operations: [{ op: 'Access', time: 'O(1)', space: 'O(n)' }, { op: 'Search', time: 'O(n)', space: 'O(1)' }, { op: 'Insert', time: 'O(n)', space: 'O(1)' }, { op: 'Delete', time: 'O(n)', space: 'O(1)' }] },
  { name: 'HashMap', operations: [{ op: 'Access', time: 'O(1)', space: 'O(n)' }, { op: 'Search', time: 'O(1)', space: 'O(1)' }, { op: 'Insert', time: 'O(1)', space: 'O(1)' }, { op: 'Delete', time: 'O(1)', space: 'O(1)' }] },
  { name: 'Binary Search Tree', operations: [{ op: 'Access', time: 'O(log n)', space: 'O(n)' }, { op: 'Search', time: 'O(log n)', space: 'O(1)' }, { op: 'Insert', time: 'O(log n)', space: 'O(1)' }, { op: 'Delete', time: 'O(log n)', space: 'O(1)' }] },
  { name: 'Linked List', operations: [{ op: 'Access', time: 'O(n)', space: 'O(n)' }, { op: 'Search', time: 'O(n)', space: 'O(1)' }, { op: 'Insert', time: 'O(1)', space: 'O(1)' }, { op: 'Delete', time: 'O(1)', space: 'O(1)' }] },
  { name: 'Heap', operations: [{ op: 'Access (min/max)', time: 'O(1)', space: 'O(n)' }, { op: 'Search', time: 'O(n)', space: 'O(1)' }, { op: 'Insert', time: 'O(log n)', space: 'O(1)' }, { op: 'Delete', time: 'O(log n)', space: 'O(1)' }] },
  { name: 'Stack/Queue', operations: [{ op: 'Access (top/front)', time: 'O(1)', space: 'O(n)' }, { op: 'Search', time: 'O(n)', space: 'O(1)' }, { op: 'Push/Enqueue', time: 'O(1)', space: 'O(1)' }, { op: 'Pop/Dequeue', time: 'O(1)', space: 'O(1)' }] },
];

const SORT_ALGOS = [
  { name: 'Bubble Sort', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true },
  { name: 'Selection Sort', best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false },
  { name: 'Insertion Sort', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true },
  { name: 'Merge Sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true },
  { name: 'Quick Sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false },
  { name: 'Heap Sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: false },
  { name: 'Counting Sort', best: 'O(n+k)', avg: 'O(n+k)', worst: 'O(n+k)', space: 'O(k)', stable: true },
  { name: 'Radix Sort', best: 'O(nk)', avg: 'O(nk)', worst: 'O(nk)', space: 'O(n+k)', stable: true },
];

const BigOVisualizer = () => {
  const navigate = useNavigate();
  const [inputSize, setInputSize] = useState([20]);
  const n = inputSize[0];

  const maxVal = Math.pow(2, Math.min(n, 25));
  const chartHeight = 280;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Modules</span>
        </Button>
        <div className="h-4 w-px bg-border" />
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Big-O Visualizer</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
          {/* Interactive Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Growth Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Input n =</span>
                <Slider value={inputSize} onValueChange={setInputSize} min={1} max={25} step={1} className="flex-1" />
                <Badge variant="outline" className="text-xs tabular-nums w-10 justify-center">{n}</Badge>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-2 sm:gap-4" style={{ height: chartHeight }}>
                {COMPLEXITIES.map(c => {
                  const val = c.fn(n);
                  const barHeight = Math.max(4, (val / maxVal) * (chartHeight - 40));
                  const clampedHeight = Math.min(barHeight, chartHeight - 20);
                  return (
                    <Tooltip key={c.name}>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground tabular-nums">{val > 1e6 ? val.toExponential(1) : Math.round(val)}</span>
                          <div className="w-full rounded-t transition-all duration-300" style={{ height: clampedHeight, backgroundColor: c.color }} />
                          <span className="text-[10px] font-medium text-foreground whitespace-nowrap">{c.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-48">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-muted-foreground">{c.desc}</p>
                        <p className="tabular-nums mt-1">f({n}) = {Math.round(val).toLocaleString()}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Data Structure Reference */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" /> Data Structure Complexities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Structure</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Operation</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Space</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFERENCE_STRUCTURES.map(ds =>
                      ds.operations.map((op, i) => (
                        <tr key={`${ds.name}-${op.op}`} className="border-b border-border/50">
                          {i === 0 && <td className="py-1.5 pr-4 font-medium text-foreground align-top" rowSpan={ds.operations.length}>{ds.name}</td>}
                          <td className="py-1.5 px-2 text-muted-foreground">{op.op}</td>
                          <td className="py-1.5 px-2"><Badge variant="outline" className="text-[10px]">{op.time}</Badge></td>
                          <td className="py-1.5 px-2"><Badge variant="secondary" className="text-[10px]">{op.space}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Sorting Algorithms */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Sorting Algorithm Complexities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Algorithm</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Best</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Average</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Worst</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Space</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Stable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SORT_ALGOS.map(algo => (
                      <tr key={algo.name} className="border-b border-border/50">
                        <td className="py-1.5 pr-4 font-medium text-foreground">{algo.name}</td>
                        <td className="py-1.5 px-2"><Badge variant="outline" className="text-[10px]">{algo.best}</Badge></td>
                        <td className="py-1.5 px-2"><Badge variant="outline" className="text-[10px]">{algo.avg}</Badge></td>
                        <td className="py-1.5 px-2"><Badge variant="destructive" className="text-[10px]">{algo.worst}</Badge></td>
                        <td className="py-1.5 px-2"><Badge variant="secondary" className="text-[10px]">{algo.space}</Badge></td>
                        <td className="py-1.5 px-2">{algo.stable ? '✓' : '✗'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BigOVisualizer;
