type DeveloperLogLevel = "info" | "warn" | "error";
type DeveloperLogSource = "health" | "developer-status" | "runtime" | "network";

export type DeveloperLogEntry = {
  id: string;
  ts: string;
  level: DeveloperLogLevel;
  source: DeveloperLogSource;
  message: string;
  meta?: Record<string, unknown>;
};

const LOG_LIMIT = 200;
const logs: DeveloperLogEntry[] = [];

function logId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function appendDeveloperLog(input: Omit<DeveloperLogEntry, "id" | "ts">) {
  const entry: DeveloperLogEntry = {
    id: logId(),
    ts: new Date().toISOString(),
    ...input,
  };

  logs.unshift(entry);
  if (logs.length > LOG_LIMIT) {
    logs.splice(LOG_LIMIT);
  }
}

export function listDeveloperLogs(limit = 100) {
  return logs.slice(0, Math.max(1, Math.min(limit, LOG_LIMIT)));
}

export function clearDeveloperLogs() {
  logs.splice(0, logs.length);
}
