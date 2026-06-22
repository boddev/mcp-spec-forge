import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /status :: EDGAR System Status
const plan: PlanStep[] = [
  {
    "id": "EDGAR System Status",
    "method": "GET",
    "path": "/status",
    "pathParams": [],
    "purpose": "EDGAR System Status"
  }
];

export const list_status = {
  name: "list_status",
  description: "Task-oriented tool for status. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Is the EDGAR system currently online and accepting filings?\".",
  inputSchema: {
  "type": "object",
  "properties": {
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
