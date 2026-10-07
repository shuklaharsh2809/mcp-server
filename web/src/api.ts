import type { Task, TaskDraft, TaskPriority, TaskStatus } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function listTasks(filters: {
  search: string;
  status: "" | TaskStatus;
  priority: "" | TaskPriority;
}): Promise<Task[]> {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (filters.priority) query.set("priority", filters.priority);
  const result = await request<{ count: number; tasks: Task[] }>(
    `/api/tasks?${query.toString()}`,
  );
  return result.tasks;
}

export function createTask(draft: TaskDraft): Promise<Task> {
  return request("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      ...draft,
      dueDate: draft.dueDate || null,
    }),
  });
}

export function updateTask(id: string, draft: TaskDraft): Promise<Task> {
  return request(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...draft, dueDate: draft.dueDate || null }),
  });
}

export function completeTask(id: string): Promise<Task> {
  return request(`/api/tasks/${id}/complete`, { method: "POST" });
}

export function deleteTask(id: string): Promise<{ deleted: true; task: Task }> {
  return request(`/api/tasks/${id}`, { method: "DELETE" });
}
