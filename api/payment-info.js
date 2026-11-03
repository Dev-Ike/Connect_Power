'use strict';
const { ApiError, admin, requireUser, feeNaira, endpoint } = require('./_lib/common');

// GET /api/payment-info  ->  { amountNaira, currency }
module.exports = endpoint(async function (req, res) {
  if (req.method !== 'GET') throw new ApiError(405, 'invalid-argument', 'Method not allowed.');
  await requireUser(req, admin());
  res.status(200).json({ amountNaira: feeNaira(), currency: 'NGN' });
});
