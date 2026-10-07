# TaskPilot Learning Guide

This guide follows the system from the protocol boundary inward. Run each experiment rather than only reading the code.

## 1. MCP vocabulary

- **LLM:** Generates language and may request tool calls when tool definitions are included in its context.
- **Agent:** An application loop that gives an LLM tools, executes requested calls, returns results, and repeats until the task is finished.
- **MCP host:** The user-facing AI application.
- **MCP client:** The component inside a host or agent that connects to MCP servers.
- **MCP server:** A process that advertises capabilities and handles protocol requests.
- **Tool:** A model-selectable operation that may read or change state.
- **Resource:** Read-only context identified by a URI.
- **Prompt:** A reusable, user-selectable message template supplied by a server.
- **Transport:** How protocol messages move. TaskPilot uses local stdio.

MCP is not an LLM and is not an agent. It standardizes the connection between clients and capabilities.

## 2. Phase 1 — one tool

`src/mcp/server.ts` creates `McpServer` and serves it over stdio. `hello_world` demonstrates the two core operations:

```text
tools/list → name + description + JSON input schema
tools/call → validated arguments → handler → MCP content result
```

The Zod input schema is converted to JSON Schema by the SDK. The client gives that definition to an LLM; the LLM uses the name, description, conversation, and argument schema to decide whether to request the tool.

Stdout is the protocol channel, so MCP diagnostics use stderr. A stray `console.log` in the MCP server can corrupt stdio messages.

Experiment: list tools in Inspector, call `hello_world`, then submit a blank name and observe SDK validation before the handler runs.

## 3. Phase 2 — task tools

`src/mcp/tools/taskTools.ts` registers six task operations. Registration has three pieces:

1. A stable tool name.
2. A description and input schema used during discovery and model selection.
3. A handler that translates a valid call into a service operation and MCP result.

`complete_task` intentionally overlaps with `update_task`. A dedicated semantic tool is easier for a model to select correctly when a user says “done.” `delete_task` explicitly requires deletion intent because deletion is materially different from completion.

Tool results contain both text content and `structuredContent`. Text is widely consumable by models; structured content is easier for programmatic clients to inspect.

Experiment: create a task, copy its ID, then get, update, complete, and delete it in one Inspector session.

## 4. Phase 3 — SQLite and separation

```text
MCP handler → TaskService → TaskRepository → SQLite
```

- `src/types/task.ts` owns domain types and enums.
- `src/schemas/taskSchemas.ts` owns reusable boundary validation.
- `src/services/taskService.ts` owns defaults, timestamps, completion rules, and business behavior.
- `src/database/taskRepository.ts` owns SQL and row-to-domain mapping.
- `src/database/database.ts` opens SQLite and runs migrations.
- `src/database/migrations/001_create_tasks.ts` defines the database structure.

This separation prevents MCP-specific concerns from leaking into the database. It also makes REST reuse possible. `dueDate` was added as an optional field because an overdue-task review is impossible without a due date.

Experiment: create a task in Inspector, disconnect, reconnect, and list tasks. The task survives because it is in `data/taskpilot.db` rather than process memory.

## 5. Phase 4 — REST does not compete with MCP

`src/api/server.ts` exposes HTTP routes for conventional software clients. It validates HTTP input with the same schemas and calls the same `TaskService` as MCP.

```text
React → HTTP/JSON → REST route → TaskService
LLM → MCP client → MCP tool  → TaskService
```

REST is a good interface for deterministic UI code, mobile apps, and service-to-service calls. MCP is a good interface for AI hosts that need capability discovery and model-readable schemas. They solve different boundary problems.

Experiment: create a task with the React UI, then read it through `tasks://all` in Inspector.

## 6. Phase 5 — React UI

`web/src/App.tsx` implements creation, editing, completion, deletion, search, status filtering, and priority filtering. `web/src/api.ts` is the UI's only backend boundary. The UI never imports the service, repository, SQLite, or MCP server.

This is deliberate: browser code cannot safely access a local database and should not contain trusted business logic.

## 7. Phase 6 — tool discovery by an AI client

`src/agent/cli.ts` contains a real MCP client:

```text
Client.connect(stdio transport)
  ↓
client.listTools()
  ↓
MCP schemas converted to model function definitions
  ↓
model requests a function call
  ↓
client.callTool(name, arguments)
  ↓
tool result returned to model
```

The LLM does not open a socket to the MCP server. The agent application owns both the model API request and the MCP client. Tool choice is a model output; execution is an application responsibility.

Try these requests:

```text
Show me my incomplete tasks.
Create a high-priority task called Fix login bug.
Complete the task called Fix login bug.
Show me all high-priority tasks.
Find tasks related to authentication.
```

A request based on a title may require multiple calls: `list_tasks` first to resolve the ID, then `complete_task` with that ID.

## 8. Phase 7 — resources

Resources expose read-only application context through stable URIs:

```text
tasks://all
tasks://completed
tasks://pending
```

Tools are model-selectable operations. Resources are client-readable context. A client may let a user attach a resource without asking the model to execute an action.

Experiment: compare `resources/read` for `tasks://pending` with `tools/call` for `list_tasks`. They may return similar data, but the protocol meaning and discovery surfaces differ.

## 9. Phase 8 — prompts

`review_tasks` is a server-provided prompt template. When retrieved, it snapshots the task list and produces a user message asking for overdue, high-priority, duplicate, grouping, and next-action analysis.

A normal application prompt is any instruction your code sends a model. An MCP prompt is discoverable through `prompts/list` and retrievable through `prompts/get`, so compatible hosts can expose it as a reusable action.

Prompts do not execute tools automatically and should not silently mutate data.

## 10. Phase 9 — the agent loop

The agent CLI repeats this sequence:

```text
user request
  ↓
model response with zero or more tool calls
  ↓
execute each call through MCP
  ↓
append tool results to model input
  ↓
model reasons again
  ↓
final answer or more tool calls
```

That repetition enables multi-step behavior such as “clean up my task list.” The model can list tasks, analyze them, request updates, inspect results, and continue. TaskPilot caps the loop at ten turns to prevent accidental unbounded execution.

Deletion guidance lives in the agent instructions and the tool description: ask before deleting unless the user explicitly requested it.

## 11. Trace one complete request

For “Create a high-priority task called Fix login bug”:

```text
User
 ↓
Agent sends request + discovered schemas to LLM
 ↓
LLM emits create_task({ title, priority })
 ↓
Agent's MCP client sends tools/call over stdio
 ↓
MCP server validates arguments
 ↓
TaskService applies defaults and timestamps
 ↓
TaskRepository inserts into SQLite
 ↓
MCP result returns to agent
 ↓
Agent sends result to LLM
 ↓
LLM confirms the created task to the user
```

## 12. Suggested study order

1. Read `src/mcp/server.ts` and call `hello_world`.
2. Read one registration in `src/mcp/tools/taskTools.ts` from schema to result.
3. Follow that method through service, repository, and migration.
4. Call the equivalent REST endpoint and compare boundaries.
5. Create through React and read through MCP.
6. Inspect resources and the prompt.
7. Run the agent and watch its printed call trace.
8. Change one tool description and observe how that affects model tool selection.

You should now be able to explain not only how to build an MCP server, but where it belongs inside a normal application and what additional orchestration turns it into an agent.
