import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

const CodeEditor = ({ code, onChange }: CodeEditorProps) => {
  return (
    <Editor
      height="100%"
      language="java"
      value={code}
      onChange={(v) => onChange(v || '')}
      theme="vs"
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
