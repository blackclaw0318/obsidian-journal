// ============================================================
// MD 上传 e2e (v0.11)
// ============================================================
import { test, expect } from "@playwright/test";

test.describe.serial("Admin MD 上传", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "admin@obsidian.local");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  });

  test("上传页加载", async ({ page }) => {
    await page.goto("/admin/upload");
    await expect(page.locator("h1")).toContainText("MD 上传");
  });

  test("粘贴 MD + 预览解析", async ({ page }) => {
    await page.goto("/admin/upload");
    const md = `---
title: E2E测试文章
slug: e2e-upload-test
excerpt: e2e 摘要
cover: /media/test.jpg
tags: test, e2e
---

# 标题

正文内容...`;
    await page.fill('textarea', md);
    await page.click('button:has-text("预览解析")');
    // 等待预览区域出现 (text="title" 标签的 div 存在)
    await expect(page.getByText("title", { exact: true }).first()).toBeVisible();
    // 验证 frontmatter 已解析
    await expect(page.getByText('"title"').first()).toBeVisible();
    await expect(page.getByText('"slug"').first()).toBeVisible();
  });
});
