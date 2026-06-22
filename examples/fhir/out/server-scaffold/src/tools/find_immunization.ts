import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /Immunization :: search-type: Search for Immunization instances
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/Immunization",
    "pathParams": [],
    "purpose": "search-type: Search for Immunization instances"
  }
];

export const find_immunization = {
  name: "find_immunization",
  description: "Task-oriented tool for immunization. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"List all immunizations a patient has received and the date of each.\".",
  inputSchema: {
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "Immunization event status"
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
