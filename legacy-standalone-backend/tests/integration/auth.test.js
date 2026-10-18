const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { truncateAll } = require('../setup/truncate');

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /auth/register', () => {
  it('creates a user, seeds default thresholds, and returns a token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'patient@example.com', password: 'hunter22', name: 'Pat' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: 'patient@example.com', name: 'Pat', role: 'user' });

    const thresholds = await db('thresholds').where({ user_id: res.body.user.id });
    expect(thresholds.length).toBeGreaterThan(0);
  });

  it('rejects a duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'hunter22' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'hunter22' });

    expect(res.status).toBe(409);
  });

  it('rejects an invalid payload', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'hunter22', name: 'Login User' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'hunter22' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user without the password hash', async () => {
    const register = await request(app)
      .post('/auth/register')
      .send({ email: 'me@example.com', password: 'hunter22', name: 'Me' });

    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${register.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@example.com');
    expect(res.body.password_hash).toBeUndefined();
  });
});
