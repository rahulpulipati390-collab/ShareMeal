module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/jest.global-setup.js',
  globalTeardown: '<rootDir>/tests/jest.global-teardown.js',
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  transform: {},
};
