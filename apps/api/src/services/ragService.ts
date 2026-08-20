import { generateEmbeddings } from "../lib/localEmbeddings";
import { queryVectors, type SearchResult } from "../lib/pinecone";
import { streamChatCompletion, type ChatMessage } from "../lib/llm";
import { logger } from "../lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RagSource {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

export interface RagResult {
  answer: string;
  sources: RagSource[];
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are GitPulse, an expert AI assistant specialized in analyzing and explaining codebases. You help developers understand code by answering questions based on actual source code snippets retrieved from the repository.

When answering:
- Be precise and reference specific files, functions, or line numbers when relevant.
- Use markdown formatting: code blocks (\`\`\`) for code, headers for sections.
- If the context doesn't contain enough information to fully answer, say so honestly.
- Do not make up code or functionality that isn't in the provided context.
- Keep answers focused and developer-friendly.`;

// ─── Context Builder ──────────────────────────────────────────────────────────

function buildContextString(sources: SearchResult[]): string {
  return sources
    .map(
      (s, i) =>
        `### Source ${i + 1}: \`${s.metadata.filePath}\` (lines ${s.metadata.startLine}-${s.metadata.endLine})\n\`\`\`\n${s.metadata.content}\n\`\`\``
    )
    .join("\n\n");
}

// ─── RAG Pipeline ─────────────────────────────────────────────────────────────

/**
 * Runs the full RAG pipeline for a user question:
 * 1. Embeds the question locally.
 * 2. Retrieves the top-K relevant code chunks from Pinecone.
 * 3. Streams an LLM response grounded in those chunks.
 *
 * @param repositoryId  The repository to search
 * @param question      The user's question
 * @param history       Prior conversation messages for multi-turn context
 * @param onToken       Callback fired for each streamed token
 * @returns             Full answer text + source citations
 */
export async function runRagPipeline(
  repositoryId: string,
  question: string,
  history: ChatMessage[],
  onToken: (token: string) => void
): Promise<RagResult> {
  // 1. Embed the question
  logger.info("[RAG] Embedding question", { repositoryId });
  const [queryVector] = await generateEmbeddings([question]);

  if (!queryVector) {
    throw new Error("Failed to embed question");
  }

  // 2. Retrieve relevant chunks from Pinecone
  logger.info("[RAG] Querying Pinecone for relevant chunks", { repositoryId });
  const searchResults = await queryVectors(repositoryId, queryVector, 8);

  const sources: RagSource[] = searchResults.map((r) => ({
    filePath: r.metadata.filePath,
    startLine: r.metadata.startLine,
    endLine: r.metadata.endLine,
    content: r.metadata.content,
    score: r.score,
  }));

  logger.info(`[RAG] Retrieved ${sources.length} sources`, { repositoryId });

  // 3. Build messages for the LLM
  const contextString =
    sources.length > 0
      ? buildContextString(searchResults)
      : "No relevant code found in the repository for this question.";

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: `Here are the most relevant code snippets from the repository:\n\n${contextString}\n\n---\n\nQuestion: ${question}`,
    },
  ];

  // 4. Stream the LLM response
  logger.info("[RAG] Streaming LLM response", { repositoryId });
  const answer = await streamChatCompletion(messages, onToken);

  return { answer, sources };
}
