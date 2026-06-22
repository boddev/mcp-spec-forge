import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /repos/{owner}/{repo}/issues :: List issues in a repository
//  - GET /repos/{owner}/{repo}/issues/{number}/comments :: List comments on an issue
//  - GET /repos/{owner}/{repo}/issues/{number} :: Get a single issue by number (foreach listIssues.items)
const plan: PlanStep[] = [
  {
    "id": "listIssues",
    "method": "GET",
    "path": "/repos/{owner}/{repo}/issues",
    "pathParams": [
      "owner",
      "repo"
    ],
    "purpose": "List issues in a repository"
  },
  {
    "id": "listIssueComments",
    "method": "GET",
    "path": "/repos/{owner}/{repo}/issues/{number}/comments",
    "pathParams": [
      "owner",
      "repo",
      "number"
    ],
    "purpose": "List comments on an issue"
  },
  {
    "id": "getIssue",
    "method": "GET",
    "path": "/repos/{owner}/{repo}/issues/{number}",
    "pathParams": [
      "owner",
      "repo",
      "number"
    ],
    "purpose": "Get a single issue by number",
    "foreach": {
      "sourceId": "listIssues",
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

export const summarize_repo_issue = {
  name: "summarize_repo_issue",
  description: "Task-oriented tool for repo, issue, comment. Wraps 3 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What open issues are assigned to Sarah across the backend repo?\".",
  inputSchema: {
  "type": "object",
  "required": [
    "owner",
    "repo",
    "number"
  ],
  "properties": {
    "owner": {
      "type": "string"
    },
    "repo": {
      "type": "string"
    },
    "number": {
      "type": "integer"
    },
    "state": {
      "type": "string"
    },
    "assignee": {
      "type": "string"
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
