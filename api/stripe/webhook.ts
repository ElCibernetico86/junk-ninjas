import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const supabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

const readRawBody = async (request: any) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !webhookSecret || !supabase) {
    return response.status(500).json({ error: 'Stripe webhook environment variables are not configured.' });
  }

  const signature = request.headers['stripe-signature'];
  if (!signature) {
    return response.status(400).json({ error: 'Missing Stripe signature.' });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await readRawBody(request);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature.';
    console.error('Stripe webhook verification failed:', message);
    return response.status(400).json({ error: message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Failed to mark booking paid:', error);
        return response.status(500).json({ error: error.message });
      }

      console.log('Booking marked paid from Stripe webhook:', bookingId);
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'failed',
        })
        .eq('id', bookingId);
    }
  }

  return response.status(200).json({ received: true });
}
