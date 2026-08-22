const { GoogleGenAI } = require("@google/genai");

const client = new GoogleGenAI({ apiKey: "AIzaSyBFptsHe5FrKl9x-xYt9cMTZwzAiOCY3zk" });

async function test() {
  console.log("Testing gemini-3.6-flash...");
  try {
    const stream = await client.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: "Say hello in one sentence." }] }],
    });
    let full = "";
    let chunks = 0;
    for await (const chunk of stream) {
      if (chunk.text) { full += chunk.text; chunks++; }
    }
    console.log("✅ Response:", full || "(EMPTY)");
    console.log("   Chunks with text:", chunks);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

test();
