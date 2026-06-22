import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /projects/{projectId}/tasks :: List tasks for a project
const plan: PlanStep[] = [
  {
    "id": "listProjectTasks",
    "method": "GET",
    "path": "/projects/{projectId}/tasks",
    "pathParams": [
      "projectId"
    ],
    "purpose": "List tasks for a project"
  }
];

export const list_project_task = {
  name: "list_project_task",
  description: "Task-oriented tool for project, task. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"List all active projects and their tasks\".",
  inputSchema: {
  "type": "object",
  "required": [
    "projectId"
  ],
  "properties": {
    "projectId": {
      "type": "integer"
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
