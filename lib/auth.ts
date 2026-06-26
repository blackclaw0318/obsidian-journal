// ============================================================
// Auth 核心 (v0.8 Phase 3.1 - JWT + httpOnly cookie)
// ============================================================
// 设计 (修正后):
//   - bcryptjs 哈希密码 (cost 10)
//   - jose 签发/验证 JWT (HS256, Edge Runtime 兼容)
//   - cookie "obsidian_session" 存 JWT (self-contained, Edge 验签)
//   - sessions 表存 sid (JWT 中的 sid claim) + userId + expires_at
//     作用: 审计 + 主动撤销 (改密码踢所有 session, 用 deleteAllUserSessions)
//   - middleware: 仅 verifyJwt (Edge, 验签 + 检查 exp), 不查 DB
//   - RSC/Routes: 完整链路 — cookie → JWT 解析 → sessions 表查 sid
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import type { User, Session } from "./types";

// ============ 常量 ============
const SESSION_COOKIE = "obsidian_session";
const SESSION_DAYS = 7;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
const BCRYPT_COST = 10;
const JWT_ALG = "HS256";

function getSecret(): Uint8Array {
  // 优先 NEXTAUTH_SECRET (老板已配), 否则 AUTH_SECRET, 最后 fallback
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-only-insecure-secret-change-in-prod-please";
  if (process.env.NODE_ENV === "production" && secret.startsWith("dev-only")) {
    throw new Error("AUTH_SECRET 未设置, 生产环境禁止使用默认 secret");
  }
  return new TextEncoder().encode(secret);
}

// ============ 密码 ============
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): boolean {
  if (!hash || !hash.startsWith("$2")) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

// ============ JWT 签发/验证 (无 DB) ============
export interface JwtPayload {
  sub: string; // userId
  sid: string; // session id (sessions 表主键)
  exp: number;
  iat: number;
}

export async function signJwt(userId: string, sessionId: string, expiresAt: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ sub: userId, sid: sessionId })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return { sub: payload.sub, sid: payload.sid, exp: payload.exp!, iat: payload.iat! };
  } catch {
    return null;
  }
}

// ============ Session 生命周期 ============
export interface CreateSessionResult {
  jwt: string;       // 给 cookie 存的
  expiresAt: number;
}

export async function createSessionJwt(userId: string): Promise<CreateSessionResult> {
  const sid = `s_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_SECONDS;

  // sessions 表里存 sid (token 字段也存 sid, 便于兼容旧 query)
  db.prepare(
    `INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(sid, userId, sid, expiresAt, now);

  // 顺手清掉过期 sessions
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now);

  const jwt = await signJwt(userId, sid, expiresAt);
  return { jwt, expiresAt };
}

export async function deleteSessionByJwt(jwt: string): Promise<void> {
  const payload = await verifyJwt(jwt);
  if (payload) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(payload.sid);
  }
}

export function deleteSessionBySid(sid: string): void {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sid);
}

export function deleteAllUserSessions(userId: string): void {
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

export function findSessionBySid(sid: string): Session | null {
  const row = db.prepare(`SELECT * FROM sessions WHERE id = ? AND expires_at > ?`).get(
    sid,
    Math.floor(Date.now() / 1000)
  ) as Session | undefined;
  return row ?? null;
}

// ============ 业务: 登录 ============
export interface LoginResult {
  ok: boolean;
  user?: Omit<User, "password_hash">;
  jwt?: string;
  expiresAt?: number;
  error?: "invalid_credentials" | "rate_limited";
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function login(email: string, password: string): Promise<LoginResult> {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_ATTEMPTS) {
    return { ok: false, error: "rate_limited" };
  }
  if (attempt && attempt.resetAt <= now) {
    loginAttempts.delete(key);
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(key) as User | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    const prev = loginAttempts.get(key) ?? { count: 0, resetAt: 0 };
    loginAttempts.set(key, {
      count: prev.count + 1,
      resetAt: prev.resetAt > now ? prev.resetAt : now + LOCKOUT_MS
    });
    return { ok: false, error: "invalid_credentials" };
  }

  loginAttempts.delete(key);

  const { jwt, expiresAt } = await createSessionJwt(user.id);
  const { password_hash: _omit, ...safeUser } = user;
  return { ok: true, user: safeUser, jwt, expiresAt };
}

// ============ Server-side helpers (RSC / Route Handler) ============
export function getSessionJwtFromCookie(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export function setSessionCookie(jwt: string, expiresAt: number): void {
  cookies().set({
    name: SESSION_COOKIE,
    value: jwt,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(expiresAt * 1000),
    path: "/"
  });
}

export function clearSessionCookie(): void {
  cookies().set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/"
  });
}

export async function getCurrentUser(): Promise<Omit<User, "password_hash"> | null> {
  const jwt = getSessionJwtFromCookie();
  if (!jwt) return null;
  const payload = await verifyJwt(jwt);
  if (!payload) return null;
  // 主动撤销检查: 查 sessions 表确认 sid 还在
  const session = findSessionBySid(payload.sid);
  if (!session) return null;
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(session.user_id) as User | undefined;
  if (!user) return null;
  const { password_hash: _omit, ...safeUser } = user;
  return safeUser;
}

export async function requireUser(): Promise<Omit<User, "password_hash">> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export const AUTH_CONSTANTS = {
  SESSION_COOKIE,
  SESSION_DAYS,
  BCRYPT_COST,
  JWT_ALG
};

// ============ 测试 helper (仅供 tests/ 调用) ============
// 清除 in-memory rate limit Map (测试间隔离, 避免上一个 test 的 5 次错误计数影响下一个)
export function __resetRateLimitForTesting(): void {
  loginAttempts.clear();
}
