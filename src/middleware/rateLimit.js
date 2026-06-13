import rateLimit from 'express-rate-limit';

export const executeLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: { error: 'Too many execution requests. Please wait.' },
  standardHeaders: true,
});

export const inviteLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { error: 'Invite limit reached for this hour.' },
  standardHeaders: true,
});

export const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many auth attempts. Try again later.' },
  standardHeaders: true,
});
