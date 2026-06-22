const TOKEN = process.env["API_TOKEN"];

export async function apiCall(method: string, path: string, opts: { query?: Record<string, unknown>; body?: unknown } = {}) {
  const url = new URL(path, process.env.API_BASE_URL ?? 'https://api.example.com');
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
  return res.json();
}
