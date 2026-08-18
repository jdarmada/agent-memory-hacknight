/**
 * memory-agent.ts - reference: Mastra's BUILT-IN memory on Elasticsearch.
 *
 * This is the other shape of "memory" in this project:
 *   easy-win-agent  → knowledge memory (your ingested data, searched as a tool)
 *   memory-agent    → conversation memory (past messages, recalled automatically)
 *
 * Mastra's Memory embeds conversation history into ElasticSearchVector and,
 * on each turn, semantically recalls the most relevant past messages -
 * across threads, for the same resourceId. Nothing to ingest; just chat.
 *
 * Smoke test: tell it your name in one Studio thread, open a NEW thread
 * (same resource), and ask "what's my name?"
 */
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { ElasticSearchVector } from "@mastra/elasticsearch";
import { anthropic } from "@ai-sdk/anthropic"; // or your provider of choice
import "dotenv/config";

const esVector = new ElasticSearchVector({
  id: "es-vector",
  url: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

const memory = new Memory({
  vector: esVector,
  options: {
    lastMessages: 10,
    semanticRecall: {
      topK: 5,
      messageRange: 2,
      scope: "resource", // recall across all threads for the same user
    },
  },
});

export const memoryAgent = new Agent({
  name: "memory-agent",
  instructions:
    "You are a helpful assistant with memory of past conversations. " +
    "When relevant, use what you remember about the user naturally.",
  model: anthropic("claude-sonnet-4-6"),
  memory,
});
