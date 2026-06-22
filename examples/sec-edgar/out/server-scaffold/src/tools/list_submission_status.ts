import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /submission/{accessionNumber}/status :: Check Single Submission Status
const plan: PlanStep[] = [
  {
    "id": "Check Single Submission Status",
    "method": "GET",
    "path": "/submission/{accessionNumber}/status",
    "pathParams": [
      "accessionNumber"
    ],
    "purpose": "Check Single Submission Status"
  }
];

export const list_submission_status = {
  name: "list_submission_status",
  description: "Task-oriented tool for submission, status. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Check the processing status of one submission by its accession number.\".",
  inputSchema: {
  "type": "object",
  "required": [
    "accessionNumber"
  ],
  "properties": {
    "accessionNumber": {
      "type": "string",
      "description": "The accession number returned when a submission is successfully transmitted."
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
