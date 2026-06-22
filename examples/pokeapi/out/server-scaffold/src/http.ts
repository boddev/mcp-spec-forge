import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from './buildServer.js';

// Remote transport: Streamable HTTP, stateless (a fresh server per request).
// For production, add auth (OAuth 2.1 / bearer), TLS, CORS and Origin validation.
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
});

// Stateless server: SSE stream / session termination are not supported.
const methodNotAllowed = (_req: express.Request, res: express.Response) =>
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.error("pokeapi-mcp" + ' MCP server (Streamable HTTP) on http://localhost:' + PORT + '/mcp'));
