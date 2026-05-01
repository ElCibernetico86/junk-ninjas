import { requireAdmin } from './_auth.js';
import { supabaseAdmin } from './_supabase.js';

const photoBucket = process.env.SUPABASE_BOOKING_PHOTOS_BUCKET || 'booking-photos';

const allowedStatuses = new Set([
  'new',
  'confirmed',
  'scheduled',
  'completed',
  'cancelled',
]);

const allowedPaymentStatuses = new Set([
  'unpaid',
  'pending',
  'paid',
  'refunded',
  'failed',
]);

const addPhotoUrls = async (bookings: any[]) => {
  if (!supabaseAdmin) {
    return bookings;
  }

  return Promise.all(bookings.map(async booking => {
    if (!booking.photo_path) {
      return { ...booking, photo_url: null };
    }

    const { data } = await supabaseAdmin.storage
      .from(photoBucket)
      .createSignedUrl(booking.photo_path, 60 * 60 * 24);

    return {
      ...booking,
      photo_url: data?.signedUrl || null,
    };
  }));
};

export default async function handler(request: any, response: any) {
  if (!requireAdmin(request, response)) {
    return;
  }

  if (!supabaseAdmin) {
    return response.status(500).json({ error: 'Supabase environment variables are not configured.' });
  }

  if (request.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, created_at, status, payment_status, customer_name, phone, address, zip, pickup_date, pickup_window, items, add_ons, subtotal, total, photo_path, notes')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return response.status(500).json({ error: error.message });
    }

    const bookings = await addPhotoUrls(data || []);
    return response.status(200).json({ bookings });
  }

  if (request.method === 'PATCH') {
    const id = String(request.body?.id || '');
    const status = String(request.body?.status || '');
    const paymentStatus = String(request.body?.payment_status || '');
    const notes = request.body?.notes;

    if (!id) {
      return response.status(400).json({ error: 'Booking ID is required.' });
    }

    if (status && !allowedStatuses.has(status)) {
      return response.status(400).json({ error: 'Invalid booking status.' });
    }

    if (paymentStatus && !allowedPaymentStatuses.has(paymentStatus)) {
      return response.status(400).json({ error: 'Invalid payment status.' });
    }

    const updates: Record<string, unknown> = {};
    if (status) {
      updates.status = status;
    }
    if (paymentStatus) {
      updates.payment_status = paymentStatus;
    }
    if (typeof notes === 'string') {
      updates.notes = notes;
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select('id, created_at, status, payment_status, customer_name, phone, address, zip, pickup_date, pickup_window, items, add_ons, subtotal, total, photo_path, notes')
      .single();

    if (error) {
      return response.status(500).json({ error: error.message });
    }

    const [booking] = await addPhotoUrls([data]);
    return response.status(200).json({ booking });
  }

  response.setHeader('Allow', 'GET, PATCH');
  return response.status(405).json({ error: 'Method not allowed' });
}
