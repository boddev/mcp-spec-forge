import type {
  CoverageRow,
  EndpointCard,
  McpDesign,
  ToolCandidate,
  ValidationReport,
} from '../types.js';
import type { QuestionPlan } from '../analyze/matcher.js';

/**
 * Validate the design: endpoint references, coverage of every eval question,
 * and structural flags (orphan / god tools).
 */
export function validateDesign(
  design: McpDesign,
  plans: QuestionPlan[],
  endpoints: EndpointCard[],
): ValidationReport {
  const endpointIds = new Set(endpoints.map((e) => e.id));
  const unknownEndpointRefs: string[] = [];
  for (const tool of design.tools) {
    for (const call of tool.underlyingCalls) {
      if (!endpointIds.has(call.endpoint)) {
        unknownEndpointRefs.push(`${tool.name} -> ${call.endpoint}`);
      }
    }
  }

  // Build coverage: which tool covers each question (by primary endpoint membership).
  const toolByEndpoint = new Map<string, ToolCandidate>();
  for (const tool of design.tools) {
    for (const call of tool.underlyingCalls) {
      if (!toolByEndpoint.has(call.endpoint)) toolByEndpoint.set(call.endpoint, tool);
    }
  }

  const coverage: CoverageRow[] = plans.map((plan) => {
    const primary = plan.matches[0];
    if (!primary) {
      return {
        questionId: plan.question.id,
        prompt: plan.question.prompt,
        coveredByTool: null,
        confidence: 0,
        notes: 'no matching endpoint found in API docs',
      };
    }
    const tool =
      toolByEndpoint.get(primary.endpoint.id) ??
      design.tools.find((t) => t.evalCoverage.includes(plan.question.id));
    const notes: string[] = [];
    if (plan.isChain) notes.push('list-then-detail collapsed');
    if (primary.endpoint.source === 'html') notes.push('endpoint from HTML docs');
    return {
      questionId: plan.question.id,
      prompt: plan.question.prompt,
      coveredByTool: tool?.name ?? null,
      confidence: Number(primary.score.toFixed(2)),
      notes: notes.join('; '),
    };
  });

  const uncovered = coverage.filter((c) => !c.coveredByTool).map((c) => c.questionId);
  const orphanTools = design.tools.filter((t) => t.evalCoverage.length === 0).map((t) => t.name);
  const godTools = design.tools
    .filter((t) => t.reviewFlags.some((f) => f.startsWith('broad-scope') || f.startsWith('many-endpoints')))
    .map((t) => t.name);

  return {
    coverage,
    uncovered,
    orphanTools,
    godTools,
    unknownEndpointRefs,
    coverageRate: coverage.length ? (coverage.length - uncovered.length) / coverage.length : 0,
  };
}
