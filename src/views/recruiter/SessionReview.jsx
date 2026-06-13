// Prompt 22 — pages/recruiter/SessionReview.jsx
// Session review page for Shadow Coder (normal + read-only share modes)
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/src/api/client';
import { formatDateTime, formatTime } from '@/src/utils/formatTime';
import useCodingMetrics from '@/src/hooks/useCodingMetrics';
import CodeEditor from '@/src/components/editor/CodeEditor';
import TimeBreakdownChart from '@/src/components/charts/TimeBreakdownChart';
import KeystrokeTimeline from '@/src/components/charts/KeystrokeTimeline';

export default function SessionReviewPage({ sessionId, shareToken, readOnly = false }) {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [editorReady, setEditorReady] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { computeMetrics, applyHeatmap, clearHeatmap } = useCodingMetrics();

  // Fetch session data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (readOnly && shareToken) {
          const res = await apiClient.get(`/share/${shareToken}`);
          setSession(res.data.session || res.data);
          setEvents(res.data.events || []);
        } else if (sessionId) {
          const [sessionRes, eventsRes] = await Promise.all([
            apiClient.get(`/sessions/${sessionId}`),
            apiClient.get(`/sessions/${sessionId}/events`),
          ]);
          setSession(sessionRes.data.session || sessionRes.data);
          setEvents(eventsRes.data.events || eventsRes.data || []);
          setNotes(sessionRes.data.session?.recruiterNotes || sessionRes.data.recruiter_notes || '');
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        toast.error('Failed to load session');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId, shareToken, readOnly]);

  // Heatmap toggle
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    if (heatmapEnabled) {
      applyHeatmap(editorRef.current, monacoRef.current, events);
    } else {
      clearHeatmap(editorRef.current);
    }
  }, [heatmapEnabled, events, editorReady, applyHeatmap, clearHeatmap]);

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);
  }, []);

  // Auto-save notes on blur
  const handleNotesBlur = async () => {
    if (readOnly) return;
    try {
      await apiClient.patch(`/sessions/${sessionId}/notes`, { notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      toast.error('Failed to save notes');
    }
  };

  // Share session
  const handleShare = async () => {
    try {
      const res = await apiClient.post(`/sessions/${sessionId}/share`);
      const url = res.data.shareUrl || res.data.url || '';
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to generate share link');
    }
  };

  // Compute metrics
  const metrics = computeMetrics(events, {
    compilationErrors: session?.compilationErrors || session?.compilation_errors || 0,
    runAttempts: session?.runAttempts || session?.run_attempts || 0,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Session not found</p>
      </div>
    );
  }

  const passed = session.testsPassed === session.testsTotal && session.testsTotal > 0;
  const editRatio = metrics.deleteCount > 0 && metrics.totalTimeTaken > 0
    ? Math.round((metrics.deleteCount / (metrics.deleteCount + events.filter(e => e.type === 'insert').length)) * 100)
    : 0;

  const duration = events.length > 1 ? events[events.length - 1].ts - events[0].ts : 0;

  return (
    <div className="max-w-[1800px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT PANEL — Editor (60%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Top bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md font-mono">
                {session.language || '—'}
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-400">Heatmap</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={heatmapEnabled}
                  onChange={e => setHeatmapEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${heatmapEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mt-0.5 ${heatmapEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>
          </div>

          {/* Editor */}
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <CodeEditor
              language={session.language || 'javascript'}
              value={session.finalCode || session.final_code || ''}
              readOnly={true}
              height="55vh"
              onMount={handleEditorMount}
            />
          </div>

          {/* Keystroke Timeline */}
          <KeystrokeTimeline events={events} duration={duration} onFlagClick={() => {}} />
        </div>

        {/* RIGHT PANEL — Stats (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Candidate Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-3">
              {session.candidateName || session.candidate_name || 'Unknown'}
            </h2>
            {!readOnly && (
              <p className="text-sm text-gray-400 mb-1">{session.candidateEmail || session.candidate_email}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
              <span className="bg-gray-800 px-2 py-1 rounded">{session.role || '—'}</span>
              <span className="bg-gray-800 px-2 py-1 rounded font-mono">{session.language}</span>
              <span className="bg-gray-800 px-2 py-1 rounded">
                {formatDateTime(session.submitted_at || session.submittedAt)}
              </span>
            </div>
          </div>

          {/* Coding Metrics */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Coding Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Time', value: formatTime(metrics.totalTimeTaken) },
                { label: 'Typing Speed', value: `${metrics.typingSpeed} cpm` },
                { label: 'Pause Duration', value: formatTime(metrics.pauseDuration) },
                { label: 'Backspace Count', value: metrics.backspaceCount },
                { label: 'Delete Count', value: metrics.deleteCount },
                { label: 'Copy-Paste', value: metrics.copyPasteAttempts },
                { label: 'Compile Errors', value: metrics.compilationErrors },
                { label: 'Executions', value: metrics.numberOfExecutions },
                { label: 'First Code At', value: formatTime(metrics.timeBeforeFirstCode) },
                { label: 'Code Duration', value: formatTime(metrics.codeCompletionTime) },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Ratio + Pass/Fail */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Edit Ratio</p>
              <p className={`text-2xl font-bold ${
                editRatio < 30 ? 'text-emerald-400' : editRatio < 60 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {editRatio}%
              </p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${
              passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
            }`}>
              <p className="text-xs text-gray-400 mb-1">Result</p>
              <p className={`text-2xl font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {passed ? 'PASS' : 'FAIL'}
              </p>
            </div>
          </div>

          {/* Time Breakdown Chart */}
          <TimeBreakdownChart events={events} />

          {/* Share button (normal mode only) */}
          {!readOnly && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <button
                onClick={handleShare}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Session
              </button>
              {shareUrl && (
                <div className="mt-3 bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-blue-400 break-all">{shareUrl}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Copied!'); }}
                      className="shrink-0 text-xs text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recruiter Notes (normal mode only) */}
          {!readOnly && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">Recruiter Notes</h3>
                {notesSaved && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add private notes about this candidate..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
