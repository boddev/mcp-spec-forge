import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /fm/{cik} :: View filer account information
const plan: PlanStep[] = [
  {
    "id": "View Filer Account Information",
    "method": "GET",
    "path": "/fm/{cik}",
    "pathParams": [
      "cik"
    ],
    "purpose": "View filer account information"
  }
];

export const get_view_filer = {
  name: "get_view_filer",
  description: "Task-oriented tool for view, filer, account. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"How do I view the filer account information for a given CIK?\".",
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
