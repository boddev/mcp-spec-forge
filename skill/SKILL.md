---
name: mcp-spec-forge
description: >-
  Generate an MCP server design spec from an evaluation set plus documented APIs. Use when
  the user has (1) a set of questions an AI assistant is expected to answer and (2) one or
  more documented public APIs (OpenAPI/Swagger or HTML docs), and wants a spec describing the
  MCP tools/resources/prompts — with API endpoints grouped into coarse, task-oriented tools
  that avoid multiple round-trips. Triggers: "design an MCP server from this eval set and
  these API docs", "group these endpoints into tools", "turn this API + eval set into an MCP
  spec".
---

# MCP Spec Forge (skill)

This skill turns an **eval set** + **API documentation** into a **design spec for an MCP
server** whose tools are grouped by task so each question is answered in a single tool call.

It orchestrates the deterministic `mcp-spec-forge` CLI (in this repo) and then layers LLM
reasoning to refine the grouping — the hybrid design the project was built around.

## When to use
- The user points at an eval set (`.csv`, `.json`, `.jsonl`) and API docs (OpenAPI file/URL,
  or HTML docs) and wants an MCP server design.
- The user asks to consolidate many endpoints into fewer, task-oriented MCP tools.

## Workflow

1. **Locate inputs.** Confirm the eval-set path and each API doc source (OpenAPI preferred;
   HTML is best-effort). If the eval set lacks a `prompt`/`question` column, ask.

2. **Run the deterministic pipeline** from the repo root
   (`C:\Users\bodonnell\src\mcp-spec-forge`):
   ```pwsh
   npx tsx src/cli.ts generate `
     -e <eval-set> `
     -o <openapi-source...> `
     [-d <html-source...>] `
     --name <server-name> `
     -O <out-dir> --scaffold
   ```
   This writes `mcp-design.yaml`, `mcp-design.md`, `mcp-design.json`, and (with `--scaffold`)
   a runnable TypeScript server skeleton.

3. **Review the coverage report** printed by the CLI and in `mcp-design.md`:
   - Every eval question should map to a tool (coverage = 100%).
   - Investigate any `uncovered` questions, `broad-scope` (god) tools, or `low-confidence`
     HTML-derived endpoints.

4. **LLM refinement (the high-value step).** Read `mcp-design.json` and improve, *keeping the
   schema identical*:
   - Rename tools to crisp, task-oriented verbs (`find_stale_issues`, not `list_issue_x`).
   - Tighten descriptions; remove noise tokens from entity lists.
   - Validate each `underlyingCalls` chain: the `foreach`/dependency order must be correct
     (detail calls fan out over the *first* list/search result; IDs flow upstream→downstream).
   - Merge endpoints that are always co-used; split tools that mix unrelated entities.
   - Confirm auth, pagination, and partial-result behavior per tool.
   Re-emit the refined `mcp-design.yaml` / `.md`.

5. **Hand off.** Summarize: # tools, coverage %, any review flags, and where the files are.
   If the user wants an implementation, point them at `server-scaffold/` and implement the
   stub handlers tool by tool.

## Design rules the spec must satisfy
- **No naive 1-endpoint-1-tool.** Group by the information needs in the eval set.
- **Collapse N+1 chains** (list → per-item detail) into one tool with `fan_out_with_limit`
  (`max_items`, `concurrency`, `include_details`, `partial_results`).
- **Avoid god-tools** (`query_api`, `get_everything`): 3–7 inputs, stable output schema, each
  tool justified by ≥1 high-value or ≥2 eval questions.
- **Only reference real endpoints** present in the normalized API index.

## Notes
- The CLI runs fully offline (deterministic lexical matching + co-usage graph clustering).
  `--llm` is a placeholder flag; the actual LLM refinement is done by this skill in step 4.
- See `PLAN.md` for the full architecture and the GPT-5.5-cross-referenced rationale.
