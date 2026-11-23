const roleCatalog = [
  ['superadmin', 'Platform Super Admin', 'Onboard publishers, configure platform services and provide support without routine access to private editorial data.'],
  ['publisheradmin', 'Publisher Owner/Admin', 'Configure newspapers, brands, regions, users, campaign budgets and approvals.'],
  ['editionmanager', 'State Manager / Edition Manager', 'Edit edition settings, schedules, local templates and final edition coordination.'],
  ['editor', 'Editor / Chief Editor', 'Review sources, approve stories, check page proof and lock publication.'],
  ['reporter', 'Reporter / Agency Feed', 'Submit stories, media and corrections within assigned geographies.'],
  ['designer', 'Designer / Prepress Operator', 'Create approved template versions, adjust page layout and run preflight.'],
  ['campaignmanager', 'Advertising / Campaign Manager', 'Book ads, define coupon campaigns and placement constraints.'],
  ['collectionoperator', 'Collection Center Manager / Operator', 'Receive physical sheets and record scan intake receipt IDs only for the assigned center.'],
  ['verificationofficer', 'Verification Officer / Supervisor', 'Inspect coupon series and original sheet evidence; decide verification status.'],
  ['drawofficer', 'Draw Officer / Auditor', 'Conduct authorized draws, freeze entries and audit seed and winner approvals.'],
  ['reader', 'Reader / Participant', 'Use the optional campaign portal for consent, status, claims and contact management.'],
];

module.exports = roleCatalog.map(([key, name, responsibility]) => ({ key, name, responsibility }));
