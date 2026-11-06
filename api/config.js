/**
 * Public runtime config for Vercel.
 * Reads env vars you set in the Vercel project (never expose secret keys here).
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const body = {
    APP_NAME: process.env.APP_NAME || 'OrmocGo',
    APP_ENV: process.env.APP_ENV || 'production',
    APP_URL: process.env.APP_URL || 'https://ormoc-go.vercel.app',
    APP_VERSION: process.env.APP_VERSION || '0.1.0',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || '',
    GOOGLE_MAPS_API_KEY:
      process.env.GOOGLE_MAPS_API_KEY
      || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      || '',
    PWA_NAME: process.env.PWA_NAME || 'OrmocGo',
    PWA_SHORT_NAME: process.env.PWA_SHORT_NAME || 'OrmocGo',
    PWA_DESCRIPTION:
      process.env.PWA_DESCRIPTION
      || 'Community city guide for Ormoc — local details, places, and helpful tools.',
    PWA_THEME_COLOR: process.env.PWA_THEME_COLOR || '#2563eb',
    PWA_BACKGROUND_COLOR: process.env.PWA_BACKGROUND_COLOR || '#ffffff',
    PWA_START_URL: process.env.PWA_START_URL || './index.html',
    PWA_SCOPE: process.env.PWA_SCOPE || './',
  };

  res.statusCode = 200;
  res.end(JSON.stringify(body));
}
