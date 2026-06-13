// Prompt 23 — pages/recruiter/CandidateCompare.jsx
// Candidate comparison page for Shadow Coder
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { segmentSession } from '@/src/utils/segmentSession';
import { formatTime, formatDateTime } from '@/src/utils/formatTime';

export default function CandidateComparePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Fetch all sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const params = {};
        if (user?.orgId) params.orgId = user.orgId;
        const res = await apiClient.get('/sessions', { params });
        setSessions(res.data.sessions || res.data || []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  // Filtered sessions by role
  const filteredSessions = useMemo(() => {
    if (!roleFilter) return sessions;
    return sessions.filter(s =>
      (s.role || '').toLowerCase().includes(roleFilter.toLowerCase())
    );
  }, [sessions, roleFilter]);

  // Toggle candidate selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  // Fetch detailed data for selected sessions
  const fetchSelectedSessions = useCallback(async () => {
    if (selectedIds.length < 2) {
      setSelectedSessions([]);
      return;
    }
    try {
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const [sessionRes, eventsRes] = await Promise.all([
            apiClient.get(`/sessions/${id}`),
            apiClient.get(`/sessions/${id}/events`).catch(() => ({ data: [] })),
          ]);
          const session = sessionRes.data.session || sessionRes.data;
          const events = eventsRes.data.events || eventsRes.data || [];
          const phases = segmentSession(events);
          const insertCount = events.filter(e => e.type === 'insert').length;
          const deleteCount = events.filter(e => e.type === 'delete').length;
          const pasteCount = events.filter(e => e.type === 'paste').length;
          const totalEdits = insertCount + deleteCount;
          const editRatio = totalEdits > 0 ? Math.round((deleteCount / totalEdits) * 100) : 0;

          return {
            ...session,
            events,
            phases,
            totalKeystrokes: session.stats?.totalKeystrokes || session.totalKeystrokes || events.length,
            editRatio,
            pasteCount,
            runAttempts: session.runAttempts || session.run_attempts || 0,
          };
        })
      );
      setSelectedSessions(results);
    } catch {
      setSelectedSessions([]);
    }
  }, [selectedIds]);

  useEffect(() => {
    fetchSelectedSessions();
  }, [fetchSelectedSessions]);

  // Sort logic
  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortedSessions = useMemo(() => {
    if (!sortCol || selectedSessions.length === 0) return selectedSessions;
    return [...selectedSessions].sort((a, b) => {
      let aVal, bVal;
      switch (sortCol) {
        case 'keystrokes': aVal = a.totalKeystrokes; bVal = b.totalKeystrokes; break;
        case 'editRatio': aVal = a.editRatio; bVal = b.editRatio; break;
        case 'thinking': aVal = a.phases.thinking; bVal = b.phases.thinking; break;
        case 'coding': aVal = a.phases.coding; bVal = b.phases.coding; break;
        case 'debugging': aVal = a.phases.debugging; bVal = b.phases.debugging; break;
        case 'testing': aVal = a.phases.testing; bVal = b.phases.testing; break;
        case 'paste': aVal = a.pasteCount; bVal = b.pasteCount; break;
        case 'runs': aVal = a.runAttempts; bVal = b.runAttempts; break;
        default: return 0;
      }
      return sortDir === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });
  }, [selectedSessions, sortCol, sortDir]);

  const SortHeader = ({ col, children }) => (
    <th
      className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-gray-200 transition-colors whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {children}
      {sortCol === col && (
        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Compare Candidates</h1>
        <p className="text-gray-400 text-sm mt-1">Select 2–5 candidates to compare side by side</p>
      </div>

      {/* Role filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by role..."
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-sm"
        />
      </div>

      {/* Candidate selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Select Candidates</h3>
          <span className="text-xs text-gray-500">{selectedIds.length}/5 selected</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {filteredSessions.map(s => {
            const isSelected = selectedIds.includes(s.id);
            const isDisabled = !isSelected && selectedIds.length >= 5;
            return (
              <label
                key={s.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-gray-800/50 border border-transparent'
                } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => !isDisabled && toggleSelect(s.id)}
                  disabled={isDisabled}
                  className="rounded"
                />
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {s.candidateName || s.candidate_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {s.role || '—'} · {formatDateTime(s.submitted_at || s.submittedAt)}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
        {selectedIds.length >= 5 && (
          <p className="text-xs text-amber-400 mt-2">Max 5 selected</p>
        )}
      </div>

      {/* Comparison table */}
      {sortedSessions.length < 2 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="text-4xl mb-4">⚖️</div>
          <h3 className="text-lg font-medium text-white mb-2">Select at least 2 candidates to compare</h3>
          <p className="text-gray-400 text-sm">Use the checkboxes above to select candidates</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Metric</th>
                {sortedSessions.map(s => (
                  <th key={s.id} className="text-left text-xs font-medium text-blue-400 uppercase tracking-wider px-4 py-3">
                    {s.candidateName || s.candidate_name || 'Unknown'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr className="hover:bg-gray-800/30">
                <td className="px-4 py-3 text-sm text-gray-400">Language</td>
                {sortedSessions.map(s => (
                  <td key={s.id} className="px-4 py-3 text-sm text-white font-mono">{s.language || '—'}</td>
                ))}
              </tr>
              <tr className="hover:bg-gray-800/30">
                <SortHeader col="keystrokes">Keystrokes</SortHeader>
                {sortedSessions.map(s => (
                  <td key={s.id} className="px-4 py-3 text-sm text-white">{s.totalKeystrokes}</td>
                ))}
              </tr>
              <tr className="hover:bg-gray-800/30">
                <SortHeader col="editRatio">Edit Ratio (%)</SortHeader>
                {sortedSessions.map(s => (
                  <td key={s.id} className={`px-4 py-3 text-sm font-medium ${
                    s.editRatio < 30 ? 'text-emerald-400' : s.editRatio < 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {s.editRatio}%
                  </td>
                ))}
              </tr>
              {['thinking', 'coding', 'debugging', 'testing'].map(phase => (
                <tr key={phase} className="hover:bg-gray-800/30">
                  <SortHeader col={phase}>{phase.charAt(0).toUpperCase() + phase.slice(1)} Time</SortHeader>
                  {sortedSessions.map(s => (
                    <td key={s.id} className="px-4 py-3 text-sm text-white">{formatTime(s.phases[phase])}</td>
                  ))}
                </tr>
              ))}
              <tr className="hover:bg-gray-800/30">
                <SortHeader col="paste">Paste Events</SortHeader>
                {sortedSessions.map(s => (
                  <td key={s.id} className="px-4 py-3 text-sm text-white">{s.pasteCount}</td>
                ))}
              </tr>
              <tr className="hover:bg-gray-800/30">
                <SortHeader col="runs">Run Attempts</SortHeader>
                {sortedSessions.map(s => (
                  <td key={s.id} className="px-4 py-3 text-sm text-white">{s.runAttempts}</td>
                ))}
              </tr>
              <tr className="hover:bg-gray-800/30">
                <td className="px-4 py-3 text-sm text-gray-400">Result</td>
                {sortedSessions.map(s => {
                  const passed = s.testsPassed === s.testsTotal && s.testsTotal > 0;
                  return (
                    <td key={s.id} className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {passed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-gray-800/30">
                <td className="px-4 py-3 text-sm text-gray-400">View Session</td>
                {sortedSessions.map(s => (
                  <td key={s.id} className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/session/${s.id}`)}
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Review →
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
