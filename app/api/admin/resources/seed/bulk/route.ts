// ============================================================
// /api/admin/resources/seed/bulk - 批量调整种子 (v0.35 Phase 4)
// 老板 2026-07-04 20:37 需求: admin 一键装门面 (全站+200 或全图+500)
// POST { delta: number, category?: 'image'|'document'|'audio', action?: 'adjust'|'randomize' }
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { mediaCounterRepo } from "@/lib/repo";

export const runtime = "nodejs";

async function auth() {
  try {
    return { user: await requireUser() };
  } catch {
    return { user: null };
  }
}

export async function POST(req: Request) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: {
    delta?: number;
    category?: "image" | "document" | "audio";
    action?: "adjust" | "randomize";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = body.action ?? "adjust";
  const category = body.category;

  // category 校验
  if (category !== undefined && !["image", "document", "audio"].includes(category)) {
    return NextResponse.json(
      { ok: false, error: "category 必须为 image | document | audio" },
      { status: 400 }
    );
  }

  if (action === "randomize") {
    // 重置为 100-999 随机 (一键回到默认)
    const result = mediaCounterRepo.randomizeAllSeeds({ category });
    return NextResponse.json({
      ok: true,
      action: "randomize",
      category: category ?? "all",
      affected: result.affected,
    });
  }

  // 默认: adjust 模式
  const delta = body.delta;
  if (delta === undefined || !Number.isFinite(delta)) {
    return NextResponse.json(
      { ok: false, error: "adjust 模式必须传 delta (number, 可正可负)" },
      { status: 400 }
    );
  }
  // 防误锁: 单次调整 ±10000 内
  if (Math.abs(delta) > 10000) {
    return NextResponse.json(
      { ok: false, error: "delta 范围 ±10000 (防止误操作)" },
      { status: 400 }
    );
  }

  const result = mediaCounterRepo.bulkAdjustSeed(delta, { category });
  return NextResponse.json({
    ok: true,
    action: "adjust",
    delta,
    category: category ?? "all",
    affected: result.affected,
  });
}