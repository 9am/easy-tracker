import jwt from 'jsonwebtoken';
import prisma from '../db/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const isDev = process.env.NODE_ENV !== 'production';

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function setAuthCookie(res, token) {
  const cookieOptions = [
    `token=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}` // 7 days
  ];

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0');
}

export async function withAuth(handler) {
  return async (req, res) => {
    // Dev bypass - auto-login as test user
    if (isDev && !req.cookies?.token) {
      const devToken = req.headers['x-dev-token'];
      if (devToken === 'dev-bypass') {
        const testUser = await prisma.user.findUnique({
          where: { email: 'test@example.com' }
        });
        if (testUser) {
          req.user = testUser;
          return handler(req, res);
        }
      }
    }

    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    return handler(req, res);
  };
}

export async function requireAuth(req, res) {
  // Dev bypass - auto-login as test user
  if (isDev) {
    const devToken = req.headers['x-dev-token'];
    if (devToken === 'dev-bypass') {
      const testUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });
      if (testUser) {
        req.user = testUser;
        return true;
      }
    }
  }

  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId }
  });

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return false;
  }

  req.user = user;
  return true;
}

export default { generateToken, verifyToken, setAuthCookie, clearAuthCookie, withAuth, requireAuth };
