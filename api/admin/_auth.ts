import { createHmac, timingSafeEqual } from 'node:crypto';

const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-admin-secret';
const cookieName = 'jn_admin_session';
const sessionMaxAgeSeconds = 60 * 60 * 12;

const sign = (value: string) => createHmac('sha256', sessionSecret).update(value).digest('hex');

const parseCookies = (cookieHeader = '') => Object.fromEntries(
  cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .map(cookie => {
      const [name, ...valueParts] = cookie.split('=');
      return [name, decodeURIComponent(valueParts.join('='))];
    }),
);

const constantTimeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const hasAdminPassword = () => Boolean(adminPassword);

export const verifyPassword = (password: string) => Boolean(
  adminPassword && constantTimeEqual(password, adminPassword),
);

export const createSessionCookie = () => {
  const expiresAt = Date.now() + (sessionMaxAgeSeconds * 1000);
  const payload = `admin.${expiresAt}`;
  const token = `${payload}.${sign(payload)}`;

  return `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeSeconds}`;
};

export const clearSessionCookie = () => `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

export const isAuthenticated = (request: any) => {
  const cookies = parseCookies(request.headers.cookie || '');
  const token = cookies[cookieName];

  if (!token) {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const payload = `${parts[0]}.${parts[1]}`;
  const expectedSignature = sign(payload);

  if (!constantTimeEqual(parts[2], expectedSignature)) {
    return false;
  }

  return Number(parts[1]) > Date.now();
};

export const requireAdmin = (request: any, response: any) => {
  if (!isAuthenticated(request)) {
    response.status(401).json({ error: 'Admin login required.' });
    return false;
  }

  return true;
};
