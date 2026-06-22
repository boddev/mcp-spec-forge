# MCP Spec Forge — Plan & Design

> Ingest an **evaluation set** (questions a generative-AI assistant is expected to answer)
> plus **documented public APIs**, and emit a **design specification for an MCP server**
> whose tools are grouped by task so that answering a question avoids many API round-trips.

This document is the researched plan. It was developed by grounding in the official
Model Context Protocol specification and **cross-referenced with GPT-5.5 (high reasoning)**.

---

## 1. Decision: skill vs. app → **Hybrid**

Build a **deterministic TypeScript CLI** wrapped by a **Copilot skill**.

| Concern | Pure skill | Pure app | Hybrid (chosen) |
|---|---|---|---|
| Reproducible parsing/validation | ✗ nondeterministic | ✓ | ✓ (CLI) |
| Intent reasoning / tool design | ✓ | ✗ rigid | ✓ (skill/LLM) |
| Re-runnable across many inputs | partial | ✓ | ✓ |
| Good UX inside Copilot | ✓ | ✗ | ✓ (skill) |

- **CLI** owns: ingestion, normalization, similarity matching, co-usage graph,
  spec generation, coverage validation, optional server scaffold. Runs fully offline.
- **Skill** owns: orchestrating the CLI and (optionally) applying LLM reasoning to the
  high-value step — mapping eval questions to multi-endpoint task tools — then reviewing.

The CLI ships a **deterministic baseline** (lexical similarity + graph clustering) so it
works with no API key; an **LLM mode** is pluggable for higher-quality grouping.

---

## 2. Pipeline

```
INGEST            NORMALIZE           ANALYZE              GROUP               EMIT            VALIDATE
eval set    ->    EndpointCard[]  ->  QuestionFacets[] ->  ToolCandidate[] ->  mcp-design  ->  coverage
API docs          (entities,          (intent,             (co-usage graph     .yaml + .md     matrix +
(OpenAPI/HTML)     verbs, fields,      entities,            clustering, N+1     (+ scaffold)    ref checks
                   deps, auth)         keywords)            collapse)
```

### Stage details
1. **Ingest eval set** — CSV / JSON / JSONL. Columns like `prompt,expected_answer,source_location`.
2. **Ingest API docs** — OpenAPI (JSON/YAML, file or URL) is primary; HTML docs are a
   best-effort fallback producing low-confidence `EndpointCard`s.
3. **Normalize** every operation into an `EndpointCard` (method, path, params, response
   fields, auth, pagination, verb class, entities). Dereference local `$ref`s.
4. **Analyze eval** — per question infer intent, entities, filters, answer shape, keywords.
5. **Match** — score each question against each endpoint (token/entity/field overlap;
   pluggable embeddings/LLM). Produce a per-question candidate **call plan**.
6. **Group** — build an endpoint co-usage graph (edge weight = # questions needing both),
   cluster frequently co-needed endpoints into **task-oriented tools**, and collapse
   detected **N+1 chains** (list → per-item detail) into one tool with fan-out config.
7. **Emit** — canonical `mcp-design.yaml`, human `mcp-design.md`, optional TS scaffold.
8. **Validate** — every endpoint referenced exists; coverage matrix maps each question to
   a covering tool; flag god-tools and orphan tools.

---

## 3. Grouping algorithm (the core intelligence)

Hybrid, not embeddings-alone:

1. **Candidate retrieval** — lexical/semantic similarity gives top-k endpoints per question.
2. **Per-question planning** — order endpoints into a call chain; detect field
   dependencies (endpoint A returns `id` that endpoint B requires) and pagination needs.
3. **Co-usage graph** — nodes = endpoints, edges weighted by co-occurrence across questions.
4. **Clustering** — connected, strongly-weighted components become tool candidates.
5. **N+1 collapse** — list-then-detail patterns become a single tool with
   `fan_out_with_limit` (max_items, concurrency, partial_results).
6. **Guardrails** —
   - Avoid **over-consolidation**: no `query_api` / `get_everything`; 3–7 inputs; stable
     output schema; a coarse tool must justify itself with ≥1 high-value or ≥2 questions.
   - Avoid **under-consolidation**: merge endpoints that are always co-used or
     dependency-chained, or when questions need synthesized answers.

---

## 4. Output spec format

Canonical **YAML** (`mcp-design.yaml`) + explanatory **Markdown** (`mcp-design.md`).
Each tool documents which underlying API calls it wraps, in what order, with fan-out,
pagination, rate-limiting, error/partial-result behavior, and the eval questions it covers.

```yaml
server: { name, description, version, transport }
auth:   { type, env_var, scopes }
tools:
  - name: find_stale_issues
    description: ...
    eval_coverage: [q12, q17]
    input_schema:  { ... JSON Schema ... }
    output_schema: { ... JSON Schema ... }
    underlying_calls:
      - { id, endpoint, purpose, params, foreach?, condition?, concurrency?, max_items? }
    pagination:    { strategy, max_pages }
    rate_limiting: { strategy, retry: { on_status, backoff } }
    errors:        { partial_results, user_visible_messages }
resources: [ { name, description } ]
prompts:   [ { name, description } ]
```

---

## 5. Validation

- **Schema** — design validates against an internal JSON Schema (zod).
- **Reference** — every `endpoint` in a tool exists in the normalized index.
- **Coverage** — matrix `question -> covering tool (confidence)`; warn on uncovered
  questions, undocumented data needs, orphan tools, and god-tools.

---

## 6. Tech stack

TypeScript / Node 20+. `commander` (CLI), `csv-parse`, `js-yaml`, `zod`, `cheerio`
(HTML), `vitest` (tests), `tsx` (run). OpenAPI handled by a focused in-repo normalizer
with local `$ref` resolution (keeps deps light). LLM mode is an optional pluggable
provider; the default path is fully deterministic and offline.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Naive 1-endpoint-1-tool | Eval-driven grouping + co-usage graph; tools cite covered questions |
| God-tools | Input cap, stable output schema, justification rule, review flags |
| Hallucinated endpoints | Tools may only reference normalized endpoint IDs; validated |
| Ambiguous HTML docs | Confidence scores; prefer OpenAPI; "needs review" warnings |
| Slow N+1 tools | Specify pagination/limits/concurrency/partial results |
| Narrow eval set | Mark output as eval-aligned; separate "covered" vs "recommended future" |
| Underspecified auth | Require auth section; map tools to scopes |

---

## 8. Repository layout

```
mcp-spec-forge/
  PLAN.md  README.md
  package.json  tsconfig.json
  src/
    cli.ts  types.ts
    ingest/   evalSet.ts  openapi.ts  htmlDocs.ts
    analyze/  questionAnalyzer.ts  matcher.ts  grouping.ts
    generate/ specBuilder.ts  emitYaml.ts  emitMarkdown.ts  scaffold.ts
    validate/ coverage.ts
    llm/      provider.ts
  tests/    fixtures/  pipeline.test.ts
  skill/    SKILL.md
  examples/
```
