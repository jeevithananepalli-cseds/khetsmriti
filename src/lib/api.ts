import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ApiResponse } from "@/types/domain";
import { clientKey, createRateLimiter } from "./rateLimit";

// Shared helpers so every route returns { ok: true, data } or { ok: false, error }.

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(code: string, message: string, status: number): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse<ApiResponse<never>> };

export async function parseJsonBody<T>(req: Request, schema: z.ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: fail("bad_request", "Request body must be JSON.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return { ok: false, response: fail("bad_request", detail, 400) };
  }
  return { ok: true, data: parsed.data };
}

/** Maps domain error codes to HTTP status codes. */
export function statusFor(code: string): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "rate_limited":
      return 429;
    case "memory_unavailable":
    case "api_error":
    case "timeout":
      return 503;
    default:
      return 502;
  }
}

export function serverError(context: string, err: unknown): NextResponse<ApiResponse<never>> {
  console.error(`[api] ${context}:`, err);
  return fail("internal", "Something went wrong on the server. Please try again.", 500);
}

// Routes that call Groq or Hindsight share one budget per client: 30 requests per minute.
const aiLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/** Returns a 429 response when the caller is over the AI budget, otherwise null. */
export function rateLimited(req: Request): NextResponse<ApiResponse<never>> | null {
  const result = aiLimiter(clientKey(req));
  if (result.allowed) return null;
  const res = fail("rate_limited", `Too many requests. Try again in ${result.retryAfterSeconds} s.`, 429);
  res.headers.set("Retry-After", String(result.retryAfterSeconds));
  return res;
}
