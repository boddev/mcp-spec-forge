import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /AllergyIntolerance/{id} :: read-instance: Read AllergyIntolerance instance
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/AllergyIntolerance/{id}",
    "pathParams": [
      "id"
    ],
    "purpose": "read-instance: Read AllergyIntolerance instance"
  }
];

export const get_allergyintolerance = {
  name: "get_allergyintolerance",
  description: "Task-oriented tool for allergyintolerance. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What allergies and intolerances are documented for patient 12345?\".",
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
