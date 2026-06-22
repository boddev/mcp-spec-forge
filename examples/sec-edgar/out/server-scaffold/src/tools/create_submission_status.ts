import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - POST /submission/status :: Check Multiple Submission Statuses
const plan: PlanStep[] = [
  {
    "id": "Check Multiple Submission Statuses",
    "method": "POST",
    "path": "/submission/status",
    "pathParams": [],
    "purpose": "Check Multiple Submission Statuses"
  }
];

export const create_submission_status = {
  name: "create_submission_status",
  description: "Task-oriented tool for submission, status. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Check the status of several of my submissions at the same time.\".",
  inputSchema: {
  "type": "object",
  "properties": {}
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
