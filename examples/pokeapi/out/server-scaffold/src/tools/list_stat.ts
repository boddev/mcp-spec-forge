import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/stat/ :: List stats
const plan: PlanStep[] = [
  {
    "id": "stat_list",
    "method": "GET",
    "path": "/api/v2/stat/",
    "pathParams": [],
    "purpose": "List stats"
  }
];

export const list_stat = {
  name: "list_stat",
  description: "Task-oriented tool for stat. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What are the base stats of Mewtwo?\".",
  inputSchema: {
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "description": "> Only available locally and not at [pokeapi.co](https://pokeapi.co/docs/v2)\nCase-insensitive query applied on the `name` property. "
    },
    "max_items": {
      "type": "integer",
      "description": "Maximum records to return (caps pagination).",
      "default": 50
    }
  }
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
