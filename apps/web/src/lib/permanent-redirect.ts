// 301 from a route handler with a relative Location. `request.url` names the server's own host, which behind a
// proxy is the internal one (staging: `localhost:3310`), so an absolute target built from it leaks that host.
// Browsers resolve a relative Location against the address they asked for (RFC 9110 §10.2.2).

/** `path` must already be encoded (segments via `encodeURIComponent`, the query as `nextUrl.search`). */
export function permanentRedirect(path: string): Response {
  return new Response(null, { status: 301, headers: { Location: path } });
}
