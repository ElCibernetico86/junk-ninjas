import { createSessionCookie, hasAdminPassword, verifyPassword } from './_auth.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!hasAdminPassword()) {
    return response.status(500).json({ error: 'ADMIN_PASSWORD is not configured.' });
  }

  const password = String(request.body?.password || '');

  if (!verifyPassword(password)) {
    return response.status(401).json({ error: 'Incorrect admin password.' });
  }

  response.setHeader('Set-Cookie', createSessionCookie());
  return response.status(200).json({ ok: true });
}
