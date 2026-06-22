import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - POST /fm/{cik}/individuals :: Add individuals
const plan: PlanStep[] = [
  {
    "id": "Add Individuals",
    "method": "POST",
    "path": "/fm/{cik}/individuals",
    "pathParams": [
      "cik"
    ],
    "purpose": "Add individuals"
  }
];

export const create_individual = {
  name: "create_individual",
  description: "Task-oriented tool for individual. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Add a new individual to the account.\".",
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
