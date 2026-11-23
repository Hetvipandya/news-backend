process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';

const request = require('supertest');
const app = require('./app');

describe('API entry points', () => {
  test('requires authentication for publishing data', async () => {
    const response = await request(app).get('/api/v1/newspapers');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('mounts workflow and report APIs behind authentication', async () => {
    const workflows = await request(app).get('/api/v1/workflows?kind=campaign');
    const reports = await request(app).get('/api/v1/reports/summary');

    expect(workflows.status).toBe(401);
    expect(reports.status).toBe(401);
  });

  test('validates login input before accessing the database', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation error');
    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'email' }),
      expect.objectContaining({ field: 'password' }),
    ]));
  });

  test('returns an unauthenticated session without an HTTP error when no refresh cookie exists', async () => {
    const response = await request(app).get('/api/v1/auth/session');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, authenticated: false });
  });

  test('allows the Vite development server on an alternate localhost port', async () => {
    const response = await request(app)
      .get('/api/v1/auth/session')
      .set('Origin', 'http://localhost:5174');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  test('returns a consistent not-found response', async () => {
    const response = await request(app).get('/api/v1/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Route not found' });
  });
});
