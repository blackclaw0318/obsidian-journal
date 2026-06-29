// ============================================================
// /admin/pages/[id]/edit - 编辑页面 (Phase 3.5)
// ============================================================
import { notFound } from "next/navigation";
import { pageRepo } from "@/lib/repo";
import { PageForm } from "../../_components/PageForm";

export const dynamic = "force-dynamic";

export default function EditPagePage({ params }: { params: { id: string } }) {
  const page = pageRepo.byId(params.id);
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">✏️ 编辑页面</h1>
        <p className="mt-1 font-mono text-xs text-fg-muted">id: {page.id} · slug: /{page.slug}</p>
      </div>
      <div className="rounded-lg border border-border bg-bg-card p-6">
        <PageForm
          mode="edit"
          initial={{
            id: page.id,
            slug: page.slug,
            title: page.title,
            description: page.description,
            blocks: page.blocks,
            status: page.status
          }}
        />
      </div>
    </div>
  );
}
