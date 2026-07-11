import type { GroundingRecord } from "./counsellorTypes.ts";

export type AgentContent = {
  role: "user" | "model";
  parts: Array<{
    text?: string;
    functionCall?: { name: string; args?: Record<string, unknown> };
    functionResponse?: { name: string; response?: Record<string, unknown> };
  }>;
};

export type ModelFunctionCall = { name: string; args: Record<string, unknown> };

export type CallModelResult = { functionCalls: ModelFunctionCall[] };

export type ToolExecutor = (args: Record<string, unknown>) => Promise<{
  records: GroundingRecord[];
  responseForModel: Record<string, unknown>;
}>;

export const maxAgentToolRounds = 4;

export async function runAgentToolLoop(input: {
  initialContents: AgentContent[];
  callModel: (contents: AgentContent[]) => Promise<CallModelResult>;
  executors: Record<string, ToolExecutor>;
  maxRounds?: number;
}): Promise<{ contents: AgentContent[]; records: GroundingRecord[]; roundsUsed: number }> {
  const maxRounds = input.maxRounds ?? maxAgentToolRounds;
  let contents = [...input.initialContents];
  const records: GroundingRecord[] = [];
  let round = 0;

  while (round < maxRounds) {
    const modelResult = await input.callModel(contents);
    if (modelResult.functionCalls.length === 0) {
      break;
    }

    contents = [
      ...contents,
      { role: "model", parts: modelResult.functionCalls.map((call) => ({ functionCall: call })) }
    ];

    const responseParts: AgentContent["parts"] = [];
    for (const call of modelResult.functionCalls) {
      const executor = input.executors[call.name];
      if (!executor) {
        responseParts.push({ functionResponse: { name: call.name, response: { output: `Unknown tool: ${call.name}` } } });
        continue;
      }
      try {
        const execution = await executor(call.args ?? {});
        records.push(...execution.records);
        responseParts.push({ functionResponse: { name: call.name, response: execution.responseForModel } });
      } catch (err) {
        responseParts.push({
          functionResponse: { name: call.name, response: { output: `Tool execution failed: ${(err as Error).message}` } }
        });
      }
    }

    contents = [...contents, { role: "user", parts: responseParts }];
    round += 1;
  }

  return { contents, records, roundsUsed: round };
}
