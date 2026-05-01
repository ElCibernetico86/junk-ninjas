import { google } from 'googleapis';

export const pickupWindowTimes: Record<string, { label: string; start: string; end: string }> = {
  '8am-12pm': { label: '8:00 AM - 12:00 PM', start: '08:00:00', end: '12:00:00' },
  '12pm-4pm': { label: '12:00 PM - 4:00 PM', start: '12:00:00', end: '16:00:00' },
  '4pm-8pm': { label: '4:00 PM - 8:00 PM', start: '16:00:00', end: '20:00:00' },
};

export const googleCalendarId = process.env.GOOGLE_CALENDAR_ID;
export const googleServiceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
export const googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
export const googleCalendarTimeZone = process.env.GOOGLE_CALENDAR_TIME_ZONE || 'America/Chicago';

export const isGoogleCalendarConfigured = () => (
  Boolean(googleCalendarId && googleServiceAccountEmail && googlePrivateKey)
);

export const getCalendarClient = (scopes = ['https://www.googleapis.com/auth/calendar']) => {
  if (!googleServiceAccountEmail || !googlePrivateKey) {
    throw new Error('Google Calendar credentials are not configured.');
  }

  const auth = new google.auth.JWT({
    email: googleServiceAccountEmail,
    key: googlePrivateKey,
    scopes,
  });

  return google.calendar({ version: 'v3', auth });
};

export const getWindowDateTimes = (date: string, windowId: string) => {
  const windowTimes = pickupWindowTimes[windowId];

  if (!windowTimes) {
    throw new Error(`Unknown pickup window: ${windowId}`);
  }

  return {
    start: `${date}T${windowTimes.start}`,
    end: `${date}T${windowTimes.end}`,
  };
};

export const rangesOverlap = (
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) => firstStart < secondEnd && secondStart < firstEnd;
