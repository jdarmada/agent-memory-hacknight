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
import { LibSQLStore } from "@mastra/libsql";
import { Client } from "@elastic/elasticsearch";
import { anthropic } from "@ai-sdk/anthropic"; // or your provider of choice
import { createElasticEmbedder } from "../elastic-embedder";
import "dotenv/config";

const esVector = new ElasticSearchVector({
  id: "es-vector",
  url: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

const es = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

const memory = new Memory({
  // Message history (threads + messages) lives in a local SQLite file;
  // Mastra requires an explicit storage adapter for Memory.
  storage: new LibSQLStore({
    id: "memory-storage",
    url: "file:./memory.db",
  }),
  vector: esVector,
  // Embeddings are computed by YOUR Elasticsearch cluster via the Inference
  // API (Jina v5, preconfigured on Serverless) - see ../elastic-embedder.ts.
  embedder: createElasticEmbedder(
    es,
    process.env.MEMORY_INFERENCE_ID ?? ".jina-embeddings-v5-text-small"
  ),
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
  id: "memory-agent",
  name: "memory-agent",
  instructions:
    "You are a helpful assistant with memory of past conversations. " +
    "When relevant, use what you remember about the user naturally.",
  model: anthropic("claude-sonnet-4-6"),
  memory,
});
