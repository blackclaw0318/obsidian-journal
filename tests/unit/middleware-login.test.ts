// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

afterEach(() => vi.unstubAllEnvs());

describe("admin login redirects behind a reverse proxy", () => {
  for (const cookie of [undefined, "obsidian_session=not-a-valid-jwt"]) {
    const branch = cookie ? "invalid session" : "missing session";

    it(`${branch}: production uses the configured public origin, ignoring forwarded hosts`, async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.shangkun.uk");
      const response = await middleware(new NextRequest("https://localhost:3003/admin?tab=posts", {
        headers: { "x-forwarded-host": "attacker.example", "x-forwarded-proto": "http", ...(cookie ? { cookie } : {}) }
      }));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://www.shangkun.uk/admin/login");
      if (cookie) expect(response.cookies.get("obsidian_session")).toMatchObject({ value: "", maxAge: 0, path: "/" });
    });

    it(`${branch}: development stays on the local origin even with a production canonical`, async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.shangkun.uk");
      const response = await middleware(new NextRequest("http://localhost:3000/admin/posts", {
        headers: cookie ? { cookie } : {}
      }));
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login");
    });

    it(`${branch}: an unconfigured production canonical keeps the request origin`, async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
      const response = await middleware(new NextRequest("http://127.0.0.1:3003/admin", {
        headers: { "x-forwarded-host": "attacker.example", ...(cookie ? { cookie } : {}) }
      }));
      expect(response.headers.get("location")).toBe("http://localhost:3003/admin/login");
    });
  }
});
