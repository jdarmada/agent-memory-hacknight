# Easy Win - Elasticsearch as Your Agent's Long-Term Memory

A complete, working Mastra project. Your only job: **connect your Elasticsearch cluster and give it data.** Everything else - the index, the embeddings, the search tool, the agent - is already built.

## What's going on here

An LLM on its own is fluent but ungrounded: it doesn't know what's in *your* catalog, docs, or dataset, and it will confidently fill gaps with plausible inventions. This project fixes that by giving a Mastra agent **long-term memory in Elasticsearch**:

1. **Your data becomes memory.** `src/ingest-knowledge.ts` loads a JSON file or a folder of markdown into an Elasticsearch index. The text is embedded **server-side** via `semantic_text` - on Elasticsearch Serverless this uses Jina v5 automatically, so there is no embedding model, API key, or pipeline for you to configure. Elasticsearch is the vector store.
2. **The agent searches it - hybrid.** The `search_knowledge` tool (in `src/mastra/tools/knowledge-tools.ts`) runs an ES|QL query with two parallel branches - classic keyword search (BM25) for exact names and IDs, vector/semantic search for meaning and vibes - merged with `FUSE`. So "Gloomhaven" and "a long co-op campaign for two" both find the right entry.
3. **The agent is disciplined.** `easy-win-agent`'s instructions (in `src/mastra/agents/easy-agents.ts`) make the knowledge base the *only* source of truth: it must search before answering, cite the entries it used, and say "that's not in my knowledge base" instead of guessing. The *model* decides when to call the tool - watch it happen in the Studio trace.

The third registered agent, `memory-agent`, is a reference implementation of Mastra's **built-in memory primitives** using `ElasticSearchVector` - conversation memory across threads, as opposed to the knowledge-base memory above. It exercises two primitives (both count toward "Use of Mastra" in the judging rubric):

- **Semantic recall** - past *messages*, embedded and retrieved by meaning. Your cluster computes the embeddings via the Inference API (Jina v5, preconfigured on Serverless - see `src/mastra/elastic-embedder.ts`) and stores them as vectors.
- **Working memory** - a persistent user *profile* (name, preferences) the agent maintains itself and always has in context. Watch it update in the Studio trace (`updateWorkingMemory`).

Raw message history lands in a local `memory.db` SQLite file (Mastra requires a storage adapter for that part). Compare both agents to see the two shapes of "memory."

## Setup (5 minutes)

**Requires Node 22.22+ (or 20.20+)** - the current LTS is easiest. Older versions install with warnings from Mastra's dependencies.

1. **Clone the repo** (skip if you already did) and enter this project:

   ```bash
   git clone https://github.com/jdarmada/agent-memory-hacknight.git
   cd agent-memory-hacknight/starter-projects/easy-win
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure credentials** - copy the template, then edit `.env`:

   ```bash
   cp .env.example .env
   ```

   - `ELASTICSEARCH_URL` + `ELASTICSEARCH_API_KEY` - from your Serverless project (Cloud console → your project → *Endpoints & API keys*)
   - `OPENROUTER_API_KEY` - handed out by the organizers

4. **Ingest a sample dataset** (creates the index on first run - no separate setup step):

   ```bash
   npm run ingest -- --file ./sample-data/board-games.json
   ```

   Four datasets ship in `sample-data/` - pick whichever you'd rather demo:
   - `board-games.json` - 10 games (genre, player count, playtime)
   - `recipes.json` - 18 recipes (cuisine, time, difficulty, diet)
   - `sf-hikes.json` - 16 Bay Area hikes (region, distance, difficulty, dogs, transit)
   - `cocktails.json` - 18 cocktails (spirit, style, difficulty, glass)

   To swap datasets, point `KNOWLEDGE_INDEX` in `.env` at a fresh index name (e.g. `recipes-kb`) and re-run ingest - each corpus gets its own index.

5. **Launch Mastra Studio:**

   ```bash
   npm run dev
   ```

   Open http://localhost:4111, pick an agent (`bare-llm-agent`, `easy-win-agent`, or `memory-agent`), and chat.

### Bring your own data

- **JSON** (array or NDJSON), each object needing at least `title` and `content` - extra fields are kept as filterable metadata:
  ```bash
  npm run ingest -- --file ./my-data.json
  ```
- **A folder of markdown/text files** (title = first `#` heading or the filename):
  ```bash
  npm run ingest -- --dir ./my-docs
  ```

**Requirements - deliberately minimal for this tier:**

- Each entry needs a `title` and a `content` string; everything else is optional. **No timestamps needed.**
- `content` should carry the *meaning* - a sentence or three of real description, not just a name. Semantic search matches vibes ("cozy game for two"), and it can only match what's written.
- Extra fields (`genre`, `cuisine`, `price`...) come along as metadata automatically - the shipped datasets show the shape.
- Sweet spot is ~10-500 entries. Ten is enough to demo; don't burn hack time ingesting thousands.

**Fast sources that convert in minutes:** an export from your notes app or bookmarks, a `docs/` folder from any repo (use `--dir`), a playlist or watchlist export, any Kaggle CSV converted to `[{title, content, ...}]` with a few lines of scripting, or ask an LLM to generate 20 entries about something you know deeply - synthetic data is fine here, the demo is about *grounding*, not provenance.

## Your demo (the before/after)

Ask the **same question** to both agents in Studio:

1. `bare-llm-agent` - answers from general knowledge: generic, possibly recommending things that don't exist in your data, possibly inventing details.
2. `easy-win-agent` - calls `search_knowledge` (open the trace and show it), recommends only real entries, cites them by title.

**The money shot:** ask about something *not* in your data. The bare agent happily answers; the grounded agent says it's not in the knowledge base. Grounding visibly doing work - that's the demo.

Try with the sample data: *"Recommend a cooperative game for 2 players that plays in under an hour"* (should surface Pandemic / The Crew, with citations), then *"What do you know about Monopoly?"* (not in the index - the grounded agent should say so).

**Bonus beat - the memory primitives (rubric credit):** switch to `memory-agent`, tell it *"I'm <name>, I love co-op games but nothing longer than an hour"*, then open a **new thread** and ask *"what should I play tonight?"* It knows who you are from working memory, recalls the earlier conversation semantically - and the Studio trace shows both (`updateWorkingMemory` + the recalled messages). That's Mastra's memory API running on your Elasticsearch cluster.

## Where to tweak

- **The search:** field list, limits, and fusion in `knowledge-tools.ts` - it's one readable ES|QL query.
- **The discipline:** the agent instructions in `easy-agents.ts` - how strictly it refuses, how it cites.
- **The index:** `KNOWLEDGE_INDEX` in `.env` if you want multiple corpora side by side.
- **The memory embeddings:** on Serverless nothing to configure; on self-managed Elasticsearch set `MEMORY_INFERENCE_ID` in `.env` to a `text_embedding` inference endpoint on your cluster (e.g. `.multilingual-e5-small-elasticsearch`).

## Troubleshooting

- **Studio spinner never resolves (no answer, no error)** → check the terminal running `npm run dev` - it's almost always an OpenRouter 402 (key out of credits; Studio's UI swallows stream errors silently). Flag an organizer for a fresh key.
- **Agent answers but never cites your data** → the ingest step didn't run against this cluster, or `KNOWLEDGE_INDEX` in `.env` doesn't match the index you ingested into.
- **"Memory not enabled" notice on an agent** → expected for `bare-llm-agent` and `easy-win-agent` (their memory is the knowledge base, not the conversation); only `memory-agent` persists threads.

## Done early? Climb.

The **Advanced** starter (`../advanced`) adds the time dimension: episodic memory where recent context outranks stale context via an ES|QL `DECAY` formula - recommendations that know what you did *lately*, decisions that respect what was *superseded*. If your data has timestamps and at least one "the answer changed" moment, that's your next rung.
