jest.mock('../models/user', () => Object.assign(jest.fn(), {
  find: jest.fn(),
  exists: jest.fn(),
}));
jest.mock('../models/role', () => ({
  findOneAndUpdate: jest.fn(),
}));

const User = require('../models/user');
const Role = require('../models/role');
const { createTeamUser, listTeamUsers } = require('./teamController');

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('team controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists only users in the authenticated tenant without password data', async () => {
    const rows = [{
      _id: 'user-id',
      email: 'editor@example.test',
      roleId: { name: 'editor' },
      isActive: true,
      createdAt: '2026-03-01T00:00:00.000Z',
    }];
    const lean = jest.fn().mockResolvedValue(rows);
    const sort = jest.fn().mockReturnValue({ lean });
    const populate = jest.fn().mockReturnValue({ sort });
    const select = jest.fn().mockReturnValue({ populate });
    User.find.mockReturnValue({ select });
    const res = response();

    await listTeamUsers({ user: { tenantId: 'tenant-id' } }, res, jest.fn());

    expect(User.find).toHaveBeenCalledWith({ tenantId: 'tenant-id' });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 'user-id', email: 'editor@example.test', roleName: 'editor', isActive: true, createdAt: rows[0].createdAt }],
    });
  });

  test('validates role, password, and email before creating an account', async () => {
    const res = response();
    await createTeamUser({
      user: { tenantId: 'tenant-id' },
      body: { email: 'owner@example.test', password: 'short', roleName: 'publisheradmin' },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.exists).not.toHaveBeenCalled();
  });

  test('creates an account with the selected tenant role permissions', async () => {
    Role.findOneAndUpdate.mockResolvedValue({ _id: 'role-id' });
    User.exists.mockResolvedValue(false);
    const user = { _id: 'user-id', email: 'editor@example.test', isActive: true, save: jest.fn() };
    User.mockImplementation(() => user);
    const res = response();

    await createTeamUser({
      user: { tenantId: 'tenant-id' },
      body: { email: 'Editor@Example.test ', password: 'SecurePassword123', roleName: 'editor' },
    }, res, jest.fn());

    expect(Role.findOneAndUpdate).toHaveBeenCalledWith(
      { tenantId: 'tenant-id', name: 'editor' },
      { $set: { permissions: expect.arrayContaining(['article:review']) } },
      { new: true, upsert: true }
    );
    expect(user.email).toBe('editor@example.test');
    expect(user.password).toBe('SecurePassword123');
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
