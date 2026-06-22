import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/type/ :: List types
const plan: PlanStep[] = [
  {
    "id": "type_list",
    "method": "GET",
    "path": "/api/v2/type/",
    "pathParams": [],
    "purpose": "List types"
  }
];

export const list_type = {
  name: "list_type",
  description: "Task-oriented tool for type. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"List the first 20 Pokemon and show each one's types.\".",
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
