import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './buildServer.js';

// Local transport: the MCP client spawns this process and talks over stdio.
const server = buildServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("FHIR R4" + ' MCP server running on stdio');
