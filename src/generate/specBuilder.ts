import type {
  EndpointCard,
  McpDesign,
  McpPrompt,
  McpResource,
  QuestionFacets,
  ToolCandidate,
} from '../types.js';

export interface BuildSpecArgs {
  serverName: string;
  description?: string;
  tools: ToolCandidate[];
  endpoints: EndpointCard[];
  questions: QuestionFacets[];
  mode: 'deterministic' | 'llm';
}

export function buildDesign(args: BuildSpecArgs): McpDesign {
  const auth = inferAuth(args.endpoints);
  const resources = buildResources(args);
  const prompts = buildPrompts(args);

  return {
    server: {
      name: args.serverName,
      description:
        args.description ??
        `MCP server designed from an eval set of ${args.questions.length} questions over ${args.endpoints.length} documented API endpoint(s).`,
      version: '0.1.0',
      transport: 'stdio',
    },
    auth,
    tools: args.tools,
    resources,
    prompts,
    meta: {
      generatedAt: new Date().toISOString(),
      generator: 'mcp-spec-forge',
      endpointCount: args.endpoints.length,
      questionCount: args.questions.length,
      mode: args.mode,
    },
  };
}

function inferAuth(endpoints: EndpointCard[]): McpDesign['auth'] {
  const schemes = new Set<string>();
  for (const e of endpoints) for (const a of e.auth) schemes.add(a);
  const joined = [...schemes].join(' ').toLowerCase();
  if (joined.includes('oauth')) {
    return { type: 'oauth2', envVar: 'API_ACCESS_TOKEN', scopes: ['read'] };
  }
  if (joined.includes('http:bearer') || joined.includes('bearer')) {
    return { type: 'bearer_token', envVar: 'API_TOKEN' };
  }
  if (joined.includes('apikey') || joined.includes('api_key') || joined.includes('apiKey')) {
    return { type: 'api_key', envVar: 'API_KEY' };
  }
  if (schemes.size === 0) {
    return { type: 'none' };
  }
  return { type: 'custom', envVar: 'API_CREDENTIALS' };
}

function buildResources(args: BuildSpecArgs): McpResource[] {
  return [
    {
      name: 'api_capability_index',
      description: `Normalized index of the ${args.endpoints.length} documented API endpoints (method, path, params, response fields) the tools are built from.`,
      uri: 'forge://capabilities',
    },
    {
      name: 'eval_coverage_matrix',
      description: 'Maps each evaluation question to the tool that answers it, with confidence and gaps.',
      uri: 'forge://coverage',
    },
  ];
}

function buildPrompts(args: BuildSpecArgs): McpPrompt[] {
  return [
    {
      name: 'answer_with_api_context',
      description:
        'System/template prompt instructing the model to select the single best task-oriented tool, pass minimal inputs, and avoid issuing redundant multi-call sequences.',
    },
    {
      name: 'route_question_to_tool',
      description:
        'Few-shot template mapping representative eval questions to the tool that should handle them.',
    },
  ];
}
