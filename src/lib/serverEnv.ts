import "server-only";
import { z } from "zod";

// Server-side configuration, validated on first use so a missing key fails with a clear message.

const serverEnvSchema = z.object({
  HINDSIGHT_BASE_URL: z.url(),
  HINDSIGHT_API_KEY: z.string().min(1),
  HINDSIGHT_BANK_ID: z.string().min(1).default("khetsmriti-demo"),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL_PRIMARY: z.string().min(1).default("openai/gpt-oss-120b"),
  GROQ_MODEL_FALLBACK: z.string().min(1).default("qwen/qwen3.8-27b"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Missing or invalid environment variables: ${missing}. Check .env.local.`);
    }
    cached = parsed.data;
  }
  return cached;
}
