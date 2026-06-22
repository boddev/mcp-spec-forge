const BASE_URL = process.env.API_BASE_URL ?? "https://pokeapi.co";
const TOKEN = process.env["API_KEY"];

export interface CallOpts {
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Single HTTP call against the documented API. Paths are appended to BASE_URL. */
export async function apiCall(method: string, path: string, opts: CallOpts = {}): Promise<unknown> {
  const url = new URL(BASE_URL.replace(/\/+$/, '') + (path.startsWith('/') ? path : '/' + path));
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (TOKEN) headers['x-api-key'] = TOKEN;
  const res = await fetch(url, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status} ${res.statusText}`);
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('json') ? res.json() : res.text();
}
