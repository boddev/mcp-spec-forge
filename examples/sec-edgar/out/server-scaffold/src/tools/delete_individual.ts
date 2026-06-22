import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - DELETE /fm/{cik}/individuals :: Remove individuals
const plan: PlanStep[] = [
  {
    "id": "Remove Individuals",
    "method": "DELETE",
    "path": "/fm/{cik}/individuals",
    "pathParams": [
      "cik"
    ],
    "purpose": "Remove individuals"
  }
];

export const delete_individual = {
  name: "delete_individual",
  description: "Task-oriented tool for individual. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Remove an individual from the account.\".",
  inputSchema: {
  "type": "object",
  "required": [
    "cik"
  ],
  "properties": {
    "cik": {
      "type": "string"
    }
  }
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
