import { useState } from 'react';
import { Plus, Trash2, Sparkles, Loader2, Edit2, Check, X, Variable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  onAdd: (inputs: Record<string, string>, expectedOutput: string) => void;
  onUpdate: (id: string, inputs: Record<string, string>, expectedOutput: string) => void;
  onDelete: (id: string) => void;
  onGenerateAI: () => void;
  isGenerating: boolean;
}

interface InputVar {
  name: string;
  value: string;
  type: string;
}

const JAVA_TYPES = [
  'auto', 'int', 'long', 'short', 'byte', 'float', 'double', 'char', 'boolean',
  'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character',
  'StringBuilder', 'StringBuffer',
  'int[]', 'String[]', 'int[][]',
  'ArrayList<Integer>', 'ArrayList<String>',
  'LinkedList<Integer>', 'LinkedList<String>',
  'HashSet<Integer>', 'HashSet<String>',
  'HashMap<String,Integer>',
];

const getInputs = (tc: DbTestCase): Record<string, string> => {
  if (tc.inputs && Object.keys(tc.inputs).length > 0) return tc.inputs;
  return { [tc.variable_name || 'arr']: tc.input || '' };
};

const TestCasePanel = ({ testCases, testResults, onAdd, onUpdate, onDelete, onGenerateAI, isGenerating }: TestCasePanelProps) => {
  const [newVars, setNewVars] = useState<InputVar[]>([{ name: 'nums', value: '', type: 'auto' }]);
  const [newExpected, setNewExpected] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVars, setEditVars] = useState<InputVar[]>([]);
  const [editExpected, setEditExpected] = useState('');

  const handleAdd = () => {
    const inputs: Record<string, string> = {};
    for (const v of newVars) {
      if (v.name.trim() && v.value.trim()) inputs[v.name.trim()] = v.value.trim();
    }
    if (Object.keys(inputs).length === 0) return;
    onAdd(inputs, newExpected.trim());
    setNewVars([{ name: 'nums', value: '', type: 'auto' }]);
    setNewExpected('');
  };

  const addNewVar = () => setNewVars(prev => [...prev, { name: '', value: '', type: 'auto' }]);
  const removeNewVar = (idx: number) => setNewVars(prev => prev.filter((_, i) => i !== idx));
  const updateNewVar = (idx: number, field: 'name' | 'value' | 'type', val: string) => {
    setNewVars(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val } : v));
  };

  const startEdit = (tc: DbTestCase) => {
    const inputs = getInputs(tc);
    setEditingId(tc.id);
    setEditVars(Object.entries(inputs).map(([name, value]) => ({ name, value, type: 'auto' })));
    setEditExpected(tc.expected_output);
  };

  const addEditVar = () => setEditVars(prev => [...prev, { name: '', value: '', type: 'auto' }]);
  const removeEditVar = (idx: number) => setEditVars(prev => prev.filter((_, i) => i !== idx));
  const updateEditVar = (idx: number, field: 'name' | 'value' | 'type', val: string) => {
    setEditVars(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val } : v));
  };

  const confirmEdit = () => {
    if (!editingId) return;
    const inputs: Record<string, string> = {};
    for (const v of editVars) {
      if (v.name.trim() && v.value.trim()) inputs[v.name.trim()] = v.value.trim();
    }
    onUpdate(editingId, inputs, editExpected.trim());
    setEditingId(null);
  };

  const passedCount = testResults.filter(r => r.status === 'PASSED').length;
  const totalResults = testResults.length;

  const TypeSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-6 w-[80px] text-[10px] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-48">
        {JAVA_TYPES.map(t => (
          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

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
            const inputs = getInputs(tc);

            return (
              <div key={tc.id} className={`rounded-md border p-2 text-xs animate-fade-in ${
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
                    {editVars.map((v, vi) => (
                      <div key={vi} className="flex gap-1 items-center">
                        <TypeSelect value={v.type} onChange={val => updateEditVar(vi, 'type', val)} />
                        <Input value={v.name} onChange={e => updateEditVar(vi, 'name', e.target.value)} className="h-6 text-xs w-16 shrink-0 font-mono" placeholder="var" />
                        <span className="text-muted-foreground">=</span>
                        <Input value={v.value} onChange={e => updateEditVar(vi, 'value', e.target.value)} className="h-6 text-xs flex-1 font-mono" placeholder="value" />
                        {editVars.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeEditVar(vi)}><X className="h-2.5 w-2.5" /></Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={addEditVar}>
                      <Plus className="h-2.5 w-2.5" /> Add Variable
                    </Button>
                    <div className="flex gap-1 items-center">
                      <span className="text-[10px] text-muted-foreground w-20 shrink-0">Expected:</span>
                      <Input value={editExpected} onChange={e => setEditExpected(e.target.value)} className="h-6 text-xs flex-1 font-mono" placeholder="Expected output" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5 font-mono">
                    {Object.entries(inputs).map(([name, value]) => (
                      <div key={name} className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">{name}</Badge>
                        <span className="text-muted-foreground">=</span>
                        <span className="text-foreground">{value}</span>
                      </div>
                    ))}
                    <div className="mt-1 pt-1 border-t border-panel-border">
                      <span className="text-muted-foreground">Expected: </span>
                      <span className="text-foreground">{tc.expected_output}</span>
                    </div>
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

          {/* Add new test case form INSIDE the scroll area so it's "slidable" */}
          <div className="mt-4 pt-4 border-t border-panel-border/30 space-y-3 bg-card/30 p-2 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Variable className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">New Test Case</span>
            </div>
            
            <div className="space-y-2">
              {newVars.map((v, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 p-2 rounded-xl border border-panel-border/50 bg-background/50">
                  <div className="flex gap-2 flex-1">
                    <TypeSelect value={v.type} onChange={val => updateNewVar(idx, 'type', val)} />
                    <Input
                      value={v.name}
                      onChange={e => updateNewVar(idx, 'name', e.target.value)}
                      placeholder="var name"
                      className="h-8 text-xs w-20 shrink-0 font-mono bg-background"
                    />
                    <div className="hidden sm:flex items-center text-muted-foreground px-1">=</div>
                  </div>
                  <div className="flex gap-2 flex-[2]">
                    <Input
                      value={v.value}
                      onChange={e => updateNewVar(idx, 'value', e.target.value)}
                      placeholder="value (e.g. [1, 2, 3])"
                      className="h-8 text-xs flex-1 font-mono bg-background"
                    />
                    {newVars.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => removeNewVar(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold gap-1.5 px-3 rounded-lg hover:bg-primary/5" onClick={addNewVar}>
                <Plus className="h-3.5 w-3.5 text-primary" /> Add Variable
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-panel-border/30">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Expected Output</label>
                <Input
                  value={newExpected}
                  onChange={e => setNewExpected(e.target.value)}
                  placeholder="e.g. 10 or [0, 1]"
                  className="h-9 text-xs font-mono bg-background border-primary/10 focus:border-primary/30"
                />
              </div>
              <Button size="sm" onClick={handleAdd} className="h-9 sm:mt-auto px-6 font-bold bg-primary hover:bg-primary/90 rounded-lg shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Create Case
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default TestCasePanel;
