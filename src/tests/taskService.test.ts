import assert from "node:assert/strict";
import test from "node:test";

import { createTaskApplication } from "../app.js";

test("task lifecycle and filters", () => {
  const { database, taskService } = createTaskApplication(":memory:");

  try {
    const task = taskService.createTask({
      title: "Fix login bug",
      description: "Authentication failure",
      priority: "high",
      dueDate: "2026-10-10",
    });

    assert.equal(task.status, "todo");
    assert.equal(taskService.getTask(task.id)?.title, "Fix login bug");
    assert.equal(taskService.listTasks({ search: "authentication" }).length, 1);
    assert.equal(taskService.listTasks({ priority: "low" }).length, 0);

    const updated = taskService.updateTask(task.id, { status: "in_progress" });
    assert.equal(updated?.status, "in_progress");
    assert.equal(updated?.completedAt, null);

    const completed = taskService.completeTask(task.id);
    assert.equal(completed?.status, "completed");
    assert.ok(completed?.completedAt);
    assert.deepEqual(taskService.completeTask(task.id), completed);

    assert.equal(taskService.deleteTask(task.id)?.id, task.id);
    assert.equal(taskService.getTask(task.id), undefined);
  } finally {
    database.close();
  }
});
