import type { DatabaseConnection } from "./database.js";
import type {
  ListTaskFilters,
  Task,
  TaskPriority,
  TaskStatus,
} from "../types/task.js";

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export class TaskRepository {
  constructor(private readonly database: DatabaseConnection) {}

  create(task: Task): Task {
    this.database
      .prepare(
        `INSERT INTO tasks (
          id, title, description, status, priority, due_date,
          created_at, updated_at, completed_at
        ) VALUES (
          @id, @title, @description, @status, @priority, @dueDate,
          @createdAt, @updatedAt, @completedAt
        )`,
      )
      .run(task);

    return task;
  }

  findById(id: string): Task | undefined {
    const row = this.database
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(id) as TaskRow | undefined;

    return row === undefined ? undefined : toTask(row);
  }

  findAll(filters: ListTaskFilters = {}): Task[] {
    const conditions: string[] = [];
    const parameters: unknown[] = [];

    if (filters.search !== undefined) {
      conditions.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)");
      const search = `%${filters.search.trim().toLowerCase()}%`;
      parameters.push(search, search);
    }

    if (filters.status !== undefined) {
      conditions.push("status = ?");
      parameters.push(filters.status);
    }

    if (filters.priority !== undefined) {
      conditions.push("priority = ?");
      parameters.push(filters.priority);
    }

    const where = conditions.length === 0 ? "" : `WHERE ${conditions.join(" AND ")}`;
    const rows = this.database
      .prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC`)
      .all(...parameters) as TaskRow[];

    return rows.map(toTask);
  }

  update(task: Task): Task {
    this.database
      .prepare(
        `UPDATE tasks SET
          title = @title,
          description = @description,
          status = @status,
          priority = @priority,
          due_date = @dueDate,
          updated_at = @updatedAt,
          completed_at = @completedAt
        WHERE id = @id`,
      )
      .run(task);

    return task;
  }

  delete(id: string): Task | undefined {
    const task = this.findById(id);

    if (task !== undefined) {
      this.database.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    }

    return task;
  }
}
