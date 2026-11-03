'use strict';
const checks = require('./_lib/checks');
const { ApiError, env, admin, paystack, settle } = require('./_lib/common');

// POST /api/paystack-webhook  (set this address in your Paystack dashboard)
// Paystack calls it when a payment succeeds, even if the user closed the browser.
// We check the signature, then confirm with Paystack before recording anything.
module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

  const secret = env('PAYSTACK_SECRET_KEY');
  const signature = String(req.headers['x-paystack-signature'] || '');
  const body = req.body;
  const candidates = [];
  if (typeof body === 'string') candidates.push(body);
  else if (Buffer.isBuffer(body)) candidates.push(body);
  else if (body && typeof body === 'object') candidates.push(JSON.stringify(body));
  const valid = !!secret && candidates.some(function (c) { return checks.safeEqual(checks.signatureFor(c, secret), signature); });
  if (!valid) { console.warn('Webhook rejected: bad signature'); res.status(401).send('Invalid signature'); return; }

  let event = body;
  if (typeof body === 'string') { try { event = JSON.parse(body); } catch (e) { event = {}; } }
  else if (Buffer.isBuffer(body)) { try { event = JSON.parse(body.toString('utf8')); } catch (e) { event = {}; } }

  if (event && event.event === 'charge.success' && event.data && event.data.reference) {
    const reference = String(event.data.reference);
    try {
      const gateway = await paystack('/transaction/verify/' + encodeURIComponent(reference));
      await settle(admin(), reference, gateway);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'not-found' || err.code === 'failed-precondition')) {
        console.warn('Webhook ignored', reference, err.code, err.message);
      } else {
        console.error('Webhook processing failed', reference, err);
        res.status(500).send('Try again');   // Paystack will retry later
        return;
      }
    }
  }
  res.status(200).send('ok');
};
