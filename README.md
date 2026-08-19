# Agent Memory Hacknight - Mastra × Elasticsearch

Build a Mastra agent that can use past context stored in Elasticsearch to make smarter decisions.

## Setup

1. Create an account and register for the hack night on [DevPost](https://ela.st/memory) (required to submit and win prizes)

2. Start an Elasticsearch Serverless [free-trial](https://cloud.elastic.co/serverless-registration?utm_source=github&utm_medium=event&utm_campaign=2026-08-19-hacknight-sf-amer&utm_content=link)

3. Grab your OpenRouter API key from the organizers (one per attendee) - the starter agents use it for the LLM via `OPENROUTER_API_KEY` in `.env`

## The Challenge - Two Pathways

### Tier 1 - Easy Win (start here): Elasticsearch as long-term memory

Ground a Mastra agent on **your data**. Elasticsearch is the vector store - embeddings computed server-side, hybrid (keyword + vector) search already wired into the agent as a tool. **Your job: connect your cluster and ingest a dataset** (JSON or a folder of markdown; sample data included). No timestamps needed - any corpus works: games, recipes, docs, products, songs.

Project Link: [`starter-projects/easy-win`](./starter-projects/easy-win)

### Tier 2 - Advanced: episodic memory with time decay

Add the time dimension: typed memories retrieved with hybrid recall (ES|QL `FORK` → `FUSE`) weighted by **`DECAY`** - recent context outranks stale context, superseded decisions lose to their replacements. The retrieval machinery is fully built (including the three-stage movie demo from the kickoff as a worked example). **Your job: data with a shift or reversal, and the tuning** - decay window, fusion weights, the query itself, the agent's instructions.

Project Link: [`starter-projects/advanced`](./starter-projects/advanced)


## Submission + Presentation

Some presentation guidelines:
1. Submit your project to DevPost before presenting. 
2. Presentations are 1-2 mins MAX. Show a before/after: the same question answered without memory vs. with it, with the Mastra Studio trace visible.
3. If you used Mastra's memory primitives (semantic recall / working memory) on Elasticsearch, show them in the trace - that's rubric credit under "Use of Mastra."

## Judging + Rubric

| Criteria | Description |
|----------|-------------|
| **Use of Elasticsearch** | Demonstrates meaningful use of Elasticsearch as a memory store and features such as search, aggregations, and vector search. Tuning the retrieval itself counts here - decay window, fusion strategy/weights, or the ES\|QL query (`FORK`/`FUSE`/`DECAY`) from the advanced starter - especially when you can show *why* your settings fit your data. |
| **Use of Mastra** | Uses Mastra framework to build AI agents and shows agent traces using Mastra Studio. Using Mastra's memory primitives (semantic recall, working memory) with Elasticsearch as the backing store counts here - the `memory-agent` in the easy-win starter shows the pattern. |
| **Creativity** | Presents a unique idea, novel user experience, or interesting technical implementation. |
| **Usefulness** | Solves a real problem or provides valuable insights from the data. |


## Prizes

The **top three projects** will each win a **Lego Icons: Bonsai Tree**.

Good luck, have fun, and happy hacking!


## Resources

### The pattern this event is built on
- [Persistent memory for agents: Claude Code on Elasticsearch](https://www.elastic.co/search-labs/blog/persistent-memory-agents-elasticsearch-claude-code) — the blog post the advanced tier ports (hybrid recall, `FUSE`, `DECAY`, `semantic_text`)
- [jeffvestal/agent-memory](https://github.com/jeffvestal/agent-memory) — the original repo; the ES|QL lives in `lib/memory.sh`. The author invites framework ports — a clean extension tonight is PR-worthy

### Mastra × Elasticsearch
- [How to build agentic AI applications with Mastra & Elasticsearch](https://www.elastic.co/search-labs/blog/build-agentic-ai-applications-mastra-elasticsearch) - Elastic's walkthrough of the native integration
- [Build a RAG agent with Mastra and Elasticsearch](https://mastra.ai/blog/build-rag-agent-mastra-elasticsearch) — Mastra's companion post (~60-line agent)
- [elastic/mastra-elasticsearch-example](https://github.com/elastic/mastra-elasticsearch-example) — official reference app
- [ElasticSearchVector reference](https://mastra.ai/reference/vectors/elasticsearch) — Mastra docs for the vector store class

### Mastra docs
- [Agents](https://mastra.ai/docs/agents/overview) · [Tools](https://mastra.ai/docs/agents/using-tools) · [Vector databases](https://mastra.ai/docs/rag/vector-databases)
- Memory primitives: [Memory overview](https://mastra.ai/docs/memory/overview) · [Semantic recall](https://mastra.ai/docs/memory/semantic-recall) · [Working memory](https://mastra.ai/docs/memory/working-memory)
- Mastra Studio launches with `npm run dev` - use it to show your agent traces

### Elasticsearch docs
- [ES|QL reference](https://www.elastic.co/docs/reference/query-languages/esql) — `FORK`, `FUSE`, and `DECAY` (the advanced tier's whole trick; requires Serverless or 9.3+)
- [semantic_text](https://www.elastic.co/docs/solutions/search/semantic-search/semantic-search-semantic-text) — server-side embeddings, automatic on Serverless
- [Elasticsearch JS client](https://www.elastic.co/docs/reference/elasticsearch/clients/javascript)