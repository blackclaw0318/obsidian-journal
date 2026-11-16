import { expect, it } from "vitest";
import { inspectMp3Header } from "../../../lib/light-music/audio-validation";
it("拒绝带合法 MP3 帧头的 432 字节静音占位文件", () => {
  const h = {
    status: 206,
    contentType: "application/octet-stream",
    contentRange: "bytes 0-431/432",
    contentLength: "432"
  };
  expect(inspectMp3Header(new Uint8Array([255, 227, 72, 196]), h).valid).toBe(false);
  expect(
    inspectMp3Header(new Uint8Array([73, 68, 51]), { ...h, contentRange: "bytes 0-1023/4000000" }).valid
  ).toBe(true);
  expect(
    inspectMp3Header(new Uint8Array([73, 68, 51]), {
      ...h,
      contentType: "text/html",
      contentRange: "bytes 0-1023/4000000"
    }).valid
  ).toBe(false);
  expect(
    inspectMp3Header(new Uint8Array([73, 68, 51]), {
      ...h,
      status: 200,
      contentRange: null,
      contentLength: null
    }).valid
  ).toBe(false);
});
