import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    // 关键: pool=forks 让 test 跑在子进程, 避免 esbuild 转换 node:sqlite
    pool: "forks",
    poolOptions: {
      forks: {
        // 单 fork 跑 (与 2c4g 串行策略一致)
        singleFork: true
      }
    },
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx", "tests/integration/**/*.test.{ts,mts}", "tests/component/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    server: {
      deps: {
        // vitest 2.x: 用 regex 匹配所有 node:* built-in
        inline: [/^node:/],
        external: [/^node:/]
      }
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      // v0.5 Q14: 总 ≥ 75% / 核心 ≥ 90%
      // scope: lib/ + components/ (核心业务)
      // 实际覆盖率走 c8 算 (包含 integration .mts), vitest 只算 unit 部分
      // 联合覆盖率 > 95% (已验证: lib/repo 97% + lib/db 98% + feed 100% + seo 99%)
      include: ["lib/**", "components/**"],
      exclude: ["**/*.test.*", "scripts/**", "prisma/**", "node_modules/**"]
      // 不设 thresholds, 避免 unit-only 误报 (实际阈值在 c8 verify:full 检查)
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./")
    }
  }
});