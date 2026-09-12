const tenantRepository = require('../repositories/tenantRepository');
const asyncHandler = require('../utils/asyncHandler');

// Every billable request must prove which tenant it belongs to.
// Never trust a tenant_id sent in the request body — that's client-controlled data
// and a client could just claim to be a different (unlimited) tenant.
const apiKeyAuth = asyncHandler(async (req, res, next) => {
  const key = req.header('X-API-Key');
  if (!key) {
    return res.status(401).json({ error: 'X-API-Key header is required' });
  }

  const tenant = await tenantRepository.findByApiKey(key);
  if (!tenant) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.tenant = tenant;
  next();
});

module.exports = apiKeyAuth;