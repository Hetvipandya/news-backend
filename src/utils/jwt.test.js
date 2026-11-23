process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('./jwt');

describe('JWT token purposes', () => {
  const payload = { sub: 'user-id', tenantId: 'tenant-id', roleId: 'role-id' };

  test('accepts access tokens only as access tokens', () => {
    const token = signAccessToken(payload);

    expect(verifyAccessToken(token)).toMatchObject({ ...payload, tokenUse: 'access' });
    expect(() => verifyRefreshToken(token)).toThrow('Invalid refresh token');
  });

  test('accepts refresh tokens only as refresh tokens', () => {
    const token = signRefreshToken(payload);
    const rotatedToken = signRefreshToken(payload);

    expect(verifyRefreshToken(token)).toMatchObject({ ...payload, tokenUse: 'refresh' });
    expect(verifyRefreshToken(rotatedToken).jti).not.toBe(verifyRefreshToken(token).jti);
    expect(() => verifyAccessToken(token)).toThrow('Invalid access token');
  });
});
