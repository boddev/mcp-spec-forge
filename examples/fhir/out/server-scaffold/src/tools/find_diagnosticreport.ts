import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /DiagnosticReport :: search-type: Search for DiagnosticReport instances
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/DiagnosticReport",
    "pathParams": [],
    "purpose": "search-type: Search for DiagnosticReport instances"
  }
];

export const find_diagnosticreport = {
  name: "find_diagnosticreport",
  description: "Task-oriented tool for diagnosticreport. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Find diagnostic reports for a patient and summarize the conclusion of each.\".",
  inputSchema: {
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "The status of the report"
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
