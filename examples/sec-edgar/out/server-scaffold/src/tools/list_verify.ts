import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /fm/{cik}/verify :: Filing credentials verification
const plan: PlanStep[] = [
  {
    "id": "Filing Credentials Verification",
    "method": "GET",
    "path": "/fm/{cik}/verify",
    "pathParams": [
      "cik"
    ],
    "purpose": "Filing credentials verification"
  }
];

export const list_verify = {
  name: "list_verify",
  description: "Task-oriented tool for verify. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Verify that my filing credentials are valid before I submit a filing.\".",
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
