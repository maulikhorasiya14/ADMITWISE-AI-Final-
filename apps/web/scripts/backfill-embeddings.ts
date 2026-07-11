import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { syncContentEmbeddings } from "../src/features/counsellor/embeddingSync.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

async function main() {
  console.log("Syncing content embeddings...");
  const result = await syncContentEmbeddings();
  console.log(`Embedded: ${result.embedded}, skipped (already current): ${result.skipped}`);
  if (result.errors.length > 0) {
    console.error(`Errors (${result.errors.length}):`);
    for (const message of result.errors) console.error(`  - ${message}`);
    process.exitCode = 1;
  }
}

main();
