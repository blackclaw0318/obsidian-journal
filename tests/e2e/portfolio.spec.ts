import { test, expect, type Locator } from "@playwright/test";

async function sceneNumber(scene: Locator, attribute: string) {
  return Number(await scene.getAttribute(attribute));
}

test.describe("作品集经历与虚拟角色", () => {
  test("9 段经历按材料时间排列，分类筛选可恢复全部", async ({ page }) => {
    await page.goto("/");
    const chapters = page.locator("article[data-project]");
    await expect(chapters).toHaveCount(9);
    await expect(chapters.first()).toHaveAttribute("data-project", "delivery-standards");
    await expect(chapters.last()).toHaveAttribute("data-project", "document-quality");
    const dates = await chapters.locator("time").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("datetime")));
    expect(dates).toEqual([...dates].sort());

    const filters = page.getByRole("group", { name: "筛选项目经历" });
    for (const [label, count] of [["计算机视觉", 2], ["多模态与评测", 2], ["工程与工具", 5]] as const) {
      await filters.getByRole("button", { name: label, exact: true }).click();
      await expect(filters.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(chapters).toHaveCount(count);
    }
    await filters.getByRole("button", { name: "全部经历" }).click();
    await expect(chapters).toHaveCount(9);
  });

  test("项目详情展示贡献、交付状态并返回原经历", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-project="document-quality"]').getByRole("link", { name: "展开这段经历" }).click();
    await expect(page).toHaveURL(/\/work\/document-quality$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("让图像质量成为第一道关卡");
    await expect(page.getByRole("heading", { name: "我在其中做了什么" })).toBeVisible();
    await expect(page.locator(".contribution-list li")).toHaveCount(4);
    await expect(page.getByText("研发与材料已交付，部署验收待确认", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "返回经历时间线" }).click();
    await expect(page).toHaveURL(/\/#document-quality$/);
    await expect(page.locator('[data-project="document-quality"]')).toBeInViewport();
  });

  test("手机滚动时角色保持可见，并跟随当前经历切换状态", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const stage = page.locator(".journey-stage");
    const avatar = stage.locator(".avatar-stage");
    await expect(avatar).toHaveAttribute("data-scene", "hello");
    for (const [slug, scene, title] of [
      ["delivery-standards", "build", "让模型交付有章可循"],
      ["video-understanding-evaluation", "research", "探索视频理解的实际边界"],
      ["document-quality", "vision", "让图像质量成为第一道关卡"]
    ] as const) {
      await page.locator(`[data-project="${slug}"]`).evaluate((element) => {
        window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 300, behavior: "instant" });
      });
      await expect(avatar).toHaveAttribute("data-scene", scene);
      await expect(stage.locator(".avatar-chapter")).toContainText(title);
      await expect(stage).toBeInViewport({ ratio: 1 });
      const box = await stage.boundingBox();
      expect(box?.y).toBeGreaterThanOrEqual(75);
      expect(box?.y).toBeLessThan(100);
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test("指针控制真实眼球，拖动视角后可重置", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const scene = page.locator('.portfolio-scene[data-model="avatar-v3"]');
    await expect(scene).toHaveClass(/scene-ready/, { timeout: 20000 });
    const box = await scene.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.move(box.x + box.width * .78, box.y + box.height * .28);
    await expect.poll(async () => Math.abs(await sceneNumber(scene, "data-gaze-y"))).toBeGreaterThan(.01);
    await expect.poll(async () => Math.abs(await sceneNumber(scene, "data-gaze-x"))).toBeGreaterThan(.01);
    const rightGaze = await sceneNumber(scene, "data-gaze-x");
    await page.mouse.move(box.x + box.width * .22, box.y + box.height * .72);
    await expect.poll(async () => (await sceneNumber(scene, "data-gaze-x")) * rightGaze).toBeLessThan(0);

    await page.mouse.move(box.x + box.width * .45, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .73, box.y + box.height * .5, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs(await sceneNumber(scene, "data-view-yaw"))).toBeGreaterThan(.04);
    await page.getByRole("button", { name: "重置角色视角" }).click();
    for (const attribute of ["data-gaze-x", "data-gaze-y", "data-view-yaw"]) {
      await expect.poll(async () => Math.abs(await sceneNumber(scene, attribute))).toBeLessThan(.015);
    }
  });

  test("无 WebGL 时展示静态形象，仍可阅读与打开项目", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("认真做技术");
    const poster = page.locator(".avatar-poster");
    await expect(poster).toBeVisible();
    await expect.poll(() => poster.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "切换角色表情，当前自然" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "重置角色视角" })).toBeDisabled();
    await expect(page.locator("article[data-project]")).toHaveCount(9);
    await page.locator('[data-project="delivery-standards"]').getByRole("link", { name: "展开这段经历" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("让模型交付有章可循");
  });
});
