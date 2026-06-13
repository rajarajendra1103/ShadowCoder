'use client';

import { use } from 'react';
import SessionReviewPage from '@/src/views/recruiter/SessionReview';

export default function SessionPage({ params }) {
  const { id } = use(params);
  return <SessionReviewPage sessionId={id} />;
}
