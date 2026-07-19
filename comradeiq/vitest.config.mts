import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // `server-only` is a Next.js build marker. Unit tests execute server modules
    // in Node, so resolve only that marker to an inert test-local module.
    alias: {
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
