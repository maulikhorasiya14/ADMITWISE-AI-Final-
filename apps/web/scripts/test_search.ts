import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env.local") });

async function testTavily() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("No TAVILY_API_KEY found");
    return;
  }
  
  console.log("Testing Tavily...");
  for (let i = 0; i < 10; i++) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `Top engineering colleges in India ${i}`,
        max_results: 1,
        include_answer: false,
        search_depth: "basic"
      })
    });
    console.log(`Tavily Test ${i+1}: Status ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Found ${data.results?.length} results.`);
    } else {
      const err = await response.text();
      console.error(`   Error: ${err}`);
    }
  }
}

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found");
    return;
  }

  console.log("\nTesting Gemini...");
  for (let i = 0; i < 2; i++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `Search the web for the following query and provide the most relevant facts. Query: Cutoff for IIT Bombay ${i}` }]
          }],
          tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0 } } }]
        })
      }
    );
    console.log(`Gemini Test ${i+1}: Status ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`   Response length: ${text?.length ?? 0} chars.`);
    } else {
      const err = await response.text();
      console.error(`   Error: ${err}`);
    }
  }
}

async function run() {
  await testTavily();
  await testGemini();
}

run();
