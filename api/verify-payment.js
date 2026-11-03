'use strict';
const { ApiError, admin, requireUser, paystack, settle, endpoint } = require('./_lib/common');

// POST /api/verify-payment  { reference }  ->  { status, applicationNumber? }
// Called by payment-callback.html when the user returns from Paystack.
module.exports = endpoint(async function (req, res) {
  if (req.method !== 'POST') throw new ApiError(405, 'invalid-argument', 'Method not allowed.');
  const sb = admin();
  const user = await requireUser(req, sb);

  const reference = req.body && req.body.reference;
  if (typeof reference !== 'string' || !/^[A-Za-z0-9-]{6,64}$/.test(reference)) {
    throw new ApiError(400, 'invalid-argument', 'Missing payment reference.');
  }
  const pay = await sb.from('payments').select('user_id,status').eq('reference', reference).maybeSingle();
  if (pay.error) throw pay.error;
  if (!pay.data || pay.data.user_id !== user.id) throw new ApiError(404, 'not-found', 'We could not find that payment.');

  if (pay.data.status !== 'success') {
    const gateway = await paystack('/transaction/verify/' + encodeURIComponent(reference));
    const result = await settle(sb, reference, gateway);
    if (result.result === 'not_successful') { res.status(200).json({ status: result.status || 'failed' }); return; }
  }
  const receipt = await sb.from('receipts').select('application_number').eq('user_id', user.id).maybeSingle();
  if (receipt.error) throw receipt.error;
  res.status(200).json(receipt.data
    ? { status: 'success', applicationNumber: receipt.data.application_number }
    : { status: 'pending' });
});
