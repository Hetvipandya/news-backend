jest.mock('../models/workflowItem', () => ({
  KINDS: ['template', 'issue', 'campaign', 'center', 'intake', 'verification', 'draw', 'claim'],
  STATUSES: {
    template: ['draft', 'review', 'approved', 'archived'],
    issue: ['planning', 'proof', 'approved', 'published'],
    campaign: ['draft', 'approved', 'active', 'paused', 'completed'],
    center: ['active', 'inactive'],
    intake: ['received', 'frozen', 'verified', 'rejected'],
    verification: ['pending', 'verified', 'rejected'],
    draw: ['scheduled', 'entries_frozen', 'completed', 'audited'],
    claim: ['submitted', 'under_review', 'approved', 'rejected', 'paid'],
  },
  DEFAULT_STATUSES: {
    template: 'draft', issue: 'planning', campaign: 'draft', center: 'active',
    intake: 'received', verification: 'pending', draw: 'scheduled', claim: 'submitted',
  },
  find: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  aggregate: jest.fn(),
}));

const WorkflowItem = require('../models/workflowItem');
const controller = require('./workflowController');
const tenantId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const itemId = '507f1f77bcf86cd799439013';
const operatorEmailFilter = { $regex: '^operator@example\\.test$', $options: 'i' };

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('workflow controllers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists by tenant and scopes reader claims to their creator', async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ limit });
    WorkflowItem.find.mockReturnValue({ sort });
    const res = response();

    await controller.listWorkflows({
      user: { tenantId, id: userId, roleName: 'reader' },
      query: { kind: 'claim' },
    }, res, jest.fn());

    expect(WorkflowItem.find).toHaveBeenCalledWith({ tenantId, kind: 'claim', createdBy: userId });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  test('limits collection operators to centers assigned to their authenticated email', async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ limit });
    WorkflowItem.find.mockReturnValue({ sort });
    const res = response();

    await controller.listWorkflows({
      user: { tenantId, id: userId, email: 'operator@example.test', roleName: 'collectionoperator' },
      query: { kind: 'center' },
    }, res, jest.fn());

    expect(WorkflowItem.find).toHaveBeenCalledWith({
      tenantId,
      kind: 'center',
      'data.assignedOperator': operatorEmailFilter,
    });
  });

  test('limits collection operator intake to centers assigned to their email', async () => {
    const centerId = '507f1f77bcf86cd799439014';
    const itemLean = jest.fn().mockResolvedValue([]);
    const itemLimit = jest.fn().mockReturnValue({ lean: itemLean });
    const itemSort = jest.fn().mockReturnValue({ limit: itemLimit });
    const assignedLean = jest.fn().mockResolvedValue([{ _id: centerId }]);
    const assignedSelect = jest.fn().mockReturnValue({ lean: assignedLean });
    WorkflowItem.find.mockImplementation((filter) => (
      filter.kind === 'center'
        ? { select: assignedSelect }
        : { sort: itemSort }
    ));
    const res = response();

    await controller.listWorkflows({
      user: { tenantId, id: userId, email: 'operator@example.test', roleName: 'collectionoperator' },
      query: { kind: 'intake' },
    }, res, jest.fn());

    expect(WorkflowItem.find).toHaveBeenNthCalledWith(1, {
      tenantId,
      kind: 'center',
      'data.assignedOperator': operatorEmailFilter,
    });
    expect(WorkflowItem.find).toHaveBeenNthCalledWith(2, {
      tenantId,
      kind: 'intake',
      'data.center': { $in: [centerId] },
    });
  });

  test('keeps verification officer intake lists tenant-wide', async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ limit });
    WorkflowItem.find.mockReturnValue({ sort });
    const res = response();

    await controller.listWorkflows({
      user: { tenantId, id: userId, email: 'verification@example.test', roleName: 'verificationofficer' },
      query: { kind: 'intake' },
    }, res, jest.fn());

    expect(WorkflowItem.find).toHaveBeenCalledWith({ tenantId, kind: 'intake' });
  });

  test('redacts private campaign data from reader lists', async () => {
    const rows = [{
      _id: itemId,
      tenantId: 'private-tenant',
      kind: 'campaign',
      title: 'Public campaign',
      description: 'Public description',
      status: 'active',
      createdBy: userId,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      data: {
        campaignCode: 'SPRING',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        terms: 'One entry per person',
        budget: 50000,
        advertiserContact: 'private@example.test',
      },
    }];
    const lean = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ limit });
    WorkflowItem.find.mockReturnValue({ sort });
    const res = response();

    await controller.listWorkflows({
      user: { tenantId, id: userId, roleName: 'reader' },
      query: { kind: 'campaign' },
    }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{
        _id: itemId,
        kind: 'campaign',
        title: 'Public campaign',
        description: 'Public description',
        status: 'active',
        createdBy: userId,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        data: {
          campaignCode: 'SPRING',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          terms: 'One entry per person',
        },
      }],
    });
    expect(rows[0].data.budget).toBe(50000);
  });

  test('rejects unsupported kinds and fields before querying or writing', async () => {
    const res = response();
    await controller.listWorkflows({ user: { tenantId }, query: { kind: 'unknown' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);

    const postRes = response();
    await controller.createWorkflow({
      user: { tenantId, id: userId },
      body: { kind: 'campaign', title: 'Spring', data: {}, tenantId: 'other-tenant' },
    }, postRes, jest.fn());
    expect(postRes.status).toHaveBeenCalledWith(400);
    expect(WorkflowItem.create).not.toHaveBeenCalled();
  });

  test('returns 400 for a create request with no title', async () => {
    const res = response();

    await controller.createWorkflow({
      user: { tenantId, id: userId },
      body: { kind: 'campaign', data: {} },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(WorkflowItem.create).not.toHaveBeenCalled();
  });

  test('creates records with trusted tenant and creator and a kind default status', async () => {
    WorkflowItem.create.mockResolvedValue({ _id: itemId, kind: 'campaign' });
    const res = response();

    await controller.createWorkflow({
      user: { tenantId, id: userId },
      body: {
        kind: 'campaign',
        title: 'Spring',
        data: {
          campaignCode: 'SPRING',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          terms: 'One entry per person',
          budget: 50,
        },
      },
    }, res, jest.fn());

    expect(WorkflowItem.create).toHaveBeenCalledWith({
      kind: 'campaign',
      title: 'Spring',
      description: '',
      status: 'draft',
      data: {
        campaignCode: 'SPRING',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        terms: 'One entry per person',
        budget: 50,
      },
      tenantId,
      createdBy: userId,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('requires new workflow records to use their initial status', async () => {
    const res = response();

    await controller.createWorkflow({
      user: { tenantId, id: userId },
      body: {
        kind: 'draw',
        title: 'May draw',
        status: 'completed',
        data: { campaign: 'SPRING', drawDate: '2026-03-31', seedReference: 'audit-1' },
      },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(WorkflowItem.create).not.toHaveBeenCalled();
  });

  test('requires claim fields and explicit consent', async () => {
    const res = response();

    await controller.createWorkflow({
      user: { tenantId, id: userId },
      body: {
        kind: 'claim',
        title: 'Prize claim',
        data: {
          campaign: 'SPRING',
          participantName: 'A Reader',
          email: 'reader@example.test',
          phone: '5550100',
          claimDetails: 'Claim details',
        },
      },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'data.consent must be true' });
    expect(WorkflowItem.create).not.toHaveBeenCalled();
  });

  test('requires intake sheetsCount to be a positive integer and normalizes form numeric strings', async () => {
    const intake = {
      kind: 'intake',
      title: 'Sheet intake',
      data: { center: 'Central', receiptId: 'R-1', sheetsCount: 1.5, receivedAt: '2026-03-01' },
    };
    const invalidRes = response();
    await controller.createWorkflow({
      user: { tenantId, id: userId }, body: intake,
    }, invalidRes, jest.fn());
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    WorkflowItem.create.mockResolvedValue({ _id: itemId, kind: 'intake' });
    const validRes = response();
    await controller.createWorkflow({
      user: { tenantId, id: userId },
      body: { ...intake, data: { ...intake.data, sheetsCount: '5' } },
    }, validRes, jest.fn());

    expect(WorkflowItem.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { ...intake.data, sheetsCount: 5 },
    }));
    expect(validRes.status).toHaveBeenCalledWith(201);
  });

  test('rejects a collection operator intake for a center not assigned to them', async () => {
    const select = jest.fn().mockResolvedValue(null);
    WorkflowItem.findOne.mockReturnValue({ select });
    const res = response();

    await controller.createWorkflow({
      user: { tenantId, id: userId, email: 'operator@example.test', roleName: 'collectionoperator' },
      body: {
        kind: 'intake',
        title: 'Sheet intake',
        data: {
          center: '507f1f77bcf86cd799439014',
          receiptId: 'R-1',
          sheetsCount: 2,
          receivedAt: '2026-03-01',
        },
      },
    }, res, jest.fn());

    expect(WorkflowItem.findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439014',
      tenantId,
      kind: 'center',
      'data.assignedOperator': operatorEmailFilter,
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(WorkflowItem.create).not.toHaveBeenCalled();
  });

  test('rejects invalid update statuses and updates only within the authenticated tenant', async () => {
    WorkflowItem.findOne.mockResolvedValue({ kind: 'issue', createdBy: 'someone-else' });
    const res = response();

    await controller.updateWorkflow({
      user: { tenantId, id: userId, roleName: 'editor' },
      params: { id: itemId },
      body: { status: 'active' },
    }, res, jest.fn());

    expect(WorkflowItem.findOne).toHaveBeenCalledWith({ _id: itemId, tenantId });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(WorkflowItem.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('rejects valid but out-of-order status transitions', async () => {
    WorkflowItem.findOne.mockResolvedValue({ kind: 'issue', status: 'planning', createdBy: userId });
    const res = response();

    await controller.updateWorkflow({
      user: { tenantId, id: userId, roleName: 'editionmanager' },
      params: { id: itemId },
      body: { status: 'published' },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cannot change issue from planning to published',
    });
    expect(WorkflowItem.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('allows the next workflow status and guards against concurrent status changes', async () => {
    WorkflowItem.findOne.mockResolvedValue({ kind: 'issue', status: 'planning', createdBy: userId });
    WorkflowItem.findOneAndUpdate.mockResolvedValue({ _id: itemId, kind: 'issue', status: 'proof' });
    const res = response();

    await controller.updateWorkflow({
      user: { tenantId, id: userId, roleName: 'editionmanager' },
      params: { id: itemId },
      body: { status: 'proof' },
    }, res, jest.fn());

    expect(WorkflowItem.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: itemId, tenantId, status: 'planning' },
      { $set: { status: 'proof' } },
      { new: true, runValidators: true },
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.objectContaining({ status: 'proof' }) });
  });

  test('keeps reader claim updates scoped to their own claim', async () => {
    WorkflowItem.findOne.mockResolvedValue({ kind: 'claim', createdBy: 'another-reader' });
    const res = response();

    await controller.updateWorkflow({
      user: { tenantId, id: userId, roleName: 'reader' },
      params: { id: itemId },
      body: { description: 'Updated contact details' },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(WorkflowItem.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('rejects participant claim status changes', async () => {
    WorkflowItem.findOne.mockResolvedValue({ kind: 'claim', createdBy: userId });
    const res = response();

    await controller.updateWorkflow({
      user: { tenantId, id: userId, roleName: 'reader' },
      params: { id: itemId },
      body: { status: 'paid' },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(WorkflowItem.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('allows reader claim description and data edits only on their own record', async () => {
    const claimData = {
      campaign: 'SPRING',
      participantName: 'A Reader',
      email: 'reader@example.test',
      phone: '5550100',
      claimDetails: 'Claim details',
      consent: true,
    };
    const updated = {
      _id: itemId,
      kind: 'claim',
      title: 'My claim',
      description: 'Updated contact',
      status: 'submitted',
      data: { ...claimData, email: 'new@example.test' },
      createdBy: userId,
    };
    WorkflowItem.findOne.mockResolvedValue({ kind: 'claim', createdBy: userId, status: 'submitted', data: claimData });
    WorkflowItem.findOneAndUpdate.mockResolvedValue(updated);
    const res = response();

    await controller.updateWorkflow({
      user: { tenantId, id: userId, roleName: 'reader' },
      params: { id: itemId },
      body: { description: 'Updated contact', data: { email: 'new@example.test' } },
    }, res, jest.fn());

    expect(WorkflowItem.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: itemId, tenantId, createdBy: userId },
      { $set: {
        description: 'Updated contact',
        data: { ...claimData, email: 'new@example.test' },
      } },
      { new: true, runValidators: true },
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.objectContaining({
      kind: 'claim',
      status: 'submitted',
      data: expect.objectContaining({ consent: true, email: 'new@example.test' }),
      createdBy: userId,
    }) });
  });

  test('rejects reader claim edits that leave required data invalid', async () => {
    WorkflowItem.findOne.mockResolvedValue({
      kind: 'claim',
      createdBy: userId,
      data: {
        campaign: 'SPRING',
        participantName: 'A Reader',
        email: 'reader@example.test',
        phone: '5550100',
        claimDetails: 'Claim details',
        consent: true,
      },
    });
    const res = response();

    await controller.updateWorkflow({
      user: { tenantId, id: userId, roleName: 'participant' },
      params: { id: itemId },
      body: { data: { phone: '' } },
    }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(WorkflowItem.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('reports tenant-scoped totals and only aggregate kind/status counts', async () => {
    WorkflowItem.aggregate.mockResolvedValue([{
      total: [{ count: 2 }],
      byKind: [{ _id: 'claim', count: 2 }],
      byStatus: [{ _id: 'submitted', count: 2 }],
    }]);
    const res = response();

    await controller.getReportsSummary({ user: { tenantId } }, res, jest.fn());

    expect(WorkflowItem.aggregate).toHaveBeenCalledWith([{
      $match: { tenantId: expect.anything() },
    }, {
      $facet: {
        byKind: [{ $group: { _id: '$kind', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        total: [{ $count: 'count' }],
      },
    }]);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        total: 2,
        byKind: [{ kind: 'claim', count: 2 }],
        byStatus: [{ status: 'submitted', count: 2 }],
      },
    });
  });
});
