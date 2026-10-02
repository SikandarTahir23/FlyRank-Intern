export function validateIngestBody(req, res, next) {
  const body = req.body;
  
  if (!Array.isArray(body) && typeof body !== 'object') {
    return res.status(400).json({ error: 'Body must be an object or array' });
  }
  
  const records = Array.isArray(body) ? body : [body];
  
  for (const record of records) {
    const required = ['accountId', 'service', 'resourceId', 'resourceType', 'region', 'usageAmount', 'unit', 'unblendedCost', 'billingPeriodStart', 'billingPeriodEnd'];
    for (const field of required) {
      if (!(field in record)) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
  }
  
  next();
}

export function validateQueryParams(req, res, next) {
  const { page, limit } = req.query;
  
  if (page !== undefined) {
    const p = parseInt(page);
    if (isNaN(p) || p < 1) {
      return res.status(400).json({ error: 'Invalid page parameter' });
    }
  }
  
  if (limit !== undefined) {
    const l = parseInt(limit);
    if (isNaN(l) || l < 1 || l > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter (1-100)' });
    }
  }
  
  next();
}