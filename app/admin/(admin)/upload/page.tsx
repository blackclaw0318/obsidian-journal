// ============================================================
// /admin/upload - MD 上传 (v0.11, v0.6.1 §7.2)
// 支持 type 区分 article (Post) / chapter (Chapter) — 自动提取 frontmatter
// ============================================================
import { MdUploader } from "./_components/MdUploader";
import { seriesRepo, novelRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  // 序列化转 plain object (跨 server→client 边界不能传 null prototype 对象)
  const series = seriesRepo.listAll().map((s) => ({ id: s.id, name: s.name, category: s.category }));
  const novels = novelRepo.list().map((n) => ({
    id: n.id,
    title: n.title,
    volumes: n.volumes.map((v) => ({ id: v.id, title: v.title, order: v.order }))
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📤 MD 上传</h1>
        <p className="mt-1 text-sm text-fg-muted">粘贴 Markdown 内容,自动解析 frontmatter 创建 Post / Chapter</p>
      </div>

      <MdUploader
        series={series.map((s) => ({ id: s.id, name: s.name, category: s.category }))}
        novels={novels.map((n) => ({
          id: n.id,
          title: n.title,
          volumes: n.volumes.map((v) => ({ id: v.id, title: v.title, order: v.order }))
        }))}
      />
    </div>
  );
}
