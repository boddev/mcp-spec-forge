import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /fm/{cik}/individuals :: View individuals
const plan: PlanStep[] = [
  {
    "id": "View Individuals",
    "method": "GET",
    "path": "/fm/{cik}/individuals",
    "pathParams": [
      "cik"
    ],
    "purpose": "View individuals"
  }
];

export const list_individual = {
  name: "list_individual",
  description: "Task-oriented tool for individual. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"List the individuals authorized on the account and the role each one has.\".",
  inputSchema: {
  "type": "object",
  "required": [
    "cik"
  ],
  "properties": {
    "cik": {
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
