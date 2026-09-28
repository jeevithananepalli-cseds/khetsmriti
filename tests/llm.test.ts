import { RateLimitError } from "groq-sdk";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { extractJson, generateJSON, type ChatMessage, type CompleteFn } from "@/lib/llm";

const schema = z.object({ answer: z.string(), score: z.number() });
const messages: ChatMessage[] = [{ role: "user", content: "Give me JSON" }];
const models = { primaryModel: "primary-model", fallbackModel: "fallback-model" };

/** A fake Groq: returns the scripted replies in order (a thrown Error simulates an API failure). */
function scripted(...replies: Array<string | Error>) {
  const calls: Array<{ model: string; messages: ChatMessage[] }> = [];
  const complete: CompleteFn = vi.fn(async (model, msgs) => {
    calls.push({ model, messages: msgs });
    const next = replies[calls.length - 1];
    if (next === undefined) throw new Error("no more scripted replies");
    if (next instanceof Error) throw next;
    return next;
  });
  return { complete, calls };
}

const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => undefined);

describe("extractJson", () => {
  it("parses a plain JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignores <think> blocks and code fences around the object", () => {
    expect(extractJson('<think>hmm {not json}</think>\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("throws when there is no object", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("generateJSON", () => {
  it("returns the primary model's answer on the first valid reply", async () => {
    const { complete, calls } = scripted('{"answer":"yes","score":1}');
    const result = await generateJSON(schema, messages, { complete, ...models });
    expect(result).toEqual({ ok: true, data: { answer: "yes", score: 1 }, model: "primary-model", attempts: 1 });
    expect(calls).toHaveLength(1);
  });

  it("retries once on the primary with the validation error appended", async () => {
    quiet();
    const { complete, calls } = scripted('{"answer":"yes"}', '{"answer":"yes","score":2}');
    const result = await generateJSON(schema, messages, { complete, ...models });
    expect(result.ok && result.model).toBe("primary-model");
    expect(result.attempts).toBe(2);
    const retryMessages = calls[1]?.messages ?? [];
    expect(retryMessages.at(-2)).toEqual({ role: "assistant", content: '{"answer":"yes"}' });
    expect(retryMessages.at(-1)?.content).toMatch(/score/);
  });

  it("falls back to the second model after two invalid replies", async () => {
    quiet();
    const { complete, calls } = scripted("not json", "still not json", '{"answer":"ok","score":3}');
    const result = await generateJSON(schema, messages, { complete, ...models });
    expect(result).toMatchObject({ ok: true, model: "fallback-model", attempts: 3 });
    expect(calls.map((c) => c.model)).toEqual(["primary-model", "primary-model", "fallback-model"]);
  });

  it("skips the same-model retry when the primary is rate limited", async () => {
    quiet();
    const rateLimit = new RateLimitError(429, { message: "slow down" }, "slow down", new Headers());
    const { complete, calls } = scripted(rateLimit, '{"answer":"ok","score":4}');
    const result = await generateJSON(schema, messages, { complete, ...models });
    expect(result).toMatchObject({ ok: true, model: "fallback-model", attempts: 2 });
    expect(calls.map((c) => c.model)).toEqual(["primary-model", "fallback-model"]);
  });

  it("returns a typed, user-safe error when every attempt fails", async () => {
    quiet();
    const { complete } = scripted("nope", "nope", "nope");
    const result = await generateJSON(schema, messages, { complete, ...models });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_output");
      expect(result.error.message).not.toMatch(/nope|Schema|JSON/);
      expect(result.attempts).toBe(3);
    }
  });

  it("never throws when the API call itself fails", async () => {
    quiet();
    const { complete } = scripted(new Error("socket hang up"), new Error("socket hang up"), new Error("socket hang up"));
    await expect(generateJSON(schema, messages, { complete, ...models })).resolves.toMatchObject({ ok: false });
  });
});
