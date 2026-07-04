// ============================================================
// lib/server-errors.ts
// 全局 uncaughtException handler, 过滤 client aborted 噪音
// (v0.33.3 修复上传 hang 时的 ECONNRESET 噪音)
//  模块顶层一次性注册 (Next.js HMR 可能重复 import, 用 globalThis 守门)
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var __serverErrorsHandlerInstalled: boolean | undefined;
}

if (!globalThis.__serverErrorsHandlerInstalled) {
  globalThis.__serverErrorsHandlerInstalled = true;

  process.on("uncaughtException", (err: Error) => {
    const msg = err?.message ?? "";
    if (
      msg.includes("aborted") ||
      msg.includes("ECONNRESET") ||
      msg.includes("Request aborted") ||
      msg.includes("ERR_STREAM_PREMATURE_CLOSE")
    ) {
      // client 断开, 已经清理 (promise 已被 respond 兜底), 静默
      return;
    }
    console.error("[uncaughtException]", err);
  });

  process.on("unhandledRejection", (reason: any) => {
    const msg = reason?.message ?? String(reason);
    if (
      msg.includes("aborted") ||
      msg.includes("ECONNRESET") ||
      msg.includes("Request aborted")
    ) {
      return;
    }
    console.error("[unhandledRejection]", reason);
  });
}

export {};
