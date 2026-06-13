// Prompt 21 — pages/recruiter/SendInvite.jsx
// Send interview invite page for Shadow Coder
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import apiClient from '@/src/api/client';

export default function SendInvitePage() {
  const [problems, setProblems] = useState([]);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      timeLimitOverride: '30',
      linkExpiry: '48',
    },
  });

  const selectedProblemId = watch('problemId');

  // Fetch problems on mount
  useEffect(() => {
    const loadProblems = async () => {
      try {
        const res = await apiClient.get('/problems');
        setProblems(res.data.problems || res.data || []);
      } catch {
        toast.error('Failed to load problems');
      }
    };
    loadProblems();
  }, []);

  // Auto-fill time limit when problem is selected
  useEffect(() => {
    if (selectedProblemId) {
      const problem = problems.find(p => String(p.id) === String(selectedProblemId));
      if (problem) {
        const timeLimit = problem.timeLimit || problem.time_limit || 30;
        setValue('timeLimitOverride', String(timeLimit));
      }
    }
  }, [selectedProblemId, problems, setValue]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/invites', {
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        role: data.role,
        problemId: data.problemId,
        timeLimitOverride: parseInt(data.timeLimitOverride),
        linkExpiry: parseInt(data.linkExpiry),
      });
      setSuccess({
        email: data.candidateEmail,
        link: res.data.inviteLink || res.data.link || `${window.location.origin}/interview/${res.data.token}`,
        emailSent: res.data.emailSent !== false
      });
      if (res.data.emailSent === false) {
        toast.error('Invite created, but email failed to send. Please share the link manually.');
      } else {
        toast.success('Invite created and sent successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setSuccess(null);
    reset();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  // Success state
  if (success) {
    const emailFailed = success.emailSent === false;
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          {emailFailed ? (
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          <h2 className="text-xl font-bold text-white mb-2">
            {emailFailed ? 'Invite Created (Email Failed)' : `Invite sent to ${success.email}`}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {emailFailed 
              ? 'The invite is ready, but the automated email could not be sent (e.g. unverified recipient in sandbox). Please send the link below manually.'
              : 'The candidate will receive an email with their session link.'}
          </p>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-400 mb-2">Candidate Session Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-blue-400 break-all text-left">{success.link}</code>
              <button
                onClick={() => copyToClipboard(success.link)}
                className="shrink-0 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          <button
            onClick={handleSendAnother}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Send Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Send Invite</h1>
        <p className="text-gray-400 text-sm mt-1">Invite a candidate to a coding session</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Candidate Name */}
          <div>
            <label htmlFor="candidateName" className="block text-sm font-medium text-gray-300 mb-1.5">
              Candidate Name
            </label>
            <input
              id="candidateName"
              type="text"
              {...register('candidateName', { required: 'Name is required' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Jane Smith"
            />
            {errors.candidateName && <p className="text-red-400 text-xs mt-1">{errors.candidateName.message}</p>}
          </div>

          {/* Candidate Email */}
          <div>
            <label htmlFor="candidateEmail" className="block text-sm font-medium text-gray-300 mb-1.5">
              Candidate Email
            </label>
            <input
              id="candidateEmail"
              type="email"
              {...register('candidateEmail', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
              })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="jane@example.com"
            />
            {errors.candidateEmail && <p className="text-red-400 text-xs mt-1">{errors.candidateEmail.message}</p>}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1.5">
              Role / Position
            </label>
            <input
              id="role"
              type="text"
              {...register('role', { required: 'Role is required' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Frontend Engineer"
            />
            {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role.message}</p>}
          </div>

          {/* Problem Selector */}
          <div>
            <label htmlFor="problemId" className="block text-sm font-medium text-gray-300 mb-1.5">
              Problem
            </label>
            <select
              id="problemId"
              {...register('problemId', { required: 'Select a problem' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Select a problem...</option>
              {problems.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            {errors.problemId && <p className="text-red-400 text-xs mt-1">{errors.problemId.message}</p>}
          </div>

          {/* Time Limit + Link Expiry row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="timeLimitOverride" className="block text-sm font-medium text-gray-300 mb-1.5">
                Time Limit
              </label>
              <select
                id="timeLimitOverride"
                {...register('timeLimitOverride')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
            <div>
              <label htmlFor="linkExpiry" className="block text-sm font-medium text-gray-300 mb-1.5">
                Link Expiry
              </label>
              <select
                id="linkExpiry"
                {...register('linkExpiry')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-linear-to-r from-blue-600 to-violet-600 text-white py-2.5 rounded-lg font-medium
                       hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all
                       flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invite'
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          The candidate will receive an email with a one-time link. No account is required. The link expires after the selected time.
        </p>
      </div>
    </div>
  );
}
