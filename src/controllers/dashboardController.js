const Newspaper = require('../models/newspaper');
const Edition = require('../models/edition');
const Article = require('../models/article');
const Tenant = require('../models/tenant');

async function getSummary(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    let newspaperTenantId = tenantId;
    let editionTenantId = tenantId;
    if (req.user.roleName?.toLowerCase() === 'superadmin') {
      const publisherTenants = await Tenant.find({
        _id: { $ne: tenantId },
        status: 'active',
      }).select('_id').lean();
      const publisherTenantIds = publisherTenants.map(({ _id }) => _id);
      newspaperTenantId = { $in: publisherTenantIds };
      editionTenantId = { $in: publisherTenantIds };
    }

    const [activeNewspapers, activeEditions, storiesToReview, approvedStories] = await Promise.all([
      Newspaper.countDocuments({ tenantId: newspaperTenantId, status: 'active' }),
      Edition.countDocuments({ tenantId: editionTenantId, status: 'active' }),
      Article.countDocuments({ tenantId, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      Article.countDocuments({ tenantId, status: 'APPROVED' }),
    ]);

    return res.json({
      success: true,
      data: { activeNewspapers, activeEditions, storiesToReview, approvedStories },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getSummary };
