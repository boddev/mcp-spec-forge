import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/evolution-chain/{id}/ :: Get evolution chain
const plan: PlanStep[] = [
  {
    "id": "evolution_chain_retrieve",
    "method": "GET",
    "path": "/api/v2/evolution-chain/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Get evolution chain"
  }
];

export const get_evolution_chain = {
  name: "get_evolution_chain",
  description: "Task-oriented tool for evolution, chain. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What is the evolution chain for Bulbasaur?\".",
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
