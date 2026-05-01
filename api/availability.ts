import {
  getCalendarClient,
  googleCalendarId,
  googleCalendarTimeZone,
  isGoogleCalendarConfigured,
  pickupWindowTimes,
  rangesOverlap,
} from './_calendar.js';

type AvailabilityWindow = {
  id: string;
  label: string;
  available: boolean;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
};

const minutesToDate = (minutes: number) => {
  const date = new Date(0);
  date.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
};

const addDays = (date: string, days: number) => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const getZonedDateMinutes = (dateTime: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: googleCalendarTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(dateTime));

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: (Number(values.hour) * 60) + Number(values.minute),
  };
};

const windowOverlapsBusyPeriod = (
  date: string,
  windowId: string,
  busy: { start?: string | null; end?: string | null },
) => {
  const window = pickupWindowTimes[windowId];
  if (!window) {
    return false;
  }

  if (!busy.start || !busy.end) {
    return false;
  }

  const busyStart = getZonedDateMinutes(busy.start);
  const busyEnd = getZonedDateMinutes(busy.end);

  if (busyStart.date > date || busyEnd.date < date) {
    return false;
  }

  const busyStartMinutes = busyStart.date < date ? 0 : busyStart.minutes;
  const busyEndMinutes = busyEnd.date > date ? 1440 : busyEnd.minutes;

  return rangesOverlap(
    minutesToDate(timeToMinutes(window.start)),
    minutesToDate(timeToMinutes(window.end)),
    minutesToDate(busyStartMinutes),
    minutesToDate(busyEndMinutes),
  );
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const date = String(request.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return response.status(400).json({ error: 'A valid date query parameter is required.' });
  }

  if (!googleCalendarId || !isGoogleCalendarConfigured()) {
    const windows: AvailabilityWindow[] = Object.entries(pickupWindowTimes).map(([id, window]) => ({
      id,
      label: window.label,
      available: true,
    }));

    return response.status(200).json({
      configured: false,
      windows,
    });
  }

  try {
    const calendar = getCalendarClient();
    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${addDays(date, 1)}T23:59:59Z`;

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart,
        timeMax: dayEnd,
        timeZone: googleCalendarTimeZone,
        items: [{ id: googleCalendarId }],
      },
    });

    const calendarStatus = data.calendars?.[googleCalendarId];
    if (calendarStatus?.errors?.length) {
      console.error('Google Calendar freebusy returned calendar errors:', calendarStatus.errors);
    }

    const busyPeriods = calendarStatus?.busy || [];
    console.log('Availability checked:', {
      date,
      busyPeriods: busyPeriods.length,
      calendarConfigured: true,
    });

    const windows: AvailabilityWindow[] = Object.entries(pickupWindowTimes).map(([id, window]) => {
      const isBusy = busyPeriods.some(busy => windowOverlapsBusyPeriod(date, id, busy));

      return {
        id,
        label: window.label,
        available: !isBusy,
      };
    });

    return response.status(200).json({
      configured: true,
      windows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown availability error';
    console.error('Availability check failed:', error);
    const windows: AvailabilityWindow[] = Object.entries(pickupWindowTimes).map(([id, window]) => ({
      id,
      label: window.label,
      available: true,
    }));

    return response.status(200).json({
      configured: true,
      error: message,
      windows,
    });
  }
}
