/**
 * Shared NLP-ish text helpers (deterministic, dependency-free).
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'is', 'are', 'was',
  'were', 'be', 'been', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'how',
  'did', 'do', 'does', 'with', 'about', 'that', 'this', 'these', 'those', 'last', 'latest',
  'my', 'me', 'i', 'we', 'our', 'us', 'it', 'its', 'their', 'there', 'from', 'by', 'at',
  'as', 'has', 'have', 'had', 'will', 'would', 'should', 'can', 'could', 'any', 'all',
  'into', 'out', 'up', 'down', 'over', 'under', 'than', 'then', 'so', 'if', 'not',
]);

/** Lowercase, split camelCase/snake/kebab, strip punctuation, drop stopwords. */
export function tokenize(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-/{}.]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .map(singularize)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Crude singularizer so "issues"/"issue" match. */
export function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('ches')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

/** Jaccard similarity between two token sets. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Weighted overlap: fraction of query tokens present in the target. */
export function overlapScore(query: Set<string>, target: Set<string>): number {
  if (query.size === 0) return 0;
  let inter = 0;
  for (const t of query) if (target.has(t)) inter++;
  return inter / query.size;
}

export function toPascalCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

export function toSnakeCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join('_');
}
