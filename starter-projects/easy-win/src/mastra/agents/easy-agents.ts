/**
 * easy-agents.ts — the EASY WIN tier.
 *
 * Elasticsearch as the agent's long-term memory / vector store.
 * All you do: connect your cluster and ingest your data —
 *   npm run ingest -- --file ./sample-data/board-games.json   (or --dir ./docs)
 *
 * Demo: ask the SAME question to `bare-llm-agent` and `easy-win-agent`.
 * The bare one guesses or hallucinates; the grounded one cites only what
 * is really in your index — and says so when the answer isn't there.
 */
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { searchKnowledge } from "../tools/knowledge-tools";
import "dotenv/config";

const model = anthropic("claude-sonnet-4-6");

// The "before": no tools, no grounding.
export const bareLlmAgent = new Agent({
  name: "bare-llm-agent",
  instructions: "You are a helpful assistant. Answer from general knowledge, concisely.",
  model,
});

// The EASY WIN: grounded on YOUR data in Elasticsearch.
export const easyWinAgent = new Agent({
  name: "easy-win-agent",
  instructions: `You are an assistant grounded in a knowledge base.

Rules:
- Call search_knowledge for EVERY factual answer or recommendation. The knowledge base is your only source of truth.
- Only state things supported by the search results. If the knowledge base has nothing relevant, say so plainly — never fill the gap from general knowledge.
- Cite which entries you used (by title) so the user can verify.`,
  model,
  tools: { searchKnowledge },
});
