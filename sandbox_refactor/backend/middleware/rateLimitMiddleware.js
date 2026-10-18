// Simple in-memory rate limiter

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export default function rateLimitMiddleware(req, res, next) {
  const key = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  const entry = requestCounts.get(key);

  if (!entry || now - entry.startTime > WINDOW_MS) {
    requestCounts.set(key, { count: 1, startTime: now });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((entry.startTime + WINDOW_MS - now) / 1000)
    });
  }

  entry.count++;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now - entry.startTime > WINDOW_MS * 2) {
      requestCounts.delete(key);
    }
  }
}, WINDOW_MS);
