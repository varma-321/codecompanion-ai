import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { TestResult } from './TestCasePanel';

interface TestResultsTableProps {
  results: TestResult[];
}

const TestResultsTable = ({ results }: TestResultsTableProps) => {
  if (results.length === 0) return null;

  const passed = results.filter(r => r.status === 'PASSED').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-muted-foreground">Test Results</span>
        <span className={`text-xs font-bold ${passed === results.length ? 'text-success' : 'text-destructive'}`}>
          {passed}/{results.length} Passed
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="h-7 px-2">Test</TableHead>
            <TableHead className="h-7 px-2">Status</TableHead>
            <TableHead className="h-7 px-2">Expected</TableHead>
            <TableHead className="h-7 px-2">Actual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map(r => (
            <TableRow key={r.test} className="text-xs">
              <TableCell className="px-2 py-1.5 font-mono">{r.test}</TableCell>
              <TableCell className="px-2 py-1.5">
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  r.status === 'PASSED' ? 'text-success' : 'text-destructive'
                }`}>
                  {r.status === 'PASSED' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {r.status === 'PASSED' ? 'PASS' : 'FAIL'}
                </span>
              </TableCell>
              <TableCell className="px-2 py-1.5 font-mono">{r.expected}</TableCell>
              <TableCell className={`px-2 py-1.5 font-mono ${r.status === 'FAILED' ? 'text-destructive' : ''}`}>{r.actual}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TestResultsTable;
