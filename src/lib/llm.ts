import "server-only";
import Groq, { APIConnectionTimeoutError, APIError, RateLimitError } from "groq-sdk";
import type { TranscribeLanguage } from "@/types/domain";
import type { z } from "zod";
import { serverEnv } from "./serverEnv";

// The ONLY module that talks to Groq chat completions.
// Flow: primary model → one retry on the primary with the error appended → fallback model → typed error.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type LlmErrorCode = "invalid_output" | "timeout" | "rate_limited" | "api_error";

export interface LlmError {
  code: LlmErrorCode;
  message: string;
}

export type LlmResult<T> =
  | { ok: true; data: T; model: string; attempts: number }
  | { ok: false; error: LlmError; attempts: number };

/** Sends messages to a model and returns the raw text reply. Swappable in tests. */
export type CompleteFn = (model: string, messages: ChatMessage[]) => Promise<string>;

export interface GenerateOptions {
  complete?: CompleteFn;
  primaryModel?: string;
  fallbackModel?: string;
}

const REQUEST_TIMEOUT_MS = 45_000;

const globalForGroq = globalThis as typeof globalThis & { __khetGroq?: Groq };

function groq(): Groq {
  if (!globalForGroq.__khetGroq) {
    globalForGroq.__khetGroq = new Groq({
      apiKey: serverEnv().GROQ_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return globalForGroq.__khetGroq;
}

const groqComplete: CompleteFn = async (model, messages) => {
  const isQwen = model.startsWith("qwen/");
  const res = await groq().chat.completions.create({
    model,
    messages,
    temperature: 0.2,
    response_format: { type: "json_object" },
    ...(isQwen ? { reasoning_format: "hidden" as const } : { include_reasoning: false }),
  });
  return res.choices[0]?.message?.content ?? "";
};

/** Pulls the JSON object out of a reply, tolerating stray <think> blocks or code fences. */
export function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Reply did not contain a JSON object.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function describeZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 8)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

function classify(err: unknown): LlmError {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof APIConnectionTimeoutError) return { code: "timeout", message: "The language model timed out." };
  if (err instanceof RateLimitError) return { code: "rate_limited", message: "The language model is rate limited. Try again shortly." };
  if (err instanceof APIError) {
    console.warn(`[llm] Groq API error ${err.status ?? ""}: ${message.slice(0, 300)}`);
    return { code: "api_error", message: `The language model returned an error${err.status ? ` (${err.status})` : ""}.` };
  }
  return { code: "invalid_output", message };
}

/** What the UI sees when every attempt failed: short and free of model output or server internals. */
function publicError(error: LlmError): LlmError {
  if (error.code === "invalid_output") {
    return { code: "invalid_output", message: "The language model returned an answer we could not use. Please try again." };
  }
  return error;
}

type AttemptResult<T> = { ok: true; data: T } | { ok: false; error: LlmError; reply: string | null };

async function attempt<T>(
  schema: z.ZodType<T>,
  model: string,
  messages: ChatMessage[],
  complete: CompleteFn,
): Promise<AttemptResult<T>> {
  let reply: string;
  try {
    reply = await complete(model, messages);
  } catch (err: unknown) {
    return { ok: false, error: classify(err), reply: null };
  }
  let json: unknown;
  try {
    json = extractJson(reply);
  } catch (err: unknown) {
    return { ok: false, error: { code: "invalid_output", message: `Invalid JSON: ${classify(err).message}` }, reply };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: { code: "invalid_output", message: `Schema mismatch: ${describeZodError(parsed.error)}` }, reply };
  }
  return { ok: true, data: parsed.data };
}

function logFailure(model: string, attemptNo: number, error: LlmError): void {
  console.warn(`[llm] attempt ${attemptNo} on ${model} failed (${error.code}): ${error.message.slice(0, 300)}`);
}

function withCorrection(messages: ChatMessage[], reply: string | null, error: LlmError): ChatMessage[] {
  const correction: ChatMessage = {
    role: "user",
    content: `Your previous reply could not be used. Error: ${error.message}. Reply again with ONLY a valid JSON object that matches the required schema exactly.`,
  };
  return reply ? [...messages, { role: "assistant", content: reply }, correction] : [...messages, correction];
}

export async function generateJSON<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  options: GenerateOptions = {},
): Promise<LlmResult<T>> {
  const complete = options.complete ?? groqComplete;
  const primary = options.primaryModel ?? serverEnv().GROQ_MODEL_PRIMARY;
  const fallback = options.fallbackModel ?? serverEnv().GROQ_MODEL_FALLBACK;

  const first = await attempt(schema, primary, messages, complete);
  if (first.ok) return { ok: true, data: first.data, model: primary, attempts: 1 };
  logFailure(primary, 1, first.error);

  // Retrying the same model is pointless when it is rate limited; go straight to the fallback.
  let lastError = first.error;
  let attempts = 1;
  if (first.error.code !== "rate_limited") {
    const retry = await attempt(schema, primary, withCorrection(messages, first.reply, first.error), complete);
    attempts = 2;
    if (retry.ok) return { ok: true, data: retry.data, model: primary, attempts };
    logFailure(primary, attempts, retry.error);
    lastError = retry.error;
  }

  const fallbackMessages = lastError.code === "invalid_output" ? withCorrection(messages, null, lastError) : messages;
  const last = await attempt(schema, fallback, fallbackMessages, complete);
  attempts += 1;
  if (last.ok) return { ok: true, data: last.data, model: fallback, attempts };
  logFailure(fallback, attempts, last.error);

  return { ok: false, error: publicError(last.error), attempts };
}

// ---------- speech to text ----------

export type { TranscribeLanguage } from "@/types/domain";

export type TranscribeResult = { ok: true; text: string } | { ok: false; error: LlmError };

const WHISPER_MODEL = "whisper-large-v3";

/** Transcribes a short voice note with Groq Whisper. "auto" lets Whisper detect Telugu/English. */
export async function transcribeAudio(file: File, language: TranscribeLanguage): Promise<TranscribeResult> {
  try {
    const res = await groq().audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      response_format: "json",
      temperature: 0,
      ...(language === "auto" ? {} : { language }),
    });
    return { ok: true, text: res.text.trim() };
  } catch (err: unknown) {
    return { ok: false, error: classify(err) };
  }
}
