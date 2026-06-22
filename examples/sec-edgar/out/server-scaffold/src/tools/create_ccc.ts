import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - POST /fm/{cik}/ccc :: Generate CCC
const plan: PlanStep[] = [
  {
    "id": "Generate CCC",
    "method": "POST",
    "path": "/fm/{cik}/ccc",
    "pathParams": [
      "cik"
    ],
    "purpose": "Generate CCC"
  }
];

export const create_ccc = {
  name: "create_ccc",
  description: "Task-oriented tool for ccc. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Generate a new CCC (CIK Confirmation Code) for the CIK.\".",
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
