import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/move-learn-method/{id}/ :: Get move learn method
//  - GET /api/v2/move/{id}/ :: Get move
const plan: PlanStep[] = [
  {
    "id": "move_learn_method_retrieve",
    "method": "GET",
    "path": "/api/v2/move-learn-method/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Get move learn method"
  },
  {
    "id": "move_retrieve",
    "method": "GET",
    "path": "/api/v2/move/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Get move"
  }
];

export const summarize_move_learn = {
  name: "summarize_move_learn",
  description: "Task-oriented tool for move, learn, method. Wraps 2 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What moves can Charizard learn, and what is the power and type of each move?\".",
  inputSchema: {
  "type": "object",
  "required": [
    "id"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "This parameter can be a string or an integer."
    },
    "include_details": {
      "type": "boolean",
      "description": "Expand each result with its detail/sub-resource calls in one round-trip.",
      "default": true
    }
  }
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
