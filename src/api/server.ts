import express, { type Response } from "express";
import { ZodError } from "zod/v4";

import { createTaskApplication } from "../app.js";
import {
  createTaskSchema,
  listTasksSchema,
  taskIdSchema,
  updateTaskFieldsSchema,
} from "../schemas/taskSchemas.js";

const { taskService } = createTaskApplication();
const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());

function invalid(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", issues: error.issues });
    return;
  }

  console.error("REST API error:", error);
  res.status(500).json({ error: "Internal server error" });
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/tasks", (req, res) => {
  try {
    const filters = listTasksSchema.parse(req.query);
    const tasks = taskService.listTasks({
      ...(filters.search === undefined ? {} : { search: filters.search }),
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.priority === undefined ? {} : { priority: filters.priority }),
    });
    res.json({ count: tasks.length, tasks });
  } catch (error) {
    invalid(res, error);
  }
});

app.get("/api/tasks/:id", (req, res) => {
  try {
    const id = taskIdSchema.parse(req.params.id);
    const task = taskService.getTask(id);
    if (task === undefined) {
      res.status(404).json({ error: `Task '${id}' was not found.` });
      return;
    }
    res.json(task);
  } catch (error) {
    invalid(res, error);
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const { title, description, status, priority, dueDate } =
      createTaskSchema.parse(req.body);
    const task = taskService.createTask({
      title,
      ...(description === undefined ? {} : { description }),
      ...(status === undefined ? {} : { status }),
      ...(priority === undefined ? {} : { priority }),
      ...(dueDate === undefined ? {} : { dueDate }),
    });
    res.status(201).json(task);
  } catch (error) {
    invalid(res, error);
  }
});

app.put("/api/tasks/:id", (req, res) => {
  try {
    const id = taskIdSchema.parse(req.params.id);
    const { title, description, status, priority, dueDate } =
      updateTaskFieldsSchema.parse(req.body);
    const task = taskService.updateTask(id, {
      ...(title === undefined ? {} : { title }),
      ...(description === undefined ? {} : { description }),
      ...(status === undefined ? {} : { status }),
      ...(priority === undefined ? {} : { priority }),
      ...(dueDate === undefined ? {} : { dueDate }),
    });
    if (task === undefined) {
      res.status(404).json({ error: `Task '${id}' was not found.` });
      return;
    }
    res.json(task);
  } catch (error) {
    invalid(res, error);
  }
});

app.post("/api/tasks/:id/complete", (req, res) => {
  try {
    const id = taskIdSchema.parse(req.params.id);
    const task = taskService.completeTask(id);
    if (task === undefined) {
      res.status(404).json({ error: `Task '${id}' was not found.` });
      return;
    }
    res.json(task);
  } catch (error) {
    invalid(res, error);
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const id = taskIdSchema.parse(req.params.id);
    const task = taskService.deleteTask(id);
    if (task === undefined) {
      res.status(404).json({ error: `Task '${id}' was not found.` });
      return;
    }
    res.json({ deleted: true, task });
  } catch (error) {
    invalid(res, error);
  }
});

app.listen(port, () => {
  console.log(`TaskPilot REST API listening at http://localhost:${port}`);
});
