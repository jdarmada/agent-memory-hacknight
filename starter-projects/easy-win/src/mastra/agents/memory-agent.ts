/**
 * memory-agent.ts - reference: Mastra's BUILT-IN memory primitives on Elasticsearch.
 *
 * This is the other shape of "memory" in this project:
 *   easy-win-agent  → knowledge memory (your ingested data, searched as a tool)
 *   memory-agent    → conversation memory, via TWO Mastra primitives:
 *
 *   semanticRecall  - embeds conversation history into ElasticSearchVector and,
 *                     on each turn, recalls the most relevant past MESSAGES -
 *                     across threads, for the same resourceId.
 *   workingMemory   - a persistent profile the agent maintains itself: the
 *                     distilled FACTS (name, preferences) always in context,
 *                     no retrieval needed. Recall finds moments; the profile
 *                     remembers conclusions.
 *
 * Smoke test: tell it your name and a preference in one Studio thread, open a
 * NEW thread (same resource), and ask "what's my name, what do I like?" -
 * then open the trace to see the updateWorkingMemory call and the recall.
 */
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { ElasticSearchVector } from "@mastra/elasticsearch";
import { LibSQLStore } from "@mastra/libsql";
import { Client } from "@elastic/elasticsearch";
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
    // Working memory: a persistent, agent-maintained profile of the user.
    // Semantic recall finds relevant PAST MESSAGES; working memory keeps the
    // distilled FACTS always in context. Resource-scoped by default, so the
    // profile follows the user across threads. Watch the agent update it in
    // the Studio trace (updateWorkingMemory tool call).
    workingMemory: {
      enabled: true,
      template: `# User Profile
- Name:
- Favorite games / genres:
- Preferences (player count, session length, complexity):
- Dislikes / games to avoid:
`,
    },
  },
});

export const memoryAgent = new Agent({
  id: "memory-agent",
  name: "memory-agent",
  instructions:
    "You are a helpful assistant with memory of past conversations. " +
    "When relevant, use what you remember about the user naturally.",
  // maxOutputTokens capped so OpenRouter's credit pre-authorization doesn't
  // reject requests on small provisioned keys.
  model: [
    {
      model: "openrouter/anthropic/claude-sonnet-4.6",
      modelSettings: { maxOutputTokens: 2048 },
    },
  ],
  memory,
});
