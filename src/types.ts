export type PrimitiveKind = "string" | "number" | "boolean" | "enum" | "url";

export interface ValidationIssue {
  key: string;
  message: string;
}

export interface BaseSchema<T> {
  readonly _kind: PrimitiveKind;
  readonly _default?: T;
  readonly _isOptional: boolean;
  readonly _description?: string;
  readonly _coerce?: boolean;
  readonly _transform?: (v: any) => any;
  readonly _output: T;

  parse(raw: string | undefined, key: string): T;

  default(value: T): this & { _default: T; _output: T };
  optional(): this & { _isOptional: true; _output: T | undefined };
  describe(text: string): this & { _description: string };
  transform<U>(fn: (v: T) => U): BaseSchema<U> & { _output: U };
  coerce(): this;
}

export type StringSchema = BaseSchema<string>;
export type NumberSchema = BaseSchema<number>;
export type BooleanSchema = BaseSchema<boolean>;

export type EnumValues<T extends readonly string[]> = T[number];
export type EnumSchema<T extends readonly string[]> = BaseSchema<EnumValues<T>> & {
  readonly _values: T;
};

export type UrlSchemaString = BaseSchema<string> & { _asURL?: false };
export type UrlSchemaURL = BaseSchema<URL> & { _asURL: true };
export type UrlSchema = UrlSchemaString | UrlSchemaURL;

export type AnySchema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | EnumSchema<readonly string[]>
  | UrlSchema;

export type EnvSchema = Record<string, AnySchema>;
export type InferType<S> = S extends { _output: infer O } ? O : never;

export type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: InferType<S[K]>;
};

export interface DotenvOptions {
  required?: boolean;
  path?: string; // optional custom path for .env
}

export interface GuardOptions {
  strict?: boolean;
  source?: Record<string, string | undefined>;
}
