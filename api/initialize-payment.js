'use strict';
const checks = require('./_lib/checks');
const { ApiError, admin, requireUser, feeNaira, appUrl, paystack, endpoint } = require('./_lib/common');

// POST /api/initialize-payment  ->  { authorizationUrl, reference }
// Checks the saved application, then asks Paystack for a payment page.
module.exports = endpoint(async function (req, res) {
  if (req.method !== 'POST') throw new ApiError(405, 'invalid-argument', 'Method not allowed.');
  const sb = admin();
  const user = await requireUser(req, sb);

  const receipt = await sb.from('receipts').select('user_id').eq('user_id', user.id).maybeSingle();
  if (receipt.error) throw receipt.error;
  if (receipt.data) throw new ApiError(409, 'already-exists', 'This application has already been paid for.');

  const found = await sb.from('applications').select('*').eq('user_id', user.id).maybeSingle();
  if (found.error) throw found.error;
  const problem = checks.incompleteReason(found.data, user.id);
  if (problem) throw new ApiError(409, 'failed-precondition', problem);

  const fee = feeNaira();
  if (!fee) throw new ApiError(409, 'failed-precondition', 'The application fee has not been set up yet. Please contact support.');
  const base = appUrl();
  if (!base) throw new ApiError(409, 'failed-precondition', 'The website address has not been set up yet. Please contact support.');

  const email = found.data.pay.email;
  const reference = checks.newReference();
  const amountKobo = Math.round(fee * 100);

  const data = await paystack('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: email,
      amount: amountKobo,
      currency: 'NGN',
      reference: reference,
      callback_url: base + '/payment-callback.html',
      metadata: { user_id: user.id, track: found.data.programme.track, app: 'connect-power' }
    })
  });

  const saved = await sb.from('payments').insert({
    reference: reference, user_id: user.id, email: email, amount_kobo: amountKobo,
    status: 'pending', access_code: data.access_code || null
  });
  if (saved.error) throw saved.error;

  res.status(200).json({ authorizationUrl: data.authorization_url, reference: reference });
});
