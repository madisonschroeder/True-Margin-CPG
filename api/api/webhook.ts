// @ts-nocheck
// Vercel Serverless Function — Stripe webhook handler
// Verifies signature, extracts customer info, forwards to Tasklet for processing

import crypto from 'crypto';

export const config = {
  api: { bodyParser: false }
};

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  const parts = sigHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];
  if (!timestamp || !signature) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Read raw body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');

    // Verify Stripe signature
    const sigHeader = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sigHeader) {
      if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(rawBody);
    if (event.type !== 'checkout.session.completed') {
      return res.status(200).json({ received: true, skipped: true });
    }

    const session = event.data?.object;
    const customerEmail = session?.customer_details?.email || session?.customer_email;
    const customerName = session?.customer_details?.name || '';
    const stripeCustomerId = session?.customer || '';

    if (!customerEmail) {
      return res.status(400).json({ error: 'No customer email in session' });
    }

    // Forward to Tasklet — it handles code generation, email, and env var updates
    const webhookUrl = process.env.TASKLET_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: customerEmail,
          customer_name: customerName,
          stripe_customer_id: stripeCustomerId,
          event_type: event.type
        })
      });
    }

    return res.status(200).json({ received: true, processed: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
