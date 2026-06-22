import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /fm/{cik}/delegations :: View delegations
const plan: PlanStep[] = [
  {
    "id": "View Delegations",
    "method": "GET",
    "path": "/fm/{cik}/delegations",
    "pathParams": [
      "cik"
    ],
    "purpose": "View delegations"
  }
];

export const list_delegation = {
  name: "list_delegation",
  description: "Task-oriented tool for delegation. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"View the delegations associated with the CIK.\".",
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
