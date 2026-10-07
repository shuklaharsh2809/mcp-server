import { type FormEvent, useCallback, useEffect, useState } from "react";

import * as api from "./api";
import type { Task, TaskDraft, TaskPriority, TaskStatus } from "./types";

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
};

function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? "",
  };
}

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | TaskStatus>("");
  const [priority, setPriority] = useState<"" | TaskPriority>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await api.listTasks({ search, status, priority }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [priority, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTasks(), 200);
    return () => window.clearTimeout(timer);
  }, [loadTasks]);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createTask(draft);
      setDraft(emptyDraft);
      await loadTasks();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create task");
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (editId === null) return;
    try {
      await api.updateTask(editId, editDraft);
      setEditId(null);
      await loadTasks();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update task");
    }
  }

  async function complete(id: string) {
    try {
      await api.completeTask(id);
      await loadTasks();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete task");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this task permanently?")) return;
    try {
      await api.deleteTask(id);
      await loadTasks();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete task");
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MCP learning project</p>
          <h1>TaskPilot</h1>
          <p>One task service, shared by REST, React, and an MCP server.</p>
        </div>
        <div className="task-count">{tasks.length} shown</div>
      </header>

      <section className="panel">
        <h2>Create a task</h2>
        <form className="task-form" onSubmit={create}>
          <label>
            Title
            <input
              required
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Fix login bug"
            />
          </label>
          <label className="wide">
            Description
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Optional details"
            />
          </label>
          <SelectFields draft={draft} onChange={setDraft} includeStatus={false} />
          <button className="primary" type="submit">Create task</button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Tasks</h2>
          <button className="secondary" onClick={() => void loadTasks()}>Refresh</button>
        </div>
        <div className="filters">
          <input
            aria-label="Search tasks"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or description"
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | TaskStatus)}
          >
            <option value="">All statuses</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as "" | TaskPriority)}
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="empty">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">No tasks match these filters.</p>
        ) : (
          <div className="task-list">
            {tasks.map((task) =>
              editId === task.id ? (
                <form className="task-card edit-card" key={task.id} onSubmit={saveEdit}>
                  <label>
                    Title
                    <input
                      required
                      value={editDraft.title}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, title: event.target.value })
                      }
                    />
                  </label>
                  <label className="wide">
                    Description
                    <textarea
                      value={editDraft.description}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, description: event.target.value })
                      }
                    />
                  </label>
                  <SelectFields draft={editDraft} onChange={setEditDraft} includeStatus />
                  <div className="actions wide">
                    <button className="primary" type="submit">Save</button>
                    <button className="secondary" type="button" onClick={() => setEditId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <article className={`task-card ${task.status}`} key={task.id}>
                  <div className="task-main">
                    <div className="badges">
                      <span className={`badge status ${task.status}`}>
                        {task.status.replace("_", " ")}
                      </span>
                      <span className={`badge priority ${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>
                    <h3>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                    <small>
                      {task.dueDate ? `Due ${task.dueDate}` : "No due date"} · ID {task.id.slice(0, 8)}
                    </small>
                  </div>
                  <div className="actions">
                    {task.status !== "completed" && (
                      <button className="primary" onClick={() => void complete(task.id)}>
                        Complete
                      </button>
                    )}
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditId(task.id);
                        setEditDraft(draftFromTask(task));
                      }}
                    >
                      Edit
                    </button>
                    <button className="danger" onClick={() => void remove(task.id)}>Delete</button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function SelectFields({
  draft,
  onChange,
  includeStatus,
}: {
  draft: TaskDraft;
  onChange: (draft: TaskDraft) => void;
  includeStatus: boolean;
}) {
  return (
    <>
      {includeStatus && (
        <label>
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              onChange({ ...draft, status: event.target.value as TaskStatus })
            }
          >
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      )}
      <label>
        Priority
        <select
          value={draft.priority}
          onChange={(event) =>
            onChange({ ...draft, priority: event.target.value as TaskPriority })
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label>
        Due date
        <input
          type="date"
          value={draft.dueDate}
          onChange={(event) => onChange({ ...draft, dueDate: event.target.value })}
        />
      </label>
    </>
  );
}
