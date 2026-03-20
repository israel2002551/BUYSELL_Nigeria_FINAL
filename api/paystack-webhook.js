import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the request is genuinely from Paystack
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  // Handle successful payment
  if (event.event === 'charge.success') {
    const ref = event.data.reference;

    // Update the order status in Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY  // use SERVICE key here, not anon
    );

    await db
      .from('orders')
      .update({ status: 'confirmed', payment_ref: ref })
      .eq('payment_ref', ref);
  }

  return res.status(200).json({ received: true });
}
```

---

**Step 4 — Add one more env variable**

You need the **Supabase Service Role key** (not the anon key) so the webhook can write to the DB without RLS blocking it:

Supabase Dashboard → Settings → API → **service_role** key

Add to Vercel:
```
SUPABASE_SERVICE_KEY    eyJhbGci...  (the service_role key)
```

---

**Step 5 — Register the webhook URL in Paystack**

1. Paystack Dashboard → Settings → API Keys & Webhooks
2. Webhook URL field → enter:
```
https://your-domain.vercel.app/api/paystack-webhook
