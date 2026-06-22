import type { EvalQuestion, QuestionFacets, VerbClass } from '../types.js';
import { tokenize } from '../text.js';

/** Words that signal a list-then-detail (N+1) information need. */
const DETAIL_SIGNALS = [
  'each', 'every', 'all', 'per', 'detail', 'details', 'breakdown', 'comments',
  'history', 'across', 'list of', 'for all',
];

const VERB_HINTS: Array<[VerbClass, RegExp]> = [
  ['search', /\b(find|search|look up|locate|which|where)\b/i],
  ['aggregate', /\b(how many|count|total|sum|average|summar|aggregate|trend|compare)\b/i],
  ['list', /\b(list|all|show me|what are|enumerate)\b/i],
  ['get', /\b(what is|who is|status of|details of|get|show)\b/i],
  ['create', /\b(create|add|submit|open a|file a)\b/i],
  ['update', /\b(update|change|edit|modify|set)\b/i],
  ['delete', /\b(delete|remove|cancel|close)\b/i],
];

export function analyzeQuestions(questions: EvalQuestion[]): QuestionFacets[] {
  return questions.map(analyzeOne);
}

export function analyzeOne(q: EvalQuestion): QuestionFacets {
  const keywords = stripLeadingCommand(tokenize(q.prompt));
  const verb = classifyQuestionVerb(q.prompt);
  const entities = extractQuestionEntities(keywords);
  const needsDetailExpansion = DETAIL_SIGNALS.some((s) =>
    q.prompt.toLowerCase().includes(s),
  );
  return {
    id: q.id,
    prompt: q.prompt,
    intent: summarizeIntent(verb, entities, q.prompt),
    verb,
    entities,
    keywords,
    needsDetailExpansion,
  };
}

// Imperative command verbs that open a prompt ("List the…", "Show all…") describe
// the action, not the subject — drop them so they can't lexically match a resource
// that happens to share the name (e.g. FHIR's `List` resource).
const COMMAND_VERBS = new Set([
  'list', 'show', 'get', 'find', 'search', 'retrieve', 'fetch', 'give', 'display',
  'return', 'tell', 'name', 'provide', 'summarize', 'count', 'lookup',
]);

function stripLeadingCommand(keywords: string[]): string[] {
  return keywords.length && COMMAND_VERBS.has(keywords[0]) ? keywords.slice(1) : keywords;
}

function classifyQuestionVerb(prompt: string): VerbClass {
  for (const [verb, re] of VERB_HINTS) {
    if (re.test(prompt)) return verb;
  }
  return 'unknown';
}

/** Heuristic: salient keywords double as entity candidates. */
function extractQuestionEntities(keywords: string[]): string[] {
  // Keep the most informative tokens; cap to keep grouping tight.
  const ranked = [...new Set(keywords)].sort((a, b) => b.length - a.length);
  return ranked.slice(0, 6);
}

function summarizeIntent(verb: VerbClass, entities: string[], prompt: string): string {
  const subject = entities.slice(0, 3).join(', ') || 'information';
  const v = verb === 'unknown' ? 'retrieve' : verb;
  return `${v} ${subject}`.trim();
}
