jest.mock('../models/article', () => ({ find: jest.fn(), create: jest.fn(), findOne: jest.fn() }));
jest.mock('../models/edition', () => ({ countDocuments: jest.fn() }));
jest.mock('../models/newspaper', () => ({ findOne: jest.fn() }));

const Article = require('../models/article');
const controller = require('./articleController');

describe('editorial workflow controls', () => {
  beforeEach(() => jest.clearAllMocks());

  test('limits reporter story lists to stories created by that reporter', async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: 'story-a' }]);
    const limit = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ limit });
    Article.find.mockReturnValue({ sort });
    const res = { json: jest.fn() };

    await controller.listArticles(
      { user: { tenantId: 'tenant-a', id: 'reporter-a', roleName: 'reporter' }, query: {} },
      res,
      jest.fn()
    );

    expect(Article.find).toHaveBeenCalledWith({ tenantId: 'tenant-a', createdBy: 'reporter-a' });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ _id: 'story-a' }] });
  });

  test('does not submit a story before source rights are approved', async () => {
    const article = {
      status: 'DRAFT',
      rights: { status: 'pending' },
      save: jest.fn(),
    };
    Article.findOne.mockResolvedValue(article);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.submitArticle(
      { params: { id: '507f1f77bcf86cd799439011' }, user: { tenantId: 'tenant-a' } },
      res,
      jest.fn()
    );

    expect(Article.findOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011', tenantId: 'tenant-a' });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(article.save).not.toHaveBeenCalled();
  });

  test('does not approve a story without an auditable rights approval', async () => {
    const article = {
      status: 'UNDER_REVIEW',
      rights: { status: 'approved', approvedAt: null },
      save: jest.fn(),
    };
    Article.findOne.mockResolvedValue(article);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.reviewArticle(
      {
        params: { id: '507f1f77bcf86cd799439011' },
        user: { tenantId: 'tenant-a' },
        validatedBody: { action: 'approve' },
      },
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(article.save).not.toHaveBeenCalled();
  });
});
