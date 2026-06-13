// Prompt 12 — components/charts/TimeBreakdownChart.jsx
// Stacked bar chart showing session time phases for Shadow Coder
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { segmentSession, formatPhases } from '@/src/utils/segmentSession';

export default function TimeBreakdownChart({ events }) {
  const data = useMemo(() => {
    if (!events || events.length === 0) return null;
    const phases = segmentSession(events);
    return formatPhases(phases);
  }, [events]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <p className="text-gray-500 text-sm">No session data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Time Breakdown</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" barSize={32}>
          <YAxis type="category" dataKey="name" hide />
          <XAxis type="number" unit="s" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            formatter={(value) => `${value}s`}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f3f4f6',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
            iconType="circle"
          />
          <Bar dataKey="thinking" stackId="a" fill="#6b7280" name="Thinking" radius={[4, 0, 0, 4]} />
          <Bar dataKey="coding" stackId="a" fill="#3b82f6" name="Coding" />
          <Bar dataKey="debugging" stackId="a" fill="#f59e0b" name="Debugging" />
          <Bar dataKey="testing" stackId="a" fill="#10b981" name="Testing" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
