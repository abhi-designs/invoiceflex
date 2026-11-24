import 'dotenv/config';
import express from 'express';
import path from 'path';

const app = express();
const PORT = 3000;

app.disable('x-powered-by');

function sanitizeSupabaseUrl(raw: string | undefined): string {
  let candidate = (raw || '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!candidate || /^MY_/i.test(candidate)) return '';
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate)) {
    if (/^[a-zA-Z0-9-]+\.supabase\.(co|in|net)(\/.*)?$/i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return '';
    }
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, ''));
  } catch {
    return '';
  }
}

// Public Supabase configuration endpoint (never exposes service_role or private secrets)
app.get('/api/supabase-config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']+|["']+$/g, '').trim();
  res.json({
    url: sanitizeSupabaseUrl(process.env.VITE_SUPABASE_URL),
    anonKey: /^MY_/i.test(anonKey) ? '' : anonKey,
  });
});

// PWA Manifest & Service Worker routes
app.get(['/manifest.webmanifest', '/manifest.json'], (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.resolve('./manifest.webmanifest'));
});

app.get('/sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.resolve('./sw.js'));
});

// Serve AI Studio uploaded assets (logo, PDFs) & app static assets (CSS, JS, images)
app.use('/assets/aistudio', express.static(path.resolve('./public/assets/aistudio'), { maxAge: '7d', etag: true }));
app.use('/assets/icons', express.static(path.resolve('./assets/icons'), { maxAge: '7d', etag: true }));
app.use('/assets', express.static(path.resolve('./assets'), { maxAge: '10m', etag: true }));

// Serve other static files directly from root (like .html files)
app.use(express.static(path.resolve('.'), { etag: true }));

// Route for root -> index.html (Login Page as default)
app.get('/', (req, res) => {
  res.sendFile(path.resolve('./index.html'));
});

// Helper routes for cleaner URLs (without .html suffix)
const pages = [
  'register', 'dashboard', 'customers', 'customer-add', 'customer-edit', 'customer-view',
  'invoice-list', 'invoice-create', 'invoice-preview', 'invoice-view',
  'payments', 'plans', 'quotations', 'bill-book', 'reports', 'company-settings', 'profile', 'help', '404'
];

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.resolve(`./${page}.html`));
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.resolve('./404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
