jest.mock('../models/newspaper', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock('../models/edition', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const Newspaper = require('../models/newspaper');
const Edition = require('../models/edition');
const controller = require('./publishingController');

describe('tenant-scoped publishing controllers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists only newspapers in the authenticated tenant', async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ lean });
    Newspaper.find.mockReturnValue({ sort });
    const res = { json: jest.fn() };

    await controller.listNewspapers({ user: { tenantId: 'tenant-a' } }, res, jest.fn());

    expect(Newspaper.find).toHaveBeenCalledWith({ tenantId: 'tenant-a' });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  test('does not accept a client-supplied tenant on newspaper creation', async () => {
    Newspaper.create.mockResolvedValue({ _id: 'paper-id' });
    const req = {
      user: { tenantId: 'tenant-a' },
      validatedBody: { title: 'Local News', tenantId: 'tenant-b' },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.createNewspaper(req, res, jest.fn());

    expect(Newspaper.create).toHaveBeenCalledWith({ title: 'Local News', tenantId: 'tenant-a' });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('lists editions only in the authenticated tenant', async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ lean });
    const populate = jest.fn().mockReturnValue({ sort });
    Edition.find.mockReturnValue({ populate });
    const res = { json: jest.fn() };

    await controller.listEditions({ user: { tenantId: 'tenant-a' }, query: {} }, res, jest.fn());

    expect(Edition.find).toHaveBeenCalledWith({ tenantId: 'tenant-a' });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});
