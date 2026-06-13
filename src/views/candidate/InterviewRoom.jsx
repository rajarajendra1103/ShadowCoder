// Prompt 24 — pages/candidate/InterviewRoom.jsx
// Candidate interview room for Shadow Coder
// Includes Compile button for custom input testing (like online compiler)
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import apiClient from '@/src/api/client';
import useRecorder from '@/src/hooks/useRecorder';
import CodeEditor from '@/src/components/editor/CodeEditor';
import CountdownTimer from '@/src/components/shared/CountdownTimer';
import LanguageSelector from '@/src/components/shared/LanguageSelector';

export default function InterviewRoomPage({ token }) {
  const router = useRouter();
  const [problem, setProblem] = useState(null);
  const [invite, setInvite] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isValid, setIsValid] = useState(null); // null = loading, true = valid, false = expired
  const [runAttempts, setRunAttempts] = useState(0);
  const [compileAttempts, setCompileAttempts] = useState(0);
  const [compilationErrors, setCompilationErrors] = useState(0);

  // Output state
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [activePanel, setActivePanel] = useState('problem'); // 'problem' | 'output' | 'compile'

  // Custom input for compile
  const [customInput, setCustomInput] = useState('');
  const [compileOutput, setCompileOutput] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleMount, flush } = useRecorder(sessionId);

  // Validate token and fetch problem on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await apiClient.get(`/invites/${token}`);
        if (res.data.valid === false) {
          setIsValid(false);
          return;
        }
        setIsValid(true);
        setProblem(res.data.problem || res.data);
        setInvite(res.data.invite || res.data);

        const langs = res.data.problem?.languages || res.data.problem?.allowedLanguages || ['python'];
        setLanguage(langs[0] || 'python');

        // Load starter code
        const starters = res.data.problem?.starterCode || res.data.problem?.starter_code || {};
        setCode(starters[langs[0]] || '');

        // Initialize session
        const sessionRes = await apiClient.post('/sessions/init', { inviteToken: token });
        setSessionId(sessionRes.data.sessionId || sessionRes.data.id);
      } catch (error) {
        console.error('Token validation failed:', error);
        setIsValid(false);
      }
    };
    if (token) validateToken();
  }, [token]);

  // Prevent tab close during active session
  useEffect(() => {
    if (sessionId) {
      const handler = (e) => {
        e.preventDefault();
        e.returnValue = 'Your session is in progress. Are you sure?';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [sessionId]);

  // Language change handler
  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    const starters = problem?.starterCode || problem?.starter_code || {};
    setCode(starters[newLang] || '');
  }, [problem]);

  // Run code (against test cases)
  const handleRun = async () => {
    setIsRunning(true);
    setActivePanel('output');
    setOutput(null);
    try {
      const res = await apiClient.post('/execute', {
        code,
        language,
        inviteToken: token,
      });
      setOutput(res.data);
      setRunAttempts(prev => prev + 1);
      if (res.data.error || res.data.stderr) {
        setCompilationErrors(prev => prev + 1);
      }
    } catch (error) {
      setOutput({
        error: true,
        stderr: error.response?.data?.message || 'Execution failed',
      });
      setCompilationErrors(prev => prev + 1);
    } finally {
      setIsRunning(false);
    }
  };

  // Compile with custom input (like online compiler)
  const handleCompile = async () => {
    setIsCompiling(true);
    setActivePanel('compile');
    setCompileOutput(null);
    try {
      const res = await apiClient.post('/execute', {
        code,
        language,
        stdin: customInput,
        inviteToken: token,
        mode: 'compile', // tells backend to use custom input instead of test cases
      });
      setCompileOutput(res.data);
      setCompileAttempts(prev => prev + 1);
      if (res.data.error || res.data.stderr) {
        setCompilationErrors(prev => prev + 1);
      }
    } catch (error) {
      setCompileOutput({
        error: true,
        stderr: error.response?.data?.message || 'Compilation failed',
      });
      setCompilationErrors(prev => prev + 1);
    } finally {
      setIsCompiling(false);
    }
  };

  // Submit session
  const handleSubmit = async () => {
    if (!confirm('Are you sure? You cannot resubmit.')) return;
    setIsSubmitting(true);
    try {
      flush(); // Flush remaining recorder buffer
      await apiClient.post('/sessions', {
        inviteToken: token,
        finalCode: code,
        language,
        runAttempts,
        compilationErrors,
        testResults: output?.testResults || output?.results || [],
      });
      window.onbeforeunload = null;
      router.push('/interview/done');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
      setIsSubmitting(false);
    }
  };

  // Timer expiry
  const handleTimerExpire = () => {
    toast.error('Time is up! Auto-submitting...');
    handleSubmit();
  };

  // Loading state
  if (isValid === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Validating session...</p>
        </div>
      </div>
    );
  }

  // Invalid/expired token
  if (isValid === false) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Link Expired</h1>
          <p className="text-gray-400">This link has expired or has already been used.</p>
        </div>
      </div>
    );
  }

  const timeLimit = invite?.timeLimitOverride || invite?.time_limit_override || problem?.timeLimit || problem?.time_limit || 30;
  const problemLanguages = problem?.languages || problem?.allowedLanguages || ['python'];

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Shadow Coder Logo" className="w-6 h-6 rounded-md object-contain" />
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px]">
              {problem?.title || 'Coding Challenge'}
            </h1>
          </div>
          <CountdownTimer durationSeconds={timeLimit * 60} onExpire={handleTimerExpire} />
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector
            value={language}
            onChange={handleLanguageChange}
            allowedLanguages={problemLanguages}
          />

          {/* Compile button — custom input like online compiler */}
          <button
            onClick={handleCompile}
            disabled={isCompiling || !code.trim()}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isCompiling ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            )}
            Compile
          </button>

          {/* Run button — run against test cases */}
          <button
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isRunning ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            Run
          </button>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Main content — split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Editor (60%) */}
        <div className="w-[60%] border-r border-gray-800">
          <CodeEditor
            language={language}
            value={code}
            onChange={setCode}
            onMount={handleMount}
            height="100%"
          />
        </div>

        {/* Right panel — Problem + Output (40%) */}
        <div className="w-[40%] flex flex-col overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setActivePanel('problem')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activePanel === 'problem' ? 'text-white bg-gray-900 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Problem
            </button>
            <button
              onClick={() => setActivePanel('output')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activePanel === 'output' ? 'text-white bg-gray-900 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Test Results
            </button>
            <button
              onClick={() => setActivePanel('compile')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activePanel === 'compile' ? 'text-white bg-gray-900 border-b-2 border-amber-500' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Console
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto bg-gray-950">
            {/* Problem description */}
            {activePanel === 'problem' && (
              <div className="p-5 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {problem?.description || 'No problem description available.'}
                </ReactMarkdown>
              </div>
            )}

            {/* Test results output */}
            {activePanel === 'output' && (
              <div className="p-4">
                {isRunning ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">Running tests...</p>
                    </div>
                  </div>
                ) : output ? (
                  <div className="space-y-3">
                    {output.error || output.stderr ? (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                        <p className="text-xs text-red-400 font-medium mb-2">Error</p>
                        <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
                          {output.stderr || output.error}
                        </pre>
                      </div>
                    ) : null}

                    {output.stdout && (
                      <div className="bg-gray-900 rounded-lg p-4">
                        <p className="text-xs text-gray-400 font-medium mb-2">Output</p>
                        <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
                          {output.stdout}
                        </pre>
                      </div>
                    )}

                    {(output.testResults || output.results || []).map((test, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-3 border ${
                          test.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">Test Case {i + 1}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {test.passed ? 'Pass' : 'Fail'}
                          </span>
                        </div>
                        {!test.passed && test.expected != null && (
                          <div className="text-xs text-gray-400 mt-2 space-y-1">
                            <p>Expected: <code className="text-emerald-400">{test.expected}</code></p>
                            <p>Got: <code className="text-red-400">{test.actual || test.output}</code></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
                    Click "Run" to execute your code against test cases
                  </div>
                )}
              </div>
            )}

            {/* Compile / Console panel (custom input) */}
            {activePanel === 'compile' && (
              <div className="p-4 flex flex-col h-full">
                {/* Custom input */}
                <div className="mb-3">
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">Custom Input (stdin)</label>
                  <textarea
                    rows={4}
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder="Enter your custom test input here..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                               placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono resize-y"
                  />
                </div>

                <button
                  onClick={handleCompile}
                  disabled={isCompiling || !code.trim()}
                  className="self-start bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 mb-4"
                >
                  {isCompiling ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  )}
                  Compile &amp; Run
                </button>

                {/* Compile output */}
                {isCompiling ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">Compiling...</p>
                    </div>
                  </div>
                ) : compileOutput ? (
                  <div className="space-y-3 flex-1">
                    {compileOutput.error || compileOutput.stderr ? (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                        <p className="text-xs text-red-400 font-medium mb-2">Error</p>
                        <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
                          {compileOutput.stderr || compileOutput.error}
                        </pre>
                      </div>
                    ) : null}

                    {compileOutput.stdout && (
                      <div className="bg-gray-900 rounded-lg p-4">
                        <p className="text-xs text-gray-400 font-medium mb-2">Output</p>
                        <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
                          {compileOutput.stdout}
                        </pre>
                      </div>
                    )}

                    {compileOutput.output && !compileOutput.stdout && (
                      <div className="bg-gray-900 rounded-lg p-4">
                        <p className="text-xs text-gray-400 font-medium mb-2">Output</p>
                        <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
                          {compileOutput.output}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                    Enter custom input and click &quot;Compile &amp; Run&quot; to test
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
