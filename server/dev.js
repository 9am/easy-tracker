import { createServer } from 'http';
import { stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const API_DIR = join(__dirname, 'api');

const PORT = process.env.PORT || 3000;

// Load environment variables
import('dotenv').then(dotenv => dotenv.config());

async function loadApiHandler(path) {
  // Convert URL path to file path
  // /api/auth/google -> server/api/auth/google.js
  // /api/routines/123 -> server/api/routines/[id].js

  const parts = path.replace('/api/', '').split('/').filter(Boolean);
  if (parts.length === 0) return null;

  let filePath = API_DIR;
  let params = {};

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;

    if (isLast) {
      // Try exact match first
      let exactPath = join(filePath, `${part}.js`);
      try {
        await stat(exactPath);
        const module = await import(exactPath);
        return { handler: module.default, params };
      } catch {
        // Try index.js in directory
        exactPath = join(filePath, part, 'index.js');
        try {
          await stat(exactPath);
          const module = await import(exactPath);
          return { handler: module.default, params };
        } catch {
          // Try [id].js pattern
          const dynamicPath = join(filePath, '[id].js');
          try {
            await stat(dynamicPath);
            params.id = part;
            const module = await import(dynamicPath);
            return { handler: module.default, params };
          } catch {
            return null;
          }
        }
      }
    } else {
      filePath = join(filePath, part);
    }
  }

  // Try index.js
  try {
    const indexPath = join(filePath, 'index.js');
    await stat(indexPath);
    const module = await import(indexPath);
    return { handler: module.default, params };
  } catch {
    return null;
  }
}

async function handleApiRequest(req, res, pathname) {
  try {
    const result = await loadApiHandler(pathname);

    if (!result || !result.handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    // Parse request body for POST/PUT
    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
    }

    // Create request object compatible with Vercel
    const url = new URL(pathname, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams);

    const request = {
      method: req.method,
      url: pathname,
      headers: req.headers,
      query: { ...query, ...req.query },
      params: result.params,
      body: body ? JSON.parse(body) : undefined,
      cookies: parseCookies(req.headers.cookie)
    };

    // Create response object
    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: null,

      status(code) {
        this.statusCode = code;
        return this;
      },

      setHeader(name, value) {
        this.headers[name] = value;
        return this;
      },

      json(data) {
        this.body = JSON.stringify(data);
        this.headers['Content-Type'] = 'application/json';
        this.send();
      },

      redirect(url) {
        this.statusCode = 302;
        this.headers['Location'] = url;
        this.send();
      },

      send(data) {
        if (data !== undefined) this.body = data;
        res.writeHead(this.statusCode, this.headers);
        res.end(this.body);
      }
    };

    await result.handler(request, response);
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

const server = createServer(async (req, res) => {
  const { pathname, query } = parse(req.url, true);

  // Add query to request for API handlers
  req.query = query;

  console.log(`${req.method} ${pathname}`);

  // CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname.startsWith('/api/')) {
    await handleApiRequest(req, res, pathname);
  } else {
    // Redirect non-API requests to Vite dev server
    res.writeHead(302, { Location: `http://localhost:5173${pathname}` });
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   Easy Tracker API Server              ║
  ║                                        ║
  ║   API:      http://localhost:${PORT}       ║
  ║   Frontend: http://localhost:5173      ║
  ╚════════════════════════════════════════╝
  `);
});
