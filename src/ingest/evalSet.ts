import { readFileSync } from 'node:fs';
import { parse as parseCsv } from 'csv-parse/sync';
import type { EvalQuestion } from '../types.js';

/**
 * Load an evaluation set from CSV, JSON, or JSONL.
 *
 * CSV: expects a header row. Recognized prompt columns:
 *   prompt | question | query | input
 * Recognized answer columns: expected_answer | answer | expected
 * Recognized source columns:  source_location | source | datasource
 *
 * JSON: an array of objects, or { questions: [...] } / { evalSet: [...] }.
 * JSONL: one JSON object per line.
 */
export function loadEvalSet(filePath: string): EvalQuestion[] {
  const raw = readFileSync(filePath, 'utf8');
  const lower = filePath.toLowerCase();
  let rows: Record<string, unknown>[];

  if (lower.endsWith('.jsonl')) {
    rows = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
  } else if (lower.endsWith('.json')) {
    const parsed = JSON.parse(raw);
    rows = Array.isArray(parsed)
      ? parsed
      : (parsed.questions ?? parsed.evalSet ?? parsed.items ?? []);
  } else {
    rows = parseCsv(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as Record<string, unknown>[];
  }

  const questions: EvalQuestion[] = [];
  rows.forEach((row, i) => {
    const prompt = pick(row, ['prompt', 'question', 'query', 'input', 'text']);
    if (!prompt) return;
    questions.push({
      id: String(pick(row, ['id']) ?? `q${i + 1}`),
      prompt: String(prompt),
      expectedAnswer: optStr(pick(row, ['expected_answer', 'answer', 'expected', 'expectedAnswer'])),
      sourceLocation: optStr(pick(row, ['source_location', 'source', 'datasource', 'sourceLocation'])),
      tags: parseTags(pick(row, ['tags', 'category', 'label'])),
    });
  });

  if (questions.length === 0) {
    throw new Error(`No questions found in eval set: ${filePath}`);
  }
  return questions;
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    for (const actual of Object.keys(row)) {
      if (actual.toLowerCase() === k.toLowerCase() && row[actual] !== '' && row[actual] != null) {
        return row[actual];
      }
    }
  }
  return undefined;
}

function optStr(v: unknown): string | undefined {
  return v == null || v === '' ? undefined : String(v);
}

function parseTags(v: unknown): string[] | undefined {
  if (v == null || v === '') return undefined;
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}
