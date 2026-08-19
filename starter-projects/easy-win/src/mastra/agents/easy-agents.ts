/**
 * easy-agents.ts - the EASY WIN tier.
 *
 * Elasticsearch as the agent's long-term memory / vector store.
 * All you do: connect your cluster and ingest your data -
 *   npm run ingest -- --file ./sample-data/board-games.json   (or --dir ./docs)
 *
 * Demo: ask the SAME question to `bare-llm-agent` and `easy-win-agent`.
 * The bare one guesses or hallucinates; the grounded one cites only what
 * is really in your index - and says so when the answer isn't there.
 */
import { Agent } from "@mastra/core/agent";
import { searchKnowledge } from "../tools/knowledge-tools";
import "dotenv/config";

// Mastra's built-in model router: routes through OpenRouter using the
// OPENROUTER_API_KEY from .env - no provider SDK needed.
// maxOutputTokens matters: OpenRouter pre-authorizes the full output budget
// against your credit balance, so an uncapped request 402s on small keys.
const model = [
  {
    model: "openrouter/anthropic/claude-sonnet-4.6",
    modelSettings: { maxOutputTokens: 2048 },
  },
];

// The "before": no tools, no grounding.
export const bareLlmAgent = new Agent({
  id: "bare-llm-agent",
  name: "bare-llm-agent",
  instructions: "You are a helpful assistant. Answer from general knowledge, concisely.",
  model,
});

// The EASY WIN: grounded on YOUR data in Elasticsearch.
export const easyWinAgent = new Agent({
  id: "easy-win-agent",
  name: "easy-win-agent",
  instructions: `You are an assistant grounded in a knowledge base.

Rules:
- Call search_knowledge for EVERY factual answer or recommendation. The knowledge base is your only source of truth.
- Only state things supported by the search results. If the knowledge base has nothing relevant, say so plainly - never fill the gap from general knowledge.
- Cite which entries you used (by title) so the user can verify.`,
  model,
  tools: { searchKnowledge },
});
