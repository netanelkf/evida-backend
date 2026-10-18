// ROOK API configuration
export default {
  clientUuid: process.env.ROOK_CLIENT_UUID,
  clientSecret: process.env.ROOK_CLIENT_SECRET,
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://api.rook-connect.com'
    : 'https://api.rook-connect.review',
  webhookSecret: process.env.ROOK_WEBHOOK_SECRET,
  pollingIntervalMs: 5 * 60 * 1000 // 5 minutes
};
