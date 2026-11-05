import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [input, output] = process.argv.slice(2);
assert(input && output && path.resolve(input) !== path.resolve(output), 'Use a separate output path.');
const source = fs.readFileSync(input);
assert.equal(source.toString('ascii', 0, 4), 'glTF');
assert.equal(source.readUInt32LE(8), source.length);
const jsonLength = source.readUInt32LE(12);
const original = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const json = structuredClone(original);
const bin = source.subarray(28 + jsonLength);
assert.equal(json.buffers.length, 1);
const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const types = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const layouts = new Map();
const indexViews = new Set();
for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) {
  if (primitive.indices !== undefined) indexViews.add(json.accessors[primitive.indices].bufferView);
}
for (const accessor of json.accessors ?? []) {
  if (accessor.bufferView !== undefined) layouts.set(accessor.bufferView, { stride: sizes[accessor.componentType] * types[accessor.type], mode: indexViews.has(accessor.bufferView) ? 'INDICES' : 'ATTRIBUTES' });
  if (accessor.sparse) {
    layouts.set(accessor.sparse.indices.bufferView, { stride: sizes[accessor.sparse.indices.componentType], mode: 'INDICES' });
    layouts.set(accessor.sparse.values.bufferView, { stride: sizes[accessor.componentType] * types[accessor.type], mode: 'ATTRIBUTES' });
  }
}
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
let offset = 0, compressedViews = 0;
const chunks = [];
const append = (bytes) => {
  const padding = (4 - offset % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
  const start = offset;
  chunks.push(bytes); offset += bytes.length;
  return start;
};
for (const [index, view] of json.bufferViews.entries()) {
  const raw = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  const layout = layouts.get(index);
  const stride = view.byteStride ?? layout?.stride;
  const mode = layout?.mode;
  const supported = mode && stride && raw.length % stride === 0 && (mode === 'ATTRIBUTES' ? stride % 4 === 0 && stride <= 256 : stride === 2 || stride === 4);
  if (supported) {
    const count = raw.length / stride;
    const encoded = MeshoptEncoder.encodeGltfBuffer(raw, count, stride, mode);
    const decoded = new Uint8Array(raw.length);
    MeshoptDecoder.decodeGltfBuffer(decoded, count, stride, encoded, mode);
    assert.deepEqual(Buffer.from(decoded), raw, `Lossless round-trip view ${index}`);
    if (encoded.length + 160 < raw.length) {
      const byteOffset = append(encoded);
      view.buffer = 1;
      view.extensions = { ...view.extensions, EXT_meshopt_compression: { buffer: 0, byteOffset, byteLength: encoded.length, byteStride: stride, count, mode } };
      compressedViews++;
      continue;
    }
  }
  view.buffer = 0;
  view.byteOffset = append(raw);
}
const finalPadding = (4 - offset % 4) % 4;
if (finalPadding) { chunks.push(Buffer.alloc(finalPadding)); offset += finalPadding; }
const packed = Buffer.concat(chunks);
json.buffers[0].byteLength = packed.length;
json.buffers.push({ byteLength: original.buffers[0].byteLength, extensions: { EXT_meshopt_compression: { fallback: true } } });
json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'EXT_meshopt_compression'])];
json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), 'EXT_meshopt_compression'])];
const jsonBytes = Buffer.from(JSON.stringify(json));
const jsonPadding = Buffer.alloc((4 - jsonBytes.length % 4) % 4, 0x20);
const jsonChunk = Buffer.concat([jsonBytes, jsonPadding]);
const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonChunk.length + packed.length, 8); header.writeUInt32LE(jsonChunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(packed.length); binHeader.writeUInt32LE(0x004e4942, 4);
const result = Buffer.concat([header, jsonChunk, binHeader, packed]);
for (const key of ['nodes', 'meshes', 'accessors', 'materials', 'textures', 'images', 'skins', 'animations', 'scenes']) assert.deepEqual(json[key], original[key], `${key} unchanged`);
for (const image of json.images ?? []) {
  const beforeView = original.bufferViews[image.bufferView], afterView = json.bufferViews[image.bufferView];
  const before = bin.subarray(beforeView.byteOffset ?? 0, (beforeView.byteOffset ?? 0) + beforeView.byteLength);
  const after = packed.subarray(afterView.byteOffset, afterView.byteOffset + afterView.byteLength);
  assert.deepEqual(after, before, 'Image unchanged');
}
fs.writeFileSync(output, result);
console.log(JSON.stringify({ inputBytes: source.length, outputBytes: result.length, outputGzip: zlib.gzipSync(result).length, ratio: result.length / source.length, compressedViews, nodes: json.nodes.length, meshes: json.meshes.length, exactAccessorBytes: true, exactNodeHierarchy: true, exactImages: true }, null, 2));
