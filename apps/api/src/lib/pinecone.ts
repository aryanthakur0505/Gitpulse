import { Pinecone, type Index, type PineconeRecord, type RecordMetadata } from "@pinecone-database/pinecone";
import { env } from "../config/env";
import { logger } from "./logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    chunkId: string;
    fileId: string;
    repositoryId: string;
    filePath: string;
    startLine: number;
    endLine: number;
    content: string; // stored for context retrieval in Phase 4 without a DB round-trip
  };
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: VectorRecord["metadata"];
}

// ─── Singleton Client ─────────────────────────────────────────────────────────

let _client: Pinecone | null = null;
let _index: Index | null = null;

function getPineconeClient(): Pinecone {
  if (!_client) {
    _client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  }
  return _client;
}

export function getPineconeIndex(): Index {
  if (!_index) {
    const client = getPineconeClient();
    _index = client.index(env.PINECONE_INDEX);
    logger.info(`[Pinecone] Connected to index: ${env.PINECONE_INDEX}`);
  }
  return _index;
}

// ─── Namespace Helpers ────────────────────────────────────────────────────────

/**
 * Produces a deterministic Pinecone namespace for a repository.
 * Scoping by namespace lets us do per-repo semantic search in Phase 4
 * without any metadata filtering overhead.
 */
export function repoNamespace(repositoryId: string): string {
  return `repo-${repositoryId}`;
}

// ─── Vector Operations ────────────────────────────────────────────────────────

/**
 * Upserts a batch of vectors into the repository's namespace.
 * Pinecone recommends batches of ≤100 vectors per upsert call.
 */
export async function upsertVectors(
  repositoryId: string,
  vectors: VectorRecord[]
): Promise<void> {
  if (vectors.length === 0) return;

  const index = getPineconeIndex();
  const ns = repoNamespace(repositoryId);

  try {
    const records: PineconeRecord<RecordMetadata>[] = vectors.map((v) => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata as RecordMetadata,
    }));
    await index.namespace(ns).upsert({ records });
  } catch (err) {
    logger.error("[Pinecone] Failed to upsert vectors", {
      namespace: ns,
      vectorCount: vectors.length,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Deletes ALL vectors in a repository's namespace.
 * Called when a repository is deleted so we don't leave orphaned vectors.
 */
export async function deleteNamespace(repositoryId: string): Promise<void> {
  const index = getPineconeIndex();
  const ns = repoNamespace(repositoryId);

  try {
    await index.namespace(ns).deleteAll();
    logger.info(`[Pinecone] Deleted namespace: ${ns}`);
  } catch (err) {
    // Non-fatal — log and continue. An empty/missing namespace deletion
    // can throw on some Pinecone plan types.
    logger.warn("[Pinecone] Failed to delete namespace (may not exist)", {
      namespace: ns,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Performs a semantic similarity search against a repository's namespace.
 * Returns the top-K most relevant chunks.
 *
 * Used in Phase 4 (RAG chat) to retrieve context for a user's question.
 */
export async function queryVectors(
  repositoryId: string,
  queryVector: number[],
  topK: number = 10
): Promise<SearchResult[]> {
  const index = getPineconeIndex();
  const ns = repoNamespace(repositoryId);

  try {
    const response = await index.namespace(ns).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    return (response.matches ?? []).map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: match.metadata as VectorRecord["metadata"],
    }));
  } catch (err) {
    logger.error("[Pinecone] Vector query failed", {
      namespace: ns,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
