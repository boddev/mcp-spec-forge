import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { summarize_ability_provide, list_type, summarize_move_learn, get_evolution_chain, list_region, summarize_item_category, list_stat, list_pokemon_encounter, get_pokemon_species } from './tools/index.js';

const server = new McpServer({ name: "pokeapi-mcp", version: "0.1.0" });

  server.registerTool(
    "summarize_ability_provide",
    {
      description: "Task-oriented tool for ability, provide, passive, berry. Wraps 3 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What are Pikachu's abilities and what does each one do?\".",
      inputSchema: summarize_ability_provide.inputSchema,
    },
    summarize_ability_provide.handler,
  );
  server.registerTool(
    "list_type",
    {
      description: "Task-oriented tool for type. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"List the first 20 Pokemon and show each one's types.\".",
      inputSchema: list_type.inputSchema,
    },
    list_type.handler,
  );
  server.registerTool(
    "summarize_move_learn",
    {
      description: "Task-oriented tool for move, learn, method. Wraps 2 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What moves can Charizard learn, and what is the power and type of each move?\".",
      inputSchema: summarize_move_learn.inputSchema,
    },
    summarize_move_learn.handler,
  );
  server.registerTool(
    "get_evolution_chain",
    {
      description: "Task-oriented tool for evolution, chain. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What is the evolution chain for Bulbasaur?\".",
      inputSchema: get_evolution_chain.inputSchema,
    },
    get_evolution_chain.handler,
  );
  server.registerTool(
    "list_region",
    {
      description: "Task-oriented tool for region. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"Describe the Kanto region and list the locations it contains.\".",
      inputSchema: list_region.inputSchema,
    },
    list_region.handler,
  );
  server.registerTool(
    "summarize_item_category",
    {
      description: "Task-oriented tool for item, category. Wraps 2 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What items are in the medicine category and what does each item do?\".",
      inputSchema: summarize_item_category.inputSchema,
    },
    summarize_item_category.handler,
  );
  server.registerTool(
    "list_stat",
    {
      description: "Task-oriented tool for stat. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What are the base stats of Mewtwo?\".",
      inputSchema: list_stat.inputSchema,
    },
    list_stat.handler,
  );
  server.registerTool(
    "list_pokemon_encounter",
    {
      description: "Task-oriented tool for pokemon, encounter. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"What Pokemon can be found in the Viridian Forest and by what encounter method?\".",
      inputSchema: list_pokemon_encounter.inputSchema,
    },
    list_pokemon_encounter.handler,
  );
  server.registerTool(
    "get_pokemon_species",
    {
      description: "Task-oriented tool for pokemon, species. Wraps 1 API endpoint(s) so a question is answered without multiple round-trips. Example question it answers: \"For the Gen 1 generation, which Pokemon species were introduced?\".",
      inputSchema: get_pokemon_species.inputSchema,
    },
    get_pokemon_species.handler,
  );

const transport = new StdioServerTransport();
await server.connect(transport);
