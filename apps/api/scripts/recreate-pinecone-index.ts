/**
 * Recreates the Pinecone index with 384 dimensions (matching all-MiniLM-L6-v2).
 * Run: npx tsx scripts/recreate-pinecone-index.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load env — same order as the API
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const INDEX_NAME = process.env.PINECONE_INDEX ?? "gitpulse";
const DIMENSIONS = 384; // all-MiniLM-L6-v2 output size

async function main() {
  if (!PINECONE_API_KEY) {
    console.error("❌ PINECONE_API_KEY is not set");
    process.exit(1);
  }

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

  // 1. Check existing indexes
  const { indexes } = await pc.listIndexes();
  const existing = indexes?.find((i) => i.name === INDEX_NAME);

  if (existing) {
    console.log(`Found existing index "${INDEX_NAME}" with ${existing.dimension} dimensions.`);

    if (existing.dimension === DIMENSIONS) {
      console.log("✅ Index already has correct dimensions (384). Nothing to do.");
      return;
    }

    console.log(`⚠️  Deleting old index (${existing.dimension}D) to recreate with ${DIMENSIONS}D...`);
    await pc.deleteIndex(INDEX_NAME);

    // Wait for deletion to propagate
    console.log("Waiting for deletion to complete...");
    await new Promise((r) => setTimeout(r, 10_000));
  }

  // 2. Create new index with correct dimensions
  console.log(`Creating new index "${INDEX_NAME}" with ${DIMENSIONS} dimensions...`);
  await pc.createIndex({
    name: INDEX_NAME,
    dimension: DIMENSIONS,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1",
      },
    },
  });

  // 3. Wait for it to become ready
  console.log("Waiting for index to be ready...");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5_000));
    const desc = await pc.describeIndex(INDEX_NAME);
    if (desc.status?.ready) {
      ready = true;
      break;
    }
    process.stdout.write(".");
  }

  if (ready) {
    console.log(`\n✅ Index "${INDEX_NAME}" is ready with ${DIMENSIONS} dimensions!`);
    console.log("You can now re-import your repositories and embeddings will work correctly.");
  } else {
    console.log("\n⚠️  Index created but not yet ready. It may take a few more seconds — check your Pinecone dashboard.");
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
