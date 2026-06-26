// ============================================================
// Playwright globalSetup - 跑 e2e 前重置 DB 到 seed 状态
// 避免 e2e 跨 spec 测试数据污染
// ============================================================
export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseURL}/api/test-reset-db`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`test-reset-db failed: ${res.status}`);
  }
  console.log("[global-setup] DB reset to seed state");
}