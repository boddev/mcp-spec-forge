/**
 * Core domain types for MCP Spec Forge.
 */

/** A single question from the evaluation set. */
export interface EvalQuestion {
  id: string;
  prompt: string;
  expectedAnswer?: string;
  sourceLocation?: string;
  tags?: string[];
}

/** Derived analysis facets for a question. */
export interface QuestionFacets {
  id: string;
  prompt: string;
  intent: string;
  verb: VerbClass;
  entities: string[];
  keywords: string[];
  /** Heuristic: does answering likely require a list-then-detail (N+1) chain? */
  needsDetailExpansion: boolean;
}

export type VerbClass =
  | 'list'
  | 'get'
  | 'search'
  | 'aggregate'
  | 'create'
  | 'update'
  | 'delete'
  | 'unknown';

/** Normalized representation of one API operation. */
export interface EndpointCard {
  /** Stable id, e.g. "GET /repos/{owner}/{repo}/issues". */
  id: string;
  method: string;
  path: string;
  operationId?: string;
  summary: string;
  description?: string;
  /** Parameter names the operation accepts (query/path/body). */
  inputs: EndpointParam[];
  /** Dotted response field paths discovered from the schema. */
  outputs: string[];
  /** Entities this endpoint concerns, e.g. ["issue","repository"]. */
  entities: string[];
  verb: VerbClass;
  auth: string[];
  pagination?: string;
  tags: string[];
  source: 'openapi' | 'html';
  confidence: number;
}

export interface EndpointParam {
  name: string;
  in: 'path' | 'query' | 'header' | 'body' | 'cookie';
  required: boolean;
  type?: string;
  description?: string;
}

/** A planned call within a tool. */
export interface UnderlyingCall {
  id: string;
  endpoint: string;
  purpose: string;
  params?: Record<string, string>;
  foreach?: string;
  condition?: string;
  concurrency?: number;
  maxItems?: number;
}

/** A candidate MCP tool produced by grouping. */
export interface ToolCandidate {
  name: string;
  description: string;
  evalCoverage: string[];
  entities: string[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  underlyingCalls: UnderlyingCall[];
  pagination?: { strategy: string; maxPages: number };
  rateLimiting?: { strategy: string; retry: { onStatus: number[]; backoff: string } };
  errors?: { partialResults: boolean; userVisibleMessages: Record<string, string> };
  reviewFlags: string[];
}

export interface JsonSchema {
  type: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  description?: string;
  default?: unknown;
  format?: string;
}

export interface McpResource {
  name: string;
  description: string;
  uri?: string;
}

export interface McpPrompt {
  name: string;
  description: string;
}

/** The full design spec emitted by the forge. */
export interface McpDesign {
  server: {
    name: string;
    description: string;
    version: string;
    transport: string;
  };
  auth: {
    type: string;
    envVar?: string;
    scopes?: string[];
  };
  tools: ToolCandidate[];
  resources: McpResource[];
  prompts: McpPrompt[];
  meta: {
    generatedAt: string;
    generator: string;
    endpointCount: number;
    questionCount: number;
    mode: 'deterministic' | 'llm';
  };
}

/** Per-question coverage validation row. */
export interface CoverageRow {
  questionId: string;
  prompt: string;
  coveredByTool: string | null;
  confidence: number;
  notes: string;
}

export interface ValidationReport {
  coverage: CoverageRow[];
  uncovered: string[];
  orphanTools: string[];
  godTools: string[];
  unknownEndpointRefs: string[];
  coverageRate: number;
}
