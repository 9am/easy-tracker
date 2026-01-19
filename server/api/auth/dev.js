import prisma from '../../db/client.js';
import { generateToken, setAuthCookie } from '../../middleware/auth.js';

const isDev = process.env.NODE_ENV !== 'production';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isDev) {
    return res.status(403).json({ error: 'Not available in production' });
  }

  // Auto-login as test user in development
  const testUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' }
  });

  if (!testUser) {
    return res.status(404).json({ error: 'Test user not found. Run npm run db:seed' });
  }

  const token = generateToken(testUser);
  setAuthCookie(res, token);

  res.json({
    success: true,
    user: {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name
    }
  });
}
