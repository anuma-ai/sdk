/**
 * Dropbox OAuth 2.0 with PKCE
 *
 * Flow:
 * 1. Generate code_verifier and code_challenge
 * 2. Redirect user to Dropbox authorization URL
 * 3. User authorizes and is redirected back with authorization code
 * 4. Exchange code for access token using code_verifier
 */

const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const TOKEN_STORAGE_KEY = 'dropbox_access_token';
const VERIFIER_STORAGE_KEY = 'dropbox_code_verifier';

/**
 * Generate a random string for PKCE code verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  // Base64 URL encoding
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Get the stored access token from session storage
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Store access token in session storage
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Clear stored access token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Get the stored code verifier
 */
function getStoredVerifier(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(VERIFIER_STORAGE_KEY);
}

/**
 * Store code verifier for OAuth callback
 */
function storeVerifier(verifier: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);
}

/**
 * Clear stored code verifier
 */
function clearVerifier(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(VERIFIER_STORAGE_KEY);
}

/**
 * Get the redirect URI for OAuth callback
 */
function getRedirectUri(callbackPath: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${callbackPath}`;
}

/**
 * Check if current URL is a Dropbox OAuth callback
 */
export function isDropboxCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  return !!code && state === 'dropbox_auth';
}

/**
 * Handle the OAuth callback - exchange code for token
 */
export async function handleDropboxCallback(appKey: string, callbackPath: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || state !== 'dropbox_auth') return null;

  const verifier = getStoredVerifier();
  if (!verifier) return null;

  try {
    const response = await fetch(DROPBOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: appKey,
        redirect_uri: getRedirectUri(callbackPath),
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();
    const token = data.access_token;

    // Store token and clean up
    storeToken(token);
    clearVerifier();

    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);

    return token;
  } catch {
    clearVerifier();
    return null;
  }
}

/**
 * Start the OAuth flow - redirects to Dropbox
 */
export async function startDropboxAuth(appKey: string, callbackPath: string): Promise<never> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier for callback
  storeVerifier(verifier);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: appKey,
    redirect_uri: getRedirectUri(callbackPath),
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'dropbox_auth',
    token_access_type: 'offline',
  });

  // Redirect to Dropbox authorization
  window.location.href = `${DROPBOX_AUTH_URL}?${params.toString()}`;

  // This will never resolve - page redirects
  return new Promise(() => {});
}

/**
 * Request Dropbox access - returns existing token or starts OAuth flow
 */
export async function requestDropboxAccess(appKey: string, callbackPath: string): Promise<string> {
  if (!appKey) {
    throw new Error('Dropbox is not configured');
  }

  // Check for existing token
  const storedToken = getStoredToken();
  if (storedToken) {
    return storedToken;
  }

  // Start OAuth flow (this will redirect and never return)
  return startDropboxAuth(appKey, callbackPath);
}
