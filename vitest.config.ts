import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx", "tests/integration/**/*.test.ts", "tests/component/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      // v0.5 Q14: 总 ≥ 75% / 核心 ≥ 90%
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./")
    }
  }
});