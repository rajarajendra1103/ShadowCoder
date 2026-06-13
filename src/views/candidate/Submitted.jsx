// Prompt 25 — pages/candidate/Submitted.jsx
// Submission confirmation page for Shadow Coder
'use client';

export default function SubmittedPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="text-center relative z-10 max-w-md">
        {/* Checkmark icon */}
        <div className="mb-8 inline-flex items-center justify-center">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Submission received
        </h1>

        {/* Body */}
        <p className="text-gray-400 text-lg leading-relaxed">
          Your coding session has been submitted successfully.
          <br />
          You will hear back from the team shortly.
        </p>

        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-1.5 mt-8">
          <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full" />
          <div className="w-1.5 h-1.5 bg-emerald-500/25 rounded-full" />
          <div className="w-1.5 h-1.5 bg-emerald-500/15 rounded-full" />
        </div>
      </div>
    </div>
  );
}
