import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";

import { createTasksMigration } from "./migrations/001_create_tasks.js";

export type DatabaseConnection = Database.Database;

export function getDatabasePath(): string {
  return process.env.TASKPILOT_DB_PATH ?? resolve("data/taskpilot.db");
}

export function createDatabase(
  databasePath = getDatabasePath(),
): DatabaseConnection {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(createTasksMigration);

  return database;
}
