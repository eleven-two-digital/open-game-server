// SPDX-License-Identifier: Apache-2.0

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const sensitiveField =
  /^(authorization|access_?token|refresh_?token|id_?token|join_?ticket|ticket|secret|private_?key|public_?key|key_?material|certificate|cert|payload|input|nonce|ciphertext)$/i;

export function redactLogFields(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      sensitiveField.test(key) ? "[REDACTED]" : redactNested(value),
    ]),
  );
}

function redactNested(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactNested);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveField.test(key) ? "[REDACTED]" : redactNested(nestedValue),
    ]),
  );
}

export function log(level: LogLevel, event: string, fields: LogFields = {}): void {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactLogFields(fields),
  };
  console[level](JSON.stringify(record));
}
