const rolePermissions = {
  publisheradmin: [
    'dashboard:read', 'newspaper:read', 'newspaper:create', 'newspaper:update',
    'edition:read', 'edition:create', 'edition:update', 'user:read', 'user:create',
    'workflow:template:read', 'workflow:template:create', 'workflow:template:update',
    'workflow:issue:read', 'workflow:issue:create', 'workflow:issue:update',
    'workflow:campaign:read', 'workflow:campaign:create', 'workflow:campaign:update',
    'workflow:center:read', 'workflow:center:create', 'workflow:center:update',
    'workflow:report:read',
    'ai:news:read', 'ai:news:create', 'ai:news:update',
  ],
  editionmanager: [
    'dashboard:read', 'newspaper:read', 'edition:read', 'edition:create', 'edition:update',
    'workflow:template:read', 'workflow:template:create', 'workflow:template:update',
    'workflow:issue:read', 'workflow:issue:create', 'workflow:issue:update',
    'workflow:report:read',
    'ai:news:read', 'ai:news:create', 'ai:news:update',
  ],
  editor: [
    'dashboard:read', 'newspaper:read', 'edition:read', 'article:read',
    'article:rights:approve', 'article:review',
    'workflow:template:read', 'workflow:issue:read', 'workflow:issue:update',
    'workflow:report:read',
    'ai:news:read', 'ai:news:create', 'ai:news:update',
  ],
  reporter: [
    'newspaper:read', 'edition:read', 'article:read', 'article:create', 'article:submit',
    'ai:news:read', 'ai:news:create',
  ],
  designer: [
    'workflow:template:read', 'workflow:template:create', 'workflow:template:update',
    'workflow:issue:read', 'workflow:issue:update',
  ],
  campaignmanager: [
    'workflow:campaign:read', 'workflow:campaign:create', 'workflow:campaign:update',
    'workflow:report:read',
  ],
  collectionoperator: [
    'workflow:center:read', 'workflow:intake:read', 'workflow:intake:create',
  ],
  verificationofficer: [
    'workflow:center:read', 'workflow:intake:read', 'workflow:verification:read',
    'workflow:verification:create', 'workflow:verification:update', 'workflow:report:read',
  ],
  drawofficer: [
    'workflow:campaign:read', 'workflow:center:read', 'workflow:intake:read',
    'workflow:intake:update', 'workflow:draw:read', 'workflow:draw:create',
    'workflow:draw:update', 'workflow:report:read',
  ],
  reader: [
    'workflow:campaign:read', 'workflow:claim:read', 'workflow:claim:create',
    'workflow:claim:update',
  ],
};

module.exports = rolePermissions;
