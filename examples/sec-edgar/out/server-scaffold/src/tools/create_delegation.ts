import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - POST /fm/{cik}/delegations :: Send delegation invitations
const plan: PlanStep[] = [
  {
    "id": "Send Delegation Invitations",
    "method": "POST",
    "path": "/fm/{cik}/delegations",
    "pathParams": [
      "cik"
    ],
    "purpose": "Send delegation invitations"
  }
];

export const create_delegation = {
  name: "create_delegation",
  description: "Task-oriented tool for delegation. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Send a delegation invitation to another filer.\".",
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
