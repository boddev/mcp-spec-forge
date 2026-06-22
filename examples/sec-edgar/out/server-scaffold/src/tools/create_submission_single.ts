import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - POST /submission/single/live :: Single Live Submission
const plan: PlanStep[] = [
  {
    "id": "Single Live Submission",
    "method": "POST",
    "path": "/submission/single/live",
    "pathParams": [],
    "purpose": "Single Live Submission"
  }
];

export const create_submission_single = {
  name: "create_submission_single",
  description: "Task-oriented tool for submission, single, live. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Submit a single live filing to EDGAR.\".",
  inputSchema: {
  "type": "object",
  "properties": {}
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
