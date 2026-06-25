// /media 路由 (v0.6.1 schema: MediaItem 模型已规划, Phase 3 完整实现)
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function MediaPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">🖼️ 媒体库</h1>
        <p className="text-fg-muted mt-2">图片 / 音频 / 视频 / 文件 (4 类)</p>
      </header>

      <div className="border border-dashed border-border rounded-lg p-8 text-fg-muted">
        <h2 className="text-lg font-semibold mb-2 text-fg">Phase 3 实现中</h2>
        <p className="mb-3">媒体库 (MediaItem) 在 Phase 3 (Admin 后台) 完整实现,包含:</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>上传 UI (拖拽 / 选择文件)</li>
          <li>mediaRepo CRUD (create/list/get/delete)</li>
          <li>引用追踪 (MediaUsage 中间表: post/chapter/page/video)</li>
          <li>存储: 本地 (默认) / R2 (Phase 4)</li>
          <li>EXIF 自动提取 (image) / 时长提取 (video/audio)</li>
        </ul>
        <p className="mt-4 text-sm">
          当前 schema 已规划 (lib/types.ts: MediaItem / MediaUsage), 等 Phase 3 Admin 上传 UI 落地。
        </p>
      </div>

      <footer className="mt-12 pt-6 border-t border-border text-sm">
        <Link href="/" className="hover:underline">← 返回首页</Link>
      </footer>
    </div>
  );
}
