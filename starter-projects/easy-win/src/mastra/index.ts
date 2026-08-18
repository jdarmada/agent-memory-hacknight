/**
 * Mastra registration - everything here appears in Studio (`npm run dev`).
 *
 *   bare-llm-agent   - the "before": ungrounded LLM
 *   easy-win-agent   - grounded on your data via hybrid search over Elasticsearch
 *   memory-agent     - reference: Mastra's built-in Memory (semanticRecall)
 *                      using Elasticsearch as the vector store
 */
import { Mastra } from "@mastra/core";
import { bareLlmAgent, easyWinAgent } from "./agents/easy-agents";
import { memoryAgent } from "./agents/memory-agent";

export const mastra = new Mastra({
  agents: { bareLlmAgent, easyWinAgent, memoryAgent },
});
