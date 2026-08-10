// ============================================================
// /quiz - 红楼梦 RBTI 落地页 (v0.43 P1)
//  - 介绍 + 16 类型预览 + 流程 + 隐私承诺
//  - 4 维度: 情 / 智 / 志 / 雅
//  - 16 类型 (12 金钗 + 4 衍生): P2 schema 起来后从 repo 取
//  - CTA → /quiz/start (P3 实现)
// ============================================================
import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, canonical } from "@/lib/seo";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "红楼梦 RBTI — 测一测你是十二金钗中的哪位",
    description:
      "基于《红楼梦》原著与现代性格心理学, 融合判词 / 人物原型 / 性格维度, 50 题速测你是十二金钗中的哪位 (林黛玉 / 薛宝钗 / 王熙凤 / 史湘云 ...)。",
    keywords: [
      "红楼梦",
      "RBTI",
      "性格测试",
      "十二金钗",
      "林黛玉",
      "薛宝钗",
      "王熙凤",
      "史湘云"
    ],
    alternates: { canonical: canonical("/quiz") },
    openGraph: {
      type: "website",
      title: "红楼梦 RBTI",
      description: "测一测你是十二金钗中的哪位",
      url: absoluteUrl("/quiz"),
      locale: "zh_CN"
    }
  };
}

// 16 类型预览 (P2 会迁入 schema, 此处先硬编码展示 4 个代表)
const PREVIEW_PERSONAS = [
  {
    name: "林黛玉",
    code: "LNQY",
    poem: "潇湘妃子 · 咏絮才",
    axes: "高情 · 高雅 · 敏思",
    color: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30",
    accent: "text-pink-700 dark:text-pink-300",
    desc: "才情绝艳, 心思细腻, 不染俗尘。你敏感于美与真情, 却也常陷自怜。"
  },
  {
    name: "薛宝钗",
    code: "XYBZ",
    poem: "蘅芜君 · 停机德",
    axes: "中情 · 高智 · 稳志",
    color: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30",
    accent: "text-amber-700 dark:text-amber-300",
    desc: "端庄周全, 通达人情, 藏锋于朴。你懂得在复杂世界里保持分寸与善意。"
  },
  {
    name: "王熙凤",
    code: "WXFF",
    poem: "凤辣子 · 弄权才",
    axes: "低情 · 高智 · 强志",
    color: "from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30",
    accent: "text-red-700 dark:text-red-300",
    desc: "精明强势, 杀伐决断, 掌控全场。你是天生的 leader, 但也易伤人而不自知。"
  },
  {
    name: "史湘云",
    code: "SXYL",
    poem: "枕霞旧友 · 英豪阔",
    axes: "高情 · 中智 · 豪志",
    color: "from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30",
    accent: "text-sky-700 dark:text-sky-300",
    desc: "爽朗豪迈, 天真烂漫, 不拘小节。你是人群里的暖阳, 快乐与豁达是你的天赋。"
  }
];

const FOUR_AXES = [
  { key: "情", full: "情感", desc: "对情感与人际的敏感度" },
  { key: "智", full: "理智", desc: "理性分析与处世能力" },
  { key: "志", full: "意志", desc: "目标驱动与掌控欲" },
  { key: "雅", full: "雅趣", desc: "审美与精神世界的丰盈" }
];

export default function QuizLandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16" data-testid="quiz-landing">
      {/* JSON-LD: Quiz */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Quiz",
            name: "红楼梦 RBTI",
            description:
              "基于《红楼梦》原著与现代性格心理学的 50 题性格测试, 测出你是十二金钗中的哪位。",
            educationalLevel: "General Audience",
            about: "Personality Assessment",
            inLanguage: "zh-CN"
          })
        }}
      />

      {/* ===== Hero ===== */}
      <header className="mb-16 text-center">
        <p className="mb-3 text-sm font-medium tracking-widest text-fg-muted">
          RBTI · RED MANSION BOOK TYPE INDICATOR
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          红楼梦 <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">RBTI</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted">
          测一测, 你是<span className="font-semibold text-fg">十二金钗</span>中的哪位?
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
          基于《红楼梦》原著与现代性格心理学, 融合<em className="not-italic">判词 / 人物原型 / 性格维度</em>, 50 题速测你的红楼人格。
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/quiz/start"
            data-testid="quiz-cta-start"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-bg transition hover:bg-accent-hover"
          >
            开始测试
            <span aria-hidden>→</span>
          </Link>
          <p className="text-xs text-fg-muted">
            50 题 · 约 8 分钟 · 答题结束立即看结果
          </p>
        </div>
      </header>

      {/* ===== 4 维度 ===== */}
      <section className="mb-16">
        <h2 className="mb-6 text-center text-2xl font-semibold">四维性格解析</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FOUR_AXES.map((a) => (
            <div
              key={a.key}
              className="rounded-xl border border-border bg-bg-card p-5 text-center"
            >
              <div className="mb-2 text-3xl font-bold text-accent">{a.key}</div>
              <div className="text-sm font-medium text-fg">{a.full}</div>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 16 类型预览 (4 个代表) ===== */}
      <section className="mb-16">
        <h2 className="mb-3 text-center text-2xl font-semibold">十六种红楼人格</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-fg-muted">
          从十二金钗 + 4 种衍生原型, 提炼 16 种红楼人格。下面展示 4 个代表类型, 完整 16 类型请完成测试解锁。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PREVIEW_PERSONAS.map((p) => (
            <article
              key={p.code}
              data-testid="quiz-persona-preview"
              data-code={p.code}
              className={`group rounded-xl border border-border bg-gradient-to-br ${p.color} p-6 transition hover:border-accent/60 hover:shadow-md`}
            >
              <div className="mb-1 text-xs font-medium tracking-wider text-fg-muted">
                {p.code}
              </div>
              <h3 className={`text-2xl font-bold ${p.accent}`}>{p.name}</h3>
              <p className="mt-1 text-sm italic text-fg-muted">{p.poem}</p>
              <div className="my-3 h-px bg-border" />
              <div className="mb-3 flex flex-wrap gap-2">
                {p.axes.split(" · ").map((axis) => (
                  <span
                    key={axis}
                    className="rounded-full border border-border bg-bg/60 px-2.5 py-0.5 text-xs"
                  >
                    {axis}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-fg">{p.desc}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-fg-muted">
          还有 12 种红楼人格等你解锁 →
        </p>
      </section>

      {/* ===== 流程 ===== */}
      <section className="mb-16 rounded-2xl border border-border bg-bg-card p-8 sm:p-10">
        <h2 className="mb-8 text-center text-2xl font-semibold">测试流程</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {[
            { n: "01", t: "答 50 题", d: "4 维度选择题, 单选作答, 进度实时显示" },
            { n: "02", t: "系统算分", d: "加权计分 + 判词匹配, 锁定 16 类型之一" },
            { n: "03", t: "看完整报告", d: "人物解析 + 性格画像 + 关系建议 + 经典判词" }
          ].map((s) => (
            <li key={s.n} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent text-lg font-bold text-accent">
                {s.n}
              </div>
              <h3 className="mb-2 font-semibold">{s.t}</h3>
              <p className="text-sm leading-relaxed text-fg-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== 隐私承诺 ===== */}
      <section className="mb-12 rounded-xl border border-dashed border-border bg-bg-muted/50 p-6 text-sm">
        <h3 className="mb-3 font-semibold">🔒 隐私承诺</h3>
        <ul className="space-y-1.5 text-fg-muted">
          <li>• 答题仅记录选项与算分, 不收集姓名 / 邮箱 / 手机号</li>
          <li>• IP 仅做哈希存储 (24h 去重), 符合 GDPR 最小化原则</li>
          <li>• 报告结果公开页只显示你的类型 + 公开发布的解析文案</li>
          <li>• 完整个性化报告需付费解锁, 支付通过虎皮椒 (零资质 + 订单可追溯)</li>
        </ul>
      </section>

      {/* ===== Bottom CTA ===== */}
      <div className="text-center">
        <Link
          href="/quiz/start"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-bg transition hover:bg-accent-hover"
        >
          开始你的红楼之旅
          <span aria-hidden>→</span>
        </Link>
        <p className="mt-4 text-xs text-fg-muted">
          已经测过了? <Link href="/quiz/history" className="underline hover:text-fg">查看历史结果</Link>
        </p>
      </div>
    </div>
  );
}