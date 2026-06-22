import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/pokemon/{pokemon_id}/encounters :: Get pokemon encounter
const plan: PlanStep[] = [
  {
    "id": "pokemon_encounters_retrieve",
    "method": "GET",
    "path": "/api/v2/pokemon/{pokemon_id}/encounters",
    "pathParams": [
      "pokemon_id"
    ],
    "purpose": "Get pokemon encounter"
  }
];

export const list_pokemon_encounter = {
  name: "list_pokemon_encounter",
  description: "Task-oriented tool for pokemon, encounter. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What Pokemon can be found in the Viridian Forest and by what encounter method?\".",
  inputSchema: {
  "type": "object",
  "required": [
    "pokemon_id"
  ],
  "properties": {
    "pokemon_id": {
      "type": "string"
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
