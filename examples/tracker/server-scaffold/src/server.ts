import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { summarize_issue_repo, list_project_task, list_project } from './tools/index.js';

const server = new McpServer({ name: "tracker-mcp", version: "0.1.0" });

  server.registerTool(
    "summarize_issue_repo",
    {
      description: "Task-oriented tool for issue, repo, across, comment. Wraps 3 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What open issues are assigned to Sarah across the backend repo?\".",
      inputSchema: summarize_issue_repo.inputSchema,
    },
    summarize_issue_repo.handler,
  );
  server.registerTool(
    "list_project_task",
    {
      description: "Task-oriented tool for project, task. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"List all active projects and their tasks\".",
      inputSchema: list_project_task.inputSchema,
    },
    list_project_task.handler,
  );
  server.registerTool(
    "list_project",
    {
      description: "Task-oriented tool for project. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Who is the owner of the billing project?\".",
      inputSchema: list_project.inputSchema,
    },
    list_project.handler,
  );

const transport = new StdioServerTransport();
await server.connect(transport);
