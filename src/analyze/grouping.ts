import type {
  EndpointCard,
  EndpointParam,
  JsonSchema,
  ToolCandidate,
  UnderlyingCall,
} from '../types.js';
import type { QuestionPlan } from './matcher.js';
import { toPascalCase, toSnakeCase } from '../text.js';

/** Union-Find for clustering endpoints into tools. */
class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

interface GroupOptions {
  /** Min co-occurrence count to merge two endpoints sharing an entity. */
  coUsageThreshold?: number;
  /** Flag a tool for review beyond this many distinct entities. */
  godEntityLimit?: number;
  /** Flag a tool for review beyond this many underlying endpoints. */
  godEndpointLimit?: number;
}

/**
 * Group endpoints into task-oriented MCP tools driven by the eval-set plans.
 *
 * Two endpoints are merged when:
 *  (a) they are co-needed within a single question (must collapse to avoid N+1), or
 *  (b) they share a dominant entity and co-occur across >= threshold questions.
 */
export function groupIntoTools(
  plans: QuestionPlan[],
  endpoints: EndpointCard[],
  opts: GroupOptions = {},
): ToolCandidate[] {
  const coUsageThreshold = opts.coUsageThreshold ?? 2;
  const godEntityLimit = opts.godEntityLimit ?? 4;
  const godEndpointLimit = opts.godEndpointLimit ?? 6;

  const cardById = new Map(endpoints.map((e) => [e.id, e]));
  const uf = new UnionFind();

  // Each question contributes a small endpoint set (primary [+ detail on chains]).
  const questionEndpoints = new Map<string, string[]>();
  const pairCount = new Map<string, number>();

  for (const plan of plans) {
    const set = selectQuestionEndpoints(plan);
    if (set.length === 0) continue;
    questionEndpoints.set(plan.question.id, set);

    // (a) co-needed within one question -> always one tool.
    for (let i = 0; i < set.length; i++) {
      uf.find(set[i]);
      for (let j = i + 1; j < set.length; j++) {
        uf.union(set[i], set[j]);
        const key = [set[i], set[j]].sort().join('||');
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  // (b) merge same-entity endpoints that co-occur across enough questions.
  for (const [key, count] of pairCount) {
    if (count < coUsageThreshold) continue;
    const [a, b] = key.split('||');
    const ca = cardById.get(a);
    const cb = cardById.get(b);
    if (ca && cb && shareDominantEntity(ca, cb)) uf.union(a, b);
  }

  // Collect components.
  const components = new Map<string, Set<string>>();
  for (const ids of questionEndpoints.values()) {
    for (const id of ids) {
      const root = uf.find(id);
      if (!components.has(root)) components.set(root, new Set());
      components.get(root)!.add(id);
    }
  }

  // Build a tool per component.
  const tools: ToolCandidate[] = [];
  const usedNames = new Set<string>();
  for (const ids of components.values()) {
    const cards = [...ids].map((id) => cardById.get(id)!).filter(Boolean);
    if (cards.length === 0) continue;
    const coveredQuestions = plans.filter((p) => {
      const set = questionEndpoints.get(p.question.id) ?? [];
      return set.some((id) => ids.has(id));
    });
    const anyChain = coveredQuestions.some((p) => p.isChain);
    tools.push(
      buildTool(cards, coveredQuestions, anyChain, usedNames, {
        godEntityLimit,
        godEndpointLimit,
      }),
    );
  }

  // Most-covered tools first.
  tools.sort((a, b) => b.evalCoverage.length - a.evalCoverage.length);
  return tools;
}

/** Pick the endpoints a question needs: its primary, plus a detail endpoint on chains. */
function selectQuestionEndpoints(plan: QuestionPlan): string[] {
  if (plan.matches.length === 0) return [];
  const primary = plan.matches[0].endpoint;
  const out = [primary.id];
  if (plan.isChain) {
    const detail = plan.matches.find(
      (m) => m.endpoint.verb === 'get' && m.endpoint.id !== primary.id,
    );
    if (detail) out.push(detail.endpoint.id);
  }
  return out;
}

function shareDominantEntity(a: EndpointCard, b: EndpointCard): boolean {
  const ea = new Set(a.entities.slice(0, 3));
  return b.entities.slice(0, 3).some((e) => ea.has(e));
}

function buildTool(
  cards: EndpointCard[],
  coveredQuestions: QuestionPlan[],
  isChain: boolean,
  usedNames: Set<string>,
  limits: { godEntityLimit: number; godEndpointLimit: number },
): ToolCandidate {
  const entities = dominantEntities(cards);
  const listLike = cards.filter((c) => c.verb === 'list' || c.verb === 'search');
  const detailLike = cards.filter((c) => c.verb === 'get');
  const ordered = [...listLike, ...detailLike, ...cards.filter((c) => !listLike.includes(c) && !detailLike.includes(c))];

  const name = uniqueName(toolName(cards, entities, isChain), usedNames);
  const description = toolDescription(cards, entities, coveredQuestions, isChain);

  const underlyingCalls = buildCalls(ordered, isChain);
  const inputSchema = buildInputSchema(ordered, isChain);
  const outputSchema = buildOutputSchema(ordered);

  const reviewFlags: string[] = [];
  if (entities.length > limits.godEntityLimit) {
    reviewFlags.push(`broad-scope: spans ${entities.length} entities — consider splitting`);
  }
  if (cards.length > limits.godEndpointLimit) {
    reviewFlags.push(`many-endpoints: wraps ${cards.length} endpoints`);
  }
  if (cards.some((c) => c.source === 'html')) {
    reviewFlags.push('low-confidence: derived from HTML docs — verify endpoint details');
  }
  if (coveredQuestions.length === 0) {
    reviewFlags.push('orphan: covers no eval questions');
  }

  return {
    name,
    description,
    evalCoverage: coveredQuestions.map((p) => p.question.id),
    entities,
    inputSchema,
    outputSchema,
    underlyingCalls,
    pagination: listLike.length
      ? { strategy: 'auto_paginate_until_limit', maxPages: 5 }
      : undefined,
    rateLimiting: {
      strategy: 'bounded_concurrency',
      retry: { onStatus: [429, 503], backoff: 'exponential' },
    },
    errors: {
      partialResults: isChain,
      userVisibleMessages: {
        auth_failed: 'Authentication failed. Check the configured credentials.',
        rate_limited: 'The API rate limit was reached. Partial results may be returned.',
        not_found: 'No matching records were found for the given inputs.',
      },
    },
    reviewFlags,
  };
}

function buildCalls(ordered: EndpointCard[], isChain: boolean): UnderlyingCall[] {
  const calls: UnderlyingCall[] = [];
  let firstListId: string | undefined;
  ordered.forEach((card, i) => {
    const isDetail = isChain && card.verb === 'get' && firstListId;
    const call: UnderlyingCall = {
      id: card.operationId || `call_${i + 1}`,
      endpoint: card.id,
      purpose: card.summary,
    };
    const pathParams = card.inputs.filter((p) => p.in === 'path');
    if (pathParams.length) {
      call.params = Object.fromEntries(pathParams.map((p) => [p.name, `{${p.name}}`]));
    }
    if (isDetail) {
      call.foreach = `${firstListId}.items`;
      call.condition = 'include_details == true';
      call.concurrency = 5;
      call.maxItems = 50;
    } else if (card.verb === 'list' || card.verb === 'search') {
      if (!firstListId) firstListId = call.id;
    }
    calls.push(call);
  });
  return calls;
}

function buildInputSchema(ordered: EndpointCard[], isChain: boolean): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const card of ordered) {
    for (const p of card.inputs) {
      if (p.in === 'path') {
        if (!properties[p.name]) {
          properties[p.name] = paramSchema(p);
          if (p.required && !required.includes(p.name)) required.push(p.name);
        }
      }
    }
  }
  // A few salient filter params from list/search endpoints.
  const filters = ['state', 'status', 'q', 'query', 'search', 'assignee', 'label', 'type', 'since', 'until', 'from', 'to'];
  for (const card of ordered) {
    for (const p of card.inputs) {
      if (p.in === 'query' && filters.includes(p.name.toLowerCase()) && !properties[p.name]) {
        properties[p.name] = paramSchema(p);
      }
    }
  }
  if (ordered.some((c) => c.verb === 'list' || c.verb === 'search')) {
    properties.max_items = {
      type: 'integer',
      description: 'Maximum records to return (caps pagination).',
      default: 50,
    };
  }
  if (isChain) {
    properties.include_details = {
      type: 'boolean',
      description: 'Expand each result with its detail/sub-resource calls in one round-trip.',
      default: true,
    };
  }
  return { type: 'object', required: required.length ? required : undefined, properties };
}

function buildOutputSchema(ordered: EndpointCard[]): JsonSchema {
  const primary = ordered[0];
  const fieldNames = uniqueTopFields(ordered);
  const itemProps: Record<string, JsonSchema> = {};
  for (const f of fieldNames) {
    const leaf = f.split('.').pop()!.replace('[]', '');
    if (leaf && !itemProps[leaf]) itemProps[leaf] = { type: 'string' };
  }
  if (Object.keys(itemProps).length === 0) {
    itemProps.id = { type: 'string' };
    itemProps.summary = { type: 'string' };
  }
  const collection = primary && (primary.verb === 'list' || primary.verb === 'search');
  if (collection) {
    return {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object', properties: itemProps } },
        count: { type: 'integer' },
        truncated: { type: 'boolean', description: 'True if max_items capped the result.' },
      },
    };
  }
  return { type: 'object', properties: itemProps };
}

function uniqueTopFields(cards: EndpointCard[]): string[] {
  const out: string[] = [];
  for (const c of cards) {
    for (const f of c.outputs) {
      if (!out.includes(f)) out.push(f);
      if (out.length >= 12) return out;
    }
  }
  return out;
}

function paramSchema(p: EndpointParam): JsonSchema {
  const t = p.type === 'integer' || p.type === 'number' || p.type === 'boolean' ? p.type : 'string';
  return { type: t, description: p.description };
}

const ACTION_WORDS = new Set([
  'list', 'get', 'search', 'find', 'summarize', 'create', 'update', 'delete',
  'show', 'all', 'fetch', 'retrieve', 'index', 'query',
]);

function dominantEntities(cards: EndpointCard[]): string[] {
  const freq = new Map<string, number>();
  for (const c of cards) {
    for (const e of c.entities.slice(0, 3)) {
      if (ACTION_WORDS.has(e)) continue;
      freq.set(e, (freq.get(e) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([e]) => e)
    .slice(0, 4);
}

function toolName(cards: EndpointCard[], entities: string[], isChain: boolean): string {
  const verbs = new Set(cards.map((c) => c.verb));
  let action = 'get';
  if (verbs.has('aggregate')) action = 'summarize';
  else if (isChain) action = 'summarize';
  else if (verbs.has('search')) action = 'find';
  else if (verbs.has('list')) action = 'list';
  else if (verbs.has('create')) action = 'create';
  else if (verbs.has('update')) action = 'update';
  else if (verbs.has('delete')) action = 'delete';
  const ents = entities.slice(0, 2);
  return toSnakeCase([action, ...ents]) || 'get_data';
}

function toolDescription(
  cards: EndpointCard[],
  entities: string[],
  covered: QuestionPlan[],
  isChain: boolean,
): string {
  const ents = entities.join(', ') || 'records';
  const base = `Task-oriented tool for ${ents}. Wraps ${cards.length} API endpoint(s)`;
  const chain = isChain
    ? ', collapsing a list-then-detail (N+1) pattern into a single call'
    : '';
  const sample = covered[0]?.question.prompt;
  const ex = sample ? ` Example question it answers: "${truncate(sample, 90)}".` : '';
  return `${base}${chain} so a question is answered without multiple round-trips.${ex}`;
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = name;
  let n = 2;
  while (used.has(candidate)) candidate = `${name}_${n++}`;
  used.add(candidate);
  return candidate;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export { toPascalCase };
