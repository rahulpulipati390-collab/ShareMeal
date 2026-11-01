const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// Read URI from globalSetup file if present
const uriFile = path.resolve(__dirname, 'mongo-uri.txt');
if (fs.existsSync(uriFile)) {
  const uri = fs.readFileSync(uriFile, 'utf8').trim();
  if (uri) {
    process.env.MONGODB_URI = uri;
  }
}
// JWT secret is set; MongoMemoryServer will provide the URI in beforeAll.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ShareMeal_Auth_2026_ChangeThis_ToARandomSecret';
process.env.RATE_LIMIT_MAX = '1000'; // high limit for most tests

const request = require('supertest');
const mongoose = require('mongoose');
let app; // will be required after DB connection
const User = require('../models/user');
const Donation = require('../models/donation');

describe('ShareMeal Automated Backend & Security Verification', () => {
  const timestamp = Date.now();
  jest.setTimeout(60000);
  const createdUserIds = [];
  const createdDonationIds = [];

  let donorUser, ngoUser1, ngoUser2, volunteerUser;
  let donorCookie, ngoCookie1, ngoCookie2, volunteerCookie;

  // Helper to extract cookie from response
  const getCookie = (res) => {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return '';
    return cookies[0].split(';')[0];
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI, {
        runtimeAdapters: { os }
      });
    }
    app = require('../server');

    // 1. Setup isolated test users
    // Donor
    const donorEmail = `donor_${timestamp}@testsharemeal.org`;
    const donorRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test Donor',
        email: donorEmail,
        password: 'password123',
        role: 'donor',
      });
    expect(donorRes.status).toBe(201);
    donorUser = donorRes.body.user;
    createdUserIds.push(donorUser.id);

    const donorLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: donorEmail, password: 'password123' });
    expect(donorLoginRes.status).toBe(200);
    donorCookie = getCookie(donorLoginRes);

    // NGO 1
    const ngo1Email = `ngo1_${timestamp}@testsharemeal.org`;
    const ngo1Res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test NGO One',
        email: ngo1Email,
        password: 'password123',
        role: 'ngo',
      });
    expect(ngo1Res.status).toBe(201);
    ngoUser1 = ngo1Res.body.user;
    createdUserIds.push(ngoUser1.id);

    const ngo1LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ngo1Email, password: 'password123' });
    expect(ngo1LoginRes.status).toBe(200);
    ngoCookie1 = getCookie(ngo1LoginRes);

    // NGO 2
    const ngo2Email = `ngo2_${timestamp}@testsharemeal.org`;
    const ngo2Res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test NGO Two',
        email: ngo2Email,
        password: 'password123',
        role: 'ngo',
      });
    expect(ngo2Res.status).toBe(201);
    ngoUser2 = ngo2Res.body.user;
    createdUserIds.push(ngoUser2.id);

    const ngo2LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ngo2Email, password: 'password123' });
    expect(ngo2LoginRes.status).toBe(200);
    ngoCookie2 = getCookie(ngo2LoginRes);

    // Volunteer
    const volEmail = `volunteer_${timestamp}@testsharemeal.org`;
    const volRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test Volunteer',
        email: volEmail,
        password: 'password123',
        role: 'volunteer',
      });
    expect(volRes.status).toBe(201);
    volunteerUser = volRes.body.user;
    createdUserIds.push(volunteerUser.id);

    const volLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: volEmail, password: 'password123' });
    expect(volLoginRes.status).toBe(200);
    volunteerCookie = getCookie(volLoginRes);
  }, 30000);

  afterAll(async () => {
    // Isolated cleanup: only remove test donations and test users created during this run
    if (createdDonationIds.length > 0) {
      await Donation.deleteMany({ _id: { $in: createdDonationIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.disconnect();
  });

  describe('1. Authentication & Session Security', () => {
    test('Logs in user with valid credentials and sets HTTP-only cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: donorUser.email,
          password: 'password123',
        });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(donorUser.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('Rejects login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: donorUser.email,
          password: 'wrongpassword',
        });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    test('Fetches current user profile with valid authentication cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', donorCookie);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(donorUser.id);
      expect(res.body.user.role).toBe('donor');
    });
    test('Rate limiting on login endpoint returns 429 after exceeding max requests', async () => {
    // Reset modules to get a fresh app instance with fresh rate limiter
    jest.resetModules();
    process.env.ENABLE_RATE_LIMIT_IN_TESTS = 'true';
    process.env.RATE_LIMIT_MAX = '2'; // low limit for this test
    app = require('../server'); // re-import after DB connection

    // Create a unique test user for this rate‑limit scenario
    const uniqueEmail = `ratelimit_${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'RateLimitUser', email: uniqueEmail, password: 'pass123', role: 'donor' })
      .expect(201);

    // Perform allowed login attempts
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: uniqueEmail, password: 'pass123' })
        .expect(200);
    }

    // Next request should be rate limited (429)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password: 'pass123' })
      .expect(429);
    expect(res.body.message).toMatch(/Too many requests/);
    // Cleanup env vars and restore normal app instance so subsequent tests are not rate limited
    delete process.env.ENABLE_RATE_LIMIT_IN_TESTS;
    process.env.RATE_LIMIT_MAX = '1000';
    jest.resetModules();
    app = require('../server');
  });

});

  

  describe('2. Unauthorized Request Protection', () => {
    test('Rejects request to /api/auth/me without authentication', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/log in/i);
    });

    test('Rejects request to /api/donations without authentication', async () => {
      const res = await request(app).get('/api/donations');
      expect(res.status).toBe(401);
    });

    test('Rejects request to /api/donations/available without authentication', async () => {
      const res = await request(app).get('/api/donations/available');
      expect(res.status).toBe(401);
    });

    test('Rejects donation creation without authentication', async () => {
      const res = await request(app)
        .post('/api/donations')
        .send({
          title: 'Unauthorized Food',
          quantity: 5,
        });
      expect(res.status).toBe(401);
    });

    test('Rejects donation creation by non-donor NGO account (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set('Cookie', ngoCookie1)
        .send({
          title: 'NGO Attempted Food',
          quantity: 10,
        });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only registered donors can create food donations/i);
    });

    test('Rejects donation creation by non-donor volunteer account (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set('Cookie', volunteerCookie)
        .send({
          title: 'Volunteer Attempted Food',
          quantity: 10,
        });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only registered donors can create food donations/i);
    });
  });

  describe('3. Donor Donation CRUD Operations', () => {
    let testDonationId;

    test('Donor creates a new donation (Create)', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set('Cookie', donorCookie)
        .send({
          title: 'Fresh Bread & Pastries',
          description: 'Surplus sourdough bread and croissants',
          quantity: 15,
          expiryDate: '2030-06-01',
          pickupAddress: '456 Bakery Lane',
          contactInfo: '555-0199',
        });

      expect(res.status).toBe(201);
      expect(res.body.donation).toBeDefined();
      expect(res.body.donation.title).toBe('Fresh Bread & Pastries');
      expect(res.body.donation.status).toBe('available');

      testDonationId = res.body.donation._id;
      createdDonationIds.push(testDonationId);
    });

    test('Donor retrieves their own donation list (Read)', async () => {
      const res = await request(app)
        .get('/api/donations')
        .set('Cookie', donorCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.donations)).toBe(true);
      const found = res.body.donations.find((d) => d._id === testDonationId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Fresh Bread & Pastries');
    });

    test('Donor updates their existing donation (Update)', async () => {
      const res = await request(app)
        .put(`/api/donations/${testDonationId}`)
        .set('Cookie', donorCookie)
        .send({
          title: 'Fresh Bread & Pastries (Updated)',
          quantity: 20,
          description: 'Updated quantity and description',
        });

      expect(res.status).toBe(200);
      expect(res.body.donation.title).toBe('Fresh Bread & Pastries (Updated)');
      expect(res.body.donation.quantity).toBe(20);
    });

    test('Donor cannot alter status directly via PUT', async () => {
      const res = await request(app)
        .put(`/api/donations/${testDonationId}`)
        .set('Cookie', donorCookie)
        .send({
          title: 'Fresh Bread & Pastries (Safe)',
          status: 'claimed', // attempt to maliciously or erroneously flip status
        });

      expect(res.status).toBe(200);
      expect(res.body.donation.status).toBe('available'); // status must remain available
    });

    test('Donor deletes their own donation (Delete)', async () => {
      const res = await request(app)
        .delete(`/api/donations/${testDonationId}`)
        .set('Cookie', donorCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Donation deleted.');

      // Verify it is no longer returned in donor list
      const checkRes = await request(app)
        .get('/api/donations')
        .set('Cookie', donorCookie);
      const found = checkRes.body.donations.find((d) => d._id === testDonationId);
      expect(found).toBeUndefined();
    });

    test('Donor cannot update a donation once claimed by an NGO (400 Bad Request)', async () => {
      // 1. Create a donation
      const createRes = await request(app)
        .post('/api/donations')
        .set('Cookie', donorCookie)
        .send({
          title: 'Claimed Edit Test Food',
          quantity: 5,
        });
      expect(createRes.status).toBe(201);
      const claimedTestId = createRes.body.donation._id;
      createdDonationIds.push(claimedTestId);

      // 2. NGO claims it
      const claimRes = await request(app)
        .post(`/api/donations/${claimedTestId}/claim`)
        .set('Cookie', ngoCookie1);
      expect(claimRes.status).toBe(200);

      // 3. Donor attempts to edit the claimed donation
      const editRes = await request(app)
        .put(`/api/donations/${claimedTestId}`)
        .set('Cookie', donorCookie)
        .send({
          title: 'Malicious Change While Dispatched',
          quantity: 0,
        });
      expect(editRes.status).toBe(400);
      expect(editRes.body.message).toMatch(/Only available donations can be updated/i);
    });

    test('Donor cannot delete a donation once claimed by an NGO (400 Bad Request)', async () => {
      // 1. Create a donation
      const createRes = await request(app)
        .post('/api/donations')
        .set('Cookie', donorCookie)
        .send({
          title: 'Claimed Delete Test Food',
          quantity: 3,
        });
      expect(createRes.status).toBe(201);
      const claimedDeleteId = createRes.body.donation._id;
      createdDonationIds.push(claimedDeleteId);

      // 2. NGO claims it
      const claimRes = await request(app)
        .post(`/api/donations/${claimedDeleteId}/claim`)
        .set('Cookie', ngoCookie1);
      expect(claimRes.status).toBe(200);

      // 3. Donor attempts to delete the claimed donation
      const delRes = await request(app)
        .delete(`/api/donations/${claimedDeleteId}`)
        .set('Cookie', donorCookie);
      expect(delRes.status).toBe(400);
      expect(delRes.body.message).toMatch(/already been claimed or completed/i);

      // 4. Verify donation still exists in DB
      const checkDonation = await Donation.findById(claimedDeleteId);
      expect(checkDonation).not.toBeNull();
      expect(checkDonation.status).toBe('claimed');
    });
      // New test: second donor cannot delete another donor's donation
    test('Second donor cannot delete another donor\'s donation (404)', async () => {
      // Create second donor
      const donor2Email = `donor2_${timestamp}@testsharemeal.org`;
      const donor2Res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Second Donor',
          email: donor2Email,
          password: 'password123',
          role: 'donor',
        });
      expect(donor2Res.status).toBe(201);
      const donor2User = donor2Res.body.user;
      createdUserIds.push(donor2User.id);

      const donor2LoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: donor2Email, password: 'password123' });
      expect(donor2LoginRes.status).toBe(200);
      const donor2Cookie = getCookie(donor2LoginRes);

      // First donor creates a donation
      const createRes = await request(app)
        .post('/api/donations')
        .set('Cookie', donorCookie)
        .send({
          title: 'Second Donor Test Donation',
          quantity: 5,
        });
      expect(createRes.status).toBe(201);
      const donationId = createRes.body.donation._id;
      createdDonationIds.push(donationId);

      // Second donor attempts to delete it
      const delRes = await request(app)
        .delete(`/api/donations/${donationId}`)
        .set('Cookie', donor2Cookie);
      expect(delRes.status).toBe(404);

      // Verify donation still exists
      const check = await Donation.findById(donationId);
      expect(check).not.toBeNull();
    });

    // New test: NGO cannot delete a claimed donation
    test('NGO cannot delete a claimed donation (404)', async () => {
      // Donor creates donation
      const createRes = await request(app)
        .post('/api/donations')
        .set('Cookie', donorCookie)
        .send({
          title: 'NGO Delete Claim Test',
          quantity: 5,
        });
      expect(createRes.status).toBe(201);
      const donationId = createRes.body.donation._id;
      createdDonationIds.push(donationId);

      // NGO claims the donation
      const claimRes = await request(app)
        .post(`/api/donations/${donationId}/claim`)
        .set('Cookie', ngoCookie1);
      expect(claimRes.status).toBe(200);

      // NGO attempts to delete
      const delRes = await request(app)
        .delete(`/api/donations/${donationId}`)
        .set('Cookie', ngoCookie1);
      expect(delRes.status).toBe(404);

      // Verify donation still exists and is claimed
      const check = await Donation.findById(donationId);
      expect(check).not.toBeNull();
      expect(check.status).toBe('claimed');
    });

});

  describe('4. NGO Claiming, Role Enforcement & Duplicate Claim Prevention', () => {
    let claimableDonationId;

    beforeEach(async () => {
      // Create a fresh donation for claim testing
      const createRes = await request(app)
        .post('/api/donations')
        .set('Cookie', donorCookie)
        .send({
          title: 'Catering Trays',
          description: 'Fresh catered pasta and salad',
          quantity: 10,
          expiryDate: '2030-01-01',
          pickupAddress: '789 Banquet Hall',
          contactInfo: '555-0234',
        });
      expect(createRes.status).toBe(201);
      claimableDonationId = createRes.body.donation._id;
      createdDonationIds.push(claimableDonationId);
    });

    test('NGO-only claiming: Non-NGO (Donor) cannot claim donation (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/donations/${claimableDonationId}/claim`)
        .set('Cookie', donorCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only registered NGO accounts can claim/i);
    });

    test('Donor self-claim prevention: Creator cannot claim own donation', async () => {
      // Even if role check passes or creator attempts claim, self-claim is prevented
      const res = await request(app)
        .post(`/api/donations/${claimableDonationId}/claim`)
        .set('Cookie', donorCookie);

      // Fails with either 403 (role enforcement) or 400 (self-claim)
      expect([400, 403]).toContain(res.status);
    });

    test('NGO can successfully claim an available donation (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/donations/${claimableDonationId}/claim`)
        .set('Cookie', ngoCookie1);

      expect(res.status).toBe(200);
      expect(res.body.donation.status).toBe('claimed');
      expect(res.body.donation.claimedBy).toBe(ngoUser1.id);
    });

    test('Claimed donation appears in NGO claimed donations list (GET /api/donations/claimed)', async () => {
      const claimRes = await request(app)
        .post(`/api/donations/${claimableDonationId}/claim`)
        .set('Cookie', ngoCookie1);
      expect(claimRes.status).toBe(200);

      const getRes = await request(app)
        .get('/api/donations/claimed')
        .set('Cookie', ngoCookie1);
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body.donations)).toBe(true);
      const found = getRes.body.donations.find((d) => d._id === claimableDonationId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Catering Trays');
      expect(found.status).toBe('claimed');
      expect(found.claimedBy).toBe(ngoUser1.id);
    });

    test('Non-NGO user cannot access GET /api/donations/claimed (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/donations/claimed')
        .set('Cookie', donorCookie);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only registered NGO accounts can view claimed donations/i);
    });

    test('Unauthenticated user cannot access GET /api/donations/claimed (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/donations/claimed');
      expect(res.status).toBe(401);
    });

    test('Duplicate claim prevention: Cannot claim an already claimed donation (409 Conflict)', async () => {
      // First NGO claims the donation
      const firstClaim = await request(app)
        .post(`/api/donations/${claimableDonationId}/claim`)
        .set('Cookie', ngoCookie1);
      expect(firstClaim.status).toBe(200);

      // Second NGO attempts to claim the same donation
      const secondClaim = await request(app)
        .post(`/api/donations/${claimableDonationId}/claim`)
        .set('Cookie', ngoCookie2);

      expect(secondClaim.status).toBe(409);
      expect(secondClaim.body.message).toMatch(/already been claimed/i);
    });

    test('Invalid or non-existent donation ID returns 404 Not Found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/donations/${nonExistentId}/claim`)
        .set('Cookie', ngoCookie1);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Donation not found/i);
    });
  });

  describe('5. Concurrency: Simultaneous Claim Requests', () => {
    test('Simultaneous claim requests from two NGOs result in exactly one winner and one 409 conflict', async () => {
      // Create a fresh donation specifically for race condition testing
      const createRes = await request(app)
        .post('/api/donations')
        .set('Cookie', donorCookie)
        .send({
          title: 'High-Demand Fresh Fruit Boxes',
          description: 'Limited seasonal fruit boxes',
          quantity: 8,
          expiryDate: '2030-05-01',
          pickupAddress: '100 Market St',
          contactInfo: '555-8888',
        });
      expect(createRes.status).toBe(201);
      const raceDonationId = createRes.body.donation._id;
      createdDonationIds.push(raceDonationId);

      // Fire simultaneous claims from NGO 1 and NGO 2
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/donations/${raceDonationId}/claim`)
          .set('Cookie', ngoCookie1),
        request(app)
          .post(`/api/donations/${raceDonationId}/claim`)
          .set('Cookie', ngoCookie2),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (200) and one must be rejected (409)
      expect(statuses).toEqual([200, 409]);

      // Verify the final MongoDB state directly
      const finalDonation = await Donation.findById(raceDonationId);
      expect(finalDonation.status).toBe('claimed');
      expect([ngoUser1.id, ngoUser2.id]).toContain(finalDonation.claimedBy.toString());
    });
  });

  describe('6. CORS Origin Security Verification', () => {
    test('Allowed local Vite dev origin receives credentialed CORS headers', async () => {
      const res = await request(app)
        .get('/debug')
        .set('Origin', 'http://localhost:5180');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5180');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    test('Untrusted origin is not granted credentialed CORS access', async () => {
      const res = await request(app)
        .get('/debug')
        .set('Origin', 'http://malicious-attacker.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    });

    test('Requests without Origin header succeed normally', async () => {
      const res = await request(app).get('/debug');
      expect(res.status).toBe(200);
    });
  });
});
