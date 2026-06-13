// Prompt 20 — pages/recruiter/ProblemLibrary.jsx
// Problem library management for Shadow Coder
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiClient from '@/src/api/client';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGE_OPTIONS = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
];

const DEFAULT_STARTERS = {
  python: 'def solution(nums: list) -> int:\n    pass',
  javascript: 'function solution(nums) {\n  // your code here\n}',
  typescript: 'function solution(nums: number[]): number {\n  // your code here\n}',
  java: 'class Solution {\n  public int solution(int[] nums) {\n    // your code here\n    return 0;\n  }\n}',
  cpp: '#include <vector>\nusing namespace std;\n\nint solution(vector<int>& nums) {\n    // your code here\n    return 0;\n}',
  csharp: 'public class Solution {\n  public int Run(int[] nums) {\n    // your code here\n    return 0;\n  }\n}',
  go: 'package main\n\nfunc solution(nums []int) int {\n    // your code here\n    return 0\n}',
  rust: 'fn solution(nums: Vec<i32>) -> i32 {\n    // your code here\n    0\n}',
};

export default function ProblemLibraryPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [previewMarkdown, setPreviewMarkdown] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    timeLimit: 30,
    visibility: 'private',
    languages: ['python'],
    starterCode: { python: DEFAULT_STARTERS.python },
    testCases: [{ input: '', expectedOutput: '' }],
  });
  const [activeTab, setActiveTab] = useState('python');

  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/problems');
      const data = (res.data.problems || res.data || []).map(p => ({
        ...p,
        timeLimit: p.timeLimit || p.time_limit,
        languages: p.languages || p.allowedLanguages || [],
        testCases: p.testCases || p.test_cases || [],
      }));
      setProblems(data);
    } catch {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const openCreateModal = () => {
    setEditingProblem(null);
    setForm({
      title: '', description: '', timeLimit: 30, visibility: 'private',
      languages: ['python'], starterCode: { python: DEFAULT_STARTERS.python },
      testCases: [{ input: '', expectedOutput: '' }],
    });
    setActiveTab('python');
    setPreviewMarkdown(false);
    setShowModal(true);
  };

  const openEditModal = (problem) => {
    setEditingProblem(problem);
    const langs = problem.languages || ['python'];
    const starters = {};
    langs.forEach(l => {
      starters[l] = problem.starterCode?.[l] || problem.starter_code?.[l] || DEFAULT_STARTERS[l] || '';
    });
    setForm({
      title: problem.title,
      description: problem.description,
      timeLimit: problem.timeLimit || 30,
      visibility: problem.visibility || 'private',
      languages: langs,
      starterCode: starters,
      testCases: (problem.testCases || []).length > 0 ? problem.testCases : [{ input: '', expectedOutput: '' }],
    });
    setActiveTab(langs[0]);
    setPreviewMarkdown(false);
    setShowModal(true);
  };

  const toggleLanguage = (langId) => {
    setForm(prev => {
      const newLangs = prev.languages.includes(langId)
        ? prev.languages.filter(l => l !== langId)
        : [...prev.languages, langId];
      if (newLangs.length === 0) return prev;

      const newStarters = { ...prev.starterCode };
      if (!newStarters[langId]) newStarters[langId] = DEFAULT_STARTERS[langId] || '';

      if (!newLangs.includes(activeTab)) setActiveTab(newLangs[0]);
      return { ...prev, languages: newLangs, starterCode: newStarters };
    });
  };

  const addTestCase = () => {
    setForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '' }],
    }));
  };

  const removeTestCase = (index) => {
    setForm(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index),
    }));
  };

  const updateTestCase = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) => i === index ? { ...tc, [field]: value } : tc),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (form.languages.length === 0) return toast.error('Select at least one language');
    if (form.testCases.length === 0) return toast.error('Add at least one test case');

    try {
      const payload = {
        title: form.title,
        description: form.description,
        timeLimit: form.timeLimit,
        time_limit: form.timeLimit,
        visibility: form.visibility,
        languages: form.languages,
        allowedLanguages: form.languages,
        starterCode: form.starterCode,
        starter_code: form.starterCode,
        testCases: form.testCases,
      };

      if (editingProblem) {
        await apiClient.put(`/problems/${editingProblem.id}`, payload);
        toast.success('Problem updated');
      } else {
        await apiClient.post('/problems', payload);
        toast.success('Problem created');
      }
      setShowModal(false);
      fetchProblems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save problem');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    try {
      await apiClient.delete(`/problems/${id}`);
      toast.success('Problem deleted');
      fetchProblems();
    } catch {
      toast.error('Failed to delete problem');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Problem Library</h1>
          <p className="text-gray-400 text-sm mt-1">Create and manage coding problems</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Problem
        </button>
      </div>

      {/* Problem cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-white mb-2">No problems yet</h3>
          <p className="text-gray-400 text-sm">Create your first problem to start inviting candidates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map(problem => (
            <div key={problem.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-medium text-lg leading-tight">{problem.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(problem)} className="p-1.5 hover:bg-gray-800 rounded-md transition-colors">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(problem.id)} className="p-1.5 hover:bg-red-500/10 rounded-md transition-colors">
                    <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Language tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(problem.languages || []).map(lang => (
                  <span key={lang} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md">
                    {lang}
                  </span>
                ))}
              </div>
              {/* Info row */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="bg-gray-800 px-2 py-1 rounded">{problem.timeLimit || problem.time_limit} min</span>
                <span>{(problem.testCases || problem.test_cases || []).length} test cases</span>
                <span className={`px-2 py-0.5 rounded ${problem.visibility === 'team' ? 'bg-violet-500/10 text-violet-400' : 'bg-gray-800 text-gray-400'}`}>
                  {problem.visibility === 'team' ? 'Team' : 'Private'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-white">
                {editingProblem ? 'Edit Problem' : 'Create Problem'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Basic Info</h3>
                <input
                  type="text" placeholder="Problem Title" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm text-gray-400">Description (Markdown)</label>
                    <button
                      onClick={() => setPreviewMarkdown(!previewMarkdown)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {previewMarkdown ? 'Edit' : 'Preview'}
                    </button>
                  </div>
                  {previewMarkdown ? (
                    <div className="bg-gray-800 rounded-lg p-4 min-h-[120px] prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.description}</ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      rows={5} placeholder="Describe the problem..." value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Time Limit</label>
                    <select
                      value={form.timeLimit}
                      onChange={e => setForm(f => ({ ...f, timeLimit: parseInt(e.target.value) }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Visibility</label>
                    <div className="flex gap-4 mt-2">
                      {['private', 'team'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio" name="visibility" value={v}
                            checked={form.visibility === v}
                            onChange={() => setForm(f => ({ ...f, visibility: v }))}
                            className="text-blue-500"
                          />
                          <span className="text-sm text-gray-300 capitalize">{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Languages */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">Allowed Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLanguage(lang.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        form.languages.includes(lang.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Starter Code */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">Starter Code</h3>
                <div className="flex gap-1 mb-2 overflow-x-auto">
                  {form.languages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        activeTab === lang ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {LANGUAGE_OPTIONS.find(l => l.id === lang)?.label || lang}
                    </button>
                  ))}
                </div>
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <MonacoEditor
                    height="200px"
                    language={activeTab}
                    value={form.starterCode[activeTab] || ''}
                    onChange={(val) => setForm(f => ({ ...f, starterCode: { ...f.starterCode, [activeTab]: val || '' } }))}
                    theme="vs-dark"
                    options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                  />
                </div>
              </div>

              {/* Section 4: Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Test Cases</h3>
                  <button onClick={addTestCase} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Test Case
                  </button>
                </div>
                <div className="space-y-3">
                  {form.testCases.map((tc, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                      <textarea
                        rows={2} placeholder="Input" value={tc.input}
                        onChange={e => updateTestCase(i, 'input', e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                      <textarea
                        rows={2} placeholder="Expected Output" value={tc.expectedOutput}
                        onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                      <button
                        onClick={() => removeTestCase(i)}
                        disabled={form.testCases.length <= 1}
                        className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-30 transition-colors mt-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                {editingProblem ? 'Update Problem' : 'Create Problem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
