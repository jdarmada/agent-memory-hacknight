/**
 * Mastra registration - everything here appears in Studio (`npm run dev`).
 *
 * The challenge agent:
 *   advanced-memory-agent - typed memories, hybrid recall, time decay (tunable)
 *
 * The worked example (the kickoff's three-stage movie demo):
 *   movie-rec-bare      - Stage 0: no tools
 *   movie-rec-catalog   - Stage 1: + long-term knowledge (hybrid catalog search)
 *   movie-rec-personal  - Stage 2: + episodic memory (decay-weighted taste + exclusions)
 */
import { Mastra } from "@mastra/core";
import { advancedMemoryAgent } from "./agents/advanced-agent";
import { movieRecBare, movieRecCatalog, movieRecPersonal } from "./agents/movie-agents";

export const mastra = new Mastra({
  agents: { advancedMemoryAgent, movieRecBare, movieRecCatalog, movieRecPersonal },
});
