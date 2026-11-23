import express from 'express';
import { Tenant } from '../models/tenant.js';
import asyncHandler from 'express-async-handler';

const router = express.Router();

// Create a new tenant (publisher)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, domain, ownerUserId } = req.body;
    const tenant = await Tenant.create({ name, domain, ownerUserId });
    res.status(201).json({ success: true, message: 'Tenant created', data: tenant });
  })
);

// Get tenant details (must belong to same tenant or be SuperAdmin – placeholder check)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    res.json({ success: true, data: tenant });
  })
);

export default router;
