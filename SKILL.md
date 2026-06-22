---
name: mcp-spec-forge
description: >-
  Generate an MCP server design spec from an evaluation set plus documented APIs. Use when the
  user has (1) a set of questions an AI assistant is expected to answer and (2) one or more
  documented public APIs (OpenAPI/Swagger files or URLs, or HTML API docs) and wants a spec
  describing the MCP server's tools/resources/prompts — with API endpoints grouped into coarse,
  task-oriented tools that avoid multiple round-trips and collapse N+1 (list-then-detail) chains.
  Triggers: "design/forge an MCP server from this eval set and these API docs", "turn this API +
  eval set into an MCP spec", "group these endpoints into MCP tools", "what MCP tools should I
  build for these questions". This skill BUNDLES its own CLI (bin/forge.cjs) — nothing to download.
---

# MCP Spec Forge

Turn an **eval set** + **API documentation** into a **design spec for an MCP server** whose tools
are grouped by task so each question is answered in a single tool call instead of many API
round-trips.

This skill is **self-contained**: the deterministic engine ships with it as a single bundled,
dependency-free executable at **`bin/forge.cjs`** (next to this file). You run that engine, then
add LLM reasoning on top. There is nothing to install or download.

## How to run the bundled engine

The executable lives in this skill's own folder. Invoke it with `node`, using the absolute path
to **this skill's** `bin/forge.cjs` (the directory that contains this `SKILL.md`):

```pwsh
node "<this-skill-dir>/bin/forge.cjs" generate `
  -e <eval-set> `            # .csv | .json | .jsonl  (auto-detects prompt/answer/source columns)
  -o <openapi-source...> `   # OpenAPI file path(s) or URL(s)  (preferred)
  [-d <html-source...>] `    # HTML API doc page(s) — best-effort, low confidence
  --name <server-name> `
  -O <out-dir> --scaffold
```

Only Node.js is required (already present in the Copilot CLI environment). No `npm install`.

### Self-heal (only if the bundle is missing)
`bin/forge.cjs` is prebuilt and committed. If it is somehow absent, rebuild it once from source
in this skill folder, then proceed:
```pwsh
npm install && npm run bundle
```

## Workflow

1. **Locate inputs.** Confirm the eval-set path and each API doc source (OpenAPI preferred; HTML
   is best-effort). If the eval set has no `prompt`/`question` column, ask the user.

2. **Run the engine** with the command above. It writes `mcp-design.yaml` (canonical),
   `mcp-design.md` (rationale + coverage matrix), `mcp-design.json`, and — with `--scaffold` — a
   runnable TypeScript MCP server skeleton under `server-scaffold/`.

3. **Read the coverage report** (printed, and in `mcp-design.md`):
   - Every eval question should map to a tool (coverage = 100%).
   - Investigate any `uncovered` questions, `broad-scope` (god) tools, or `low-confidence`
     HTML-derived endpoints.

4. **LLM refinement — the high-value step.** Open `mcp-design.json` and improve it *without
   changing the schema*:
   - Rename tools to crisp, task-oriented verbs (`find_stale_issues`, not `list_issue_x`).
   - Tighten descriptions; drop noise tokens from entity lists.
   - Verify each `underlyingCalls` chain: detail/`foreach` calls must fan out over the *first*
     list/search result, and IDs must flow upstream→downstream.
   - Merge endpoints that are always co-used; split tools that mix unrelated entities.
   - Confirm auth, pagination, and partial-result behavior per tool.
   Re-emit the refined `mcp-design.yaml` / `.md` (you can hand-edit, or re-run with adjusted
   inputs).

5. **Hand off.** Summarize: number of tools, coverage %, any review flags, and where the files
   are. If the user wants an implementation, point them at `server-scaffold/` and fill in each
   stub handler tool by tool.

## Design rules the output must satisfy
- **No naive 1-endpoint-1-tool.** Group endpoints by the information needs in the eval set.
- **Collapse N+1 chains** (list → per-item detail) into one tool with fan-out config
  (`max_items`, `concurrency`, `include_details`, `partial_results`).
- **Avoid god-tools** (`query_api`, `get_everything`): 3–7 inputs, stable output schema; each
  tool justified by ≥1 high-value or ≥2 eval questions.
- **Only reference real endpoints** present in the normalized API index (the engine validates
  this; never invent endpoints during refinement).

## Notes
- The engine runs fully offline (deterministic lexical matching + co-usage graph clustering), so
  the baseline spec is reproducible. The `--llm` flag only tags the output `mode`; the actual LLM
  refinement is step 4, performed by you (the agent) running this skill.
- See `PLAN.md` for the full architecture and the GPT-5.5-cross-referenced rationale, and
  `examples/tracker/` for sample generated output.
