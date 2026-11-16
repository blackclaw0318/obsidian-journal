export function inspectMp3Header(
  bytes: Uint8Array,
  headers: {
    status: number;
    contentType: string | null;
    contentRange: string | null;
    contentLength: string | null;
  }
) {
  const totalBytes = Number(
    headers.contentRange?.match(/\/(\d+)$/)?.[1] ?? (headers.status === 200 ? headers.contentLength : 0)
  );
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes.some(
    (n, i) =>
      n === 255 &&
      ((bytes[i + 1] ?? 0) & 224) === 224 &&
      ((bytes[i + 1] >> 3) & 3) !== 1 &&
      ((bytes[i + 1] >> 1) & 3) === 1 &&
      bytes[i + 2] >> 4 > 0 &&
      bytes[i + 2] >> 4 < 15 &&
      ((bytes[i + 2] >> 2) & 3) !== 3
  );
  const mediaType = /^(audio\/|application\/octet-stream|binary\/octet-stream)/i.test(
    headers.contentType ?? ""
  );
  const valid =
    headers.status >= 200 && headers.status < 300 && mediaType && (id3 || frame) && totalBytes >= 128 * 1024;
  return {
    valid,
    totalBytes,
    reason: valid
      ? undefined
      : totalBytes > 0 && totalBytes < 128 * 1024
        ? "文件过短，可能为静音占位或片段"
        : !totalBytes
          ? "无法核对完整文件长度"
          : "未通过 MP3 类型与文件头检查"
  };
}

export default { inspectMp3Header };
