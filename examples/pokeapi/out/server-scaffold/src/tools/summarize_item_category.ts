import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/item-category/{id}/ :: Get item category
//  - GET /api/v2/item/{id}/ :: Get item
const plan: PlanStep[] = [
  {
    "id": "item_category_retrieve",
    "method": "GET",
    "path": "/api/v2/item-category/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Get item category"
  },
  {
    "id": "item_retrieve",
    "method": "GET",
    "path": "/api/v2/item/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Get item"
  }
];

export const summarize_item_category = {
  name: "summarize_item_category",
  description: "Task-oriented tool for item, category. Wraps 2 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What items are in the medicine category and what does each item do?\".",
  inputSchema: {
  "type": "object",
  "required": [
    "id"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "This parameter can be a string or an integer."
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
