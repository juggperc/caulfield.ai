import { appendFileSync, mkdirSync } from "node:fs";

type AgentDebugLogEntry = {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp?: number;
};

const DEBUG_LOG_PATH = "/opt/cursor/logs/debug.log";

export const writeAgentDebugLog = ({
  timestamp,
  ...entry
}: AgentDebugLogEntry) => {
  mkdirSync("/opt/cursor/logs", { recursive: true });
  appendFileSync(
    DEBUG_LOG_PATH,
    `${JSON.stringify({
      ...entry,
      timestamp: timestamp ?? Date.now(),
    })}\n`,
  );
};
