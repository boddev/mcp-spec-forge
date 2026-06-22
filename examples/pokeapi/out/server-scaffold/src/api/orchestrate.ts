import { apiCall } from './client.js';

/** One step of a tool's orchestration plan. */
export interface PlanStep {
  id: string;
  method: string;
  path: string;
  pathParams: string[];
  /** When set, repeat this step once per item of a prior step's result list. */
  foreach?: { sourceId: string; hint: string };
  /** Gate the step on a boolean tool argument, e.g. include_details == true. */
  condition?: { arg: string; equals: boolean };
  concurrency?: number;
  maxItems?: number;
  purpose?: string;
}

// Tool inputs that control orchestration rather than map to API params.
const CONTROL_ARGS = new Set(['include_details', 'max_items']);

type AnyObj = Record<string, unknown>;

function findArray(obj: unknown, hint?: string): unknown[] {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    const o = obj as AnyObj;
    if (hint && Array.isArray(o[hint])) return o[hint] as unknown[];
    for (const k of ['items', 'results', 'data', 'value', 'content']) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
    for (const v of Object.values(o)) if (Array.isArray(v)) return v as unknown[];
  }
  return [];
}

function idFromUrl(url: unknown): string {
  return String(url).replace(/\/+$/, '').split('/').pop() ?? '';
}

/** Fill {param} placeholders from tool args, falling back to a list item's id/name/url. */
function bindPath(path: string, names: string[], args: AnyObj, item?: AnyObj): string {
  let out = path;
  for (const n of names) {
    let v: unknown = args[n];
    if ((v === undefined || v === null) && item) {
      v = item[n] ?? item.id ?? item.name ?? (item.url ? idFromUrl(item.url) : undefined);
    }
    out = out.replace('{' + n + '}', encodeURIComponent(String(v ?? '')));
  }
  return out;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Execute a tool's plan, collapsing list-then-detail chains into one response.
 * Generic and best-effort: tune param binding / pagination for your API as needed.
 */
export async function runPlan(plan: PlanStep[], args: AnyObj): Promise<AnyObj> {
  const byId: AnyObj = {};
  const output: AnyObj = {};
  let lastList: unknown[] | null = null;
  const maxItems = typeof args.max_items === 'number' ? (args.max_items as number) : 50;

  const passThroughQuery: AnyObj = {};
  for (const [k, v] of Object.entries(args)) if (!CONTROL_ARGS.has(k)) passThroughQuery[k] = v;

  for (const step of plan) {
    if (step.condition) {
      const truthy = Boolean(args[step.condition.arg]);
      if (truthy !== step.condition.equals) continue;
    }

    if (step.foreach) {
      const source = findArray(byId[step.foreach.sourceId] ?? lastList, step.foreach.hint).slice(
        0,
        step.maxItems ?? maxItems,
      );
      const details = await mapLimit(source as AnyObj[], step.concurrency ?? 5, (item) =>
        apiCall(step.method, bindPath(step.path, step.pathParams, args, item)),
      );
      byId[step.id] = details;
      output[step.id + '_details'] = details;
    } else {
      const query: AnyObj = {};
      for (const [k, v] of Object.entries(passThroughQuery)) {
        if (!step.pathParams.includes(k)) query[k] = v;
      }
      const data = await apiCall(step.method, bindPath(step.path, step.pathParams, args), { query });
      byId[step.id] = data;
      output[step.id] = data;
      const arr = findArray(data);
      if (arr.length) lastList = arr;
    }
  }

  return output;
}
