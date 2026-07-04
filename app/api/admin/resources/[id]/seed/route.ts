// ============================================================
// /api/admin/resources/[id]/seed - 资源种子编辑 (v0.35 Phase 4)
// 老板 2026-07-04 20:37 需求: 资源计数 + 初始百位数 admin 可控
// PATCH: 改 base_value + seed_download_count + seed_enabled (单条)
// ============================================================
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { mediaCounterRepo, mediaRepo } from "@/lib/repo";
import { displayView, displayDownload } from "@/lib/counter";

export const runtime = "nodejs";

async function auth() {
  try {
    return { user: await requireUser() };
  } catch {
    return { user: null };
  }
}

const MAX_SEED = 99999;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user } = await auth();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: {
    base_value?: number;
    seed_download_count?: number;
    seed_enabled?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // 1) 校验资源存在
  const media = mediaRepo.byId(params.id);
  if (!media) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // 2) 校验字段范围
  const patch: { base_value?: number; seed_download_count?: number; seed_enabled?: number } = {};
  if (body.base_value !== undefined) {
    if (!Number.isFinite(body.base_value) || body.base_value < 0 || body.base_value > MAX_SEED) {
      return NextResponse.json(
        { ok: false, error: `base_value 必须在 0-${MAX_SEED} 之间` },
        { status: 400 }
      );
    }
    patch.base_value = Math.floor(body.base_value);
  }
  if (body.seed_download_count !== undefined) {
    if (
      !Number.isFinite(body.seed_download_count) ||
      body.seed_download_count < 0 ||
      body.seed_download_count > MAX_SEED
    ) {
      return NextResponse.json(
        { ok: false, error: `seed_download_count 必须在 0-${MAX_SEED} 之间` },
        { status: 400 }
      );
    }
    patch.seed_download_count = Math.floor(body.seed_download_count);
  }
  if (body.seed_enabled !== undefined) {
    if (body.seed_enabled !== 0 && body.seed_enabled !== 1) {
      return NextResponse.json(
        { ok: false, error: "seed_enabled 必须为 0 或 1" },
        { status: 400 }
      );
    }
    patch.seed_enabled = body.seed_enabled;
  }

  // 3) 至少一个字段要改
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "至少传入一个可改字段 (base_value / seed_download_count / seed_enabled)" },
      { status: 400 }
    );
  }

  // 4) 落库
  const counter = mediaCounterRepo.patchSeed(params.id, patch);
  if (!counter) return NextResponse.json({ ok: false, error: "patch_failed" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    counter,
    display: {
      view: displayView(counter),
      download: displayDownload(counter),
    },
  });
}