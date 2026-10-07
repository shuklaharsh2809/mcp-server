import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

import { createTaskApplication } from "../app.js";
import type { TaskService } from "../services/taskService.js";
import { registerTaskTools } from "./tools/taskTools.js";

function registerResources(server: McpServer, taskService: TaskService): void {
  const registerTaskResource = (
    name: string,
    uri: string,
    description: string,
    read: () => unknown,
  ) => {
    server.registerResource(
      name,
      uri,
      { title: name, description, mimeType: "application/json" },
      async (resourceUri) => ({
        contents: [
          {
            uri: resourceUri.href,
            mimeType: "application/json",
            text: JSON.stringify(read(), null, 2),
          },
        ],
      }),
    );
  };

  registerTaskResource(
    "All Tasks",
    "tasks://all",
    "A read-only snapshot of every task.",
    () => taskService.listTasks(),
  );
  registerTaskResource(
    "Completed Tasks",
    "tasks://completed",
    "A read-only snapshot of completed tasks.",
    () => taskService.listTasks({ status: "completed" }),
  );
  registerTaskResource(
    "Pending Tasks",
    "tasks://pending",
    "A read-only snapshot of todo and in-progress tasks.",
    () => taskService.listTasks().filter((task) => task.status !== "completed"),
  );
}

function registerPrompts(server: McpServer, taskService: TaskService): void {
  server.registerPrompt(
    "review_tasks",
    {
      title: "Review Task List",
      description:
        "Ask the model to review tasks for overdue work, priorities, duplicates, grouping, and next actions.",
      argsSchema: z.object({
        focus: z
          .string()
          .trim()
          .optional()
          .describe("Optional area or goal to emphasize in the review"),
      }),
    },
    ({ focus }) => {
      const tasks = taskService.listTasks();
      const focusInstruction =
        focus === undefined ? "" : `\nPay special attention to: ${focus}.`;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Review the following TaskPilot tasks.${focusInstruction}

Identify:
- overdue tasks (a dueDate before today and not completed)
- high-priority unfinished tasks
- likely duplicates
- tasks that could be grouped
- the best tasks to do next

Explain your reasoning and do not modify tasks unless I explicitly ask.

Tasks:
${JSON.stringify(tasks, null, 2)}`,
            },
          },
        ],
      };
    },
  );
}

export function createTaskPilotServer(): McpServer {
  const { taskService } = createTaskApplication();
  const server = new McpServer({ name: "taskpilot", version: "1.0.0" });

  server.registerTool(
    "hello_world",
    {
      description: "Greet a person by name.",
      inputSchema: z.object({
        name: z.string().trim().min(1).describe("The person to greet"),
      }),
    },
    async ({ name }) => ({
      content: [{ type: "text", text: `Hello ${name}!` }],
    }),
  );

  registerTaskTools(server, taskService);
  registerResources(server, taskService);
  registerPrompts(server, taskService);

  return server;
}

serveStdio(createTaskPilotServer);
console.error("TaskPilot MCP server is waiting for a client on stdio.");
