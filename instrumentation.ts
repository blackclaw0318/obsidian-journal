// ============================================================
// instrumentation.ts (Next.js 14 官方启动钩子)
//  - register(): server 启动时执行一次
//  - 注册 uncaughtException / unhandledRejection 过滤器
// ============================================================
import "./lib/server-errors";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // lib/server-errors.ts 顶层已注册 process.on 副作用
    console.log("[instrumentation] server-errors handler loaded");
  }
}
