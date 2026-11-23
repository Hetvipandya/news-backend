jest.mock('../models/newspaper', () => ({ countDocuments: jest.fn() }));
jest.mock('../models/edition', () => ({ countDocuments: jest.fn() }));
jest.mock('../models/article', () => ({ countDocuments: jest.fn() }));
jest.mock('../models/tenant', () => ({ find: jest.fn() }));

const Newspaper = require('../models/newspaper');
const Edition = require('../models/edition');
const Article = require('../models/article');
const Tenant = require('../models/tenant');
const { getSummary } = require('./dashboardController');

describe('tenant dashboard summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('counts only records in the authenticated tenant', async () => {
    Newspaper.countDocuments.mockResolvedValue(1);
    Edition.countDocuments.mockResolvedValue(2);
    Article.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
    const res = { json: jest.fn() };

    await getSummary({ user: { tenantId: 'tenant-a' } }, res, jest.fn());

    expect(Newspaper.countDocuments).toHaveBeenCalledWith({ tenantId: 'tenant-a', status: 'active' });
    expect(Edition.countDocuments).toHaveBeenCalledWith({ tenantId: 'tenant-a', status: 'active' });
    expect(Article.countDocuments).toHaveBeenNthCalledWith(1, {
      tenantId: 'tenant-a',
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { activeNewspapers: 1, activeEditions: 2, storiesToReview: 3, approvedStories: 4 },
    });
  });

  test('counts active newspapers and editions across active publisher workspaces for superadmins', async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: 'publisher-a' }, { _id: 'publisher-b' }]);
    const select = jest.fn().mockReturnValue({ lean });
    Tenant.find.mockReturnValue({ select });
    Newspaper.countDocuments.mockResolvedValue(5);
    Edition.countDocuments.mockResolvedValue(8);
    Article.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const res = { json: jest.fn() };

    await getSummary({ user: { tenantId: 'platform', roleName: 'superadmin' } }, res, jest.fn());

    expect(Tenant.find).toHaveBeenCalledWith({
      _id: { $ne: 'platform' },
      status: 'active',
    });
    expect(Newspaper.countDocuments).toHaveBeenCalledWith({
      tenantId: { $in: ['publisher-a', 'publisher-b'] },
      status: 'active',
    });
    expect(Edition.countDocuments).toHaveBeenCalledWith({
      tenantId: { $in: ['publisher-a', 'publisher-b'] },
      status: 'active',
    });
    expect(Article.countDocuments).toHaveBeenCalledWith({
      tenantId: 'platform',
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { activeNewspapers: 5, activeEditions: 8, storiesToReview: 0, approvedStories: 0 },
    });
  });
});
