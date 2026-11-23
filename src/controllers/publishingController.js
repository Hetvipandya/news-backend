const mongoose = require('mongoose');
const Newspaper = require('../models/newspaper');
const Edition = require('../models/edition');

function invalidId(id) {
  return !mongoose.Types.ObjectId.isValid(id);
}

async function listNewspapers(req, res, next) {
  try {
    const newspapers = await Newspaper.find({ tenantId: req.user.tenantId }).sort({ title: 1 }).lean();
    return res.json({ success: true, data: newspapers });
  } catch (error) {
    return next(error);
  }
}

async function createNewspaper(req, res, next) {
  try {
    const newspaper = await Newspaper.create({
      ...req.validatedBody,
      tenantId: req.user.tenantId,
    });
    return res.status(201).json({ success: true, data: newspaper });
  } catch (error) {
    return next(error);
  }
}

async function getNewspaper(req, res, next) {
  try {
    if (invalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid newspaper ID' });
    }
    const newspaper = await Newspaper.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).lean();
    if (!newspaper) {
      return res.status(404).json({ success: false, message: 'Newspaper not found' });
    }
    return res.json({ success: true, data: newspaper });
  } catch (error) {
    return next(error);
  }
}

async function updateNewspaper(req, res, next) {
  try {
    if (invalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid newspaper ID' });
    }
    const newspaper = await Newspaper.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: req.validatedBody },
      { new: true, runValidators: true }
    );
    if (!newspaper) {
      return res.status(404).json({ success: false, message: 'Newspaper not found' });
    }
    return res.json({ success: true, data: newspaper });
  } catch (error) {
    return next(error);
  }
}

async function listEditions(req, res, next) {
  try {
    const filter = { tenantId: req.user.tenantId };
    if (req.query.newspaperId) {
      if (invalidId(req.query.newspaperId)) {
        return res.status(400).json({ success: false, message: 'Invalid newspaperId' });
      }
      filter.newspaperId = req.query.newspaperId;
    }
    const editions = await Edition.find(filter).populate('newspaperId', 'title').sort({ city: 1 }).lean();
    return res.json({ success: true, data: editions });
  } catch (error) {
    return next(error);
  }
}

async function createEdition(req, res, next) {
  try {
    const newspaper = await Newspaper.findOne({
      _id: req.validatedBody.newspaperId,
      tenantId: req.user.tenantId,
      status: 'active',
    }).select('_id');
    if (!newspaper) {
      return res.status(404).json({ success: false, message: 'Active newspaper not found' });
    }
    const edition = await Edition.create({
      ...req.validatedBody,
      tenantId: req.user.tenantId,
    });
    return res.status(201).json({ success: true, data: edition });
  } catch (error) {
    return next(error);
  }
}

async function updateEdition(req, res, next) {
  try {
    if (invalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid edition ID' });
    }
    const updates = { ...req.validatedBody };
    if (updates.newspaperId) {
      const newspaper = await Newspaper.findOne({
        _id: updates.newspaperId,
        tenantId: req.user.tenantId,
        status: 'active',
      }).select('_id');
      if (!newspaper) {
        return res.status(404).json({ success: false, message: 'Active newspaper not found' });
      }
    }
    const edition = await Edition.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!edition) {
      return res.status(404).json({ success: false, message: 'Edition not found' });
    }
    return res.json({ success: true, data: edition });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listNewspapers, createNewspaper, getNewspaper, updateNewspaper,
  listEditions, createEdition, updateEdition,
};
