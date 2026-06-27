import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

type LogLevel = keyof typeof LEVELS;
export type LogFields = Record<string, unknown>;

type SerializedError = {
  type: string;
  message: string;
  stack?: string;
  cause?: SerializedError | string;
};

const REDACTED = "[REDACTED]";
const REDACTED_KEY =
  /(authorization|cookie|password|secret|api[-_]?key|access[-_]?token|refresh[-_]?token|webhook[-_]?secret|prompt|dialogue|caption|body)/i;
const SECRET_IN_TEXT =
  /(Bearer\s+)[^\s,]+|([?&](?:access_token|refresh_token|api_key|secret)=)[^&\s]+/gi;

function configuredLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.toLowerCase();
  if (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  ) {
    return value;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function sanitizeText(value: string): string {
  return value.replace(SECRET_IN_TEXT, (match, bearerPrefix, queryPrefix) => {
    if (typeof bearerPrefix === "string") return `${bearerPrefix}${REDACTED}`;
    if (typeof queryPrefix === "string") return `${queryPrefix}${REDACTED}`;
    return match;
  });
}

export function safeErrorMessage(error: unknown, maxLength = 1000): string {
  const message = sanitizeText(
    error instanceof Error ? error.message : String(error),
  );
  return message.length > maxLength
    ? `${message.slice(0, maxLength).trimEnd()}...`
    : message;
}

function serializeError(error: unknown): SerializedError {
  if (!(error instanceof Error)) {
    return { type: "UnknownError", message: sanitizeText(String(error)) };
  }

  const cause =
    error.cause === undefined
      ? undefined
      : error.cause instanceof Error
        ? serializeError(error.cause)
        : sanitizeText(String(error.cause));

  return {
    type: error.name,
    message: sanitizeText(error.message),
    ...(error.stack ? { stack: sanitizeText(error.stack) } : {}),
    ...(cause ? { cause } : {}),
  };
}

function sanitizeValue(
  value: unknown,
  key: string,
  seen: WeakSet<object>,
  depth = 0,
): unknown {
  if (REDACTED_KEY.test(key)) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value);
  if (depth >= 8) return "[TRUNCATED]";
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[CIRCULAR]";

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key, seen, depth + 1));
  }

  const result: LogFields = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = sanitizeValue(childValue, childKey, seen, depth + 1);
  }
  return result;
}

function sanitizeFields(fields: LogFields): LogFields {
  return sanitizeValue(fields, "fields", new WeakSet()) as LogFields;
}

export class Logger {
  constructor(
    private readonly service: string,
    private readonly context: LogFields = {},
  ) {}

  child(context: LogFields): Logger {
    return new Logger(this.service, { ...this.context, ...context });
  }

  debug(event: string, message: string, fields: LogFields = {}): void {
    this.write("debug", event, message, fields);
  }

  info(event: string, message: string, fields: LogFields = {}): void {
    this.write("info", event, message, fields);
  }

  warn(event: string, message: string, fields: LogFields = {}): void {
    this.write("warn", event, message, fields);
  }

  error(
    event: string,
    message: string,
    error: unknown,
    fields: LogFields = {},
  ): void {
    this.write("error", event, message, {
      ...fields,
      error: serializeError(error),
    });
  }

  private write(
    level: LogLevel,
    event: string,
    message: string,
    fields: LogFields,
  ): void {
    if (LEVELS[level] < LEVELS[configuredLevel()]) return;

    const entry = sanitizeFields({
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      event,
      message,
      ...this.context,
      ...fields,
    });
    const line = JSON.stringify(entry);

    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

export function createLogger(service: string, context: LogFields = {}): Logger {
  return new Logger(service, context);
}

export function getRequestId(headers: Headers): string {
  const requestId = headers.get(REQUEST_ID_HEADER)?.trim();
  return requestId || randomUUID();
}

export function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}
