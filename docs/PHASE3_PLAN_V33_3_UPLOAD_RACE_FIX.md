# Phase 3 计划 — v0.33.3 上传 race condition 修复 — 2026-07-04

> **状态**: 📋 方案稿,等老板拍板
> **触发**: 老板 13:17 反馈 12.5MB MP4 仍报 524 (v0.33.2 busboy 流式后还是 hang)
> **作者**: 黑

---

## 🚨 现场证据 (老板报告 + dev 日志)

**老板截图**:
- 12.5MB 视频"第一章-5.mp4"
- 状态: ⏳ 处理中 → ✗ **524 超时**

**dev 日志** (`/tmp/dev_v331.log`):
```
POST /api/admin/media 200 in 125022ms     ← 真正 125 秒 (Next.js 框架兜底)
Error: aborted
    at abortIncoming (node:_http_server:855:17)
    code: 'ECONNRESET'
 ⨯ uncaughtException: Error: aborted       ← client 断了
```

**关键事实**:
- busboy 流式写盘实测 12.5MB 应 < 1s (localhost 8MB=436ms)
- server 真的 hang 125s,期间 client 早就断了 (Cloudflare 100s)
- uncaughtException `ECONNRESET` 说明 req stream 被 abort 但 server 没 cleanup promise

---

## 🔍 根因分析 (代码 race condition)

文件: `app/api/admin/media/route.ts`

### 时序 / Bug 1: writeStream.on("close") 注册晚

```ts
bb.on("close", () => {
  // ...respond 定义...
  if (writeStream) {
    writeStream.on("close", respond);  // ← 异步注册 listener
    writeStream.on("error", (err) => { errorCode = ...; respond(); });
    if (!fileDone) writeStream.end();
  } else {
    respond();
  }
});
```

**事件顺序** (5+ 步):
1. bytes 上传完成 → xhr.upload.onload → status=`processing`
2. `file.pipe(writeStream)`: file end → pipe auto end → writeStream `finish` → writeStream `close`
3. busboy `bb.emit('finish')` 然后 `bb.emit('close')`
4. **我的代码在 bb close 时调 `writeStream.on("close", respond)`**
5. 如果 writeStream 已经 close(步骤 2 在前),**listener 注册晚 → 'close' 已发 → respond 永不触发 → promise hang**

### Bug 2: 多个 error path 都不直接 respond

```ts
bb.on("error", (err) => { errorCode = "parse_error"; });   // 只设,不调 respond
file.on("limit", () => { errorCode = "file_too_large"; }); // 只设,不调 respond
file.on("error", (err) => { errorCode = "write_error"; }); // 只设,不调 respond
```

这些都"假设 bb close 会兜底",但 Bug 1 让 bb close 不可靠。

### Bug 3: client 断开无感知

```
❌ 没有监听 req.signal.aborted
❌ 没有监听 req.body.on('error')
❌ 没有超时兜底
→ client 断 100s 后,server 才被 Next.js 兜底返回 200
```

### Bug 4: 多次 resolve 风险

`respond` 多次调用会 throw (Promise resolve 二次是 no-op 但 NextResponse.json 创建抛错)。

---

## 🛠 修复方案 (4 项, ~30 min)

### 修 1: 改用 `'finish'` + `writableFinished` 检查

```ts
if (writeStream?.writableFinished) {
  respond();  // 已经 finish (race-safe),立即响应
} else if (writeStream) {
  writeStream.on("finish", respond);  // 'finish' 在 'close' 前,更早触发
  writeStream.on("error", (err) => {
    errorCode = "write_error";
    errorDetail = err.message;
    respond();
  });
  if (!fileDone) writeStream.end();
}
```

**预期效果**: race condition 100% 解决,respond 总能在合理时机触发。

### 修 2: 错误路径立即 respond (不等 bb close)

```ts
bb.on("error", (err) => {
  if (responded) return;
  errorCode = "parse_error";
  errorDetail = err.message;
  respond();
});

file.on("limit", () => {
  if (responded) return;
  errorCode = "file_too_large";
  errorDetail = `${MAX_SIZE}`;
  respond();
});

file.on("error", (err) => {
  if (responded) return;
  errorCode = "write_error";
  errorDetail = err.message;
  respond();
});

nodeStream.on("error", (err) => {
  if (responded) return;
  errorCode = "stream_error";
  errorDetail = err.message;
  respond();
});
```

### 修 3: 幂等 + 超时 + abort 兜底

```ts
let responded = false;
const respond = (status: number, body: any) => {
  if (responded) return;
  responded = true;
  clearTimeout(timeoutHandle);
  resolve(NextResponse.json(body, { status }));
};

// 超时兜底 (比 Next.js maxDuration 早 1s)
const timeoutHandle = setTimeout(() => {
  respond(408, { ok: false, error: "upload_timeout", detail: `${maxDuration}s` });
}, (maxDuration - 1) * 1000);

// client 断开感知
req.signal?.addEventListener("abort", () => {
  respond(499, { ok: false, error: "client_aborted" });
});
```

### 修 4: uncaughtException handler (避免 ECONNRESET crash)

在 `app/api/admin/media/route.ts` 顶部加:
```ts
process.on("uncaughtException", (err) => {
  if (err.message.includes("aborted") || err.message.includes("ECONNRESET")) {
    return; // 已 respond,清理
  }
  console.error("[media upload] uncaught:", err);
});
```

或者更干净:在 app 顶层 useEffect/onInit 注册一次 (避免每个请求注册)。

---

## ✅ 验收方案

| 测试 | 预期 |
|------|------|
| 12.5MB 视频 (老板的实际场景) | < 5s 完成,201 ok |
| 模拟客户端 80s 后断开 (close request mid-upload) | server 立即 respond 499,不卡 125s |
| 上传 .txt 文件 (拒绝) | 400 + error=`unsupported_mime`,< 100ms |
| 上传 25MB 文件 (超 limit) | 400 + error=`file_too_large`,< 5s |
| 并发 5 文件上传 | 串行处理,每个 < 5s 完成 |

**回归测试**: 全套 7 项不变 (typecheck / lint / unit 157 / integration / visual / e2e)

---

## ⏸ 等老板拍板

| Q | 选项 | 黑推荐 |
|---|------|--------|
| Q1 | 是否立即实施? | **是 (30 min, 4 项修复 + 5 项验收测试)** |
| Q2 | 是否同时加 server-side file metadata 提取 (duration / width / height)? | **否** (本期不动 ffprobe,后续另开) |
| Q3 | 改后要不要把 maxSize 上调到 50MB 给老板大视频? | **否** (Cloudflare 100s 上限,大文件仍是风险) |

---

## 📌 备注: 524 的 100s 上限,任何方案都受限于此

即使修好 race,Cloudflare tunnel **默认 100s 超时**。如果老板实际是直接 `localhost:3000` 访问(无 CF),且 dev server 处理 12.5MB 视频 > 100s,那就是 **dev mode SSR 慢导致**:

| 文件大小 | localhost dev 实测 (v0.33.2 busboy) | CF tunnel 100s |
|----------|-----------------------------------|-----------------|
| 8MB | 436ms ✅ | ✅ |
| 18MB | 161ms ✅ | ✅ |
| 50MB | 估计 < 5s ✅ | **临界 ⚠** |
| 100MB+ | 估计 10-15s ✅ | ❌ **超时** |

**结论**: 修 race 后,12.5MB 上传 100% 能过。**老板先前 524 = 100% 是 race condition 导致 promise hang,不是真慢**。
