import { OllamaAIProvider } from './apps/web/src/features/counsellor/ollamaProvider.ts';
import { counsellorSystemInstruction } from './apps/web/src/features/counsellor/counsellorCore.ts';

const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'qwen2.5:7b' });

async function run() {
  const streamGen = provider.streamWithAgent({
    question: 'What is the latest 2026 NIRF ranking for IIIT Nagpur?',
    history: [],
    systemInstruction: counsellorSystemInstruction,
    recommendationRecords: [],
    recommendationCollegeIds: []
  });

  for await (const chunk of streamGen) {
    if (typeof chunk === 'string') {
      process.stdout.write(chunk);
    } else {
      console.log('\nFINAL:', JSON.stringify(chunk, null, 2));
    }
  }
}
run().catch(console.error);
