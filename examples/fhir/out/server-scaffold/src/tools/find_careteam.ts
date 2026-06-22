import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /CareTeam :: search-type: Search for CareTeam instances
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/CareTeam",
    "pathParams": [],
    "purpose": "search-type: Search for CareTeam instances"
  }
];

export const find_careteam = {
  name: "find_careteam",
  description: "Task-oriented tool for careteam. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Which practitioners are associated with a patient's care team?\".",
  inputSchema: {
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "proposed | active | suspended | inactive | entered-in-error"
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
