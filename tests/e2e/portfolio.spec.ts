import { test, expect, type Locator } from "@playwright/test";
import { portfolioProjects, projectCategories } from "../../lib/portfolio";

async function sceneNumber(scene: Locator, attribute: string) {
  return Number((await scene.getAttribute(attribute)) ?? "NaN");
}

const cameraAttributes = ["data-camera-x", "data-camera-y", "data-camera-z"] as const;
const cameraPosition = (scene: Locator) => Promise.all(cameraAttributes.map(attribute => sceneNumber(scene, attribute)));
const cameraDistance = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));

async function stableCameraPosition(scene: Locator) {
  for (const attribute of cameraAttributes) await expect(scene).toHaveAttribute(attribute, /-?\d/);
  let previous = await cameraPosition(scene);
  let settled = 0;
  await expect.poll(async () => {
    const current = await cameraPosition(scene);
    settled = cameraDistance(current, previous) < .006 ? settled + 1 : 0;
    previous = current;
    return settled;
  }, { intervals: [150], timeout: 10000 }).toBeGreaterThanOrEqual(3);
  return previous;
}

test.describe("工作项目与多面虚拟角色", () => {
  test("4 个工作项目按材料时间排列，分类筛选可恢复全部", async ({ page }) => {
    await page.goto("/");
    const chapters = page.locator("article[data-project]");
    await expect(chapters).toHaveCount(4);
    expect(await chapters.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-project")))).toEqual([
      "delivery-standards", "pedestrian-events", "resume-parser", "document-quality"
    ]);
    const dates = await chapters.locator("time").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("datetime")));
    expect(dates).toEqual([...dates].sort());

    const filters = page.locator("#work");
    for (const { id, label } of projectCategories.filter((category) => category.id !== "all")) {
      const count = portfolioProjects.filter((project) => project.category === id).length;
      await filters.getByRole("button", { name: label, exact: true }).click();
      await expect(filters.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(chapters).toHaveCount(count);
    }
    await filters.getByRole("button", { name: projectCategories[0].label, exact: true }).click();
    await expect(chapters).toHaveCount(4);
  });

  test("项目详情展示贡献、交付状态并返回原经历", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-project="document-quality"] a[href="/work/document-quality"]').last().click();
    await expect(page).toHaveURL(/\/work\/document-quality$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("证件图像质量检测");
    await expect(page.getByRole("heading", { name: "我在其中做了什么" })).toBeVisible();
    const contributions = page.locator("section").filter({ has: page.getByRole("heading", { name: "我在其中做了什么", exact: true }) });
    await expect(contributions.locator("li")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: "工作推进的阶段", exact: true })).toBeVisible();
    await expect(page.getByText("研发与材料已交付，部署验收待确认", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "返回工作经历", exact: true }).click();
    await expect(page).toHaveURL(/\/#document-quality$/);
    await expect(page.locator('[data-project="document-quality"]')).toBeInViewport();
  });

  test("旧项目详情跳转到归并后的项目", async ({ page, request }) => {
    for (const [alias, canonical] of [
      ["delivery-skill", "delivery-standards"],
      ["video-understanding-evaluation", "pedestrian-events"],
      ["annotation-tool", "pedestrian-events"],
      ["video-data", "pedestrian-events"],
      ["multimodal-evaluation", "pedestrian-events"]
    ]) {
      const response = await request.get(`/work/${alias}`, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers().location).toBe(`/work/${canonical}`);
      await page.goto(`/work/${alias}`);
      await expect(page).toHaveURL(new RegExp(`/work/${canonical}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(portfolioProjects.find((project) => project.slug === canonical)!.title);
    }
  });

  test("工作经历锚点、旧锚点与浏览器历史都能回到可读位置", async ({ page }, testInfo) => {
    await page.goto("/#work");
    const workHeading = page.locator("#work").getByRole("heading").first();
    await expect(workHeading).toBeInViewport();
    await page.goto("/#experience");
    await expect(workHeading).toBeInViewport();
    await page.goto("/#video-data");
    await expect(page.locator('[data-project="pedestrian-events"]')).toBeInViewport();
    await page.goto("/#document-quality");
    const chapter = page.locator('[data-project="document-quality"]');
    await expect(chapter).toBeInViewport();
    await chapter.locator('a[href="/work/document-quality"]').last().click();
    await expect(page).toHaveURL(/\/work\/document-quality$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("证件图像质量检测");
    await page.goBack();
    await expect(page).toHaveURL(/\/#document-quality$/);
    await expect(chapter).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath("work-history-return.png"), fullPage: false });
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("证件图像质量检测");
  });

  test("六个领域入口滚动到对应故事，三维镜头随选择改变", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const world = page.getByTestId("avatar-world");
    const scene = page.getByTestId("avatar-scene");
    await expect(world).toBeVisible();
    await expect(scene).toHaveClass(/scene-ready/, { timeout: 20000 });
    await expect(scene).toHaveAttribute("data-focus", "all");
    await world.screenshot({ path: testInfo.outputPath("avatar-main-desktop.png") });
    for (const attribute of cameraAttributes) await expect(scene).toHaveAttribute(attribute, /-?\d/);
    const initialCamera = await Promise.all(cameraAttributes.map((attribute) => sceneNumber(scene, attribute)));
    await page.getByRole("button", { name: "探索程序员", exact: true }).click();
    await expect(scene).toHaveAttribute("data-focus", "coder");
    await expect(page.locator("#domain-coder")).toBeInViewport();
    await expect.poll(async () => {
      const camera = await Promise.all(cameraAttributes.map((attribute) => sceneNumber(scene, attribute)));
      return Math.hypot(...camera.map((value, index) => value - initialCamera[index]));
    }).toBeGreaterThan(.05);
    for (const [label, focus, destination] of [
      ["音乐人", "musician", "#domain-musician"], ["视频创作者", "video", "#domain-video"], ["基督徒", "christian", "#domain-christian"],
      ["梦想家", "dreamer", "#domain-dreamer"], ["工作经历", "work", "#work"]
    ]) {
      await page.getByRole("button", { name: `探索${label}`, exact: true }).click();
      await expect(scene).toHaveAttribute("data-focus", focus);
      await expect(page.locator(destination)).toBeInViewport();
    }
    await expect(page.locator("#work").getByRole("heading").first()).toBeInViewport();
  });

  test("角色占据满视口，实际模型投影足够大", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const world = page.getByTestId("avatar-world");
    const scene = page.getByTestId("avatar-scene");
    await expect(world).toHaveCount(1);
    await expect(scene.locator("canvas")).toHaveCount(1);
    await expect(scene).toHaveClass(/scene-ready/, { timeout: 30000 });
    const box = await world.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(1440 * .98);
    expect(box!.height).toBeGreaterThanOrEqual(900 * .95);
    expect(Math.abs(box!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box!.y)).toBeLessThanOrEqual(1);
    await expect.poll(() => sceneNumber(scene, "data-model-viewport-height")).toBeGreaterThanOrEqual(.7);
    await expect.poll(() => sceneNumber(scene, "data-model-screen-height")).toBeGreaterThanOrEqual(900 * .7);
    await page.screenshot({ path: testInfo.outputPath("cinematic-desktop-opening.png"), fullPage: false });
  });

  test("只滚动就改变真实相机，并能反向回到首镜头", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const scene = page.getByTestId("avatar-scene");
    await expect(scene).toHaveClass(/scene-ready/, { timeout: 30000 });
    await expect(scene).toHaveAttribute("data-shot", /\S+/);
    await expect(page.locator("[data-cinema-frame]")).not.toHaveCount(0);
    const viewport = page.viewportSize()!;
    await page.mouse.move(viewport.width * .96, viewport.height * .9);
    const opening = await stableCameraPosition(scene);
    const openingShot = await scene.getAttribute("data-shot");
    const openingProgress = await sceneNumber(scene, "data-scroll-progress");
    await page.mouse.wheel(0, Math.round(viewport.height * 1.1));
    await expect.poll(() => sceneNumber(scene, "data-scroll-progress"), { timeout: 10000 }).toBeGreaterThan(openingProgress + .02);
    await expect(scene).not.toHaveAttribute("data-shot", openingShot!);
    const next = await stableCameraPosition(scene);
    expect(cameraDistance(next, opening)).toBeGreaterThan(.1);
    await page.screenshot({ path: testInfo.outputPath("cinematic-after-scroll.png"), fullPage: false });
    await page.mouse.wheel(0, -Math.round(viewport.height * 3));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(scene).toHaveAttribute("data-shot", openingShot!);
    await expect.poll(async () => cameraDistance(await cameraPosition(scene), opening), { timeout: 10000 }).toBeLessThan(.05);
  });

  test("道具与搞怪表情可以通过可访问按钮触发", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const world = page.getByTestId("avatar-world");
    const scene = page.getByTestId("avatar-scene");
    await expect(world).toBeVisible();
    await expect(scene).toHaveClass(/scene-ready/, { timeout: 20000 });
    await expect(scene).toHaveAttribute("data-apple-y", /-?\d/);
    const initialAppleY = await sceneNumber(scene, "data-apple-y");
    let count = await sceneNumber(scene, "data-action-count");
    for (const [label, action] of [["抛一下苹果", "apple"], ["咬一口面包", "bread"], ["手机闪光灯", "flash"]]) {
      const flashSeen = action === "flash" ? scene.evaluate(element => new Promise<boolean>(resolve => {
        const observer = new MutationObserver(() => {
          if (element.getAttribute("data-flash") === "true") { observer.disconnect(); clearTimeout(timeout); resolve(true); }
        });
        const timeout = setTimeout(() => { observer.disconnect(); resolve(false); }, 3000);
        observer.observe(element, { attributes: true, attributeFilter: ["data-flash"] });
      })) : undefined;
      await world.getByRole("button", { name: label, exact: true }).click();
      await expect(scene).toHaveAttribute("data-action", action);
      count += 1;
      await expect(scene).toHaveAttribute("data-action-count", String(count));
      if (action === "apple") await expect.poll(() => sceneNumber(scene, "data-apple-y")).toBeGreaterThan(initialAppleY + .05);
      if (action === "bread") {
        await expect(scene).toHaveAttribute("data-bread-whole-visible", "false");
        await expect(scene).toHaveAttribute("data-bread-bitten-visible", "true");
      }
      if (flashSeen) expect(await flashSeen).toBe(true);
    }
    await expect(scene).toHaveAttribute("data-bread", "bitten");
    await expect(scene).toHaveAttribute("data-expression", "natural");
    await world.getByRole("button", { name: "换个搞怪表情", exact: true }).click();
    await expect(scene).toHaveAttribute("data-expression", "silly");
    await world.getByRole("button", { name: "重置角色视角", exact: true }).click();
    await expect(scene).toHaveAttribute("data-expression", "natural");
    await expect(scene).toHaveAttribute("data-focus", "all");
    await expect(scene).toHaveAttribute("data-bread-whole-visible", "true");
    await expect(scene).toHaveAttribute("data-bread-bitten-visible", "false");
  });

  test("减少动画偏好停止眼神跟随，领域与工作导航仍可用", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const world = page.getByTestId("avatar-world");
    const scene = page.getByTestId("avatar-scene");
    await expect(world).toBeVisible();
    await expect(scene).toHaveClass(/scene-ready/, { timeout: 20000 });
    const box = await scene.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.move(box.x + box.width * .9, box.y + box.height * .15);
    const maximumGaze = await scene.evaluate(async (element) => {
      let maximum = 0;
      for (let frame = 0; frame < 12; frame++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        maximum = Math.max(maximum, Math.abs(Number(element.getAttribute("data-gaze-x"))), Math.abs(Number(element.getAttribute("data-gaze-y"))));
      }
      return maximum;
    });
    expect(maximumGaze).toBeLessThan(.01);
    await page.getByRole("button", { name: "探索程序员", exact: true }).click();
    await expect(scene).toHaveAttribute("data-focus", "coder");
    await page.getByRole("button", { name: "探索工作经历", exact: true }).click();
    await expect(scene).toHaveAttribute("data-focus", "work");
    await expect(page.locator("#work").getByRole("heading").first()).toBeInViewport();
  });

  test("手机可探索领域、滚动阅读四个项目且没有横向溢出", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const world = page.getByTestId("avatar-world");
    await expect(world).toBeVisible();
    await expect(page.getByTestId("avatar-scene")).toHaveCount(1);
    await expect(page.getByTestId("avatar-scene")).toHaveClass(/scene-ready/, { timeout: 20000 });
    const box = await world.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(390 * .98);
    expect(box!.height).toBeGreaterThanOrEqual(844 * .95);
    await expect.poll(() => sceneNumber(page.getByTestId("avatar-scene"), "data-model-viewport-height")).toBeGreaterThanOrEqual(.7);
    await world.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("avatar-mobile.png"), fullPage: false });
    await page.getByRole("button", { name: "探索工作经历", exact: true }).click();
    await expect(page.locator("#work").getByRole("heading").first()).toBeInViewport();
    for (const project of portfolioProjects) {
      const chapter = page.locator(`[data-project="${project.slug}"]`);
      await chapter.getByRole("heading").scrollIntoViewIfNeeded();
      await expect(chapter.getByRole("heading")).toBeInViewport();
      await expect(chapter).toContainText(project.title);
    }
    await expect(page.getByTestId("avatar-scene")).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath("work-mobile.png"), fullPage: false });
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test("指针控制真实眼球，拖动视角后可重置", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const scene = page.getByTestId("avatar-scene");
    await expect(scene).toHaveAttribute("data-model", "avatar-v4");
    await expect(scene).toHaveClass(/scene-ready/, { timeout: 20000 });
    const box = await scene.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.move(box.x + box.width * .78, box.y + box.height * .28);
    await expect.poll(async () => Math.abs(await sceneNumber(scene, "data-gaze-y"))).toBeGreaterThan(.01);
    await expect.poll(async () => Math.abs(await sceneNumber(scene, "data-gaze-x"))).toBeGreaterThan(.01);
    for (const attribute of ["data-gaze-left", "data-gaze-right"]) {
      await expect.poll(async () => Math.abs(await sceneNumber(scene, attribute))).toBeGreaterThan(.005);
    }
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("我有很多面，来认识一下。");
    const world = page.getByTestId("avatar-world");
    const poster = page.getByTestId("avatar-poster");
    await expect(poster).toBeVisible();
    await expect.poll(() => poster.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    for (const name of ["换个搞怪表情", "抛一下苹果", "咬一口面包", "手机闪光灯"]) {
      await expect(world.getByRole("button", { name, exact: true })).toBeDisabled();
    }
    await page.getByRole("button", { name: "探索程序员", exact: true }).click();
    await expect(page.getByTestId("avatar-scene")).toHaveAttribute("data-focus", "coder");
    await world.getByRole("button", { name: "重置角色视角", exact: true }).click();
    await expect(page.getByTestId("avatar-scene")).toHaveAttribute("data-focus", "all");
    await page.getByRole("button", { name: "探索工作经历", exact: true }).click();
    await expect(page.locator("#work").getByRole("heading").first()).toBeInViewport();
    await expect(page.locator("article[data-project]")).toHaveCount(4);
    await page.locator('[data-project="delivery-standards"] a[href="/work/delivery-standards"]').last().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI 交付规范与检查工作流");
  });

  test("模型下载失败时手机仍可通过领域入口阅读工作项目", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route(/\/models\/[^/?]+\.glb(?:\?.*)?$/, route => route.abort("failed"));
    await page.goto("/");
    const world = page.getByTestId("avatar-world");
    await expect(world).toHaveAttribute("data-ready", "false");
    await expect(page.getByTestId("avatar-poster")).toBeVisible();
    await expect.poll(() => page.getByTestId("avatar-poster").evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(world.getByRole("button", { name: "抛一下苹果", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "探索工作经历", exact: true }).click();
    await expect(page.locator("#work").getByRole("heading").first()).toBeInViewport();
    await expect(page.locator("article[data-project]")).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath("cinematic-mobile-model-failure.png"), fullPage: false });
  });

  test("模型加载中丢失 WebGL 时保留备用图，恢复后重新显示角色", async ({ page }) => {
    let releaseModel!: () => void;
    const pendingModel = new Promise<void>((resolve) => { releaseModel = resolve; });
    await page.route(/\/models\/[^/?]+\.glb(?:\?.*)?$/, async (route) => { await pendingModel; await route.continue(); });
    await page.goto("/");
    const scene = page.getByTestId("avatar-scene");
    await expect(scene.locator("canvas")).toBeAttached();
    await page.evaluate(async () => {
      const canvas = document.querySelector('[data-testid="avatar-scene"] canvas') as HTMLCanvasElement;
      const context = canvas.getContext("webgl2");
      const extension = context?.getExtension("WEBGL_lose_context");
      if (!extension) throw new Error("Test browser requires WEBGL_lose_context");
      (window as unknown as { restoreAvatarContext: () => void }).restoreAvatarContext = () => extension.restoreContext();
      await new Promise<void>((resolve) => {
        canvas.addEventListener("webglcontextlost", () => resolve(), { once: true });
        extension.loseContext();
      });
    });
    releaseModel();
    await expect(scene).toHaveAttribute("data-model", "avatar-v4");
    await expect(scene).not.toHaveClass(/scene-ready/);
    await expect(page.getByTestId("avatar-poster")).toHaveCSS("opacity", "1");
    await expect(page.getByRole("button", { name: "换个搞怪表情" })).toBeDisabled();
    await page.evaluate(() => (window as unknown as { restoreAvatarContext: () => void }).restoreAvatarContext());
    await expect(scene).toHaveClass(/scene-ready/);
    await expect(page.getByRole("button", { name: "重置角色视角" })).toBeEnabled();
  });

  test("从同页项目锚点回首页时不残留加载进度条", async ({ page }) => {
    await page.goto("/#document-quality");
    await expect(page.locator("#document-quality")).toBeInViewport();
    await page.locator('nav a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(20);
    await expect(page.getByTestId("route-progress").locator("div")).toHaveCSS("opacity", "0");
  });
});
