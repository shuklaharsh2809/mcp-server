# TaskPilot

TaskPilot is a complete, intentionally small task-management system for learning the Model Context Protocol (MCP). The same SQLite-backed task service is exposed through MCP tools and a REST API; a React UI uses REST, while an optional AI agent uses MCP.

## Architecture

```text
React UI ───────────────→ REST API ──┐
                                     ├─→ TaskService → TaskRepository → SQLite
User → LLM → MCP Client → MCP Server ┘
```

MCP does not replace REST. REST serves conventional application clients such as the React UI. MCP gives AI hosts a standard way to discover and invoke capabilities. Both reuse the same service and database layers.

## Requirements

- Node.js 20 or newer
- npm
- An OpenAI API key only for the optional agent CLI

## Install and build

```bash
npm install
npm run typecheck
npm run build
npm test
```

SQLite initializes `data/taskpilot.db` automatically. Override it with `TASKPILOT_DB_PATH`; use `:memory:` for temporary tests.

## Run the application

Start the REST API:

```bash
npm run dev:api
```

In a second terminal, start React:

```bash
npm run dev:web
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the REST API on port 3001.

## Inspect the MCP server

```bash
npm run inspect
```

Open the complete token-bearing URL printed by Inspector. If its connection form is not prefilled, use:

```text
Transport: STDIO
Command: node
Arguments: /absolute/path/to/taskpilot/dist/mcp/server.js
```

Keep one Inspector connection open while testing. Tasks now persist across server restarts because MCP and REST use SQLite.

The Inspector version is pinned to `0.15.0` for this machine's Node.js 20 runtime. Current Inspector v2 requires Node.js 22.19 or newer.

## MCP capabilities

Tools perform actions:

- `hello_world`
- `create_task`
- `get_task`
- `list_tasks` — supports search, status, and priority filters
- `update_task`
- `complete_task`
- `delete_task`

Resources provide read-only snapshots:

- `tasks://all`
- `tasks://completed`
- `tasks://pending`

The `review_tasks` prompt packages the current task list with instructions to identify overdue work, high priorities, duplicates, useful groups, and next actions.

## REST API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/tasks` | List, search, and filter tasks |
| `GET` | `/api/tasks/:id` | Get one task |
| `POST` | `/api/tasks` | Create a task |
| `PUT` | `/api/tasks/:id` | Update a task |
| `POST` | `/api/tasks/:id/complete` | Complete a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |

`GET /api/tasks` accepts `search`, `status`, and `priority` query parameters.

## Run the AI agent

The agent requires an OpenAI API key supplied through the environment. The project does not store the key.

```bash
export OPENAI_API_KEY="your-key"
# Optional; defaults to gpt-5
export OPENAI_MODEL="gpt-5"

npm run agent -- "Show me my incomplete high-priority tasks"
npm run agent -- "Create a high-priority task called Fix login bug"
npm run agent -- "Clean up my task list"
```

The CLI prints every MCP tool call and result to stderr, then prints the model's final answer to stdout. The model never calls SQLite directly: it selects from schemas discovered by the MCP client, and the client executes those calls through the MCP server.

## Connect another MCP-compatible host

Use the compiled server command in the host's MCP configuration:

```json
{
  "mcpServers": {
    "taskpilot": {
      "command": "node",
      "args": ["/absolute/path/to/taskpilot/dist/mcp/server.js"],
      "env": {
        "TASKPILOT_DB_PATH": "/absolute/path/to/taskpilot/data/taskpilot.db"
      }
    }
  }
}
```

The exact outer configuration file differs by host, but the command, arguments, transport, and MCP protocol are the same.

## Learn the system

Read [docs/LEARNING_GUIDE.md](docs/LEARNING_GUIDE.md) in order. It explains each phase, every important file, protocol discovery and invocation, tools/resources/prompts, and why the final agent is more than an MCP server.
