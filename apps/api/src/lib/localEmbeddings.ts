import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";
import { logger } from "./logger";

// ─── Singleton Pipeline ───────────────────────────────────────────────────────

let _pipeline: Promise<FeatureExtractionPipeline> | null = null;

// all-MiniLM-L6-v2: 384 dims, fast and local
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

export async function getEmbeddingPipeline() {
  if (!_pipeline) {
    logger.info(`[LocalEmbeddings] Loading model ${EMBEDDING_MODEL} (this may take a moment on first run)...`);
    _pipeline = pipeline("feature-extraction", EMBEDDING_MODEL, {
      quantized: true,
    }) as Promise<FeatureExtractionPipeline>;
  }
  return _pipeline;
}

/**
 * Generates embeddings for an array of text inputs in a single batch.
 *
 * Returns a parallel array of vectors (number[][]) in the same order as
 * the input texts.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const embedder = await getEmbeddingPipeline();

    // Generate embeddings with mean pooling and L2 normalization
    const output = await embedder(texts, { pooling: "mean", normalize: true });
    
    // The output tensor data is a flat Float32Array. We chunk it into [batchSize, dims].
    const batchSize = texts.length;
    const dims = output.dims[output.dims.length - 1] ?? 384; // 384 is the fallback
    
    const embeddings: number[][] = [];
    const flatData = output.data;
    
    for (let i = 0; i < batchSize; i++) {
      const start = i * dims;
      // Convert Float32Array slice to a standard JS Array<number>
      const vector = Array.from(flatData.slice(start, start + dims)) as number[];
      embeddings.push(vector);
    }
    
    return embeddings;
  } catch (err) {
    logger.error("[LocalEmbeddings] Failed to generate embeddings", {
      error: err instanceof Error ? err.message : String(err),
      inputCount: texts.length,
    });
    throw err;
  }
}
