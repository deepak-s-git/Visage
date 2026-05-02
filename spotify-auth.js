/* ═══════════════════════════════════════════════════════════════
   Spotify OAuth · PKCE Flow (no backend required)
   ─────────────────────────────────────────────────────────────
   1. Create an app at https://developer.spotify.com/dashboard
   2. Set Redirect URI to: http://127.0.0.1:3000/callback.html
   3. Paste your Client ID below
   ═══════════════════════════════════════════════════════════════ */

// ⚠️  PASTE YOUR SPOTIFY CLIENT ID HERE
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';

// Spotify requires 127.0.0.1 instead of localhost for development
const origin = window.location.hostname === 'localhost'
  ? window.location.origin.replace('localhost', '127.0.0.1')
  : window.location.origin;
const REDIRECT_URI = `${origin}/callback.html`;

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'user-read-email',
  'user-read-private'
].join(' ');

// localStorage keys
const TOKEN_KEY = 'visage_spotify_token';
const REFRESH_KEY = 'visage_spotify_refresh';
const EXPIRY_KEY = 'visage_spotify_expiry';
const VERIFIER_KEY = 'visage_spotify_verifier';

/* ── PKCE Helpers ── */

function generateRandomString(length) {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => possible[v % possible.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64urlEncode(hashed);
}

/* ── Authorization ── */

async function startAuth() {
  if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
    console.error(
      '[Visage] Set your Spotify Client ID in spotify-auth.js before connecting.'
    );
    alert(
      'Set your Spotify Client ID in spotify-auth.js\n\n' +
        '1. Go to https://developer.spotify.com/dashboard\n' +
        '2. Create an app\n' +
        '3. Add redirect URI: ' + REDIRECT_URI + '\n' +
        '4. Copy Client ID into spotify-auth.js'
    );
    return;
  }

  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier for the token exchange step
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  // Center the popup on screen
  const w = 500,
    h = 700;
  const left = Math.round(screen.width / 2 - w / 2);
  const top = Math.round(screen.height / 2 - h / 2);

  window.open(
    authUrl,
    'visage-spotify-auth',
    `width=${w},height=${h},left=${left},top=${top},popup=1`
  );
}

/* ── Token Exchange ── */

async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Missing PKCE verifier');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    })
  });

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  localStorage.setItem(TOKEN_KEY, data.access_token);
  if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
  sessionStorage.removeItem(VERIFIER_KEY);

  return data.access_token;
}

/* ── Token Refresh ── */

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
      localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
      return data.access_token;
    }
  } catch (err) {
    console.warn('[Visage] Token refresh failed:', err);
  }

  // Refresh failed — clear stale tokens
  logout();
  return null;
}

/* ── Token Access ── */

async function getValidToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);

  // Refresh 60 seconds before expiry
  if (Date.now() > expiry - 60_000) {
    return await refreshAccessToken();
  }

  return token;
}

function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

/* ── Spotify Web API Helpers ── */

async function fetchProfile() {
  const token = await getValidToken();
  if (!token) return null;

  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.ok ? await res.json() : null;
}

async function searchTrack(songName, artistName) {
  const token = await getValidToken();
  if (!token) return null;

  const query = `track:${songName} artist:${artistName}`;
  const params = new URLSearchParams({ q: query, type: 'track', limit: '1' });

  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.tracks?.items?.[0] || null;
}

async function playTrack(trackUri) {
  const token = await getValidToken();
  if (!token) return false;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [trackUri] })
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/* ── Listen for OAuth Callback from Popup ── */

window.addEventListener('message', async (event) => {
  // Only accept messages from our own origin
  if (event.origin !== window.location.origin) return;

  if (event.data?.type === 'spotify-callback' && event.data.code) {
    try {
      await exchangeCodeForToken(event.data.code);
      window.dispatchEvent(new CustomEvent('spotify-authenticated'));
    } catch (err) {
      console.error('[Visage] Spotify auth failed:', err);
      window.dispatchEvent(
        new CustomEvent('spotify-auth-error', { detail: err })
      );
    }
  }
});

/* ── Public API ── */

window.spotifyAuth = {
  startAuth,
  getValidToken,
  isAuthenticated,
  logout,
  fetchProfile,
  searchTrack,
  playTrack
};
