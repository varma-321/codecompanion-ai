import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { TestResult } from './TestCasePanel';

interface TestResultsTableProps {
  results: TestResult[];
}

const TestResultsTable = ({ results }: TestResultsTableProps) => {
  if (results.length === 0) return null;

  const passed = results.filter(r => r.status === 'PASSED').length;
  const allPassed = passed === results.length;
  const percentage = Math.round((passed / results.length) * 100);

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {allPassed ? '✅ All Tests Passed' : `Test Results`}
          </span>
          <span className={`text-sm font-bold ${allPassed ? 'text-emerald-500' : 'text-destructive'}`}>
            {passed}/{results.length} Passed ({percentage}%)
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
        {!allPassed && (
          <p className="text-[11px] text-muted-foreground">
            {results.length - passed} test(s) failed — check the expected vs actual output below
          </p>
        )}
      </div>

      {/* Only show failed tests first, then passed */}
      <Table>
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="h-7 w-12 px-2">#</TableHead>
            <TableHead className="h-7 w-16 px-2">Status</TableHead>
            <TableHead className="h-7 px-2">Expected</TableHead>
            <TableHead className="h-7 px-2">Actual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Failed tests first */}
          {results.filter(r => r.status === 'FAILED').map(r => (
            <TableRow key={r.test} className="text-xs bg-destructive/5">
              <TableCell className="px-2 py-1.5 font-mono text-muted-foreground">{r.test}</TableCell>
              <TableCell className="px-2 py-1.5">
                <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                  <XCircle className="h-3 w-3" /> FAIL
                </span>
              </TableCell>
              <TableCell className="px-2 py-1.5 font-mono text-xs max-w-[200px] truncate">{r.expected}</TableCell>
              <TableCell className="px-2 py-1.5 font-mono text-xs text-destructive max-w-[200px] truncate">{r.actual}</TableCell>
            </TableRow>
          ))}
          {/* Passed tests */}
          {results.filter(r => r.status === 'PASSED').map(r => (
            <TableRow key={r.test} className="text-xs">
              <TableCell className="px-2 py-1.5 font-mono text-muted-foreground">{r.test}</TableCell>
              <TableCell className="px-2 py-1.5">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> PASS
                </span>
              </TableCell>
              <TableCell className="px-2 py-1.5 font-mono text-xs max-w-[200px] truncate">{r.expected}</TableCell>
              <TableCell className="px-2 py-1.5 font-mono text-xs max-w-[200px] truncate">{r.actual}</TableCell>
            </TableRow>
          ))}
          {results.filter(r => (r as any).isHidden).length > 0 && (
             <TableRow>
                 <TableCell colSpan={4} className="text-center py-4 bg-secondary/10 text-muted-foreground text-xs italic">
                    Additional hidden set of testcases were executed in the backend. 
                </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TestResultsTable;
