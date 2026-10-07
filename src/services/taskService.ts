import { randomUUID } from "node:crypto";

import { TaskRepository } from "../database/taskRepository.js";
import type {
  CreateTaskInput,
  ListTaskFilters,
  Task,
  UpdateTaskInput,
} from "../types/task.js";

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  createTask(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const status = input.status ?? "todo";

    return this.repository.create({
      id: randomUUID(),
      title: input.title,
      description: input.description ?? "",
      status,
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: status === "completed" ? now : null,
    });
  }

  getTask(id: string): Task | undefined {
    return this.repository.findById(id);
  }

  listTasks(filters: ListTaskFilters = {}): Task[] {
    return this.repository.findAll(filters);
  }

  updateTask(id: string, input: UpdateTaskInput): Task | undefined {
    const current = this.repository.findById(id);

    if (current === undefined) {
      return undefined;
    }

    const now = new Date().toISOString();
    const status = input.status ?? current.status;
    const completedAt = status === "completed" ? current.completedAt ?? now : null;

    return this.repository.update({
      ...current,
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      status,
      priority: input.priority ?? current.priority,
      dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
      updatedAt: now,
      completedAt,
    });
  }

  completeTask(id: string): Task | undefined {
    const current = this.repository.findById(id);

    if (current === undefined || current.status === "completed") {
      return current;
    }

    const now = new Date().toISOString();
    return this.repository.update({
      ...current,
      status: "completed",
      updatedAt: now,
      completedAt: now,
    });
  }

  deleteTask(id: string): Task | undefined {
    return this.repository.delete(id);
  }
}
