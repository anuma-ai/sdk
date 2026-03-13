/**
 * Shared Google service account auth for e2e tests.
 * Reads GOOGLE_SERVICE_ACCOUNT_KEY from env and provides token management.
 */

import { createSign } from "crypto";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

function createJwt(key: ServiceAccountKey, scope: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope,
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    })
  );
  const signable = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signable);
  const signature = sign.sign(key.private_key, "base64url");
  return `${signable}.${signature}`;
}

async function fetchToken(key: ServiceAccountKey, scope: string): Promise<string> {
  const jwt = createJwt(key, scope);
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get service account token (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * Creates a token manager for a given Google API scope.
 * Caches the token and provides getAccessToken/requestAccess helpers
 * compatible with the tool factory signatures.
 */
export function createGoogleTokenManager(scope: string) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is required. Add it to .env or set the environment variable."
    );
  }
  const serviceKey: ServiceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  let accessToken: string | null = null;

  async function ensureToken(): Promise<string> {
    if (!accessToken) {
      accessToken = await fetchToken(serviceKey, scope);
    }
    return accessToken;
  }

  return {
    ensureToken,
    getAccessToken: () => accessToken,
    requestAccess: () => ensureToken(),
  };
}
