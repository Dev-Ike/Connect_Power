'use strict';
const { createClient } = require('@supabase/supabase-js');

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function env(name) { return String(process.env[name] || '').trim(); }

// Server-side Supabase client (service role: bypasses row level security).
function admin() {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new ApiError(500, 'failed-precondition', 'The server is not set up yet. Please contact support.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Reads "Authorization: Bearer <Supabase access token>" and returns the signed-in user.
async function requireUser(req, sb) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) throw new ApiError(401, 'unauthenticated', 'Please sign in to continue.');
  const out = await sb.auth.getUser(m[1]);
  if (out.error || !out.data || !out.data.user) throw new ApiError(401, 'unauthenticated', 'Please sign in again to continue.');
  return out.data.user;
}

function feeNaira() {
  const n = Number(env('APPLICATION_FEE_NGN'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// The public address of the website (no trailing slash).
function appUrl() {
  let base = env('APP_URL');
  if (!base && env('VERCEL_PROJECT_PRODUCTION_URL')) base = 'https://' + env('VERCEL_PROJECT_PRODUCTION_URL');
  base = base.replace(/\/+$/, '');
  return /^https?:\/\//.test(base) ? base : '';
}

async function paystack(path, options) {
  const secret = env('PAYSTACK_SECRET_KEY');
  if (!secret) throw new ApiError(500, 'failed-precondition', 'Payments are not set up yet. Please contact support.');
  const res = await fetch('https://api.paystack.co' + path, Object.assign({}, options, {
    headers: Object.assign({ Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' }, (options && options.headers) || {})
  }));
  let body = null;
  try { body = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok || !body || body.status !== true) {
    console.error('Paystack request failed', path, res.status, body && body.message);
    throw new ApiError(503, 'unavailable', 'We could not reach the payment service. Please try again in a moment.');
  }
  return body.data;
}

// Confirms a payment result once, safely (the database does the locking).
async function settle(sb, reference, gateway) {
  const out = await sb.rpc('settle_payment', {
    p_reference: reference,
    p_status: gateway && gateway.status ? String(gateway.status) : '',
    p_amount_kobo: gateway && Number.isInteger(gateway.amount) ? gateway.amount : 0,
    p_currency: gateway && gateway.currency ? String(gateway.currency) : '',
    p_gateway_reference: gateway && gateway.reference ? String(gateway.reference) : '',
    p_gateway_id: gateway && gateway.id != null ? String(gateway.id) : '',
    p_channel: gateway && gateway.channel ? String(gateway.channel) : ''
  });
  if (out.error) { console.error('settle_payment failed', out.error); throw new ApiError(500, 'internal', 'We could not record the payment. Please contact support with your reference: ' + reference); }
  const result = out.data || {};
  if (result.result === 'not_found') throw new ApiError(404, 'not-found', 'Unknown payment reference.');
  if (result.result === 'mismatch') throw new ApiError(409, 'failed-precondition', 'The payment amount did not match. Please contact support with your reference: ' + reference);
  return result;
}

// Wraps an endpoint: no caching, JSON errors, never leaks internals.
function endpoint(fn) {
  return async function (req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof ApiError) { res.status(e.status).json({ error: { code: e.code, message: e.message } }); return; }
      console.error(e);
      res.status(500).json({ error: { code: 'internal', message: 'Something went wrong. Please try again.' } });
    }
  };
}

module.exports = { ApiError, env, admin, requireUser, feeNaira, appUrl, paystack, settle, endpoint };
