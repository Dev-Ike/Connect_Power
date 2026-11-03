// Connect Power - every call to Supabase (sign-in, database, files) and to our
// own /api payment functions lives here. Keys come from ./config.js.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { supabaseConfig } from './config.js';

export const configured =
  !!supabaseConfig.url && !/^YOUR_/.test(supabaseConfig.url) &&
  !!supabaseConfig.anonKey && !/^YOUR_/.test(supabaseConfig.anonKey);

const BUCKET = 'documents';
let sb = null;
if (configured) {
  sb = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    // PKCE keeps the address bar free of tokens, so our #page links keep working.
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
}

function need() {
  if (!configured) { const e = new Error('Supabase is not configured'); e.code = 'app/not-configured'; throw e; }
}

// Turns Supabase errors into the short codes the site understands.
function authError(err) {
  const e = new Error((err && err.message) || 'Error');
  const c = (err && err.code) || '';
  const m = String((err && err.message) || '');
  if (c === 'invalid_credentials' || /invalid login credentials/i.test(m)) e.code = 'auth/invalid-credential';
  else if (c === 'user_already_exists' || c === 'email_exists') e.code = 'auth/email-already-in-use';
  else if (c === 'weak_password') e.code = 'auth/weak-password';
  else if (c === 'email_not_confirmed') e.code = 'auth/email-not-confirmed';
  else if (c === 'same_password') e.code = 'auth/same-password';
  else if (err && err.name === 'AuthSessionMissingError') e.code = 'auth/session-missing';
  else if (c === 'over_request_rate_limit' || c === 'over_email_send_rate_limit' || (err && err.status === 429)) e.code = 'auth/too-many-requests';
  else if (c === 'provider_disabled' || c === 'signup_disabled' || /provider is not enabled/i.test(m)) e.code = 'auth/operation-not-allowed';
  else if (c === 'validation_failed' && /email/i.test(m)) e.code = 'auth/invalid-email';
  else if (!err || err.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(m)) e.code = 'auth/network-request-failed';
  else e.code = c ? 'auth/' + c : 'auth/unknown';
  return e;
}

/* ------------------------------ Sign-in ------------------------------ */
let signUpPromise = null;
let recoveryCb = null;
// Never rejects: a failed sign-up must not block a later sign-in.
export function pendingSignUp() { return (signUpPromise || Promise.resolve()).catch(function () {}); }
export function onRecovery(cb) { recoveryCb = cb; }

const userOf = function (session) {
  return session && session.user ? { uid: session.user.id, email: session.user.email || '' } : null;
};

export function onAuth(cb) {
  if (!configured) { setTimeout(function () { cb(null); }, 0); return function () {}; }
  const out = sb.auth.onAuthStateChange(function (event, session) {
    // Do other Supabase calls later, never inside this callback (avoids a known deadlock).
    setTimeout(function () {
      if (event === 'PASSWORD_RECOVERY' && recoveryCb) recoveryCb();
      cb(userOf(session));
    }, 0);
  });
  return function () { out.data.subscription.unsubscribe(); };
}

// After an email link or Google sign-in the user comes back to the home page.
// This remembers to send them to their furthest step instead.
export function markResume() { try { localStorage.setItem('cp_resume', String(Date.now())); } catch (e) { /* ignore */ } }
export function takeResume() {
  try {
    const t = Number(localStorage.getItem('cp_resume') || 0);
    localStorage.removeItem('cp_resume');
    return !!t && Date.now() - t < 86400000;
  } catch (e) { return false; }
}

export function signUp(p) {
  need();
  signUpPromise = (async function () {
    const out = await sb.auth.signUp({
      email: p.email, password: p.password,
      options: {
        emailRedirectTo: location.origin + '/',
        data: { first_name: p.first, last_name: p.last, full_name: p.first + ' ' + p.last, phone: p.phone, state: p.state, consent: true }
      }
    });
    if (out.error) throw authError(out.error);
    const u = out.data.user;
    // With email confirmation on, an existing address comes back as a user with no identities.
    if (u && Array.isArray(u.identities) && u.identities.length === 0) {
      const e = new Error('exists'); e.code = 'auth/email-already-in-use'; throw e;
    }
    if (!out.data.session) markResume();
    return { needsConfirmation: !out.data.session };
  })();
  signUpPromise.catch(function () { signUpPromise = null; });
  return signUpPromise;
}

export async function signIn(email, password) {
  need();
  const out = await sb.auth.signInWithPassword({ email: email, password: password });
  if (out.error) throw authError(out.error);
  return { uid: out.data.user.id, email: out.data.user.email };
}

export async function googleSignIn() {
  need();
  markResume();
  const out = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
  if (out.error) throw authError(out.error);
}

export async function resetPassword(email) {
  need();
  const out = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
  if (out.error) throw authError(out.error);
}

export async function updatePassword(password) {
  need();
  const out = await sb.auth.updateUser({ password: password });
  if (out.error) throw authError(out.error);
}

export async function signOut() {
  if (!configured) return;
  await sb.auth.signOut();
}

export async function getProfile(uid) {
  need();
  const out = await sb.from('profiles').select('first_name,last_name,phone,state').eq('id', uid).maybeSingle();
  if (out.error) throw out.error;
  return out.data ? { firstName: out.data.first_name, lastName: out.data.last_name, phone: out.data.phone, state: out.data.state } : null;
}

/* ------------------------------ Application data ------------------------------ */
export async function loadApplication(uid) {
  need();
  const out = await sb.from('applications').select('*').eq('user_id', uid).maybeSingle();
  if (out.error) throw out.error;
  return out.data || { user_id: uid, completed: 0, documents: {} };
}

// "fields" replaces whole columns, e.g. { personal: {...}, completed: 1 }.
export async function saveApp(uid, fields) {
  need();
  const out = await sb.from('applications').update(fields).eq('user_id', uid).select('user_id');
  if (out.error) throw out.error;
  if (!out.data || !out.data.length) { const e = new Error('Application is locked'); e.code = 'permission-denied'; throw e; }
}

/* ------------------------------ Documents ------------------------------ */
const EXT = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' };
export function contentTypeOf(file) {
  if (EXT[file.type]) return file.type;
  const n = (file.name || '').toLowerCase();
  if (/\.pdf$/.test(n)) return 'application/pdf';
  if (/\.png$/.test(n)) return 'image/png';
  if (/\.jpe?g$/.test(n)) return 'image/jpeg';
  return '';
}

export async function uploadDoc(uid, key, file, onProgress) {
  need();
  const type = contentTypeOf(file);
  if (!type) throw new Error('Unsupported file type');
  const path = uid + '/' + key + '.' + EXT[type];
  if (onProgress) onProgress(35);
  const up = await sb.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: type, cacheControl: '3600' });
  if (up.error) {
    const e = new Error(up.error.message || 'Upload failed');
    e.code = (String(up.error.statusCode) === '403' || /row-level security|not allowed|unauthori/i.test(e.message)) ? 'storage/unauthorized' : 'storage/failed';
    throw e;
  }
  if (onProgress) onProgress(90);
  const meta = { path: path, name: file.name, size: file.size, type: type, uploadedAt: Date.now() };
  const saved = await sb.rpc('set_document', { p_key: key, p_meta: meta });
  if (saved.error) throw saved.error;
  if (saved.data === false) { const e = new Error('Application is locked'); e.code = 'permission-denied'; throw e; }
  if (onProgress) onProgress(100);
  return meta;
}

export async function deleteFile(path) {
  need();
  const out = await sb.storage.from(BUCKET).remove([path]);
  if (out.error) throw out.error;
}

export async function removeDoc(uid, key, meta) {
  need();
  if (meta && meta.path) await deleteFile(meta.path);
  const out = await sb.rpc('remove_document', { p_key: key });
  if (out.error) throw out.error;
}

export async function downloadUrl(path) {
  need();
  const out = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (out.error) throw out.error;
  return out.data.signedUrl;
}

export async function fileBlob(path) {
  need();
  const out = await sb.storage.from(BUCKET).download(path);
  if (out.error) throw out.error;
  return out.data;
}

/* ------------------------------ Payment ------------------------------ */
// Checks for a receipt now and every few seconds until one appears, so the page
// updates by itself when Paystack's webhook confirms a payment.
export function watchReceipt(uid, cb) {
  need();
  let stop = false, timer = null, prev;
  async function tick() {
    if (stop) return;
    let r = null;
    if (!document.hidden || prev === undefined) {
      try {
        const out = await sb.from('receipts').select('*').eq('user_id', uid).maybeSingle();
        if (out.error) throw out.error;
        r = out.data ? { applicationNumber: out.data.application_number, reference: out.data.reference, amountNaira: Number(out.data.amount_naira), paidAt: out.data.paid_at } : null;
        const key = r ? r.reference : null;
        if (prev === undefined || key !== prev) { prev = key; cb(r); }
      } catch (e) {
        console.error('Receipt check failed', e);
        if (prev === undefined) { prev = null; cb(null); }
      }
    }
    if (!stop && !(prev)) timer = setTimeout(tick, 6000);
  }
  tick();
  return function () { stop = true; clearTimeout(timer); };
}

async function api(path, opts) {
  need();
  const s = await sb.auth.getSession();
  const token = s.data && s.data.session ? s.data.session.access_token : '';
  const res = await fetch(path, {
    method: (opts && opts.method) || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: opts && opts.body ? JSON.stringify(opts.body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok) {
    const er = (json && json.error) || {};
    const e = new Error(er.message || 'Request failed');
    e.code = 'functions/' + (er.code || (res.status === 401 ? 'unauthenticated' : 'internal'));
    throw e;
  }
  return json;
}

export function paymentInfo() { return api('/api/payment-info'); }
export function initPayment() { return api('/api/initialize-payment', { method: 'POST', body: {} }); }
export function verifyPayment(reference) { return api('/api/verify-payment', { method: 'POST', body: { reference: reference } }); }
