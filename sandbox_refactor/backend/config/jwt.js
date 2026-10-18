// JWT configuration
export default {
  secret: process.env.JWT_SECRET || 'evida-development-secret-change-in-production',
  accessTokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  issuer: 'evida-health',
  audience: 'evida-app'
};
