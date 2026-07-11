import assert from "node:assert/strict";
import test from "node:test";
import { runAgentToolLoop, type AgentContent, type CallModelResult, type ToolExecutor } from "../src/features/counsellor/agentLoop.ts";
import type { GroundingRecord } from "../src/features/counsellor/counsellorTypes.ts";

function record(id: string): GroundingRecord {
  return { publicationStatus: "published", evidence: { sourceId: id, sourceLabel: id, sourceType: "test" }, summary: id };
}

const initialContents: AgentContent[] = [{ role: "user", parts: [{ text: "What is the cutoff for Demo College?" }] }];

test("loop stops immediately when the model requests no tools", async () => {
  const callModel = async (): Promise<CallModelResult> => ({ functionCalls: [] });
  const executors: Record<string, ToolExecutor> = {};

  const result = await runAgentToolLoop({ initialContents, callModel, executors });

  assert.equal(result.records.length, 0);
  assert.equal(result.roundsUsed, 0);
});

test("loop executes a single tool call and accumulates its records", async () => {
  let callCount = 0;
  const callModel = async (): Promise<CallModelResult> => {
    callCount += 1;
    if (callCount === 1) return { functionCalls: [{ name: "search_college_db", args: { query: "cutoff" } }] };
    return { functionCalls: [] };
  };
  const executors: Record<string, ToolExecutor> = {
    search_college_db: async () => ({ records: [record("cutoff:1")], responseForModel: { output: "cutoff data" } })
  };

  const result = await runAgentToolLoop({ initialContents, callModel, executors });

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0]?.evidence.sourceId, "cutoff:1");
  assert.equal(result.roundsUsed, 1);
});

test("loop executes multiple function calls within a single round", async () => {
  let callCount = 0;
  const callModel = async (): Promise<CallModelResult> => {
    callCount += 1;
    if (callCount === 1) {
      return {
        functionCalls: [
          { name: "search_college_db", args: { query: "cutoff" } },
          { name: "search_internet", args: { query: "nirf ranking" } }
        ]
      };
    }
    return { functionCalls: [] };
  };
  const executors: Record<string, ToolExecutor> = {
    search_college_db: async () => ({ records: [record("db:1")], responseForModel: { output: "db data" } }),
    search_internet: async () => ({ records: [record("web:1")], responseForModel: { output: "web data" } })
  };

  const result = await runAgentToolLoop({ initialContents, callModel, executors });

  assert.deepEqual(
    result.records.map((r) => r.evidence.sourceId).sort(),
    ["db:1", "web:1"]
  );
});

test("loop accumulates records across multiple rounds", async () => {
  let callCount = 0;
  const callModel = async (): Promise<CallModelResult> => {
    callCount += 1;
    if (callCount === 1) return { functionCalls: [{ name: "search_college_db", args: { query: "cutoff" } }] };
    if (callCount === 2) return { functionCalls: [{ name: "search_internet", args: { query: "nirf" } }] };
    return { functionCalls: [] };
  };
  const executors: Record<string, ToolExecutor> = {
    search_college_db: async () => ({ records: [record("db:1")], responseForModel: { output: "insufficient" } }),
    search_internet: async () => ({ records: [record("web:1")], responseForModel: { output: "web data" } })
  };

  const result = await runAgentToolLoop({ initialContents, callModel, executors });

  assert.equal(result.roundsUsed, 2);
  assert.deepEqual(
    result.records.map((r) => r.evidence.sourceId).sort(),
    ["db:1", "web:1"]
  );
});

test("loop enforces the round cap and never hangs on a model that always calls tools", async () => {
  const callModel = async (): Promise<CallModelResult> => ({
    functionCalls: [{ name: "search_college_db", args: { query: "loop forever" } }]
  });
  const executors: Record<string, ToolExecutor> = {
    search_college_db: async () => ({ records: [record("db:1")], responseForModel: { output: "data" } })
  };

  const result = await runAgentToolLoop({ initialContents, callModel, executors, maxRounds: 4 });

  assert.equal(result.roundsUsed, 4);
});

test("loop catches a throwing tool executor and continues instead of crashing", async () => {
  let callCount = 0;
  const callModel = async (): Promise<CallModelResult> => {
    callCount += 1;
    if (callCount === 1) return { functionCalls: [{ name: "search_college_db", args: {} }] };
    return { functionCalls: [] };
  };
  const executors: Record<string, ToolExecutor> = {
    search_college_db: async () => {
      throw new Error("Supabase connection refused");
    }
  };

  const result = await runAgentToolLoop({ initialContents, callModel, executors });

  assert.equal(result.records.length, 0);
  const lastContent = result.contents.at(-1);
  const responseText = JSON.stringify(lastContent);
  assert.match(responseText, /Supabase connection refused/);
});

test("loop handles an unknown tool name gracefully", async () => {
  let callCount = 0;
  const callModel = async (): Promise<CallModelResult> => {
    callCount += 1;
    if (callCount === 1) return { functionCalls: [{ name: "delete_everything", args: {} }] };
    return { functionCalls: [] };
  };

  const result = await runAgentToolLoop({ initialContents, callModel, executors: {} });

  assert.equal(result.records.length, 0);
  const responseText = JSON.stringify(result.contents.at(-1));
  assert.match(responseText, /Unknown tool/);
});
