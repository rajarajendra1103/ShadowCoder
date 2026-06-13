// Prompt 19 — pages/recruiter/Dashboard.jsx
// Recruiter dashboard for Shadow Coder
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { isToday } from 'date-fns';
import apiClient from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { formatDateTime } from '@/src/utils/formatTime';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: '',
    language: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (user?.orgId) params.orgId = user.orgId;
      if (filters.role) params.role = filters.role;
      if (filters.language) params.language = filters.language;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const res = await apiClient.get('/sessions', { params });
      setSessions(res.data.sessions || res.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Stats calculations
  const stats = useMemo(() => {
    const total = sessions.length;
    const pendingReview = sessions.filter(s => s.status === 'submitted' && !s.recruiter_notes && !s.recruiterNotes).length;
    const submittedToday = sessions.filter(s => {
      const date = s.submitted_at || s.submittedAt;
      return date && isToday(new Date(date));
    }).length;
    const passCount = sessions.filter(s => s.testsPassed === s.testsTotal && s.testsTotal > 0).length;
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

    return { total, pendingReview, submittedToday, passRate };
  }, [sessions]);

  const handleDelete = async (sessionId, candidateName) => {
    if (!window.confirm(`Are you sure you want to delete candidate ${candidateName || 'this candidate'}?`)) {
      return;
    }
    try {
      await apiClient.delete(`/sessions/${sessionId}`);
      toast.success('Candidate deleted successfully');
      fetchSessions();
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      toast.error('Failed to delete candidate');
    }
  };

  const statCards = [
    { label: 'Total Sessions', value: stats.total, color: 'from-blue-500 to-blue-600', icon: '📊' },
    { label: 'Pending Review', value: stats.pendingReview, color: 'from-amber-500 to-amber-600', icon: '⏳' },
    { label: 'Submitted Today', value: stats.submittedToday, color: 'from-violet-500 to-violet-600', icon: '📅' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, color: 'from-emerald-500 to-emerald-600', icon: '✅' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Overview of all coding sessions</p>
        </div>

      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <div className={`w-2 h-2 rounded-full bg-linear-to-r ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Filter by role..."
            value={filters.role}
            onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.language}
            onChange={(e) => setFilters(f => ({ ...f, language: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Languages</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="invited">Invited</option>
            <option value="started">Started</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Session table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-white mb-2">No sessions yet</h3>
            <p className="text-gray-400 text-sm">Start by sending invites to candidates</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Candidate</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Language</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Submitted</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Keystrokes</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Result</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sessions.map((session) => {
                  const passed = session.testsPassed === session.testsTotal && session.testsTotal > 0;
                  return (
                    <tr key={session.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm text-white font-medium">{session.candidateName || session.candidate_name || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{session.role || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-md font-mono">
                          {session.language || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {formatDateTime(session.submitted_at || session.submittedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">
                          {session.stats?.totalKeystrokes || session.totalKeystrokes || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {passed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-4">
                        <button
                          onClick={() => router.push(`/session/${session.id}`)}
                          className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          Review →
                        </button>
                        <button
                          onClick={() => handleDelete(session.id, session.candidateName || session.candidate_name)}
                          className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
