jest.mock('../models/tenant', () => ({
  find: jest.fn(),
  exists: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
}));
jest.mock('../models/newspaper', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock('../models/edition', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../models/role', () => ({
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
}));
jest.mock('../models/user', () => Object.assign(jest.fn(), { exists: jest.fn() }));

const Tenant = require('../models/tenant');
const Newspaper = require('../models/newspaper');
const Edition = require('../models/edition');
const Role = require('../models/role');
const User = require('../models/user');
const {
  listPublishers,
  createPublisher,
  listPublisherNewspapers,
  listPublisherEditions,
  createPublisherEdition,
} = require('./platformController');

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('platform publisher controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists publisher metadata without the platform tenant', async () => {
    const publishers = [{ _id: 'publisher-id', name: 'Example Press', status: 'active' }];
    const lean = jest.fn().mockResolvedValue(publishers);
    const sort = jest.fn().mockReturnValue({ lean });
    const select = jest.fn().mockReturnValue({ sort });
    Tenant.find.mockReturnValue({ select });
    const res = response();

    await listPublishers({ user: { tenantId: 'platform-id' } }, res, jest.fn());

    expect(Tenant.find).toHaveBeenCalledWith({ _id: { $ne: 'platform-id' } });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: publishers });
  });

  test('requires a valid owner password before creating a publisher', async () => {
    const res = response();

    await createPublisher({
      body: { name: 'Example Press', ownerEmail: 'owner@example.test', ownerPassword: 'short' },
      user: { tenantId: 'platform-id' },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Tenant.create).not.toHaveBeenCalled();
  });

  test('creates an isolated publisher tenant and its owner account', async () => {
    Tenant.exists.mockResolvedValue(false);
    User.exists.mockResolvedValue(false);
    const tenant = { _id: 'publisher-id', name: 'Example Press', domain: 'example.test', status: 'active' };
    Tenant.create.mockResolvedValue(tenant);
    Role.findOneAndUpdate.mockResolvedValue({ _id: 'role-id' });
    const owner = { _id: 'owner-id', email: 'owner@example.test', save: jest.fn() };
    User.mockImplementation(() => owner);
    const res = response();

    await createPublisher({
      body: {
        name: ' Example Press ',
        domain: 'example.test',
        ownerEmail: ' Owner@Example.test ',
        ownerPassword: 'SecureOwnerPass123',
      },
      user: { tenantId: 'platform-id' },
    }, res, jest.fn());

    expect(Tenant.create).toHaveBeenCalledWith({ name: 'Example Press', domain: 'example.test', status: 'active' });
    expect(Role.findOneAndUpdate).toHaveBeenCalledWith(
      { tenantId: 'publisher-id', name: 'publisheradmin' },
      { $set: { permissions: expect.arrayContaining(['user:create', 'workflow:campaign:create']) } },
      { new: true, upsert: true }
    );
    expect(owner.email).toBe('owner@example.test');
    expect(owner.password).toBe('SecureOwnerPass123');
    expect(owner.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('lists active newspapers from active publisher workspaces only', async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: 'publisher-id' }]);
    const select = jest.fn().mockReturnValue({ lean });
    Tenant.find.mockReturnValue({ select });

    const newspapers = [{ _id: 'paper-id', title: 'Example News' }];
    const newspaperLean = jest.fn().mockResolvedValue(newspapers);
    const sort = jest.fn().mockReturnValue({ lean: newspaperLean });
    const populate = jest.fn().mockReturnValue({ sort });
    const newspaperSelect = jest.fn().mockReturnValue({ populate, sort });
    Newspaper.find.mockReturnValue({ select: newspaperSelect });
    const res = response();

    await listPublisherNewspapers({ user: { tenantId: 'platform-id' } }, res, jest.fn());

    expect(Tenant.find).toHaveBeenCalledWith({
      _id: { $ne: 'platform-id' },
      status: 'active',
    });
    expect(Newspaper.find).toHaveBeenCalledWith({
      tenantId: { $in: ['publisher-id'] },
      status: 'active',
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: newspapers });
  });

  test('creates an edition inside the selected active newspaper publisher tenant', async () => {
    const newspaper = { tenantId: { _id: 'publisher-id', status: 'active' } };
    const lean = jest.fn().mockResolvedValue(newspaper);
    const populate = jest.fn().mockReturnValue({ lean });
    const select = jest.fn().mockReturnValue({ populate });
    Newspaper.findOne.mockReturnValue({ select });
    Edition.create.mockResolvedValue({ _id: 'edition-id' });
    const req = {
      validatedBody: { newspaperId: 'paper-id', city: 'Ahmedabad' },
    };
    const res = response();

    await createPublisherEdition(req, res, jest.fn());

    expect(Newspaper.findOne).toHaveBeenCalledWith({
      _id: 'paper-id',
      status: 'active',
    });
    expect(Edition.create).toHaveBeenCalledWith({
      newspaperId: 'paper-id',
      city: 'Ahmedabad',
      tenantId: 'publisher-id',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('lists editions only from active publisher workspaces', async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: 'publisher-id' }]);
    const select = jest.fn().mockReturnValue({ lean });
    Tenant.find.mockReturnValue({ select });

    const editions = [{ _id: 'edition-id', city: 'Ahmedabad' }];
    const editionLean = jest.fn().mockResolvedValue(editions);
    const sort = jest.fn().mockReturnValue({ lean: editionLean });
    const populate = jest.fn().mockReturnValue({ sort });
    Edition.find.mockReturnValue({ populate });
    const res = response();

    await listPublisherEditions({ user: { tenantId: 'platform-id' } }, res, jest.fn());

    expect(Edition.find).toHaveBeenCalledWith({
      tenantId: { $in: ['publisher-id'] },
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: editions });
  });

  test('does not create an edition for a newspaper in an inactive publisher workspace', async () => {
    const lean = jest.fn().mockResolvedValue({ tenantId: { _id: 'publisher-id', status: 'inactive' } });
    const populate = jest.fn().mockReturnValue({ lean });
    const select = jest.fn().mockReturnValue({ populate });
    Newspaper.findOne.mockReturnValue({ select });
    const res = response();

    await createPublisherEdition({
      validatedBody: { newspaperId: 'paper-id' },
    }, res, jest.fn());

    expect(Edition.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
