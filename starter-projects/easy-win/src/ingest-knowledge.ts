/**
 * ingest-knowledge.ts — EASY WIN ingest: load YOUR data into Elasticsearch
 * as the agent's long-term memory. No timestamps required.
 *
 * Elasticsearch is the vector store: every document's text is embedded
 * server-side via semantic_text (Jina v5 on Serverless, automatically),
 * so there is no client-side embedding pipeline to configure.
 *
 * Two input modes — pick whichever matches your data:
 *
 *   JSON file (array or NDJSON) with at least {title, content}; any extra
 *   string/number fields are kept as filterable metadata:
 *     npx tsx src/ingest-knowledge.ts --file ./my-data.json
 *
 *   Folder of markdown/text files (title = first heading or filename):
 *     npx tsx src/ingest-knowledge.ts --dir ./my-docs
 *
 * Then talk to the `easy-win-agent` in Mastra Studio. That's the whole loop:
 * connect cluster → ingest data → grounded agent.
 */
import { Client } from "@elastic/elasticsearch";
import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import "dotenv/config";

const es = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

const INDEX = process.env.KNOWLEDGE_INDEX ?? "knowledge-base";
const INFERENCE_ID = process.env.INFERENCE_ID || undefined;
const semanticField = INFERENCE_ID
  ? { type: "semantic_text" as const, inference_id: INFERENCE_ID }
  : { type: "semantic_text" as const };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

type Doc = { title: string; content: string; [k: string]: unknown };

async function loadFromJson(file: string): Promise<Doc[]> {
  const raw = await readFile(file, "utf8");
  const parsed = raw.trimStart().startsWith("[")
    ? (JSON.parse(raw) as Doc[])
    : raw.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Doc);
  return parsed.filter((d) => d.title && d.content);
}

async function loadFromDir(dir: string): Promise<Doc[]> {
  const docs: Doc[] = [];
  async function walk(d: string) {
    for (const entry of await readdir(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") await walk(p);
      else if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) {
        const text = await readFile(p, "utf8");
        const h1 = text.match(/^#\s+(.+)$/m);
        docs.push({
          title: (h1 ? h1[1] : basename(p).replace(/\.(md|txt)$/i, "")).slice(0, 300),
          content: text.slice(0, 6000),
          source: p,
        });
      }
    }
  }
  await walk(dir);
  return docs;
}

async function main() {
  const file = arg("file");
  const dir = arg("dir");
  if (!file && !dir) {
    console.error("Usage: npx tsx src/ingest-knowledge.ts --file data.json  OR  --dir ./docs");
    process.exit(1);
  }

  const docs = file ? await loadFromJson(file) : await loadFromDir(dir!);
  if (docs.length === 0) {
    console.error("No documents found. JSON mode needs {title, content} objects; dir mode needs .md/.txt files.");
    process.exit(1);
  }

  if (!(await es.indices.exists({ index: INDEX }))) {
    await es.indices.create({
      index: INDEX,
      mappings: {
        dynamic: true, // extra metadata fields become filterable automatically
        properties: {
          title: { type: "text", fields: { keyword: { type: "keyword" } } },
          content: { type: "text" },
          content_semantic: semanticField,
        },
      },
    });
    console.log(`Created ${INDEX}`);
  }

  const BATCH = 40;
  const operations = docs.flatMap((d, i) => [
    { index: { _index: INDEX, _id: `kb-${String(i).padStart(5, "0")}` } },
    { ...d, content_semantic: `${d.title}. ${d.content}` },
  ]);
  for (let i = 0; i < operations.length; i += BATCH * 2) {
    const r = await es.bulk({ operations: operations.slice(i, i + BATCH * 2), refresh: i + BATCH * 2 >= operations.length });
    if (r.errors) console.error("Batch errors at doc", i / 2, "— first:", JSON.stringify((r.items as any[]).find((x) => x.index?.error)?.index?.error));
    console.log(`Indexed ${Math.min((i + BATCH * 2) / 2, docs.length)}/${docs.length}`);
  }

  console.log(`Done: ${docs.length} documents in '${INDEX}'.`);
  console.log("Now open Mastra Studio and ask the easy-win-agent about your data.");
  console.log("Easy-win demo = ask the SAME question to a bare LLM vs this grounded agent.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
