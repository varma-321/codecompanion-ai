import { useState } from 'react';
import { Plus, Trash2, Sparkles, Loader2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DbTestCase } from '@/lib/supabase';

export interface TestResult {
  test: number;
  status: 'PASSED' | 'FAILED';
  expected: string;
  actual: string;
}

interface TestCasePanelProps {
  testCases: DbTestCase[];
  testResults: TestResult[];
  onAdd: (input: string, expectedOutput: string, variableName: string) => void;
  onUpdate: (id: string, input: string, expectedOutput: string, variableName: string) => void;
  onDelete: (id: string) => void;
  onGenerateAI: () => void;
  isGenerating: boolean;
}

const TestCasePanel = ({ testCases, testResults, onAdd, onUpdate, onDelete, onGenerateAI, isGenerating }: TestCasePanelProps) => {
  const [newVarName, setNewVarName] = useState('arr');
  const [newInput, setNewInput] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVarName, setEditVarName] = useState('');
  const [editInput, setEditInput] = useState('');
  const [editExpected, setEditExpected] = useState('');

  const handleAdd = () => {
    if (!newInput.trim()) return;
    onAdd(newInput.trim(), newExpected.trim(), newVarName.trim() || 'arr');
    setNewInput('');
    setNewExpected('');
  };

  const startEdit = (tc: DbTestCase) => {
    setEditingId(tc.id);
    setEditVarName(tc.variable_name);
    setEditInput(tc.input);
    setEditExpected(tc.expected_output);
  };

  const confirmEdit = () => {
    if (editingId) {
      onUpdate(editingId, editInput, editExpected, editVarName.trim() || 'arr');
      setEditingId(null);
    }
  };

  const passedCount = testResults.filter(r => r.status === 'PASSED').length;
  const totalResults = testResults.length;

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Test Cases {testCases.length > 0 && `(${testCases.length})`}
        </span>
        <div className="flex items-center gap-1">
          {totalResults > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              passedCount === totalResults ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}>
              {passedCount}/{totalResults} Passed
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onGenerateAI} disabled={isGenerating} title="Generate AI Test Cases">
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {testCases.map((tc, idx) => {
            const result = testResults.find(r => r.test === idx + 1);
            const isEditing = editingId === tc.id;

            return (
              <div key={tc.id} className={`rounded-md border p-2 text-xs ${
                result?.status === 'PASSED' ? 'border-success/30 bg-success/5' :
                result?.status === 'FAILED' ? 'border-destructive/30 bg-destructive/5' :
                'border-panel-border bg-card'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-muted-foreground">Test {idx + 1}</span>
                  <div className="flex items-center gap-0.5">
                    {result && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        result.status === 'PASSED' ? 'text-success' : 'text-destructive'
                      }`}>
                        {result.status}
                      </span>
                    )}
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={confirmEdit}><Check className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => startEdit(tc)}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onDelete(tc.id)}><Trash2 className="h-3 w-3" /></Button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input value={editVarName} onChange={e => setEditVarName(e.target.value)} className="h-6 text-xs" placeholder="Variable name e.g. arr" />
                    <Input value={editInput} onChange={e => setEditInput(e.target.value)} className="h-6 text-xs" placeholder="Input value" />
                    <Input value={editExpected} onChange={e => setEditExpected(e.target.value)} className="h-6 text-xs" placeholder="Expected Output" />
                  </div>
                ) : (
                  <div className="space-y-0.5 font-mono">
                    <div><span className="text-muted-foreground">Var: </span><span className="text-primary font-semibold">{tc.variable_name}</span></div>
                    <div><span className="text-muted-foreground">Input: </span>{tc.input}</div>
                    <div><span className="text-muted-foreground">Expected: </span>{tc.expected_output}</div>
                    {result?.status === 'FAILED' && (
                      <div className="text-destructive"><span className="text-muted-foreground">Actual: </span>{result.actual}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {testCases.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No test cases yet. Add one below or generate with AI.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add new test case */}
      <div className="border-t border-panel-border p-2 space-y-1">
        <div className="flex gap-1">
          <Input value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="var name" className="h-7 text-xs w-20 shrink-0" />
          <Input value={newInput} onChange={e => setNewInput(e.target.value)} placeholder="Input e.g. [1,2,3]" className="h-7 text-xs flex-1" />
          <Input value={newExpected} onChange={e => setNewExpected(e.target.value)} placeholder="Expected e.g. 6" className="h-7 text-xs flex-1" />
          <Button size="sm" onClick={handleAdd} disabled={!newInput.trim()} className="h-7 px-2">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestCasePanel;
