import { EnvGuardError, isBlank, parseURL } from "./utils";
import type {
  BaseSchema,
  BooleanSchema,
  NumberSchema,
  StringSchema,
  EnumSchema,
  EnumValues,
  UrlSchema,
  UrlSchemaString,
  UrlSchemaURL
} from "./types";

// Core factory
function factory<T>(
  kind: BaseSchema<any>["_kind"],
  parser: (raw: string, key: string, self: any) => T
): BaseSchema<T> {
  const base: any = {
    _kind: kind,
    _isOptional: false as const,

    parse(raw: string | undefined, key: string): T {
      if (isBlank(raw)) {
        if ("_default" in base) {
          let v = base._default as T;
          if (base._transform) v = base._transform(v);
          return v;
        }
        if (base._isOptional) {
          return undefined as unknown as T;
        }
        const hint = base._description ? ` (${base._description})` : "";
        throw new EnvGuardError([{ key, message: `missing${hint}` }]);
      }

      try {
        let value = parser(raw as string, key, base);
        if (base._transform) value = base._transform(value);
        return value;
      } catch (e: any) {
        const msg = e?.message ?? "invalid value";
        throw new EnvGuardError([{ key, message: msg }]);
      }
    },

    default(value: T) {
      const clone = { ...this, _default: value } as BaseSchema<T> & { _default: T };
      return clone;
    },

    optional() {
      const clone = { ...this, _isOptional: true } as BaseSchema<T> & { _isOptional: true };
      return clone;
    },

    describe(text: string) {
      const clone = { ...this, _description: text } as BaseSchema<T> & { _description: string };
      return clone;
    },

    transform<U>(fn: (v: T) => U): BaseSchema<U> & { _output: U } {
      const prev = this._transform;
      const combined = prev
        ? (x: any) => fn(prev(x))
        : (x: any) => fn(x);
      const clone = { ...this, _transform: combined } as any;
      return clone;
    },

    coerce() {
      // For symmetry; number/boolean already parse strings.
      return { ...this };
    }
  };
  return base;
}

// string
export function string(): StringSchema {
  return factory<string>("string", (raw) => raw);
}

// number
export function number(): NumberSchema {
  return factory<number>("number", (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`expected number but got "${raw}"`);
    return n;
  });
}

// boolean
export function boolean(): BooleanSchema {
  const truthy = new Set(["true", "1", "yes", "y", "on"]);
  const falsy = new Set(["false", "0", "no", "n", "off"]);
  return factory<boolean>("boolean", (raw) => {
    const v = raw.trim().toLowerCase();
    if (truthy.has(v)) return true;
    if (falsy.has(v)) return false;
    throw new Error(`expected boolean but got "${raw}"`);
  });
}

// enum
export function enum_<T extends readonly string[]>(values: T): EnumSchema<T> {
  const set = new Set(values);
  const base = factory<EnumValues<T>>("enum", (raw) => {
    if (!set.has(raw)) {
      const choices = values.join("|");
      throw new Error(`expected one of [${choices}] but got "${raw}"`);
    }
    return raw as EnumValues<T>;
  }) as EnumSchema<T>;
  (base as any)._values = values;
  return base;
}

// url
export function url(): UrlSchema {
  const base = factory<string>("url", (raw) => {
    // Validate format, but return string by default
    parseURL(raw);
    return raw;
  }) as UrlSchemaString;

  const withAsURL = Object.assign(base, {
    asURL(): UrlSchemaURL {
      const obj = factory<URL>("url", (raw) => parseURL(raw)) as UrlSchemaURL;
      (obj as any)._asURL = true;
      // carry over modifiers if any
      if (base._default !== undefined) (obj as any)._default = base._default;
      if (base._isOptional) (obj as any)._isOptional = true;
      if (base._description) (obj as any)._description = base._description;
      if (base._transform) (obj as any)._transform = base._transform;
      return obj;
    }
  });

  return withAsURL as UrlSchema;
}

export type {
  StringSchema,
  NumberSchema,
  BooleanSchema
};
