# env-guard

Tiny, Zod-like schema validator for environment variables with defaults, transforms, and type-narrowed output. Zero runtime deps.

## Install
```bash
npm i env-guard
````

## Quick start (chainable API)

```ts
import { envGuard, string, number, boolean, enum_, url } from "env-guard";

const schema = {
  API_URL: url().asURL().describe("Main backend URL"),
  DB_URL: url(),                      // returns string by default
  PORT: number().default(8080),
  REGION: enum_(["us", "eu", "asia"]),
  DEBUG: boolean().default(false),
  SECRET_KEY: string().optional().transform(s => s?.trim())
};

const env = envGuard(schema)
  .dotenv({ required: false }) // load .env if present (no throw)
  .strict()                    // error on unknown keys
  .parse();

console.log(env.API_URL instanceof URL); // true
```

## Features

* String, number, boolean, enum, url
* `.default()`, `.optional()`, `.describe()`
* `.transform(fn)`, `.coerce()` (symmetry)
* `url().asURL()` to return a `URL` object
* `.dotenv({ required?: boolean, path?: string })`
* `.strict()` to reject unknown keys
* Fully typed return object

## API surface

```ts
string()
number()
boolean()
enum_(values: readonly string[])
url()            // validates format, returns string
url().asURL()    // returns URL object

modifier: .default(v), .optional(), .describe(text), .transform(fn), .coerce()

envGuard(schema)                 // returns builder
  .dotenv({ required?: boolean, path?: string })
  .strict()
  .source(customSource?)         // optional override of process.env
  .parse();

envGuard(schema, source)         // immediate parse (back-compat)
```

