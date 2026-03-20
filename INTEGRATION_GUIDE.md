# How to deploy the secret-free version

## 1 — Project folder structure

Your Vercel project root should look like this:

  /
  ├── index.html        (your existing file, modified below)
  ├── api/
  │   └── config.js     (the new serverless function)
  └── vercel.json       (optional — for security headers)


## 2 — Add environment variables in Vercel

Vercel Dashboard → Your Project → Settings → Environment Variables

Add ALL of these (Production + Preview + Development):

  Name                  Value
  ──────────────────────────────────────────────────────
  SUPABASE_URL          https://obzhlmzswthnorkiqemh.supabase.co
  SUPABASE_ANON_KEY     eyJhbGci…  (your full key)
  PAYSTACK_PUBLIC_KEY   pk_live_…  (use live key in Production)
  ADMIN_EMAIL           israelefe093@gmail.com
  ALLOWED_ORIGIN        https://your-domain.vercel.app


## 3 — Edit index.html

Find this block near the bottom of index.html (inside the last <script> tag):

  // ====================================================
  //  CONFIG
  // ====================================================
  const SB_URL = 'https://obzhlmzswthnorkiqemh.supabase.co';
  const SB_KEY = 'eyJhbGci...';
  const ADMIN_EMAIL = 'israelefe093@gmail.com';
  const PAYSTACK_PUBLIC_KEY = 'pk_test_xxx';
  const COMMISSION_AMOUNT = 500000;
  const PLATFORM_FEE_PCT = 0.03;

  const db = window.supabase.createClient(SB_URL, SB_KEY, { ... });

  // ====================================================
  //  STATE
  // ====================================================
  let currentUser = null ...

  ...all the rest of the JS...

  // ====================================================
  //  INIT
  // ====================================================
  (async function init() {
    await checkSession();
    ...
  })();

Replace everything from "// CONFIG" down to the closing })(); of init()
with the contents of config-patch.js.

Keep everything in between (toast, modal helpers, auth, navigation, products,
cart, checkout, reviews, etc.) exactly as-is — only the CONFIG block and the
INIT block at the very bottom change.


## 4 — Test locally with Vercel CLI

  npm i -g vercel
  vercel dev

Visit http://localhost:3000 — the page should load without any secrets in
the HTML source. Open DevTools → Network → click the "config" request to
confirm it returns your keys from the server.


## 5 — Verify in production

After deploying:
  1. View source on your live page — SB_KEY and PAYSTACK_PUBLIC_KEY
     must NOT appear anywhere in the HTML.
  2. Open DevTools → Network → reload — you should see a /api/config
     request returning your keys in JSON.
  3. Check the Vercel dashboard → Functions tab — config.js should show
     invocations once visitors load the page.


## What this achieves

  Before: secrets visible to anyone who presses Ctrl+U
  After:  secrets live only in Vercel's encrypted env var store,
          served to your own domain only, never baked into HTML
