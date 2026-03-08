import Editor from '@monaco-editor/react';
import { useTheme } from '@/lib/theme-context';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

const CodeEditor = ({ code, onChange }: CodeEditorProps) => {
  const { theme } = useTheme();

  return (
    <Editor
      height="100%"
      language="java"
      value={code}
      onChange={(v) => onChange(v || '')}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        autoClosingBrackets: 'always',
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 12 },
        renderLineHighlight: 'line',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      }}
    />
  );
};

export default CodeEditor;
