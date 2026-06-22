import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /Medication/{id} :: read-instance: Read Medication instance
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/Medication/{id}",
    "pathParams": [
      "id"
    ],
    "purpose": "read-instance: Read Medication instance"
  }
];

export const get_medication = {
  name: "get_medication",
  description: "Task-oriented tool for medication. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What medications has patient 67890 been prescribed and what is the dosage of each?\".",
  inputSchema: {
  "type": "object",
  "required": [
    "id"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "The resource ID"
    }
  }
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
