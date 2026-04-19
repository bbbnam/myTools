// api/auth/google/refresh.js
// refresh_token으로 만료된 access_token 갱신

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'No refresh_token' });

  try {
    const params = new URLSearchParams({
      refresh_token,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type:    'refresh_token',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokens.error_description || 'Refresh failed');

    return res.status(200).json({
      access_token: tokens.access_token,
      expires_in:   tokens.expires_in,
    });
  } catch (err) {
    console.error('[Refresh Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
