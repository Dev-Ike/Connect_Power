# Connect Power: free stack on Vercel + Supabase + Paystack

No paid plan is needed to build and test this.

| Part | Service | What it does |
|---|---|---|
| Website | **Vercel** (free Hobby plan) | Serves `index.html`, `css/`, `js/`, `assets/` and runs the payment functions in `api/`. |
| Sign-in, database, files | **Supabase** (free plan, no card) | Email and password sign-up and login, password reset, saved applications, private document storage. |
| Payments | **Paystack** | Takes the payment. The secret key stays on the server. |

```
connect-power/
├── index.html                   the website (home, about, news, login, sign up, application steps, slip)
├── payment-callback.html        where Paystack sends people back to
├── 404.html
├── vercel.json  package.json    Vercel settings
├── .env.example                 server settings to add in Vercel (see below)
├── css/      styles.css  callback.css
├── js/
│   ├── config.js                >>> YOUR SUPABASE KEYS GO HERE <<<
│   ├── backend.js               every Supabase call
│   ├── app.js                   the site's behaviour
│   └── callback.js              confirms a payment when the user returns from Paystack
├── assets/                      logo, portrait, favicon
├── api/                         free serverless functions (Vercel)
│   ├── payment-info.js          GET  /api/payment-info
│   ├── initialize-payment.js    POST /api/initialize-payment
│   ├── verify-payment.js        POST /api/verify-payment
│   ├── paystack-webhook.js      POST /api/paystack-webhook   <- Paystack calls this
│   └── _lib/                    shared code
└── supabase/schema.sql          database tables, security rules, file storage rules
```

## Where your keys go

| Key | Where | Safe to be public? |
|---|---|---|
| Supabase **Project URL** and **anon** key | `js/config.js` | Yes. The database rules protect the data. |
| Supabase **service_role** key | Vercel environment variable `SUPABASE_SERVICE_ROLE_KEY` | **No. Server only.** |
| Paystack **secret** key (`sk_test_...`) | Vercel environment variable `PAYSTACK_SECRET_KEY` | **No. Server only.** |
| Your site address | Vercel variable `APP_URL` | Yes |
| Application fee (Naira) | Vercel variable `APPLICATION_FEE_NGN` | Yes |
| Supabase project URL | Vercel variable `SUPABASE_URL` | Yes |

`.env.example` lists the five server variables. Never put a secret key in `js/config.js`.

## Setup, in order (about 30 minutes)

**1. Supabase** (supabase.com, free, no card). If you already ran an older `schema.sql`, run the new one again: it is safe to repeat and updates the step limit from 4 to 5.
1. New project. Pick a region near your users and save the database password.
2. **SQL Editor > New query**, paste all of `supabase/schema.sql`, press **Run**. It creates the tables, the security rules and the private `documents` file bucket. Check that **Table Editor** shows `profiles`, `applications`, `payments`, `receipts`, and **Storage** shows a `documents` bucket.
3. **Authentication > Providers > Email**: keep it on. Decide on **Confirm email**:
   - **On** (recommended for launch): users must click a link in their inbox first. Supabase's built-in email sender is limited to a few emails per hour, so for real use set your own sender under **Authentication > Emails > SMTP Settings** (Resend, Brevo and similar have free plans).
   - **Off** (easiest for testing): users are signed in straight after sign-up.
4. **Authentication > URL Configuration**: set **Site URL** to your Vercel address (step 3 below) and add to **Redirect URLs**: `https://YOUR-SITE.vercel.app/**` and `http://localhost:3000/**`. (A wildcard such as `https://*-yourteam.vercel.app/**` makes Vercel preview links work too.)
5. **Project Settings > API**: copy the **Project URL**, the **anon** key and the **service_role** key.

**2. Put your Supabase keys in the site**: edit `js/config.js` and replace the two `YOUR_...` values (URL and anon key only).

**3. Vercel** (vercel.com, free)
1. Put this folder on GitHub. In Vercel: **Add New > Project**, import it. Framework Preset **Other**. Leave build settings alone.
2. Before deploying, open **Environment Variables** and add all five from `.env.example`:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` (your **test** key first), `APP_URL`, `APPLICATION_FEE_NGN`.
   If you do not know your address yet, deploy once, copy the address Vercel shows, add it as `APP_URL`, then **Redeploy**.
3. Note your address (for example `https://connect-power.vercel.app`) and use it in steps 1.4 above.

**4. Paystack** (dashboard.paystack.com): Settings > API Keys & Webhooks.
- Copy the **test secret key** into Vercel (done above).
- Set the **Test Webhook URL** to `https://YOUR-SITE.vercel.app/api/paystack-webhook`.

**5. Test everything on your live address** (use Paystack's test cards from their docs):
sign up, complete the five steps (personal details, education, programme track, review, documents), pay, check you reach the slip and can download it, then log out and log in again to check it resumes.

**6. Go live**: switch Paystack to live mode (needs your business verified), replace `PAYSTACK_SECRET_KEY` in Vercel with the `sk_live_` key, set the **Live Webhook URL**, and **Redeploy**.

## Run it on your computer

```
npm install -g vercel
cp .env.example .env.local        # fill it in; use APP_URL=http://localhost:3000
vercel dev                         # site and /api at http://localhost:3000
```
Paystack cannot call your computer, so locally the payment is confirmed by `payment-callback.html` instead of the webhook.

## How it works

- **Sign up and login:** Supabase Auth. Step pages and the slip only open for logged-in users, and a user cannot jump ahead of the step they have reached. Email confirmation links return the user to their furthest step.
- **Saving:** steps 1 to 5 (personal details, education, programme track, review, documents) save to the `applications` table when the user presses Save and Continue. Applicants must be 18 to 46 years old; the browser and the server both check this. Documents upload straight to the private `documents` bucket, in a folder named after the user.
- **Payment:** `/api/initialize-payment` checks the saved application (including every required document), then asks Paystack for a payment page. After paying, Paystack sends the user to `payment-callback.html`, which calls `/api/verify-payment`. `/api/paystack-webhook` also confirms it, so the receipt exists even if the user closes the page. A database function records each payment exactly once.
- **Receipt:** the `receipts` table holds the application number (for example `CP-2026-000001`). Once it exists the application and its files are locked. The slip is built from it.

## Things to know about the free plans

- **Supabase free projects pause after about a week with no activity.** Open the dashboard and press Restore to wake it. Paid plans do not pause.
- **Supabase's built-in email sender is very limited.** Add your own SMTP sender before launch, or sign-up emails will stop arriving.
- **Vercel's free Hobby plan is meant for personal, non-commercial use.** A site that takes payments may need Vercel's paid Pro plan. Check Vercel's current terms before launch.
- Paystack has no monthly fee; it charges a fee per successful transaction.

## Troubleshooting

| Problem | Fix |
|---|---|
| Yellow bar "Supabase is not connected yet" | Fill in `js/config.js` and redeploy. |
| Sign-up works but no email arrives | Add a custom SMTP sender, or turn off Confirm email while testing. |
| "Pay with Paystack" says the fee or address is not set | Set `APPLICATION_FEE_NGN` and `APP_URL` in Vercel, then Redeploy. |
| "The server is not set up yet" | `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing in Vercel (this is not the Paystack key). Add it under Settings > Environment Variables for **Production**, then **Redeploy**: new variables only reach new deployments. Vercel > Logs names the missing one. |
| "Payments are not set up yet" | `PAYSTACK_SECRET_KEY` is missing in Vercel. Add it, then Redeploy. |
| Paid, but the slip does not appear | Check the webhook URL in Paystack. Look in Vercel > Logs. |
| Database errors after running the SQL | Copy the exact message from the SQL Editor and send it to me. |

## Security notes

- The database rules let a user read and change only their own data. Users cannot create receipts, payments or application numbers. Only the server can.
- The fee comes from the server, is checked against Paystack's confirmation, and the webhook signature is verified.
- The NIN is stored in the user's own application record. Consider extra protection for it and a privacy notice that matches the Nigeria Data Protection Act.
- A staff page for reviewing applications is not included.
