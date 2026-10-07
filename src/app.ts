import { createDatabase } from "./database/database.js";
import { TaskRepository } from "./database/taskRepository.js";
import { TaskService } from "./services/taskService.js";

export function createTaskApplication(databasePath?: string) {
  const database = createDatabase(databasePath);
  const repository = new TaskRepository(database);
  const taskService = new TaskService(repository);

  return { database, taskService };
}
