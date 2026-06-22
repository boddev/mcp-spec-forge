#!/usr/bin/env node
import { Command } from 'commander';
import { forge, writeResult } from './pipeline.js';

const program = new Command();

program
  .name('mcp-spec-forge')
  .description('Forge an MCP server design spec from an eval set + documented APIs.')
  .version('0.1.0');

program
  .command('generate')
  .description('Ingest an eval set and API docs, then emit an MCP design spec.')
  .requiredOption('-e, --eval <path>', 'eval set file (.csv, .json, .jsonl)')
  .option('-o, --openapi <source...>', 'OpenAPI doc(s): file path or URL', [])
  .option('-d, --html <source...>', 'HTML API doc(s): file path or URL (best-effort)', [])
  .option('-n, --name <name>', 'MCP server name', 'forged-mcp-server')
  .option('--description <text>', 'server description')
  .option('-O, --out <dir>', 'output directory', './out')
  .option('--scaffold', 'also emit a runnable TypeScript MCP server (local + remote)', false)
  .option('--transport <mode>', 'server transport(s) to emit: stdio | http | both', 'both')
  .option('--llm', 'enable LLM grouping refinement (requires provider)', false)
  .action(async (opts) => {
    try {
      const transport = ['stdio', 'http', 'both'].includes(opts.transport) ? opts.transport : 'both';
      const result = await forge({
        evalPath: opts.eval,
        openapiSources: opts.openapi,
        htmlSources: opts.html,
        serverName: opts.name,
        description: opts.description,
        mode: opts.llm ? 'llm' : 'deterministic',
        transport,
      });

      const written = writeResult(result, opts.out, opts.scaffold);
      const r = result.report;

      console.log(`\n✔ Forged MCP design for "${result.design.server.name}"`);
      console.log(`  Endpoints ingested : ${result.endpoints.length}`);
      console.log(`  Eval questions     : ${result.questions.length}`);
      console.log(`  Tools produced     : ${result.design.tools.length}`);
      console.log(`  Coverage           : ${Math.round(r.coverageRate * 100)}% (${r.uncovered.length} uncovered)`);
      if (r.uncovered.length) console.log(`  Uncovered          : ${r.uncovered.join(', ')}`);
      if (r.godTools.length) console.log(`  Review (broad)     : ${r.godTools.join(', ')}`);
      if (r.unknownEndpointRefs.length) console.log(`  Bad endpoint refs  : ${r.unknownEndpointRefs.length}`);
      console.log('\n  Tools:');
      for (const t of result.design.tools) {
        console.log(`   - ${t.name}  [covers: ${t.evalCoverage.join(', ') || '—'}]  wraps ${t.underlyingCalls.length} call(s)`);
      }
      console.log('\n  Output:');
      for (const f of written) console.log(`   - ${f}`);
      if (opts.scaffold) {
        console.log('\n  Runnable MCP server emitted under server-scaffold/:');
        console.log('   cd ' + opts.out + '\\server-scaffold && npm install');
        if (transport !== 'http') console.log('   npm run start:stdio   # local (stdio)');
        if (transport !== 'stdio') console.log('   npm run start:http    # remote (Streamable HTTP)');
      }
      console.log('');
    } catch (err) {
      console.error(`✖ ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
