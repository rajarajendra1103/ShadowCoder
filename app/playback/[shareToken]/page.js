'use client';

import { use } from 'react';
import SessionReviewPage from '@/src/views/recruiter/SessionReview';

export default function PlaybackPage({ params }) {
  const { shareToken } = use(params);
  return <SessionReviewPage shareToken={shareToken} readOnly={true} />;
}
