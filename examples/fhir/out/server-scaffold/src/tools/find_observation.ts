import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /Observation :: search-type: Search for Observation instances
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/Observation",
    "pathParams": [],
    "purpose": "search-type: Search for Observation instances"
  }
];

export const find_observation = {
  name: "find_observation",
  description: "Task-oriented tool for observation. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What are the most recent vital-sign observations for patient 12345?\".",
  inputSchema: {
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "The status of the observation"
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
