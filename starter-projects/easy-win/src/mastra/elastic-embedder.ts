/**
 * elastic-embedder.ts - an AI SDK-compatible embedding model backed by
 * Elasticsearch's Inference API (POST /_inference/text_embedding/{id}).
 *
 * Why: Mastra's Memory embeds conversation messages client-side before
 * storing them in the vector store. Rather than downloading and running a
 * local embedding model, this asks YOUR Elasticsearch cluster to compute
 * the embeddings - the same Jina v5 model that powers `semantic_text` on
 * Elasticsearch Serverless. No extra API key, nothing to download.
 *
 * Default endpoint: `.jina-embeddings-v5-text-small` - preconfigured on
 * Elasticsearch Serverless (and stack 9.4+). Override with
 * MEMORY_INFERENCE_ID in .env, e.g. `.multilingual-e5-small-elasticsearch`
 * or your own inference endpoint on a self-managed cluster.
 */
import { Client } from "@elastic/elasticsearch";
import type { EmbeddingModelV2 } from "@ai-sdk/provider";

export function createElasticEmbedder(es: Client, inferenceId: string): EmbeddingModelV2<string> {
  return {
    specificationVersion: "v2",
    provider: "elasticsearch",
    modelId: inferenceId,
    maxEmbeddingsPerCall: 16,
    supportsParallelCalls: true,
    async doEmbed({ values }) {
      const result = await es.inference.textEmbedding({
        inference_id: inferenceId,
        input: values,
      });
      const embeddings = (result?.text_embedding ?? []).map((e) => e.embedding);
      if (embeddings.length !== values.length) {
        throw new Error(
          `Inference endpoint "${inferenceId}" returned ${embeddings.length} embeddings for ${values.length} inputs`
        );
      }
      return { embeddings };
    },
  };
}
