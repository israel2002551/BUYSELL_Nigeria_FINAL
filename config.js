/**
 * Vercel Serverless Function — /api/config
 *
 * Returns only the keys the browser legitimately needs.
 * Set these in Vercel Dashboard → Settings → Environment Variables:
 *
 *   SUPABASE_URL          https://xxx.supabase.co
 *   SUPABASE_ANON_KEY     eyJhbGci…
 *   PAYSTACK_PUBLIC_KEY   pk_live_…
 *   ADMIN_EMAIL           israelefe093@gmail.com
 *   ALLOWED_ORIGIN        https://your-domain.vercel.app
 */
export default function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || '';

  // Only serve config to your own domain
  if (allowed && origin && origin !== allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Validate all required vars are set
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'PAYSTACK_PUBLIC_KEY', 'ADMIN_EMAIL'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('Missing env vars:', missing);
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Cache for 60 s at the edge — public keys don't change often
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.setHeader('Content-Type', 'application/json');

  // Only the anon/public keys go here — NEVER the secret key
  return res.status(200).json({
    supabaseUrl:       process.env.SUPABASE_URL,
    supabaseAnonKey:   process.env.SUPABASE_ANON_KEY,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    adminEmail:        process.env.ADMIN_EMAIL,
  });
}
