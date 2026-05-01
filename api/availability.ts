import {
  getCalendarClient,
  googleCalendarId,
  googleCalendarTimeZone,
  isGoogleCalendarConfigured,
  pickupWindowTimes,
  rangesOverlap,
} from './_calendar';

type AvailabilityWindow = {
  id: string;
  label: string;
  available: boolean;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
};

const dateTimeToMinutes = (dateTime: string) => timeToMinutes(dateTime.slice(11, 16));

const minutesToDate = (minutes: number) => {
  const date = new Date(0);
  date.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
};

const windowOverlapsEvent = (
  date: string,
  windowId: string,
  event: { start?: string | null; end?: string | null; startDate?: string | null; endDate?: string | null },
) => {
  const window = pickupWindowTimes[windowId];
  if (!window) {
    return false;
  }

  if (event.startDate || event.endDate) {
    return event.startDate === date;
  }

  if (!event.start || !event.end || !event.start.startsWith(date)) {
    return false;
  }

  return rangesOverlap(
    minutesToDate(timeToMinutes(window.start)),
    minutesToDate(timeToMinutes(window.end)),
    minutesToDate(dateTimeToMinutes(event.start)),
    minutesToDate(dateTimeToMinutes(event.end)),
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
    const dayStart = `${date}T00:00:00-06:00`;
    const dayEnd = `${date}T23:59:59-06:00`;

    const { data } = await calendar.events.list({
      calendarId: googleCalendarId,
      timeMin: dayStart,
      timeMax: dayEnd,
      timeZone: googleCalendarTimeZone,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
    });

    const busyEvents = (data.items || [])
      .map(event => ({
        start: event.start?.dateTime || null,
        end: event.end?.dateTime || null,
        startDate: event.start?.date || null,
        endDate: event.end?.date || null,
      }))
      .filter(event => Boolean((event.start && event.end) || event.startDate));

    const windows: AvailabilityWindow[] = Object.entries(pickupWindowTimes).map(([id, window]) => {
      const isBusy = busyEvents.some(event => windowOverlapsEvent(date, id, event));

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
    return response.status(500).json({ error: message });
  }
}
