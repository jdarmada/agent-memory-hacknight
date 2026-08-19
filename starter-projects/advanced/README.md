# Advanced - Episodic Memory with Time Decay

A complete, working Mastra project where the agent's memory is **time-aware**: recent context outranks stale context, superseded decisions lose to their replacements, and just-consumed items get excluded. The retrieval machinery is fully built - **your challenge is the data and the tuning.**

## What's going on here

This is a Mastra port of Elastic's [agent-memory](https://github.com/jeffvestal/agent-memory) pattern ([blog post](https://www.elastic.co/search-labs/blog/persistent-memory-agents-elasticsearch-claude-code)). Where the original wired memory into Claude Code with lifecycle hooks, here memory is **tools the agent chooses to call** - watch it decide in the Studio trace.

Two memory systems live in this project:

### 1. The generic decision memory (`advanced-memory-agent`)
- **`remember`** stores typed memories - `decision`, `pattern`, `context`, `feedback` - in an `agent-memory` index. Text is embedded server-side via `semantic_text` (automatic Jina v5 on Serverless): no embedding pipeline to configure.
- **`recall`** retrieves with one ES|QL query (see `src/mastra/tools/memory-tools.ts`):
  - **`FORK`** runs two branches in parallel: BM25 keyword search (exact IDs, names) and semantic search (meaning, paraphrase);
  - **`FUSE`** merges them (Reciprocal Rank Fusion, or `FUSE LINEAR` with explicit weights);
  - **`DECAY`** multiplies the score by recency: `_score * DECAY(created_at, NOW(), <window>)` - the further back a memory, the less it counts. (The window is a `time_duration`, so the tools convert your day-denominated knobs to hours.)
- The agent's instructions enforce **memory discipline**: recall before deciding, prefer the most recent when memories conflict, cite what it used.

### 2. The worked example: the three-stage movie demo
The `movie-rec-*` agents show the whole idea on a relatable domain - run them before building your own:
- `movie-rec-bare` - no tools; fluent, generic, ungrounded.
- `movie-rec-catalog` - + long-term knowledge: hybrid search over a ~60-title catalog.
- `movie-rec-personal` - + **episodic memory**: a decay-weighted taste formula over watch history (`get_taste_profile`: `weight = DECAY(watched_at) * rating`, summed by genre) plus exclusion of just-watched titles. The seeded history contains a **planted taste shift** - months of rom-coms, then a recent sci-fi kick - so the decay window visibly changes who the agent thinks you are.

## Setup (5 minutes)

```bash
npm install
cp .env.example .env    # Elasticsearch URL + API key, OpenRouter key, unique AGENT_ID
npm run setup           # creates the agent-memory index
npm run seed:movies     # movie catalog + watch history (run day-of: backdated to today)
npm run dev             # opens Mastra Studio
```

**Requires Elasticsearch Serverless or 9.3+** - the `DECAY` function and `FUSE` command are recent ES|QL features. Serverless also gives you automatic embeddings. **Node 22.22+ (or 20.20+)** - the current LTS is easiest.

### See it work (5 more minutes)

Ask all three movie agents the same question - *"Recommend me something to watch tonight"* - and open the traces. Then **the decay flip**: change `TASTE_DECAY_DAYS=21` to `180` in `.env`, restart, ask again. Sci-fi kick → rom-com era. Same data, same agent, one knob: which *version of you* the memory remembers.

## Your challenge

1. **Get data with a shift or reversal** - a moment where the right answer *changed*:
   ```bash
   npm run seed:nimbus                                   # synthetic decision log, planted reversals
   npm run ingest:issues -- --repo owner/name --max 150  # any repo's closed issues (also your BYOD template)
   npm run ingest:markdown -- --dir ./corpus --tag adr   # cloned ADRs / PEPs / changelogs
   ```
   BYOD rule: real historical `created_at` timestamps, and at least one reversal - otherwise decay has nothing to show.
2. **Break it:** find the question where memory-blind or badly-tuned recall gives the confidently *stale* answer.
3. **Tune until it's right:**
   - `BRIDGE_MEMORY_DECAY_WINDOW` - hours-scale for incidents, weeks for taste, months for architecture decisions;
   - `FUSION_STRATEGY=linear` + `FUSION_BM25_WEIGHT` - push toward keyword for ID-heavy data, semantic for prose;
   - the ES|QL itself in `memory-tools.ts` - branch fields, limits, filters, or your own weighting formula (the taste profile in `movie-tools.ts` is a template);
   - the instructions in `advanced-agent.ts` - when to recall, how to resolve conflicts.
4. **Demo:** same question, before and after, trace visible, plus *why* your window and weights fit your domain.

**Bonus (rubric credit under "Use of Mastra"):** combine both memory layers - Mastra's built-in memory primitives (semantic recall + working memory, see the `memory-agent` in `../easy-win`) for the *conversation* layer, your ES|QL `remember`/`recall` tools for the *episodic* layer. One agent that remembers who it's talking to AND what changed over time.

## Troubleshooting

- **`DECAY(...)` type error** → the third argument must be a `time_duration` (`1080 hours`), not a `date_period` (`45 days`) - the tools already convert your day-denominated env knobs to hours; keep that pattern if you edit the query. If it still fails, swap in the `DATE_DIFF` fallback commented next to each DECAY line.
- **`semantic_text` errors on self-managed ES** → create a Jina inference endpoint and set `INFERENCE_ID`; or use Serverless.
- **Recall empty right after remember** → the tools use `refresh: "wait_for"`; keep it.
- **Decay changes nothing** → your data has no temporal spread. Seed scripts backdate for you; `ingest:markdown` warns when it falls back to file mtimes.

## Simpler start?

If this is too much machinery to begin with, start with the **Easy Win** project (`../easy-win`): Elasticsearch as plain long-term memory - no timestamps, no decay - then come back here to add the time dimension.
