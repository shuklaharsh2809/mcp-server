import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";

import {
  createTaskSchema,
  listTasksSchema,
  taskIdInputSchema,
  updateTaskToolSchema,
} from "../../schemas/taskSchemas.js";
import type { TaskService } from "../../services/taskService.js";

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function errorResult(message: string): CallToolResult {
  const error = { error: message };
  return {
    content: [{ type: "text", text: JSON.stringify(error) }],
    structuredContent: error,
    isError: true,
  };
}

export function registerTaskTools(
  server: McpServer,
  taskService: TaskService,
): void {
  server.registerTool(
    "create_task",
    {
      description:
        "Create a task. Use when the user asks to add, create, schedule, or remember work.",
      inputSchema: createTaskSchema,
    },
    async ({ title, description, status, priority, dueDate }) =>
      jsonResult(
        taskService.createTask({
          title,
          ...(description === undefined ? {} : { description }),
          ...(status === undefined ? {} : { status }),
          ...(priority === undefined ? {} : { priority }),
          ...(dueDate === undefined ? {} : { dueDate }),
        }),
      ),
  );

  server.registerTool(
    "get_task",
    {
      description: "Get one task by ID when details for a known task are needed.",
      inputSchema: taskIdInputSchema,
    },
    async ({ id }) => {
      const task = taskService.getTask(id);
      return task === undefined
        ? errorResult(`Task '${id}' was not found.`)
        : jsonResult(task);
    },
  );

  server.registerTool(
    "list_tasks",
    {
      description:
        "List or find tasks. Supports text search and exact status/priority filters.",
      inputSchema: listTasksSchema,
    },
    async ({ search, status, priority }) => {
      const tasks = taskService.listTasks({
        ...(search === undefined ? {} : { search }),
        ...(status === undefined ? {} : { status }),
        ...(priority === undefined ? {} : { priority }),
      });
      return jsonResult({ count: tasks.length, tasks });
    },
  );

  server.registerTool(
    "update_task",
    {
      description:
        "Update a task's title, description, status, priority, or due date. Requires its ID.",
      inputSchema: updateTaskToolSchema,
    },
    async ({ id, title, description, status, priority, dueDate }) => {
      const task = taskService.updateTask(id, {
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
        ...(status === undefined ? {} : { status }),
        ...(priority === undefined ? {} : { priority }),
        ...(dueDate === undefined ? {} : { dueDate }),
      });
      return task === undefined
        ? errorResult(`Task '${id}' was not found.`)
        : jsonResult(task);
    },
  );

  server.registerTool(
    "complete_task",
    {
      description: "Mark a task completed when the user says it is done.",
      inputSchema: taskIdInputSchema,
    },
    async ({ id }) => {
      const task = taskService.completeTask(id);
      return task === undefined
        ? errorResult(`Task '${id}' was not found.`)
        : jsonResult(task);
    },
  );

  server.registerTool(
    "delete_task",
    {
      description:
        "Permanently delete a task. Use only when the user explicitly requests deletion.",
      inputSchema: taskIdInputSchema,
    },
    async ({ id }) => {
      const task = taskService.deleteTask(id);
      return task === undefined
        ? errorResult(`Task '${id}' was not found.`)
        : jsonResult({ deleted: true, task });
    },
  );
}
