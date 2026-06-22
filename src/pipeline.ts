import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EndpointCard, EvalQuestion, McpDesign, ValidationReport } from './types.js';
import { loadEvalSet } from './ingest/evalSet.js';
import { loadOpenApi } from './ingest/openapi.js';
import { loadHtmlDocs } from './ingest/htmlDocs.js';
import { analyzeQuestions } from './analyze/questionAnalyzer.js';
import { planQuestions } from './analyze/matcher.js';
import { groupIntoTools } from './analyze/grouping.js';
import { buildDesign } from './generate/specBuilder.js';
import { emitYaml } from './generate/emitYaml.js';
import { emitMarkdown } from './generate/emitMarkdown.js';
import { scaffoldServer } from './generate/scaffold.js';
import { validateDesign } from './validate/coverage.js';

export interface ForgeInput {
  evalPath: string;
  openapiSources?: string[];
  htmlSources?: string[];
  serverName: string;
  description?: string;
  mode?: 'deterministic' | 'llm';
}

export interface ForgeResult {
  design: McpDesign;
  report: ValidationReport;
  endpoints: EndpointCard[];
  questions: EvalQuestion[];
  yaml: string;
  markdown: string;
  scaffold: Record<string, string>;
}

/** Run the full ingest -> group -> generate -> validate pipeline in memory. */
export async function forge(input: ForgeInput): Promise<ForgeResult> {
  const questions = loadEvalSet(input.evalPath);

  const endpoints: EndpointCard[] = [];
  for (const src of input.openapiSources ?? []) {
    endpoints.push(...(await loadOpenApi(src)));
  }
  for (const src of input.htmlSources ?? []) {
    endpoints.push(...(await loadHtmlDocs(src)));
  }
  if (endpoints.length === 0) {
    throw new Error('No endpoints ingested. Provide at least one --openapi or --html source.');
  }

  const facets = analyzeQuestions(questions);
  const plans = planQuestions(facets, endpoints);
  const tools = groupIntoTools(plans, endpoints);

  const design = buildDesign({
    serverName: input.serverName,
    description: input.description,
    tools,
    endpoints,
    questions: facets,
    mode: input.mode ?? 'deterministic',
  });

  const report = validateDesign(design, plans, endpoints);
  const yaml = emitYaml(design);
  const markdown = emitMarkdown(design, report);
  const scaffold = scaffoldServer(design);

  return { design, report, endpoints, questions, yaml, markdown, scaffold };
}

/** Write a ForgeResult to an output directory. */
export function writeResult(result: ForgeResult, outDir: string, withScaffold: boolean): string[] {
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  const write = (rel: string, content: string) => {
    const full = join(outDir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
    written.push(full);
  };

  write('mcp-design.yaml', result.yaml);
  write('mcp-design.md', result.markdown);
  write('mcp-design.json', JSON.stringify(result.design, null, 2));
  if (withScaffold) {
    for (const [rel, content] of Object.entries(result.scaffold)) {
      write(join('server-scaffold', rel), content);
    }
  }
  return written;
}
