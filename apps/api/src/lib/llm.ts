import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { logger } from "./logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Singleton Client ─────────────────────────────────────────────────────────

let _gemini: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!_gemini) {
    _gemini = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return _gemini;
}

// ─── Streaming Completion ─────────────────────────────────────────────────────

const MODEL = "gemini-3.6-flash"; // Fast and capable Gemini model

/**
 * Streams a chat completion from Gemini and calls `onToken` for each text chunk.
 * Returns the full accumulated response text when done.
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  onToken: (token: string) => void
): Promise<string> {
  const client = getGeminiClient();

  try {
    // Extract system instructions if provided
    const systemMessage = messages.find((m) => m.role === "system");
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    // Filter out the system message and map to Gemini format
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const responseStream = await client.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temp for more deterministic code-focused answers
      },
    });

    let fullText = "";

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onToken(chunk.text);
        fullText += chunk.text;
      }
    }

    return fullText;
  } catch (err) {
    logger.error("[LLM] Gemini streaming failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
