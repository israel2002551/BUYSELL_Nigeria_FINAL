module.exports = function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || '';

  if (allowed && origin && origin !== allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'PAYSTACK_PUBLIC_KEY', 'ADMIN_EMAIL'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    supabaseUrl:       process.env.SUPABASE_URL,
    supabaseAnonKey:   process.env.SUPABASE_ANON_KEY,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    adminEmail:        process.env.ADMIN_EMAIL,
  });
};
