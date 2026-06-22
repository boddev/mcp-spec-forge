import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - PUT /fm/{cik}/individuals :: Change roles
const plan: PlanStep[] = [
  {
    "id": "Change Roles",
    "method": "PUT",
    "path": "/fm/{cik}/individuals",
    "pathParams": [
      "cik"
    ],
    "purpose": "Change roles"
  }
];

export const update_individual = {
  name: "update_individual",
  description: "Task-oriented tool for individual. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Change the role assigned to an individual on my account.\".",
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
