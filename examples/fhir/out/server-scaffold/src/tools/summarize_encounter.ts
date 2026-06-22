import { runPlan, type PlanStep } from '../api/orchestrate.js';

// Underlying API calls this tool orchestrates (in order), collapsing any
// list-then-detail (N+1) pattern into a single response:
//  - GET /Encounter :: search-type: Search for Encounter instances
//  - GET /Encounter/{id} :: read-instance: Read Encounter instance (foreach call_1.items)
const plan: PlanStep[] = [
  {
    "id": "call_1",
    "method": "GET",
    "path": "/Encounter",
    "pathParams": [],
    "purpose": "search-type: Search for Encounter instances"
  },
  {
    "id": "call_2",
    "method": "GET",
    "path": "/Encounter/{id}",
    "pathParams": [
      "id"
    ],
    "purpose": "read-instance: Read Encounter instance",
    "foreach": {
      "sourceId": "call_1",
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

export const summarize_encounter = {
  name: "summarize_encounter",
  description: "Task-oriented tool for encounter. Wraps 2 API endpoint(s), collapsing a list-then-detail (N+1) pattern into a single call so a question is answered without multiple round-trips. Example question it answers: \"Show all encounters for a patient and the reason and date of each visit.\".",
  inputSchema: {
  "type": "object",
  "required": [
    "id"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "The resource ID"
    },
    "type": {
      "type": "string",
      "description": "Multiple Resources: \r\n\r\n* [AllergyIntolerance](https://hl7.org/fhir/R4/allergyintolerance.html): allergy | intolerance - Underlying mechanism (if known)\r\n* [Composition](https://hl7.org/fhir/R4/composition.html): Kind of composition (LOINC if possible)\r\n* [DocumentManifest](https://hl7.org/fhir/R4/documentmanifest.html): Kind of document set\r\n* [DocumentReference](https://hl7.org/fhir/R4/documentreference.html): Kind of document (LOINC if possible)\r\n* [Encounter](https://hl7.org/fhir/R4/encounter.html): Specific type of encounter\r\n* [EpisodeOfCare](https://hl7.org/fhir/R4/episodeofcare.html): Type/class  - e.g. specialist referral, disease management"
    },
    "status": {
      "type": "string",
      "description": "planned | arrived | triaged | in-progress | onleave | finished | cancelled +"
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
