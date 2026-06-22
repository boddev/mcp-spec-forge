import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/pokemon-species/{id}/ :: Get pokemon species
const plan: PlanStep[] = [
  {
    "id": "pokemon_species_retrieve",
    "method": "GET",
    "path": "/api/v2/pokemon-species/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Get pokemon species"
  }
];

export const get_pokemon_species = {
  name: "get_pokemon_species",
  description: "Task-oriented tool for pokemon, species. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"For the Gen 1 generation, which Pokemon species were introduced?\".",
  inputSchema: {
  "type": "object",
  "required": [
    "id"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "This parameter can be a string or an integer."
    }
  }
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
