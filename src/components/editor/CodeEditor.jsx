// Prompt 09 — components/editor/CodeEditor.jsx
// Monaco Editor wrapper for Shadow Coder
'use client';

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function CodeEditor({
  language = 'python',
  value = '',
  onChange,
  onMount,
  readOnly = false,
  height = '65vh',
}) {
  const options = {
    fontSize: 14,
    minimap: { enabled: false },
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    readOnly,
    padding: { top: 16, bottom: 16 },
    lineNumbers: 'on',
    roundedSelection: false,
    cursorBlinking: 'smooth',
    smoothScrolling: true,
    ...(readOnly && {
      renderLineHighlight: 'none',
      cursorStyle: 'line',
    }),
  };

  return (
    <MonacoEditor
      height={height}
      language={language}
      value={value}
      onChange={onChange}
      onMount={onMount}
      theme="vs-dark"
      options={options}
      loading={
        <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading editor...</span>
          </div>
        </div>
      }
    />
  );
}
