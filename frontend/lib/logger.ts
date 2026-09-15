/**
 * Lightweight console logger so important frontend events (API calls,
 * failures) leave a consistent, greppable trail during debugging —
 * mirrors the structured logging set up on the Django backend.
 */

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, message: string, context?: unknown) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  const method: "log" | "warn" | "error" = level === "info" ? "log" : level;
  if (context !== undefined) {
    // eslint-disable-next-line no-console
    console[method](line, context);
  } else {
    // eslint-disable-next-line no-console
    console[method](line);
  }
}

export const logger = {
  info: (message: string, context?: unknown) => emit("info", message, context),
  warn: (message: string, context?: unknown) => emit("warn", message, context),
  error: (message: string, context?: unknown) => emit("error", message, context),
};
