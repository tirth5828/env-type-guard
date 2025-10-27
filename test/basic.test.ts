import test from "node:test";
import assert from "node:assert/strict";
import { envGuard, string, number, boolean } from "../src/index";

test("loads and types values", () => {
  const env = envGuard({
    DB_URL: string(),
    PORT: number().default(3000),
    DEBUG: boolean().default(false),
    OPTIONAL_KEY: string().optional()
  }, {
    DB_URL: "postgres://x",
    PORT: "8080",
    DEBUG: "true",
    OPTIONAL_KEY: undefined
  });

  assert.equal(env.DB_URL, "postgres://x");
  assert.equal(env.PORT, 8080);
  assert.equal(env.DEBUG, true);
  assert.equal(env.OPTIONAL_KEY, undefined);
});

test("collects and prints multiple issues", () => {
  try {
    envGuard({
      A: number(),
      B: boolean(),
      C: string()
    }, { A: "nope", B: "maybe", C: "" });
    assert.fail("should have thrown");
  } catch (e: any) {
    const msg = e.message as string;
    assert(msg.includes("A: expected number"));
    assert(msg.includes("B: expected boolean"));
    assert(msg.includes("C: missing"));
  }
});
