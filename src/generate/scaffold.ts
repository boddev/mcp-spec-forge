import type { McpDesign, ToolCandidate, UnderlyingCall } from '../types.js';

/** Which transport entrypoints to emit. */
export type ServerTransport = 'stdio' | 'http' | 'both';

/** A declarative orchestration step, embedded into each generated tool module. */
interface GenStep {
  id: string;
  method: string;
  path: string;
  pathParams: string[];
  foreach?: { sourceId: string; hint: string };
  condition?: { arg: string; equals: boolean };
  concurrency?: number;
  maxItems?: number;
  purpose?: string;
}

/**
 * Emit a runnable TypeScript MCP server from the design.
 *
 * The tool registration is shared (`src/buildServer.ts`); two thin entrypoints
 * attach the transport: `src/local.ts` (stdio) and `src/http.ts` (Streamable
 * HTTP). Tool handlers execute the documented underlying API calls generically,
 * collapsing list-then-detail (N+1) chains into a single response.
 *
 * Returns a map of relative file path -> file contents.
 */
export function scaffoldServer(design: McpDesign, transport: ServerTransport = 'both'): Record<string, string> {
  const files: Record<string, string> = {};
  const wantStdio = transport === 'stdio' || transport === 'both';
  const wantHttp = transport === 'http' || transport === 'both';

  files['package.json'] = packageJson(design, wantStdio, wantHttp);
  files['tsconfig.json'] = TSCONFIG;
  files['.env.example'] = envExample(design);
  files['README.md'] = readme(design, wantStdio, wantHttp);

  files['src/buildServer.ts'] = buildServerModule(design);
  files['src/api/client.ts'] = apiClient(design);
  files['src/api/orchestrate.ts'] = ORCHESTRATE;

  if (wantStdio) files['src/local.ts'] = localEntry(design);
  if (wantHttp) files['src/http.ts'] = httpEntry(design);

  for (const tool of design.tools) {
    files[`src/tools/${tool.name}.ts`] = toolModule(tool);
  }
  files['src/tools/index.ts'] =
    design.tools.map((t) => `import { ${t.name} } from './${t.name}.js';`).join('\n') +
    `\n\nexport const tools = [\n${design.tools.map((t) => `  ${t.name},`).join('\n')}\n];\n`;

  return files;
}

function packageJson(design: McpDesign, wantStdio: boolean, wantHttp: boolean): string {
  const scripts: Record<string, string> = {};
  if (wantStdio) scripts['start:stdio'] = 'tsx src/local.ts';
  if (wantHttp) scripts['start:http'] = 'tsx src/http.ts';
  scripts.start = wantStdio ? 'tsx src/local.ts' : 'tsx src/http.ts';
  scripts.build = 'tsc';

  const dependencies: Record<string, string> = { '@modelcontextprotocol/sdk': '^1.0.0' };
  if (wantHttp) dependencies.express = '^4.21.2';

  const devDependencies: Record<string, string> = {
    tsx: '^4.19.1',
    typescript: '^5.6.2',
    '@types/node': '^22.7.4',
  };
  if (wantHttp) devDependencies['@types/express'] = '^4.17.21';

  return JSON.stringify(
    {
      name: design.server.name,
      version: design.server.version,
      private: true,
      type: 'module',
      bin: { [design.server.name]: 'src/local.ts' },
      scripts,
      dependencies,
      devDependencies,
    },
    null,
    2,
  );
}

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: 'dist',
      rootDir: 'src',
    },
    include: ['src'],
  },
  null,
  2,
);

function envExample(design: McpDesign): string {
  const lines = [
    '# Base URL of the target API (overrides the spec default).',
    `API_BASE_URL=${design.server.baseUrl ?? 'https://api.example.com'}`,
    '',
  ];
  if (design.auth.type !== 'none' && design.auth.envVar) {
    lines.push(`# Credential the API requires (auth type: ${design.auth.type}).`, `${design.auth.envVar}=`, '');
  }
  lines.push('# Port for the remote (Streamable HTTP) server.', 'PORT=3000', '');
  return lines.join('\n');
}

function buildServerModule(design: McpDesign): string {
  return `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools/index.js';

/** Build a fresh MCP server with all tools registered. Transport-agnostic. */
export function buildServer(): Server {
  const server = new Server(
    { name: ${JSON.stringify(design.server.name)}, version: ${JSON.stringify(design.server.version)} },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) throw new Error(\`Unknown tool: \${req.params.name}\`);
    try {
      const data = await tool.handler((req.params.arguments ?? {}) as Record<string, unknown>);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: \`Error in \${tool.name}: \${(err as Error).message}\` }],
        isError: true,
      };
    }
  });

  return server;
}
`;
}

function localEntry(design: McpDesign): string {
  return `import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './buildServer.js';

// Local transport: the MCP client spawns this process and talks over stdio.
const server = buildServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(${JSON.stringify(design.server.name)} + ' MCP server running on stdio');
`;
}

function httpEntry(design: McpDesign): string {
  return `import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from './buildServer.js';

// Remote transport: Streamable HTTP, stateless (a fresh server per request).
// For production, add auth (OAuth 2.1 / bearer), TLS, CORS and Origin validation.
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
});

// Stateless server: SSE stream / session termination are not supported.
const methodNotAllowed = (_req: express.Request, res: express.Response) =>
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.error(${JSON.stringify(design.server.name)} + ' MCP server (Streamable HTTP) on http://localhost:' + PORT + '/mcp'));
`;
}

function apiClient(design: McpDesign): string {
  const base = design.server.baseUrl ?? 'https://api.example.com';
  const env = design.auth.envVar ?? 'API_TOKEN';
  const authHeader =
    design.auth.type === 'none'
      ? ''
      : design.auth.type === 'api_key'
        ? `  if (TOKEN) headers['x-api-key'] = TOKEN;\n`
        : `  if (TOKEN) headers['authorization'] = \`Bearer \${TOKEN}\`;\n`;

  return `const BASE_URL = process.env.API_BASE_URL ?? ${JSON.stringify(base)};
const TOKEN = process.env[${JSON.stringify(env)}];

export interface CallOpts {
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Single HTTP call against the documented API. Paths are appended to BASE_URL. */
export async function apiCall(method: string, path: string, opts: CallOpts = {}): Promise<unknown> {
  const url = new URL(BASE_URL.replace(/\\/+$/, '') + (path.startsWith('/') ? path : '/' + path));
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
${authHeader}  const res = await fetch(url, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(\`API \${method} \${path} failed: \${res.status} \${res.statusText}\`);
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('json') ? res.json() : res.text();
}
`;
}

const ORCHESTRATE = `import { apiCall } from './client.js';

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
  return String(url).replace(/\\/+$/, '').split('/').pop() ?? '';
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
`;

function toStep(call: UnderlyingCall): GenStep {
  const sp = call.endpoint.indexOf(' ');
  const method = sp > 0 ? call.endpoint.slice(0, sp) : 'GET';
  const path = sp > 0 ? call.endpoint.slice(sp + 1) : call.endpoint;
  const pathParams = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  const step: GenStep = { id: call.id, method, path, pathParams };
  if (call.purpose) step.purpose = call.purpose;
  if (call.foreach) {
    const dot = call.foreach.lastIndexOf('.');
    step.foreach =
      dot > -1
        ? { sourceId: call.foreach.slice(0, dot), hint: call.foreach.slice(dot + 1) }
        : { sourceId: call.foreach, hint: 'items' };
  }
  if (call.condition) {
    const m = call.condition.match(/(\w+)\s*==\s*(true|false)/);
    if (m) step.condition = { arg: m[1], equals: m[2] === 'true' };
  }
  if (call.concurrency) step.concurrency = call.concurrency;
  if (call.maxItems) step.maxItems = call.maxItems;
  return step;
}

function toolModule(tool: ToolCandidate): string {
  const steps = tool.underlyingCalls.map(toStep);
  return `import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
${tool.underlyingCalls.map((c) => `//  - ${c.endpoint} :: ${c.purpose}${c.foreach ? ` (foreach ${c.foreach})` : ''}`).join('\n')}
const plan: PlanStep[] = ${JSON.stringify(steps, null, 2)};

export const ${tool.name} = {
  name: ${JSON.stringify(tool.name)},
  description: ${JSON.stringify(tool.description)},
  inputSchema: ${JSON.stringify(tool.inputSchema, null, 2)} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
`;
}

function readme(design: McpDesign, wantStdio: boolean, wantHttp: boolean): string {
  const lines: string[] = [];
  lines.push(`# ${design.server.name}`, '', design.server.description, '');
  lines.push(
    'Runnable MCP server generated by **mcp-spec-forge**. Tool handlers execute the',
    'documented underlying API calls and collapse list-then-detail (N+1) chains into a',
    'single response. The orchestration is generic and best-effort — review each tool in',
    '`src/tools/` and tune param binding / pagination for your API.',
    '',
    '## Configure',
    '',
    '```bash',
    'npm install',
    'cp .env.example .env   # set API_BASE_URL' +
      (design.auth.type !== 'none' && design.auth.envVar ? ` and ${design.auth.envVar}` : ''),
    '```',
    '',
    `- **API base URL:** \`${design.server.baseUrl ?? '(set API_BASE_URL)'}\``,
    `- **Auth:** \`${design.auth.type}\`${design.auth.envVar ? ` via env \`${design.auth.envVar}\`` : ''}`,
    '',
    '## Run',
    '',
  );
  if (wantStdio) {
    lines.push(
      '### Local (stdio)',
      '',
      'For desktop clients (Copilot CLI, Claude Desktop) that spawn the server as a subprocess:',
      '',
      '```bash',
      'npm run start:stdio',
      '```',
      '',
      'Example client config entry:',
      '',
      '```json',
      JSON.stringify(
        { mcpServers: { [design.server.name]: { command: 'npx', args: ['tsx', 'src/local.ts'] } } },
        null,
        2,
      ),
      '```',
      '',
    );
  }
  if (wantHttp) {
    lines.push(
      '### Remote (Streamable HTTP)',
      '',
      'For a hosted/shared server reachable at a URL:',
      '',
      '```bash',
      'npm run start:http   # listens on http://localhost:$PORT/mcp (default 3000)',
      '```',
      '',
      'The endpoint is stateless. Before exposing it publicly, add **auth (OAuth 2.1 / bearer)**,',
      'TLS, CORS, and Origin validation (DNS-rebinding protection).',
      '',
    );
  }
  lines.push(
    '## How local vs remote differ',
    '',
    'The tools are identical — only the transport changes. `src/buildServer.ts` registers the',
    'tools; `src/local.ts` attaches stdio and `src/http.ts` attaches Streamable HTTP.',
    '',
  );
  return lines.join('\n');
}
