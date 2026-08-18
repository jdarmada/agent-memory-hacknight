/**
 * knowledge-tools.ts - EASY WIN tool: hybrid search over YOUR data.
 *
 * Elasticsearch is the vector store: the semantic branch searches the
 * server-side embeddings (semantic_text), the keyword branch catches exact
 * names/IDs, and FUSE merges them. Works on whatever `ingest-knowledge.ts`
 * loaded - no timestamps, no decay, no tuning required to get started.
 */
import { createTool } from "@mastra/core/tools";
import { Client } from "@elastic/elasticsearch";
import { z } from "zod";
import "dotenv/config";

const es = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

const INDEX = process.env.KNOWLEDGE_INDEX ?? "knowledge-base";

function esqlEscape(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"').slice(0, 500);
}

export const searchKnowledge = createTool({
  id: "search_knowledge",
  description:
    "Search the knowledge base (the only source of truth). Use for EVERY factual answer or " +
    "recommendation - if it's not in the knowledge base, say so rather than guessing.",
  inputSchema: z.object({
    query: z.string().describe("What to look for - a topic, a name, an ID, or a vibe"),
    limit: z.number().min(1).max(15).default(5),
  }),
  outputSchema: z.object({
    results: z.array(z.object({ title: z.string(), content: z.string(), score: z.number() })),
  }),
  execute: async ({ context }) => {
    const q = esqlEscape(context.query);
    const query = `
FROM ${INDEX} METADATA _id, _score, _index
| FORK (
    WHERE title:"${q}" OR content:"${q}"
    | SORT _score DESC | LIMIT 50
) (
    WHERE content_semantic:"${q}"
    | SORT _score DESC | LIMIT 50
)
| FUSE
| SORT _score DESC | LIMIT ${context.limit}
| KEEP title, content, _score
`.trim();

    const result = await es.esql.query({ query, format: "json" });
    const cols = (result as any).columns.map((c: { name: string }) => c.name);
    const idx = (n: string) => cols.indexOf(n);
    const results = ((result as any).values as unknown[][]).map((row) => ({
      title: String(row[idx("title")]),
      content: String(row[idx("content")]).slice(0, 800),
      score: Number(row[idx("_score")]),
    }));
    return { results };
  },
});
