import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - POST /submission/bulk/live :: Bulk Live Submission
const plan: PlanStep[] = [
  {
    "id": "Bulk Live Submission",
    "method": "POST",
    "path": "/submission/bulk/live",
    "pathParams": [],
    "purpose": "Bulk Live Submission"
  }
];

export const create_submission_bulk = {
  name: "create_submission_bulk",
  description: "Task-oriented tool for submission, bulk, live. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Submit multiple filings at once in one bulk live submission.\".",
  inputSchema: {
  "type": "object",
  "properties": {}
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
