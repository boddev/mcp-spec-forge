import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /api/v2/ability/ :: Abilities provide passive effects for Pokémon in battle or in the overworld. Pokémon have multiple possible abilities but can have only one ability at a time. Check out [Bulbapedia](http://bulbapedia.bulbagarden.net/wiki/Ability) for greater detail.
//  - GET /api/v2/ability/{id}/ :: Abilities provide passive effects for Pokémon in battle or in the overworld. Pokémon have multiple possible abilities but can have only one ability at a time. Check out [Bulbapedia](http://bulbapedia.bulbagarden.net/wiki/Ability) for greater detail. (foreach ability_list.items)
//  - GET /api/v2/berry-flavor/{id}/ :: Get berries by flavor (foreach ability_list.items)
const plan: PlanStep[] = [
  {
    "id": "ability_list",
    "method": "GET",
    "path": "/api/v2/ability/",
    "pathParams": [],
    "purpose": "Abilities provide passive effects for Pokémon in battle or in the overworld. Pokémon have multiple possible abilities but can have only one ability at a time. Check out [Bulbapedia](http://bulbapedia.bulbagarden.net/wiki/Ability) for greater detail."
  },
  {
    "id": "ability_retrieve",
    "method": "GET",
    "path": "/api/v2/ability/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Abilities provide passive effects for Pokémon in battle or in the overworld. Pokémon have multiple possible abilities but can have only one ability at a time. Check out [Bulbapedia](http://bulbapedia.bulbagarden.net/wiki/Ability) for greater detail.",
    "foreach": {
      "sourceId": "ability_list",
      "hint": "items"
    },
    "condition": {
      "arg": "include_details",
      "equals": true
    },
    "concurrency": 5,
    "maxItems": 50
  },
  {
    "id": "berry_flavor_retrieve",
    "method": "GET",
    "path": "/api/v2/berry-flavor/{id}/",
    "pathParams": [
      "id"
    ],
    "purpose": "Get berries by flavor",
    "foreach": {
      "sourceId": "ability_list",
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

export const summarize_ability_provide = {
  name: "summarize_ability_provide",
  description: "Task-oriented tool for ability, provide, passive, berry. Wraps 3 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"What are Pikachu's abilities and what does each one do?\".",
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
    "q": {
      "type": "string",
      "description": "> Only available locally and not at [pokeapi.co](https://pokeapi.co/docs/v2)\nCase-insensitive query applied on the `name` property. "
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
