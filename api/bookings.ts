import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const photoBucket = process.env.SUPABASE_BOOKING_PHOTOS_BUCKET || 'booking-photos';

const supabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

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
      return response.status(500).json({ error: `Booking save failed: ${error.message}` });
    }

    return response.status(200).json({ bookingId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown booking error';
    return response.status(500).json({ error: message });
  }
}
