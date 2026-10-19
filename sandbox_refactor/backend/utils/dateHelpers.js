// Date utility functions

export function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

export function formatDateTime(date) {
  return new Date(date).toISOString();
}

export function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

export function isWithinMinutes(date, minutes) {
  const diff = Date.now() - new Date(date).getTime();
  return diff < minutes * 60 * 1000;
}

export function minutesAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (60 * 1000));
}

export function hoursAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (60 * 60 * 1000));
}

export function daysAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getToday() {
  return formatDate(new Date());
}

export function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}
