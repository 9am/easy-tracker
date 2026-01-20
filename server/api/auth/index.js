import prisma from '../../db/client.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../../middleware/auth.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const isDev = process.env.NODE_ENV !== 'production';

async function exchangeCodeForTokens(code) {
  const redirectUri = `${APP_URL}/api/auth?action=callback`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

async function getGoogleUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

// Google OAuth initiation
function handleGoogle(req, res) {
  const redirectUri = `${APP_URL}/api/auth?action=callback`;
  const scope = encodeURIComponent('email profile');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent`;

  res.redirect(authUrl);
}

// Google OAuth callback
async function handleCallback(req, res) {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(`/?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    let user = await prisma.user.findFirst({
      where: {
        provider: 'google',
        providerId: googleUser.id
      }
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: googleUser.email }
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            provider: 'google',
            providerId: googleUser.id,
            avatarUrl: googleUser.picture
          }
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            avatarUrl: googleUser.picture,
            provider: 'google',
            providerId: googleUser.id
          }
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUser.name,
          avatarUrl: googleUser.picture
        }
      });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.redirect('/workout');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`/?error=${encodeURIComponent('auth_failed')}`);
  }
}

// Logout
function handleLogout(req, res) {
  clearAuthCookie(res);
  res.json({ success: true });
}

// Dev login
async function handleDev(req, res) {
  if (!isDev) {
    return res.status(403).json({ error: 'Not available in production' });
  }

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

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'google':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleGoogle(req, res);

    case 'callback':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleCallback(req, res);

    case 'logout':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleLogout(req, res);

    case 'dev':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleDev(req, res);

    default:
      return res.status(400).json({ error: 'Invalid action. Use: google, callback, logout, or dev' });
  }
}
