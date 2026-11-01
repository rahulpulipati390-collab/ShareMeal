// Rate limiting tests for authentication endpoints
// Increase default timeout for async operations
jest.setTimeout(30000);

const os = require('os');
const mongoose = require('mongoose');
const request = require('supertest');
const User = require('../models/user');

const mongoUri = process.env.MONGODB_URI;

// Helper to load a fresh Express app with a fresh rate limiter configuration
const loadFreshApp = async () => {
  // Reset module cache so that server module is re-evaluated with current env vars
  jest.resetModules();
  // Ensure test‑specific env vars are set before requiring the server
  process.env.ENABLE_RATE_LIMIT_IN_TESTS = 'true';
  process.env.RATE_LIMIT_MAX = '2'; // low limit for quick triggering
  // Ensure mongoose is connected (resetModules may clear the cache)
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, { runtimeAdapters: { os } });
  }
  return require('../server'); // returns the Express app instance
};

describe('Authentication rate limiting', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let createdUserEmail;

  beforeAll(async () => {
    // Connect to the test database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { runtimeAdapters: { os } });
    }
  });

  afterEach(async () => {
    // Cleanup any user created during a test
    if (createdUserEmail) {
      await User.deleteOne({ email: createdUserEmail });
      createdUserEmail = undefined;
    }
    // Remove test‑specific env vars
    delete process.env.ENABLE_RATE_LIMIT_IN_TESTS;
    delete process.env.RATE_LIMIT_MAX;
  });

  afterAll(async () => {
    // Restore original NODE_ENV and close DB connection
    process.env.NODE_ENV = originalNodeEnv;
    await mongoose.disconnect();
  });

  test('Login endpoint returns 429 after exceeding max requests', async () => {
    const app = await loadFreshApp();
    const uniqueEmail = `rateuser_${Date.now()}@example.com`;
    // Sign up the user
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'RateUser', email: uniqueEmail, password: 'pass123', role: 'donor' })
      .expect(201);
    createdUserEmail = uniqueEmail;

    // Perform allowed login attempts (max 2)
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: uniqueEmail, password: 'pass123' })
        .expect(200);
    }
    // Next request should be rate‑limited
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password: 'pass123' })
      .expect(429);
    expect(res.body.message).toMatch(/Too many requests/);
  });

  test('Signup endpoint returns 429 after exceeding max requests', async () => {
    const app = await loadFreshApp();
    // Perform allowed sign‑ups with unique emails
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/auth/signup')
        .send({ name: `TmpUser${i}`, email: `tmp${i}_${Date.now()}@example.com`, password: 'pass123', role: 'donor' })
        .expect(201);
    }
    // The third signup should be rate‑limited
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Overflow', email: `overflow_${Date.now()}@example.com`, password: 'pass123', role: 'donor' })
      .expect(429);
    expect(res.body.message).toMatch(/Too many requests/);
  });
});
