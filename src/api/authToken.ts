// The access token lives ONLY here, in a module-level variable — never in
// localStorage/sessionStorage/a JS-readable cookie. It's lost on page reload
// by design; client.ts silently re-derives it from the HttpOnly refresh-token
// cookie on load (see bootstrap() in client.ts).
let accessToken: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function onAccessTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
