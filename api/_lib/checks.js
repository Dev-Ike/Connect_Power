'use strict';
// Pure helpers (no network) so they are easy to test.
const crypto = require('crypto');

const TRACKS = ['Tech Connect', 'Agro Connect', 'Health Connect', 'Build Connect', 'Teach Connect'];
const HIGHER = ['Degree', 'HND', 'OND', 'NCE'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Returns a message when the saved application is not ready for payment, or null when it is.
// The server re-checks everything the browser checks.
function incompleteReason(a, uid) {
  if (!a) return 'Complete your application first.';
  if (!(a.completed >= 4)) return 'Complete all four application steps before paying.';
  const p = a.personal || {}, e = a.education || {}, r = a.review || {}, d = a.documents || {};
  if (!p.sn || !p.fn || !p.dob || !p.ph || !p.so || !p.lg || !p.ad) return 'Your personal details are incomplete.';
  if (!e.q) return 'Your education details are incomplete.';
  if (!a.programme || TRACKS.indexOf(a.programme.track) < 0) return 'Choose a programme track before paying.';
  if (!/^\d{11}$/.test(r.nin || '')) return 'Your NIN must be exactly 11 digits.';
  const need = ['nin', 'lg', 'pp', 'bc', 'cv'];
  if (HIGHER.indexOf(e.q) > -1) need.push('deg');
  const prefix = uid + '/';
  const missing = need.filter(function (k) {
    return !d[k] || typeof d[k].path !== 'string' || d[k].path.indexOf(prefix) !== 0;
  });
  if (missing.length) return 'Upload all required documents before paying.';
  if (!a.pay || !EMAIL.test(a.pay.email || '')) return 'Enter a valid email address for payment.';
  return null;
}

function newReference() {
  return ('CP-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex')).toUpperCase();
}

// Constant-time comparison of two hex strings (Paystack webhook signature).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function signatureFor(body, secret) {
  return crypto.createHmac('sha512', secret).update(body).digest('hex');
}

module.exports = { TRACKS, HIGHER, EMAIL, incompleteReason, newReference, safeEqual, signatureFor };
