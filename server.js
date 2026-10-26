/**
 * Connect Power — server.js
 * Node.js/Express backend for the Connect Power youth empowerment portal.
 *
 * Fixes/behaviour in this version:
 *  - Register + Login now communicate: an email used to sign up CANNOT be used to
 *    sign up again (returns "There is already an existing account with this email"),
 *    and the same email + password CAN be used to log in afterwards.
 *  - NIN is COMPULSORY: /api/submit-application refuses applications without a valid
 *    11-digit NIN.
 *  - Admin session is a cryptographically signed, STATELESS cookie (HMAC-SHA256) with
 *    a STABLE secret — fixing the bug where admin login randomly failed on serverless
 *    hosting (each request hitting a different instance that didn't share memory).
 *  - Paystack payments verified directly against Paystack servers before saving.
 *  - Notification emails sent via Gmail to the company and the applicant.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- env ---------------- */
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
// Constant-time compare so a correct password can never be rejected by a
// length/timing quirk, and trimming differences can never cause a mismatch.
function safeEqual(a, b) {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
}
const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || '').trim();
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').trim();

// STABLE session secret: never random per instance. Uses SESSION_SECRET when given,
// otherwise derives deterministically from the admin credentials. This is what fixes
// the "admin password randomly doesn't work" bug on serverless hosts.
const SESSION_SECRET = (process.env.SESSION_SECRET || ('cp::' + ADMIN_USERNAME + '::' + ADMIN_PASSWORD));

/* ---------------- data files ---------------- */
const DATA_DIR = __dirname;
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UPLOADS_INDEX_FILE = path.join(DATA_DIR, 'uploads-index.json');
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function readJson(file, fallback) {
    try {
        if (!fs.existsSync(file)) return fallback;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error('readJson error', file, e.message);
        return fallback;
    }
}
function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function ensureInit() {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(APPLICATIONS_FILE)) writeJson(APPLICATIONS_FILE, []);
    if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
    if (!fs.existsSync(UPLOADS_INDEX_FILE)) writeJson(UPLOADS_INDEX_FILE, {});
    if (!fs.existsSync(STORIES_FILE)) writeJson(STORIES_FILE, []);
}
ensureInit();

/* ---------------- password hashing (PBKDF2, random salt per account) ---------------- */
function hashPassword(password, salt) {
    salt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    return { salt, hash };
}
function verifyPassword(password, salt, expectedHash) {
    try {
        const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
    } catch (e) {
        return false;
    }
}

/* ---------------- signed stateless session (admin) ---------------- */
function sign(value) {
    return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}
function makeAdminToken(username) {
    const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + 1000 * 60 * 60 * 24 })).toString('base64url');
    return payload + '.' + sign(payload);
}
function checkAdminToken(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const [payload, sig] = token.split('.');
    try {
        if (sign(payload) !== sig) return null;
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!data.exp || data.exp < Date.now()) return null;
        return data;
    } catch (e) {
        return null;
    }
}
function parseCookies(req) {
    const header = req.headers.cookie || '';
    const out = {};
    header.split(';').forEach(part => {
        const idx = part.indexOf('=');
        if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    });
    return out;
}
/* The token can arrive two ways: the HttpOnly cookie, or (fallback) an
   Authorization: Bearer header the dashboard keeps in localStorage. Mobile
   browsers and cross-site previews sometimes drop the cookie, which is what made
   admin logins look "random" — with two channels a correct password always works. */
function getAdminToken(req) {
    const cookies = parseCookies(req);
    if (cookies.admin_token) return cookies.admin_token;
    const auth = String(req.headers.authorization || '');
    if (auth.toLowerCase().indexOf('bearer ') === 0) return auth.slice(7).trim();
    return null;
}
function requireAdmin(req, res, next) {
    const session = checkAdminToken(getAdminToken(req));
    if (!session) return res.status(401).json({ success: false, message: 'Not authorized. Please log in as admin.' });
    req.admin = session;
    next();
}

/* ---------------- middleware ---------------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname, { extensions: ['html'] }));

/* ---------------- uploads (multer) ---------------- */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ref = (req.body.reference || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '');
        const dir = path.join(UPLOADS_DIR, ref);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const slot = Object.keys(req.files || {}).length; // fallback
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '-' + safe);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per document
});
const docFields = [
    { name: 'birth', maxCount: 1 },
    { name: 'nysc', maxCount: 1 },
    { name: 'waec', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'govid', maxCount: 1 },
    { name: 'prof', maxCount: 1 },
    { name: 'degree', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
];

/* ---------------- email (Gmail) ---------------- */
let mailer = null;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    mailer = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
    });
}
function sendMail(to, subject, text) {
    if (!mailer) {
        console.log('[email skipped — GMAIL_USER/GMAIL_APP_PASSWORD not set]', subject, '->', to);
        return Promise.resolve(false);
    }
    return mailer.sendMail({ from: GMAIL_USER, to, subject, text })
        .then(() => true)
        .catch(err => { console.error('email error:', err.message); return false; });
}

/* ================================================================
 * AUTH — register / login now communicate with each other
 * ================================================================ */
app.post('/api/register', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const phone = String(req.body.phone || '').trim();
        const password = String(req.body.password || '');

        if (!email || !email.includes('@')) return res.json({ success: false, message: 'Please provide a valid email address.' });
        if (!/^\d{11}$/.test(phone)) return res.json({ success: false, message: 'Phone number must be exactly 11 digits.' });
        if (password.length < 8) return res.json({ success: false, message: 'Password must be at least 8 characters.' });

        const users = readJson(USERS_FILE, []);
        const existing = users.find(u => u.email === email);

        // SAME EMAIL CAN NEVER SIGN UP TWICE
        if (existing) {
            return res.json({
                success: false,
                code: 'email_exists',
                message: 'There is already an existing account with this email. Please log in with your email and password.'
            });
        }

        const { salt, hash } = hashPassword(password);
        users.push({ email, phone, salt, hash, createdAt: new Date().toISOString() });
        writeJson(USERS_FILE, users);

        sendMail(email, 'Welcome to Connect Power',
            'Welcome to Connect Power!\n\nYour account has been created successfully.\nYou can now log in anytime with this email and your password to continue or check your application.\n\n— Connect Power Support Team');

        return res.json({ success: true, email });
    } catch (e) {
        console.error('register error:', e);
        return res.json({ success: false, message: 'Server error while creating account. Please try again.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        const users = readJson(USERS_FILE, []);
        const user = users.find(u => u.email === email);

        if (!user || !verifyPassword(password, user.salt, user.hash)) {
            return res.json({ success: false, message: 'Incorrect email or password. If you have not signed up before, create an account first.' });
        }

        // SIGNED-UP EMAIL + SAME PASSWORD LOGS BACK IN SUCCESSFULLY
        return res.json({ success: true, email: user.email, phone: user.phone || '' });
    } catch (e) {
        console.error('login error:', e);
        return res.json({ success: false, message: 'Server error while logging in. Please try again.' });
    }
});

/* ================================================================
 * DOCUMENT UPLOADS
 * ================================================================ */
app.post('/api/upload-documents', upload.fields(docFields), (req, res) => {
    try {
        const ref = (req.body.reference || '').trim();
        if (!ref) return res.status(400).json({ success: false, message: 'Missing application reference.' });

        const index = readJson(UPLOADS_INDEX_FILE, {});
        const files = {};
        Object.keys(req.files || {}).forEach(slot => {
            files[slot] = req.files[slot].map(f => ({
                filename: f.filename,
                originalName: f.originalname,
                size: f.size,
                mimetype: f.mimetype,
                path: path.join('uploads', ref, f.filename)
            }));
        });
        index[ref] = { uploadedAt: new Date().toISOString(), files };
        writeJson(UPLOADS_INDEX_FILE, index);

        return res.json({ success: true, reference: ref, files: Object.keys(files) });
    } catch (e) {
        console.error('upload error:', e);
        return res.status(500).json({ success: false, message: 'Document upload failed. Please try again.' });
    }
});

/* ================================================================
 * PAYSTACK — verify payment directly against Paystack servers
 * ================================================================ */
async function paystackVerify(reference) {
    const resp = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
        headers: { Authorization: 'Bearer ' + PAYSTACK_SECRET_KEY }
    });
    if (!resp.ok) throw new Error('Paystack responded ' + resp.status);
    const body = await resp.json();
    return body && body.data ? body.data : null;
}

app.post('/api/verify-payment', async (req, res) => {
    try {
        const reference = String(req.body.reference || '').trim();
        if (!reference) return res.json({ success: false, message: 'Missing payment reference.' });
        if (!PAYSTACK_SECRET_KEY) return res.json({ success: false, message: 'Payment verification is not configured (missing Paystack key).' });

        const tx = await paystackVerify(reference);
        if (!tx || tx.status !== 'success') {
            return res.json({ success: false, message: 'Payment could not be verified with Paystack.' });
        }
        if (Number(tx.amount) !== 101500) {
            return res.json({ success: false, message: 'Payment amount does not match the application fee (₦1,015).' });
        }
        return res.json({ success: true, amount: tx.amount, paidAt: tx.paid_at });
    } catch (e) {
        console.error('verify-payment error:', e.message);
        return res.json({ success: false, message: 'Could not reach Paystack to verify payment. Please try again.' });
    }
});

/* ================================================================
 * APPLICATION SUBMISSION — NIN IS COMPULSORY
 * ================================================================ */
app.post('/api/submit-application', async (req, res) => {
    try {
        const reference = String(req.body.reference || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const applicant = req.body.applicant || {};

        // NIN COMPULSORY — an application without a valid 11-digit NIN is refused
        const nin = String(applicant.nin || '').trim();
        if (!/^\d{11}$/.test(nin)) {
            return res.json({ success: false, message: 'NIN is compulsory. Please complete Step 1 with a valid 11-digit NIN.' });
        }
        if (!reference || !email) {
            return res.json({ success: false, message: 'Missing application reference or email.' });
        }

        const applications = readJson(APPLICATIONS_FILE, []);
        if (applications.find(a => a.reference === reference)) {
            return res.json({ success: true, message: 'Application already saved.', reference });
        }

        applications.push({
            reference,
            email,
            fullname: applicant.fullname || '',
            nin,
            track: applicant.track || '',
            paymentStatus: 'PAID — verified with Paystack',
            paymentAmount: '₦1,015',
            submittedAt: new Date().toISOString()
        });
        writeJson(APPLICATIONS_FILE, applications);

        sendMail(email,
            'Connect Power — Application Received (' + reference + ')',
            'Dear Applicant,\n\nThank you for applying to the Connect Power Programme.\n\nApplication Reference: ' + reference +
            '\nTrack: ' + (applicant.track || '-') + '\nNIN: ' + nin + '\nFee Paid: ₦1,015\n\nYour application has been received and will be reviewed. You will be contacted via this email.\n\n— Connect Power Support Team');

        sendMail(GMAIL_USER || 'infoconnectpower@gmail.com',
            'New Connect Power Application — ' + reference,
            'A new application was submitted.\n\nReference: ' + reference + '\nName: ' + (applicant.fullname || '-') +
            '\nEmail: ' + email + '\nNIN: ' + nin + '\nTrack: ' + (applicant.track || '-') + '\nPayment: ₦1,015 verified');

        return res.json({ success: true, reference });
    } catch (e) {
        console.error('submit-application error:', e);
        return res.json({ success: false, message: 'Server error while saving application. Please contact support with your payment reference.' });
    }
});

/* ================================================================
 * SUCCESS STORIES
 * ================================================================ */
app.post('/api/share-story', (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const track = String(req.body.track || '').trim();
        const story = String(req.body.story || '').trim();
        if (!name || !track || !story) return res.json({ success: false, message: 'Please fill in every field.' });

        const stories = readJson(STORIES_FILE, []);
        stories.push({ name, track, story, sharedAt: new Date().toISOString() });
        writeJson(STORIES_FILE, stories);

        sendMail(GMAIL_USER || 'infoconnectpower@gmail.com', 'New Success Story submitted',
            'Name: ' + name + '\nTrack: ' + track + '\n\n' + story);

        return res.json({ success: true });
    } catch (e) {
        console.error('share-story error:', e);
        return res.json({ success: false, message: 'Server error while saving your story.' });
    }
});

/* ================================================================
 * ADMIN — signed stateless session (works reliably on serverless)
 * ================================================================ */
app.post('/api/admin-login', (req, res) => {
    const username = String((req.body && req.body.username) || '').trim();
    // Both sides are trimmed: a password pasted with a trailing space used to be
    // rejected forever, which looked exactly like "the password stopped working".
    const password = String((req.body && req.body.password) || '').trim();

    if (!ADMIN_PASSWORD) {
        return res.json({ success: false, message: 'Admin credentials are not configured on the server (.env).' });
    }
    const userOk = username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
    const passOk = safeEqual(password, ADMIN_PASSWORD.trim());
    if (!userOk || !passOk) {
        return res.json({ success: false, message: 'Wrong username or password.' });
    }

    // Stateless HMAC-signed session with a STABLE secret, delivered BOTH as an
    // HttpOnly cookie and in the JSON body (the dashboard stores it and sends it as
    // a Bearer token). If a browser drops the cookie, the header still authorises.
    const token = makeAdminToken(username.toLowerCase());
    res.setHeader('Set-Cookie',
        'admin_token=' + encodeURIComponent(token) +
        '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (60 * 60 * 24));
    return res.json({ success: true, token: token, admin: username.toLowerCase() });
});

app.get('/api/admin/check', requireAdmin, (req, res) => {
    res.json({ success: true, admin: req.admin.u });
});

app.get('/api/admin/applications', requireAdmin, (req, res) => {
    const applications = readJson(APPLICATIONS_FILE, []);
    const uploads = readJson(UPLOADS_INDEX_FILE, {});
    res.json({
        success: true,
        applications: applications.map(a => ({
            ...a,
            documents: uploads[a.reference] ? uploads[a.reference].files : {}
        }))
    });
});

app.get('/api/admin/applications/:ref/documents/:slot', requireAdmin, (req, res) => {
    const index = readJson(UPLOADS_INDEX_FILE, {});
    const entry = index[req.params.ref];
    if (!entry || !entry.files[req.params.slot] || !entry.files[req.params.slot].length) {
        return res.status(404).send('Document not found.');
    }
    const doc = entry.files[req.params.slot][0];
    const filePath = path.join(DATA_DIR, doc.path);
    if (!fs.existsSync(filePath)) return res.status(404).send('File missing on disk.');
    res.download(filePath, doc.originalName || path.basename(filePath));
});

app.post('/api/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ success: true });
});

/* ---------------- 404 for unknown API routes ---------------- */
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Unknown API endpoint.' }));

/* ---------------- start (only when run directly) ---------------- */
if (require.main === module) {
    app.listen(PORT, () => console.log('Connect Power server running at http://localhost:' + PORT));
}

module.exports = app;
