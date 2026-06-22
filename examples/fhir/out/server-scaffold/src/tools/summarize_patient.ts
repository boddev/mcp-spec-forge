import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /Patient :: search-type: Search for Patient instances
//  - GET /Patient/{id} :: read-instance: Read Patient instance (foreach call_1.items)
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/Patient",
    "pathParams": [],
    "purpose": "search-type: Search for Patient instances"
  },
  {
    "id": "call_2",
    "method": "GET",
    "path": "/Patient/{id}",
    "pathParams": [
      "id"
    ],
    "purpose": "read-instance: Read Patient instance",
    "foreach": {
      "sourceId": "call_1",
      "hint": "items"
    },
    "condition": {
      "arg": "include_details",
      "equals": true
    },
    "concurrency": 5,
    "maxItems": 50
  }
];

export const summarize_patient = {
  name: "summarize_patient",
  description: "Task-oriented tool for patient. Wraps 2 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"Find all patients named Smith and show each patient's birth date and gender.\".",
  inputSchema: {
  "type": "object",
  "required": [
    "id"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "The resource ID"
    },
    "max_items": {
      "type": "integer",
      "description": "Maximum records to return (caps pagination).",
      "default": 50
    },
    "include_details": {
      "type": "boolean",
      "description": "Expand each result with its detail/sub-resource calls in one round-trip.",
      "default": true
    }
  }
} as const,
  plan,
  handler: (args: Record<string, unknown>) => runPlan(plan, args),
};
