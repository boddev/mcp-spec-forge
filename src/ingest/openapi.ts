import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import type { EndpointCard, EndpointParam, VerbClass } from '../types.js';
import { singularize, tokenize } from '../text.js';

type AnyObj = Record<string, any>;

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options'];

/** Load an OpenAPI document from a local file path or a URL. */
export async function loadOpenApi(source: string): Promise<{ endpoints: EndpointCard[]; baseUrl?: string }> {
  let raw: string;
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch OpenAPI doc: ${res.status} ${source}`);
    raw = await res.text();
  } else {
    raw = readFileSync(source, 'utf8');
  }
  const doc = parseDoc(raw);
  return { endpoints: normalizeOpenApi(doc), baseUrl: extractBaseUrl(doc) };
}

/** Pull the first concrete server URL from an OpenAPI document, if present. */
export function extractBaseUrl(doc: AnyObj): string | undefined {
  const url = doc?.servers?.[0]?.url;
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url.replace(/\/+$/, '');
  return undefined;
}

export function parseDoc(raw: string): AnyObj {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{')) return JSON.parse(raw);
  return yaml.load(raw) as AnyObj;
}

/** Convert an OpenAPI document into normalized EndpointCards. */
export function normalizeOpenApi(doc: AnyObj): EndpointCard[] {
  const cards: EndpointCard[] = [];
  const paths: AnyObj = doc.paths ?? {};
  const globalSecurity = securityNames(doc.security, doc);

  for (const [path, pathItemRaw] of Object.entries(paths)) {
    const pathItem = deref(pathItemRaw, doc);
    const sharedParams: AnyObj[] = (pathItem.parameters ?? []).map((p: AnyObj) => deref(p, doc));
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      cards.push(buildCard(method.toUpperCase(), path, deref(op, doc), sharedParams, doc, globalSecurity));
    }
  }
  return cards;
}

function buildCard(
  method: string,
  path: string,
  op: AnyObj,
  sharedParams: AnyObj[],
  doc: AnyObj,
  globalSecurity: string[],
): EndpointCard {
  const params = [...sharedParams, ...(op.parameters ?? []).map((p: AnyObj) => deref(p, doc))];
  const inputs = extractParams(params, op, doc);
  const outputs = extractResponseFields(op, doc);
  const summary = op.summary || op.description?.split('\n')[0] || `${method} ${path}`;
  const entities = extractEntities(path, summary, op.operationId);
  const verb = classifyVerb(method, path, summary, op.operationId);
  const auth = op.security ? securityNames(op.security, doc) : globalSecurity;
  const pagination = detectPagination(inputs);
  const tags: string[] = op.tags ?? [];

  return {
    id: `${method} ${path}`,
    method,
    path,
    operationId: op.operationId,
    summary,
    description: op.description,
    inputs,
    outputs,
    entities,
    verb,
    auth,
    pagination,
    tags,
    source: 'openapi',
    confidence: 1,
  };
}

function extractParams(params: AnyObj[], op: AnyObj, doc: AnyObj): EndpointParam[] {
  const out: EndpointParam[] = [];
  for (const p of params) {
    if (!p?.name) continue;
    out.push({
      name: p.name,
      in: (p.in ?? 'query') as EndpointParam['in'],
      required: Boolean(p.required) || p.in === 'path',
      type: p.schema?.type,
      description: p.description,
    });
  }
  // Request body -> synthesize body params from top-level schema properties.
  const body = deref(op.requestBody, doc);
  const bodySchema = deref(
    body?.content?.['application/json']?.schema ?? body?.content?.['*/*']?.schema,
    doc,
  );
  if (bodySchema?.properties) {
    const required: string[] = bodySchema.required ?? [];
    for (const [name, schema] of Object.entries<AnyObj>(bodySchema.properties)) {
      out.push({
        name,
        in: 'body',
        required: required.includes(name),
        type: (deref(schema, doc) as AnyObj)?.type,
      });
    }
  }
  return out;
}

/** Extract dotted response field paths from the primary success response schema. */
function extractResponseFields(op: AnyObj, doc: AnyObj): string[] {
  const responses: AnyObj = op.responses ?? {};
  const successKey =
    Object.keys(responses).find((k) => /^2\d\d$/.test(k)) ??
    (responses.default ? 'default' : undefined);
  if (!successKey) return [];
  const resp = deref(responses[successKey], doc);
  const schema = deref(
    resp?.content?.['application/json']?.schema ?? resp?.content?.['*/*']?.schema,
    doc,
  );
  if (!schema) return [];
  const fields = new Set<string>();
  collectFields(schema, '', fields, doc, 0);
  return [...fields].slice(0, 60);
}

function collectFields(schema: AnyObj, prefix: string, out: Set<string>, doc: AnyObj, depth: number): void {
  if (!schema || depth > 4) return;
  schema = deref(schema, doc);
  if (schema.type === 'array' && schema.items) {
    collectFields(schema.items, prefix ? `${prefix}[]` : '[]', out, doc, depth + 1);
    return;
  }
  if (schema.properties) {
    for (const [name, child] of Object.entries<AnyObj>(schema.properties)) {
      const fieldPath = prefix ? `${prefix}.${name}` : name;
      out.add(fieldPath);
      collectFields(child, fieldPath, out, doc, depth + 1);
    }
  }
  for (const key of ['allOf', 'oneOf', 'anyOf']) {
    if (Array.isArray(schema[key])) {
      for (const sub of schema[key]) collectFields(sub, prefix, out, doc, depth + 1);
    }
  }
}

/** Resolve a single local $ref (one hop, recursively) within the same document. */
export function deref(node: AnyObj | undefined, doc: AnyObj, seen = new Set<string>()): AnyObj {
  if (!node || typeof node !== 'object') return node as unknown as AnyObj;
  if (typeof node.$ref === 'string') {
    const ref = node.$ref;
    if (seen.has(ref)) return {};
    seen.add(ref);
    if (!ref.startsWith('#/')) return {};
    const target = ref
      .slice(2)
      .split('/')
      .reduce<AnyObj | undefined>((acc, key) => (acc ? acc[decodeRefToken(key)] : undefined), doc);
    return deref(target, doc, seen);
  }
  return node;
}

function decodeRefToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function securityNames(security: any, doc: AnyObj): string[] {
  const schemes = doc.components?.securitySchemes ?? doc.securityDefinitions ?? {};
  const names = new Set<string>();
  if (Array.isArray(security)) {
    for (const req of security) {
      for (const name of Object.keys(req ?? {})) {
        const scheme = schemes[name];
        names.add(scheme?.type ? `${scheme.type}${scheme.scheme ? ':' + scheme.scheme : ''}` : name);
      }
    }
  }
  return [...names];
}

export function classifyVerb(method: string, path: string, summary: string, opId?: string): VerbClass {
  const text = `${summary} ${opId ?? ''}`.toLowerCase();
  const m = method.toUpperCase();
  if (m === 'POST' && !/search|query|find/.test(text)) return 'create';
  if (m === 'PUT' || m === 'PATCH') return 'update';
  if (m === 'DELETE') return 'delete';
  // A path ending in a parameter is a single-resource fetch, regardless of any
  // verb-like words in the summary (e.g. a resource literally named "List").
  if (/\{[^}]+\}\/?$/.test(path)) return 'get';
  if (/search|query|find/.test(text)) return 'search';
  if (/\b(list|all|index)\b/.test(text)) return 'list';
  if (m === 'GET') return 'list';
  return 'unknown';
}

export function extractEntities(path: string, summary: string, opId?: string): string[] {
  const entities = new Set<string>();
  // Path segments that are not parameters are likely entity/collection names.
  for (const seg of path.split('/')) {
    if (!seg || seg.startsWith('{')) continue;
    // FHIR/REST special operations & interactions ($validate, $export, _history,
    // _search) are not domain entities — skip them so they don't pollute names.
    if (seg.startsWith('$') || seg.startsWith('_')) continue;
    const clean = seg.replace(/[^a-zA-Z0-9]/g, ' ').trim();
    for (const tok of clean.split(/\s+/)) {
      const lower = tok.toLowerCase();
      if (tok.length > 2 && !PATH_STOPWORDS.has(lower) && !/^v\d+$/.test(lower)) {
        entities.add(singularize(lower));
      }
    }
  }
  // The path usually encodes the real domain entity. Only fall back to nouns from
  // the summary/operationId when the path yielded nothing (e.g. opaque RPC paths),
  // since interaction descriptions ("Read X instance") otherwise leak verb noise.
  if (entities.size === 0) {
    const cleanSummary = stripInteractionPrefix(summary);
    for (const tok of tokenize(`${cleanSummary} ${opId ?? ''}`)) {
      if (!ENTITY_NOISE.has(tok)) entities.add(tok);
    }
  }
  return [...entities];
}

// Common API routing/prefix segments that are never the real domain entity.
const PATH_STOPWORDS = new Set([
  'api', 'rest', 'public', 'private', 'json', 'xml', 'www', 'http', 'https',
  'service', 'services', 'endpoint', 'endpoints',
]);

// Structural words that describe the kind of REST interaction, not the entity.
const ENTITY_NOISE = new Set(['instance', 'resource']);

// Machine interaction labels some specs prefix summaries with, e.g. FHIR's
// "search-type: Search for Patient instances" or "GET: /Observation/$validate".
const INTERACTION_PREFIX =
  /^(?:search|read|vread|create|update|delete|patch|history|capabilities|transaction|batch|operation|get|post|put|head|options)(?:-(?:type|instance|system))?\s*:\s*/i;

function stripInteractionPrefix(summary: string): string {
  return summary.replace(INTERACTION_PREFIX, '');
}

function detectPagination(inputs: EndpointParam[]): string | undefined {
  const names = inputs.map((i) => i.name.toLowerCase());
  if (names.includes('page')) return 'page';
  if (names.some((n) => n === 'cursor' || n === 'after' || n === 'next')) return 'cursor';
  if (names.includes('offset') || names.includes('limit')) return 'offset';
  return undefined;
}
