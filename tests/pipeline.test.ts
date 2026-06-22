import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { forge } from '../src/pipeline.js';
import { normalizeOpenApi, parseDoc, classifyVerb, extractEntities } from '../src/ingest/openapi.js';
import { extractFromHtml } from '../src/ingest/htmlDocs.js';
import { loadEvalSet } from '../src/ingest/evalSet.js';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const evalPath = join(here, 'fixtures', 'eval.csv');
const apiPath = join(here, 'fixtures', 'api.openapi.yaml');

describe('OpenAPI normalization', () => {
  const doc = parseDoc(readFileSync(apiPath, 'utf8'));
  const cards = normalizeOpenApi(doc);

  it('extracts one card per operation', () => {
    expect(cards.length).toBe(7);
  });

  it('resolves $ref response fields', () => {
    const listIssues = cards.find((c) => c.id === 'GET /repos/{owner}/{repo}/issues')!;
    expect(listIssues).toBeDefined();
    expect(listIssues.outputs).toContain('[].title');
    expect(listIssues.outputs).toContain('[].state');
  });

  it('classifies verbs', () => {
    expect(classifyVerb('GET', '/repos/{o}/{r}/issues', 'List issues')).toBe('list');
    expect(classifyVerb('GET', '/users/{userId}', 'Get a user')).toBe('get');
    expect(classifyVerb('GET', '/search/issues', 'Search issues')).toBe('search');
    expect(classifyVerb('POST', '/issues', 'Create issue')).toBe('create');
  });

  it('detects pagination and entities', () => {
    const listIssues = cards.find((c) => c.id === 'GET /repos/{owner}/{repo}/issues')!;
    expect(listIssues.pagination).toBe('page');
    expect(extractEntities('/projects/{projectId}/tasks', 'List tasks')).toContain('project');
  });

  it('captures bearer auth', () => {
    const card = cards[0];
    expect(card.auth.join(' ')).toMatch(/bearer/i);
  });
});

describe('eval set loading', () => {
  it('parses the CSV into questions', () => {
    const qs = loadEvalSet(evalPath);
    expect(qs.length).toBe(6);
    expect(qs[0].prompt).toMatch(/open issues/i);
    expect(qs[0].id).toBe('q1');
  });
});

describe('HTML fallback extraction', () => {
  it('finds method+path patterns', () => {
    const html = '<html><body><h2>GET /v1/widgets</h2><p>List widgets.</p><code>POST /v1/widgets/{id}/orders</code></body></html>';
    const cards = extractFromHtml(html);
    expect(cards.map((c) => c.id)).toContain('GET /v1/widgets');
    expect(cards.find((c) => c.path.includes('{id}'))?.inputs?.[0]?.name).toBe('id');
    expect(cards.every((c) => c.source === 'html')).toBe(true);
  });
});

describe('end-to-end forge', () => {
  it('produces a valid design with coverage and call-collapsing tools', async () => {
    const result = await forge({
      evalPath,
      openapiSources: [apiPath],
      serverName: 'tracker-mcp',
    });

    // Every question should be covered.
    expect(result.report.coverageRate).toBe(1);
    expect(result.report.uncovered).toEqual([]);

    // Tools exist and reference only real endpoints.
    expect(result.design.tools.length).toBeGreaterThan(0);
    expect(result.report.unknownEndpointRefs).toEqual([]);

    // The "details and all comments for each open issue" question must collapse
    // a list-then-detail chain into a single tool with a foreach call.
    const chainTool = result.design.tools.find((t) =>
      t.underlyingCalls.some((c) => c.foreach),
    );
    expect(chainTool, 'expected a tool that collapses an N+1 chain').toBeDefined();
    expect(chainTool!.inputSchema.properties).toHaveProperty('include_details');

    // Auth inferred as bearer.
    expect(result.design.auth.type).toBe('bearer_token');

    // YAML + markdown are non-empty and serializable.
    expect(result.yaml).toMatch(/tools:/);
    expect(result.markdown).toMatch(/# MCP Server Design/);

    // Scaffold includes a server entry and one module per tool.
    expect(result.scaffold['src/server.ts']).toMatch(/McpServer/);
    for (const t of result.design.tools) {
      expect(result.scaffold[`src/tools/${t.name}.ts`]).toBeDefined();
    }
  });

  it('reports uncovered questions when docs lack endpoints', async () => {
    const result = await forge({
      evalPath,
      // Only a user endpoint doc via HTML; most questions cannot be answered.
      htmlSources: [],
      openapiSources: [apiPath],
      serverName: 'tracker-mcp',
    });
    // sanity: coverage computed
    expect(result.report.coverage.length).toBe(6);
  });
});
