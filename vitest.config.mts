import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside a React Server Components build; tests import server modules directly.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/narrative.ts",
        "src/lib/guardrails.ts",
        "src/lib/briefSchema.ts",
        "src/lib/dataSchemas.ts",
        "src/lib/llm.ts",
        "src/lib/format.ts",
        "src/lib/learningCurve.ts",
        "src/lib/rateLimit.ts",
        "src/lib/season.ts",
        "src/lib/memoryLog.ts",
      ],
    },
  },
});
