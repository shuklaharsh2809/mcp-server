import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import type {
  FunctionTool,
  ResponseInput,
} from "openai/resources/responses/responses";

const prompt = process.argv.slice(2).join(" ").trim();

if (prompt.length === 0) {
  console.error('Usage: npm run agent -- "Show my incomplete tasks"');
  process.exit(1);
}

if (process.env.OPENAI_API_KEY === undefined) {
  console.error("Set OPENAI_API_KEY before running the TaskPilot agent.");
  process.exit(1);
}

const mcpClient = new Client({ name: "taskpilot-agent", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", resolve("src/mcp/server.ts")],
  cwd: process.cwd(),
  env: {
    ...process.env,
    PATH: process.env.PATH ?? "",
  },
  stderr: "inherit",
});

function toolOutputText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  if (result.structuredContent !== undefined) {
    return JSON.stringify(result.structuredContent);
  }

  return result.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function run(): Promise<void> {
  await mcpClient.connect(transport);

  try {
    const { tools: discoveredTools } = await mcpClient.listTools();
    const tools: FunctionTool[] = discoveredTools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema,
      strict: false,
    }));

    console.error(
      `Discovered ${tools.length} MCP tools: ${tools.map((tool) => tool.name).join(", ")}`,
    );

    const openai = new OpenAI();
    const input: ResponseInput = [{ role: "user", content: prompt }];
    const model = process.env.OPENAI_MODEL ?? "gpt-5";

    for (let turn = 1; turn <= 10; turn += 1) {
      const response = await openai.responses.create({
        model,
        store: false,
        instructions:
          "You are TaskPilot, a careful task-management agent. Use the provided tools for task facts and mutations. Never claim a mutation succeeded without a successful tool result. Ask before deleting unless the user explicitly requested deletion.",
        input,
        tools,
        parallel_tool_calls: false,
      });

      input.push(...toResponseInputItems(response.output));
      const calls = response.output.filter((item) => item.type === "function_call");

      if (calls.length === 0) {
        console.log(response.output_text || "The agent returned no text response.");
        return;
      }

      for (const call of calls) {
        const argumentsValue = JSON.parse(call.arguments) as Record<string, unknown>;
        console.error(`→ ${call.name}(${JSON.stringify(argumentsValue)})`);
        const result = await mcpClient.callTool({
          name: call.name,
          arguments: argumentsValue,
        });
        const output = toolOutputText(result);
        console.error(`← ${result.isError ? "error" : "ok"}: ${output}`);
        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output,
        });
      }
    }

    throw new Error("Agent stopped after 10 tool-calling turns.");
  } finally {
    await mcpClient.close();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
