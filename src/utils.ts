import type { ValidationIssue } from "./types";
import * as fs from "node:fs";
import * as path from "node:path";

const c = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`
};

export class EnvGuardError extends Error {
  issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    const header = c.bold(c.red("ENV validation failed"));
    const body = issues.map(i => `- ${i.key}: ${i.message}`).join("\n");
    super(`${header}\n${body}`);
    this.name = "EnvGuardError";
    this.issues = issues;
  }
}

export function isBlank(v: string | undefined): boolean {
  return v === undefined || v === "";
}

export function parseURL(raw: string): URL {
  try {
    return new URL(raw);
  } catch {
    throw new Error(`expected URL but got "${raw}"`);
  }
}

export function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Minimal .env loader (no dependency).
 * Behavior:
 * - Parses KEY=VALUE lines
 * - Ignores comments (#) and blank lines
 * - Respects quoted values "like this"
 * - Does NOT override existing process.env keys
 */
export function loadDotEnv(opts?: { path?: string; required?: boolean }): void {
  const envPath = opts?.path ?? path.resolve(process.cwd(), ".env");
  if (!fileExists(envPath)) {
    if (opts?.required) {
      throw new EnvGuardError([{ key: ".env", message: `file not found at ${envPath}` }]);
    }
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
