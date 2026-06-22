import { apiCall } from '../api/client.js';

// Auto-generated stub. Implement the orchestration described below.
export const list_project_task = {
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

  // Underlying API calls this tool should orchestrate (in order):
  //  - GET /projects/{projectId}/tasks :: List tasks for a project
  async handler(args: Record<string, unknown>) {
    // TODO: orchestrate the underlying calls above, collapsing list-then-detail
    // patterns into a single response. Respect max_items / include_details inputs.
    void apiCall;
    void args;
    return { content: [{ type: 'text', text: 'Not implemented: list_project_task' }] };
  },
};
