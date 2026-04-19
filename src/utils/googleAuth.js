// src/utils/googleAuth.js

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

export function buildOAuthUrl() {
  const base = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id:     process.env.REACT_APP_GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.REACT_APP_GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',  // 항상 refresh_token 받기 위해
  });
  return `${base}?${params.toString()}`;
}

const TOKEN_KEY = 'bp_google_tokens';

export function saveTokens({ access_token, refresh_token, expires_in }) {
  const expiresAt = Date.now() + (Number(expires_in) * 1000) - 60_000; // 1분 여유
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token, refresh_token, expiresAt }));
}

export function loadTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY));
  } catch {
    return null;
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenExpired(tokens) {
  return !tokens || Date.now() >= tokens.expiresAt;
}

export async function refreshAccessToken(refresh_token) {
  const res = await fetch('/api/auth/google/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json();
  return data; // { access_token, expires_in }
}

export async function getValidAccessToken() {
  let tokens = loadTokens();
  if (!tokens) throw new Error('NOT_LOGGED_IN');

  if (isTokenExpired(tokens)) {
    if (!tokens.refresh_token) throw new Error('NO_REFRESH_TOKEN');
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    tokens = {
      ...tokens,
      access_token: refreshed.access_token,
      expiresAt: Date.now() + (Number(refreshed.expires_in) * 1000) - 60_000,
    };
    saveTokens(tokens);
  }
  return tokens.access_token;
}
