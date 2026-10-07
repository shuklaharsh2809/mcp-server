import * as z from "zod/v4";

import { TASK_PRIORITIES, TASK_STATUSES } from "../types/task.js";

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export const taskIdSchema = z.uuid().describe("The task's unique ID");
export const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .nullable();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).describe("A short title for the task"),
  description: z.string().trim().optional().describe("Optional task details"),
  status: taskStatusSchema.optional().describe("Initial status; defaults to todo"),
  priority: taskPrioritySchema
    .optional()
    .describe("Task priority; defaults to medium"),
  dueDate: dueDateSchema
    .optional()
    .describe("Optional due date in YYYY-MM-DD format, or null"),
});

export const listTasksSchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Case-insensitive text to find in titles or descriptions"),
  status: taskStatusSchema.optional().describe("Only return this status"),
  priority: taskPrioritySchema.optional().describe("Only return this priority"),
});

export const updateTaskFieldsSchema = z
  .object({
    title: z.string().trim().min(1).optional().describe("New task title"),
    description: z.string().trim().optional().describe("New task description"),
    status: taskStatusSchema.optional().describe("New task status"),
    priority: taskPrioritySchema.optional().describe("New task priority"),
    dueDate: dueDateSchema
      .optional()
      .describe("New due date in YYYY-MM-DD format, or null to clear it"),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Provide at least one field to update.",
  });

export const updateTaskToolSchema = z
  .object({ id: taskIdSchema })
  .and(updateTaskFieldsSchema);

export const taskIdInputSchema = z.object({ id: taskIdSchema });
