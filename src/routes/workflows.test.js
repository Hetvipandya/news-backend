jest.mock('../middlewares/authenticate', () => (req, res, next) => {
  req.user = {
    id: '507f1f77bcf86cd799439012',
    tenantId: '507f1f77bcf86cd799439011',
    roleName: req.headers['x-role'] || 'reader',
    permissions: ['workflow:campaign:read', 'workflow:report:read'],
  };
  return next();
});

jest.mock('../models/workflowItem', () => ({
  KINDS: ['template', 'issue', 'campaign', 'center', 'intake', 'verification', 'draw', 'claim'],
  STATUSES: {},
  DEFAULT_STATUSES: { draw: 'scheduled' },
  find: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  aggregate: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const WorkflowItem = require('../models/workflowItem');
const workflowRoutes = require('./workflows');

const app = express();
app.use(express.json());
app.use('/api/v1', workflowRoutes);

describe('workflow route authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  test('uses the requested kind read permission', async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ limit });
    WorkflowItem.find.mockReturnValue({ sort });

    const allowed = await request(app).get('/api/v1/workflows?kind=campaign');
    const denied = await request(app).get('/api/v1/workflows?kind=draw');

    expect(allowed.status).toBe(200);
    expect(WorkflowItem.find).toHaveBeenCalledWith({
      tenantId: '507f1f77bcf86cd799439011',
      kind: 'campaign',
    });
    expect(denied.status).toBe(403);
  });

  test('uses workflow kind create permission and the report permission convention', async () => {
    const denied = await request(app)
      .post('/api/v1/workflows')
      .send({ kind: 'campaign', title: 'Spring', data: {} });
    expect(denied.status).toBe(403);
    expect(WorkflowItem.create).not.toHaveBeenCalled();

    WorkflowItem.aggregate.mockResolvedValue([{ total: [], byKind: [], byStatus: [] }]);
    const report = await request(app).get('/api/v1/reports/summary');
    expect(report.status).toBe(200);
    expect(report.body.data).toEqual({ total: 0, byKind: [], byStatus: [] });
  });

  test('grants superadmin wildcard access to workflow actions', async () => {
    WorkflowItem.create.mockResolvedValue({ _id: 'item-id' });

    const response = await request(app)
      .post('/api/v1/workflows')
      .set('x-role', 'superadmin')
      .send({
        kind: 'draw',
        title: 'May draw',
        data: { campaign: 'SPRING', drawDate: '2026-03-31', seedReference: 'audit-1' },
      });

    expect(response.status).toBe(201);
  });
});
