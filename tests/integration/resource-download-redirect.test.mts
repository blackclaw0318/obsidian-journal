// 测试 downloads: 验证 download API 在 proxy 后返回正确的 public URL
// 老板 21:54 反馈: localhost:3000 跳转错误
//
// 注: 完整 API 测试需要 live server, 这里只测试 helper 逻辑
// (端到端通过 curl + Playwright 已验证: dev.shangkun.uk/api/.../download →
//  redirect to https://dev.shangkun.uk/uploads/...)

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

process.env.DATABASE_URL = "file:data/test-resource-dl.db";
process.env.SKIP_DB_INIT = "0";

const { mediaRepo, mediaCounterRepo, resetAllData } = await import("../../lib/repo.ts");

before(() => {
  resetAllData();
});

test("download helper: item.url 是相对路径 (/uploads/...)", () => {
  const m = mediaRepo.create({
    filename: `${randomBytes(4).toString("hex")}.png`,
    mime_type: "image/png",
    size: 1024,
    width: null, height: null, alt: null,
    url: "/uploads/test-dl.png",
    storage_type: "local",
    category: "image",
    is_paid: false,
  });
  const item = mediaRepo.byId(m.id)!;
  assert.ok(item.url.startsWith("/"), `URL 应为相对路径, 实际 ${item.url}`);
});

test("download counter: incDownload 增加 download_count", () => {
  const m = mediaRepo.create({
    filename: `${randomBytes(4).toString("hex")}.jpg`,
    mime_type: "image/jpeg",
    size: 1024,
    width: null, height: null, alt: null,
    url: "/uploads/test-dl2.jpg",
    storage_type: "local",
    category: "image",
    is_paid: false,
  });

  const before = mediaCounterRepo.byId(m.id)!;
  const beforeDl = before.download_count;

  mediaCounterRepo.incDownload(m.id);
  const after = mediaCounterRepo.byId(m.id)!;
  assert.equal(after.download_count, beforeDl + 1);

  // 重复 incDownload (下载不去重 — 老板决策)
  mediaCounterRepo.incDownload(m.id);
  mediaCounterRepo.incDownload(m.id);
  const after3 = mediaCounterRepo.byId(m.id)!;
  assert.equal(after3.download_count, beforeDl + 3);
});

test("download counter: 多次下载每次都 +1 (不去重)", () => {
  // 老板决策: 公开资源下载不限制同 IP (防滥用靠其他层)
  const m = mediaRepo.create({
    filename: `${randomBytes(4).toString("hex")}.pdf`,
    mime_type: "application/pdf",
    size: 1024,
    width: null, height: null, alt: null,
    url: "/uploads/test-dl3.pdf",
    storage_type: "local",
    category: "document",
    is_paid: false,
  });

  for (let i = 0; i < 5; i++) mediaCounterRepo.incDownload(m.id);
  const c = mediaCounterRepo.byId(m.id)!;
  assert.equal(c.download_count, 5);
});