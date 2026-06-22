import { readFileSync } from 'node:fs';
import type { EndpointCard } from '../types.js';
import { classifyVerb, extractEntities } from './openapi.js';

/**
 * Best-effort extraction of API endpoints from unstructured HTML documentation.
 *
 * This is a heuristic fallback for when no OpenAPI spec is available. It scans the
 * rendered text for "METHOD /path" patterns and emits low-confidence EndpointCards
 * that should be marked "needs human review". Prefer OpenAPI whenever possible.
 */
const METHOD_PATH_RE =
  /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[A-Za-z0-9_\-/{}.:]+)/g;

export async function loadHtmlDocs(source: string): Promise<EndpointCard[]> {
  let html: string;
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch HTML docs: ${res.status} ${source}`);
    html = await res.text();
  } else {
    html = readFileSync(source, 'utf8');
  }
  return extractFromHtml(html);
}

export function extractFromHtml(html: string): EndpointCard[] {
  // Drop scripts/styles/nav/footer and comments, then replace remaining tags with
  // spaces so adjacent block elements don't fuse (e.g. "<h2>GET /widgets</h2><p>List..."
  // must not become "/widgetsList"). Pure-regex keeps the skill dependency-free.
  const stripped = html
    .replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const text = stripped
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  const seen = new Map<string, EndpointCard>();
  let match: RegExpExecArray | null;
  METHOD_PATH_RE.lastIndex = 0;
  while ((match = METHOD_PATH_RE.exec(text)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2].replace(/[.,;:]+$/, '');
    const id = `${method} ${path}`;
    if (seen.has(id)) continue;

    // Grab a little surrounding context as a pseudo-summary.
    const ctxStart = Math.max(0, match.index - 0);
    const ctxEnd = Math.min(text.length, match.index + match[0].length + 120);
    const summary = text
      .slice(ctxStart, ctxEnd)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);

    const params = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path' as const,
      required: true,
    }));

    seen.set(id, {
      id,
      method,
      path,
      summary: summary || id,
      inputs: params,
      outputs: [],
      entities: extractEntities(path, summary),
      verb: classifyVerb(method, path, summary),
      auth: [],
      tags: [],
      source: 'html',
      confidence: 0.4,
    });
  }
  return [...seen.values()];
}
