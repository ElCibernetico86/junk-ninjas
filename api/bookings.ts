import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  getCalendarClient,
  getWindowDateTimes,
  googleCalendarId,
  googleCalendarTimeZone,
  isGoogleCalendarConfigured,
} from './_calendar';

type BookingPhoto = {
  name: string;
  type: string;
  data: string;
};

type BookingPayload = {
  customerName: string;
  phone: string;
  address: string;
  zip: string;
  pickupDate: string;
  pickupWindow: string;
  items: unknown[];
  addOns: unknown[];
  subtotal: number;
  total: number;
  photo?: BookingPhoto | null;
};

type NotificationResult = {
  sent: boolean;
  reason?: string;
};

type CalendarResult = {
  created: boolean;
  eventId?: string;
  reason?: string;
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const photoBucket = process.env.SUPABASE_BOOKING_PHOTOS_BUCKET || 'booking-photos';
const notificationTo = process.env.BOOKING_NOTIFICATION_EMAIL;
const notificationFrom = process.env.BOOKING_NOTIFICATION_FROM || 'Junk Ninjas <onboarding@resend.dev>';
const resendApiKey = process.env.RESEND_API_KEY;

const supabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const requiredFields: Array<keyof BookingPayload> = [
  'customerName',
  'phone',
  'address',
  'zip',
  'pickupDate',
  'pickupWindow',
  'items',
  'addOns',
  'subtotal',
  'total',
];

const sanitizeFileName = (name: string) => name
  .toLowerCase()
  .replace(/[^a-z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 80);

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatMoney = (amount: number) => `$${Number(amount || 0).toLocaleString('en-US')}`;

const textList = (items: unknown[]) => {
  if (!items.length) {
    return 'None';
  }

  return items.map(item => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const name = record.name || record.id || 'Item';
      const quantity = record.quantity ? ` x${record.quantity}` : '';
      const price = typeof record.price === 'number' ? ` - ${formatMoney(record.price)}` : '';
      return `- ${name}${quantity}${price}`;
    }

    return `- ${item}`;
  }).join('\n');
};

const renderList = (items: unknown[]) => {
  if (!items.length) {
    return '<li>None</li>';
  }

  return items.map(item => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const name = record.name || record.id || 'Item';
      const quantity = record.quantity ? ` x${record.quantity}` : '';
      const price = typeof record.price === 'number' ? ` - ${formatMoney(record.price)}` : '';
      return `<li>${escapeHtml(name)}${escapeHtml(quantity)}${escapeHtml(price)}</li>`;
    }

    return `<li>${escapeHtml(item)}</li>`;
  }).join('');
};

const sendBookingNotification = async (
  bookingId: string,
  payload: BookingPayload,
  photoUrl: string | null,
) => {
  if (!resend || !notificationTo) {
    return { sent: false, reason: 'Email notifications are not configured.' };
  }

  const subject = `New Junk Ninjas booking - ${payload.pickupDate} ${payload.pickupWindow}`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5">
      <h1 style="margin:0 0 16px;color:#ea580c">New Junk Ninjas Booking</h1>
      <p><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
      <h2>Customer</h2>
      <p>
        <strong>Name:</strong> ${escapeHtml(payload.customerName)}<br>
        <strong>Phone:</strong> ${escapeHtml(payload.phone)}<br>
        <strong>Address:</strong> ${escapeHtml(payload.address)} ${escapeHtml(payload.zip)}
      </p>
      <h2>Pickup</h2>
      <p>
        <strong>Date:</strong> ${escapeHtml(payload.pickupDate)}<br>
        <strong>Window:</strong> ${escapeHtml(payload.pickupWindow)}
      </p>
      <h2>Haul</h2>
      <ul>${renderList(payload.items)}</ul>
      <h2>Add-ons</h2>
      <ul>${renderList(payload.addOns)}</ul>
      <p>
        <strong>Subtotal:</strong> ${formatMoney(payload.subtotal)}<br>
        <strong>Total:</strong> ${formatMoney(payload.total)}
      </p>
      ${photoUrl ? `<p><strong>Photo:</strong> <a href="${escapeHtml(photoUrl)}">View uploaded junk photo</a></p>` : ''}
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: notificationFrom,
    to: notificationTo,
    subject,
    html,
  });

  if (error) {
    console.error('Resend email send failed:', error);
    return { sent: false, reason: error.message || 'Resend rejected the email.' };
  }

  console.log('Booking notification email sent:', data?.id);
  return { sent: true };
};

const createCalendarEvent = async (
  bookingId: string,
  payload: BookingPayload,
  photoUrl: string | null,
): Promise<CalendarResult> => {
  if (!googleCalendarId || !isGoogleCalendarConfigured()) {
    return { created: false, reason: 'Google Calendar is not configured.' };
  }

  const windowDateTimes = getWindowDateTimes(payload.pickupDate, payload.pickupWindow);
  const calendar = getCalendarClient(['https://www.googleapis.com/auth/calendar.events']);
  const description = [
    `Booking ID: ${bookingId}`,
    `Customer: ${payload.customerName}`,
    `Phone: ${payload.phone}`,
    `Address: ${payload.address} ${payload.zip}`,
    '',
    'Items:',
    textList(payload.items),
    '',
    'Add-ons:',
    textList(payload.addOns),
    '',
    `Subtotal: ${formatMoney(payload.subtotal)}`,
    `Total: ${formatMoney(payload.total)}`,
    photoUrl ? `Photo: ${photoUrl}` : '',
  ].filter(Boolean).join('\n');

  const { data } = await calendar.events.insert({
    calendarId: googleCalendarId,
    requestBody: {
      summary: `Junk Ninjas Pickup - ${payload.customerName}`,
      location: `${payload.address} ${payload.zip}`,
      description,
      start: {
        dateTime: windowDateTimes.start,
        timeZone: googleCalendarTimeZone,
      },
      end: {
        dateTime: windowDateTimes.end,
        timeZone: googleCalendarTimeZone,
      },
      extendedProperties: {
        private: {
          bookingId,
        },
      },
    },
  });

  console.log('Google Calendar event created:', data.id);
  return { created: true, eventId: data.id || undefined };
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return response.status(500).json({ error: 'Supabase environment variables are not configured.' });
  }

  try {
    const payload = request.body as BookingPayload;
    console.log('Booking request received:', {
      pickupDate: payload?.pickupDate,
      pickupWindow: payload?.pickupWindow,
      itemCount: Array.isArray(payload?.items) ? payload.items.length : 0,
      hasPhoto: Boolean(payload?.photo?.data),
    });

    const missingField = requiredFields.find(field => payload[field] === undefined || payload[field] === null || payload[field] === '');
    if (missingField) {
      return response.status(400).json({ error: `Missing required field: ${missingField}` });
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return response.status(400).json({ error: 'At least one haul item is required.' });
    }

    let photoPath: string | null = null;

    if (payload.photo?.data) {
      const safeName = sanitizeFileName(payload.photo.name || 'junk-photo.jpg');
      const filePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
      const buffer = Buffer.from(payload.photo.data, 'base64');

      const { error: uploadError } = await supabase.storage
        .from(photoBucket)
        .upload(filePath, buffer, {
          contentType: payload.photo.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        return response.status(500).json({ error: `Photo upload failed: ${uploadError.message}` });
      }

      photoPath = filePath;
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_name: payload.customerName.trim(),
        phone: payload.phone.trim(),
        address: payload.address.trim(),
        zip: payload.zip.trim(),
        pickup_date: payload.pickupDate,
        pickup_window: payload.pickupWindow,
        items: payload.items,
        add_ons: payload.addOns,
        subtotal: payload.subtotal,
        total: payload.total,
        photo_path: photoPath,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase booking insert failed:', error);
      return response.status(500).json({ error: `Booking save failed: ${error.message}` });
    }

    let photoUrl: string | null = null;

    if (photoPath) {
      const { data: signedUrlData } = await supabase.storage
        .from(photoBucket)
        .createSignedUrl(photoPath, 60 * 60 * 24 * 7);

      photoUrl = signedUrlData?.signedUrl || null;
    }

    let calendar: CalendarResult = { created: false, reason: 'Google Calendar is not configured.' };

    try {
      calendar = await createCalendarEvent(data.id, payload, photoUrl);
    } catch (calendarError) {
      console.error('Google Calendar event creation failed:', calendarError);
      calendar = { created: false, reason: 'Google Calendar event creation failed.' };
    }

    let notification: NotificationResult = { sent: false, reason: 'Email notifications are not configured.' };

    try {
      notification = await sendBookingNotification(data.id, payload, photoUrl);
    } catch (notificationError) {
      console.error('Booking notification failed:', notificationError);
      notification = { sent: false, reason: 'Email notification failed.' };
    }

    return response.status(200).json({ bookingId: data.id, notification, calendar });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown booking error';
    return response.status(500).json({ error: message });
  }
}
