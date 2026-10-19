// Structured logger

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatMessage(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
}

export function debug(message, meta) {
  if (currentLevel <= LOG_LEVELS.debug) {
    console.debug(formatMessage('debug', message, meta));
  }
}

export function info(message, meta) {
  if (currentLevel <= LOG_LEVELS.info) {
    console.info(formatMessage('info', message, meta));
  }
}

export function warn(message, meta) {
  if (currentLevel <= LOG_LEVELS.warn) {
    console.warn(formatMessage('warn', message, meta));
  }
}

export function error(message, meta) {
  if (currentLevel <= LOG_LEVELS.error) {
    console.error(formatMessage('error', message, meta));
  }
}

export default { debug, info, warn, error };
