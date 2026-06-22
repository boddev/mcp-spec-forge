/**
 * Pluggable LLM provider for the optional "llm" grouping mode.
 *
 * The deterministic pipeline runs with no API key. When MCP_FORGE_LLM is set and a
 * provider is available, the skill / CLI can use this interface to refine grouping,
 * tool names, and descriptions. This module intentionally ships only the interface and
 * an offline no-op so the package has zero hard dependency on any model SDK.
 */
export interface LlmProvider {
  /** Return a JSON object matching the requested shape. */
  completeJson<T>(system: string, user: string): Promise<T>;
}

export interface LlmOptions {
  enabled: boolean;
  model?: string;
}

/** Read LLM options from the environment. */
export function llmOptionsFromEnv(): LlmOptions {
  return {
    enabled: process.env.MCP_FORGE_LLM === '1' || process.env.MCP_FORGE_LLM === 'true',
    model: process.env.MCP_FORGE_LLM_MODEL,
  };
}

/**
 * Resolve a provider. Returns null in the default offline path. Wire a real provider
 * here (or inject one) when running inside an environment that has model access, e.g.
 * the Copilot skill that calls this CLI can post-process the deterministic output.
 */
export function resolveProvider(_opts: LlmOptions): LlmProvider | null {
  return null;
}
