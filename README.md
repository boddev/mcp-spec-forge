# MCP Spec Forge

Ingest an **evaluation set** (questions a generative-AI assistant is expected to answer) and
**documented public APIs**, and forge a **design specification for an MCP server** whose tools
are grouped by task so that answering a question avoids many API round-trips.

> **This is a self-contained Copilot skill.** `SKILL.md` is the skill entry point and the
> deterministic engine ships *with it* as a single dependency-free executable, `bin/forge.cjs`.
> Drop this folder into your skills directory and it works — nothing to download. The skill runs
> the bundled engine, then layers LLM reasoning for the hard grouping. See [`PLAN.md`](./PLAN.md)
> for the full, GPT-5.5-cross-referenced design.

## What it produces

For each run you get:

- `mcp-design.yaml` — canonical, machine-readable spec (server, auth, **tools**, resources,
  prompts). Each tool documents the underlying API calls it wraps, in order, with fan-out,
  pagination, rate-limiting, and partial-result behavior, plus the eval questions it covers.
- `mcp-design.md` — human rationale + an **eval coverage matrix** + review checklist.
- `mcp-design.json` — the same design as JSON (for programmatic refinement).
- `server-scaffold/` — optional runnable TypeScript MCP server skeleton (`--scaffold`).

## Install as a skill

Copy this folder to your Copilot skills directory (no build needed — `bin/forge.cjs` is
prebuilt and committed):

```pwsh
Copy-Item -Recurse C:\Users\bodonnell\src\mcp-spec-forge $HOME\.copilot\skills\mcp-spec-forge
```

The skill folder only needs `SKILL.md` + `bin/forge.cjs` at runtime; the rest is source/dev.

## Run the bundled engine directly

```pwsh
# Only Node.js required — no npm install:
node bin/forge.cjs generate -e <eval.csv> -o <api.openapi.yaml> --name my-mcp -O out --scaffold

# Example (bundled fixtures):
node bin/forge.cjs generate -e tests/fixtures/eval.csv -o tests/fixtures/api.openapi.yaml `
  --name tracker-mcp -O examples/tracker --scaffold
```

Options:

| Flag | Meaning |
|---|---|
| `-e, --eval <path>` | Eval set: `.csv`, `.json`, or `.jsonl` (auto-detects prompt/answer/source columns) |
| `-o, --openapi <src...>` | One or more OpenAPI docs (file path or URL) |
| `-d, --html <src...>` | One or more HTML API doc pages (best-effort, low-confidence) |
| `-n, --name <name>` | MCP server name |
| `--description <text>` | Server description |
| `-O, --out <dir>` | Output directory (default `./out`) |
| `--scaffold` | Also emit a runnable TypeScript MCP server scaffold |
| `--llm` | Marks output `mode: llm` (refinement is performed by the skill) |

## How it works

```
INGEST            NORMALIZE           ANALYZE            GROUP              EMIT            VALIDATE
eval set     ->   EndpointCard[]  ->  facets +       ->  co-usage graph ->  mcp-design  ->  coverage
API docs          (entities,          per-question       clustering +       .yaml/.md/      matrix +
(OpenAPI/HTML)     verbs, fields,      call plans         N+1 collapse       .json + code    ref checks
                   deps, auth)
```

The grouping algorithm merges endpoints that are **co-needed within one question** (to avoid
N+1) and endpoints that **share an entity and co-occur across questions**, then names each
cluster as a task-oriented tool. Guardrails flag over-broad ("god") tools and orphan tools.

## Project layout

```
SKILL.md              # skill entry point (Copilot loads this)
bin/forge.cjs         # bundled, dependency-free engine the skill runs
src/                  # engine source (bundled into bin/forge.cjs)
  cli.ts  pipeline.ts  types.ts  text.ts
  ingest/   evalSet.ts  openapi.ts  htmlDocs.ts
  analyze/  questionAnalyzer.ts  matcher.ts  grouping.ts
  generate/ specBuilder.ts  emitYaml.ts  emitMarkdown.ts  scaffold.ts
  validate/ coverage.ts
  llm/      provider.ts
tests/      pipeline.test.ts  fixtures/
examples/   tracker/   (sample generated output)
```

## Develop

```pwsh
npm install            # dev deps (engine itself needs none at runtime)
npm test               # vitest suite
npx tsc --noEmit       # typecheck
npm run bundle         # rebuild bin/forge.cjs (single self-contained file)
```

## License

MIT
