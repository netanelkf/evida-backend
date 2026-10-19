module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  testMatch: ['**/tests/**/*.test.js'],
};
