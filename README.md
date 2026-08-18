# Agent Memory Hacknight - Mastra × Elasticsearch

Build a Mastra agent that can use past context stored in Elasticsearch to make smarter decisions.

## Setup

1. Sign up for [DevPost](https://devpost.com/) (required to submit and win prizes)

2. Start an Elastisearch Serverless [free-trial](https://cloud.elastic.co/serverless-registration?utm_source=github&utm_medium=event&utm_campaign=2026-08-19-hacknight-sf-amer&utm_content=link)

## The Challenge - Two Pathways

### Tier 1 - Easy Win (start here): Elasticsearch as long-term memory

Ground a Mastra agent on **your data**. Elasticsearch is the vector store — embeddings computed server-side, hybrid (keyword + vector) search already wired into the agent as a tool. **Your job: connect your cluster and ingest a dataset** (JSON or a folder of markdown; sample data included). No timestamps needed - any corpus works: games, recipes, docs, products, songs.


### Tier 2 - Advanced: episodic memory with time decay

Add the time dimension: typed memories retrieved with hybrid recall (ES|QL `FORK` → `FUSE`) weighted by **`DECAY`** - recent context outranks stale context, superseded decisions lose to their replacements. The retrieval machinery is fully built (including the three-stage movie demo from the kickoff as a worked example). **Your job: data with a shift or reversal, and the tuning** - decay window, fusion weights, the query itself, the agent's instructions.


## Submission + Presentation

Submit your project to DevPost before presenting. Presentations are 2 mins MAX, please focus on telling the Elasticsearch and Mastra parts. Use Mastra studio to show agent traces.

## Judging + Rubric

- Use of Elasticsearch
- Use of Mastra
- Creative use cases

## Resources