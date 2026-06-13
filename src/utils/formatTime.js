// Prompt 26 — utils/formatTime.js
// Time formatting utilities for Shadow Coder

import { format } from 'date-fns';

/**
 * Converts milliseconds to MM:SS string.
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string "MM:SS"
 */
export function formatTime(ms) {
  if (ms == null || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formats ISO date string to readable format.
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date "MMM dd, yyyy HH:mm"
 */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  try {
    return format(new Date(isoString), 'MMM dd, yyyy HH:mm');
  } catch {
    return '';
  }
}

/**
 * Converts milliseconds to human-readable duration string.
 * @param {number} ms - Milliseconds
 * @returns {string} Human-readable duration
 */
export function formatDuration(ms) {
  if (ms == null || ms < 0) return '0 seconds';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
  }
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
