import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env.local") });

import { OpenRouter } from "@openrouter/sdk";

async function test() {
  console.log("Key:", process.env.OPENROUTER_API_KEY?.substring(0, 10));
  const openrouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const stream = await openrouter.chat.send({
    chatRequest: {
      model: "google/gemma-4-31b-it:free",
      messages: [
        { role: "user", content: "How many r's are in strawberry?" }
      ],
      stream: true
    }
  });

  let response = "";
  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      response += content;
      process.stdout.write(content);
    }
  }
  console.log("\nDone:", response);
}
test().catch(console.error);
