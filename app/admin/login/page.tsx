// ============================================================
// /admin/login - 登录页 (client component, form 提交到 /api/auth/login)
// ============================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push(next);
        router.refresh();
      } else {
        if (res.status === 429) setError("登录尝试过多, 15 分钟后再试");
        else if (data.error === "invalid_credentials") setError("邮箱或密码错误");
        else setError(`登录失败 (${data.error ?? res.status})`);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">⬛ 黑曜石日志</h1>
          <p className="mt-1 text-sm text-fg-muted">管理后台</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-bg-card p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold">登录</h2>

          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium">邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          {error && (
            <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            {isPending ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-fg-muted">
          默认账户见 <code>prisma/seed.ts</code> 与 <code>docs/PHASE3_PLAN.md</code>
        </p>
      </div>
    </div>
  );
}
