import "server-only";

/**
 * Cookie-authenticated mutation endpoints should only be called from the app's own origin.
 * This complements SameSite cookies and JSON/CORS behavior; authorization still lives in RLS.
 */
export function isTrustedMutation(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser/API clients still require a valid authenticated session
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return originUrl.protocol === requestUrl.protocol && originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}
