// Canonical base URL for links we put in outbound email (password reset).
//
// SECURITY: never derive these links from the inbound request's Host header
// (`new URL(req.url).origin`) — the Host is attacker-controllable, so a reset
// link could be poisoned to point at an attacker domain (host-header injection),
// and on preview/proxy deployments the origin is simply wrong. Prefer an
// explicitly configured APP_URL; fall back to the Vercel deployment URL, then
// localhost for dev.
export function appBaseUrl(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}
