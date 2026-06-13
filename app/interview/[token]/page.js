'use client';

import { use } from 'react';
import InterviewRoomPage from '@/src/views/candidate/InterviewRoom';

export default function InterviewPage({ params }) {
  const { token } = use(params);
  return <InterviewRoomPage token={token} />;
}
