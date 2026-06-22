import type { EndpointCard, QuestionFacets } from '../types.js';
import { jaccard, overlapScore, tokenize } from '../text.js';

export interface EndpointMatch {
  endpoint: EndpointCard;
  score: number;
}

export interface QuestionPlan {
  question: QuestionFacets;
  /** Ranked endpoints, best first. */
  matches: EndpointMatch[];
  /** Whether this looks like a list-then-detail chain. */
  isChain: boolean;
}

/** Precomputed token set per endpoint for scoring. */
interface ScoredEndpoint {
  card: EndpointCard;
  tokens: Set<string>;
  entitySet: Set<string>;
  fieldTokens: Set<string>;
}

function indexEndpoints(endpoints: EndpointCard[]): ScoredEndpoint[] {
  return endpoints.map((card) => {
    const text = `${card.summary} ${card.path} ${card.operationId ?? ''} ${card.tags.join(' ')}`;
    return {
      card,
      tokens: new Set(tokenize(text)),
      entitySet: new Set(card.entities),
      fieldTokens: new Set(card.outputs.flatMap((f) => tokenize(f))),
    };
  });
}

/**
 * Score every question against every endpoint and build a ranked call plan.
 * Scoring blends: lexical overlap (summary/path), entity overlap, and
 * response-field overlap (does the endpoint return what the question asks for?).
 */
export function planQuestions(
  questions: QuestionFacets[],
  endpoints: EndpointCard[],
  opts: { topK?: number; minScore?: number } = {},
): QuestionPlan[] {
  const topK = opts.topK ?? 4;
  const minScore = opts.minScore ?? 0.08;
  const indexed = indexEndpoints(endpoints);

  return questions.map((q) => {
    const qTokens = new Set(q.keywords);
    const qEntities = new Set(q.entities);

    const scored: EndpointMatch[] = indexed
      .map(({ card, tokens, entitySet, fieldTokens }) => {
        const lexical = overlapScore(qTokens, tokens);
        const entity = jaccard(qEntities, entitySet);
        const fields = overlapScore(qEntities, fieldTokens) * 0.6;
        const verbBonus = card.verb === q.verb ? 0.1 : 0;
        const confidence = card.confidence;
        const score = (lexical * 0.5 + entity * 0.3 + fields * 0.2 + verbBonus) * confidence;
        return { endpoint: card, score };
      })
      .filter((m) => m.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const isChain =
      q.needsDetailExpansion &&
      scored.some((m) => m.endpoint.verb === 'list' || m.endpoint.verb === 'search') &&
      scored.some((m) => m.endpoint.verb === 'get');

    return { question: q, matches: scored, isChain };
  });
}
