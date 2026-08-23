import Database from "better-sqlite3";
import path from "path";
import os from "os";

// Resolusi path default Hermes
const HERMES_ROOT = process.env.HERMES_HOME || path.join(os.homedir(), ".hermes");
const KANBAN_DB_PATH = process.env.HERMES_KANBAN_DB || path.join(HERMES_ROOT, "kanban.db");
const STATE_DB_PATH = process.env.HERMES_STATE_DB || path.join(HERMES_ROOT, "state.db");

let kanbanDbInstance: Database.Database | null = null;
let stateDbInstance: Database.Database | null = null;

export function getKanbanDb(): Database.Database {
  if (!kanbanDbInstance) {
    kanbanDbInstance = new Database(KANBAN_DB_PATH, { readonly: true, fileMustExist: false });
    kanbanDbInstance.pragma("journal_mode = WAL");
  }
  return kanbanDbInstance;
}

export function getStateDb(): Database.Database {
  if (!stateDbInstance) {
    stateDbInstance = new Database(STATE_DB_PATH, { readonly: true, fileMustExist: false });
    stateDbInstance.pragma("journal_mode = WAL");
  }
  return stateDbInstance;
}
