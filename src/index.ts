import { loadDotEnv, EnvGuardError } from "./utils";
import type {
  EnvSchema,
  InferEnv,
  ValidationIssue,
  DotenvOptions,
  GuardOptions
} from "./types";
export { string, number, boolean, enum_, url } from "./schema";

type Source = Record<string, string | undefined>;

class EnvGuardBuilder<S extends EnvSchema> {
  private schema: S;
  private opts: GuardOptions = {};
  private dotenvOpts: DotenvOptions = { required: false };

  constructor(schema: S) {
    this.schema = schema;
  }

  dotenv(options?: DotenvOptions): this {
    this.dotenvOpts = { required: false, ...(options ?? {}) };
    return this;
  }

  strict(): this {
    this.opts.strict = true;
    return this;
  }

  source(src: Source): this {
    this.opts.source = src;
    return this;
  }

  parse(): InferEnv<S> {
    // dotenv first
    loadDotEnv(this.dotenvOpts);

    const source: Source = this.opts.source ?? process.env;
    const issues: ValidationIssue[] = [];
    const out: Record<string, unknown> = {};

    // Validate known keys
    for (const key of Object.keys(this.schema)) {
      const rule: any = this.schema[key];
      const raw = source[key];
      try {
        out[key] = rule.parse(raw, key);
      } catch (e: any) {
        if (e instanceof EnvGuardError) issues.push(...e.issues);
        else issues.push({ key, message: e?.message ?? "invalid value" });
      }
    }

    // Strict: reject unknown keys
    if (this.opts.strict) {
      for (const k of Object.keys(source)) {
        if (k in this.schema) continue;
        // Ignore Node internals to avoid chaos
        if (k.startsWith("npm_") || k === "PWD" || k === "HOME" || k === "PATH") continue;
        // Also ignore empty keys
        if (!k) continue;
        issues.push({ key: k, message: "unknown key (strict mode)" });
      }
    }

    if (issues.length) throw new EnvGuardError(issues);
    return out as InferEnv<S>;
  }
}

// Overloads
export function envGuard<S extends EnvSchema>(schema: S): EnvGuardBuilder<S>;
export function envGuard<S extends EnvSchema>(schema: S, source: Source): InferEnv<S>;
export function envGuard<S extends EnvSchema>(schema: S, source?: Source): any {
  if (source) {
    // Immediate parse mode for backward-compat
    return new EnvGuardBuilder(schema).source(source).parse();
  }
  return new EnvGuardBuilder(schema);
}
