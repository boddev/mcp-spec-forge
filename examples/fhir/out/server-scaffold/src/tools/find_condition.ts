import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /Condition :: search-type: Search for Condition instances
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/Condition",
    "pathParams": [],
    "purpose": "search-type: Search for Condition instances"
  }
];

export const find_condition = {
  name: "find_condition",
  description: "Task-oriented tool for condition. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"List the active conditions (problems) recorded for a given patient.\".",
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
