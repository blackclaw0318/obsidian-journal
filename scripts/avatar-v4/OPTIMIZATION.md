# Lossless Meshopt packing

These private build tools are separate from the website's dependencies. Install the pinned encoder with:

```sh
npm ci --prefix scripts/avatar-v4 --ignore-scripts --no-audit --no-fund
```

Run only after the source model passes visual QA. Always use a separate output file:

```sh
node scripts/avatar-v4/meshopt-lossless.mjs INPUT.glb OUTPUT.meshopt.glb
```

The script adds required `EXT_meshopt_compression` and a spec-compliant placeholder buffer. Each compressed bufferView is decoded and asserted byte for byte before writing. Nodes, hierarchy, mesh/morph declarations, accessors, material alpha, animations and texture bytes are asserted unchanged. There is no quantization, simplification, flatten, join, instance or prune step.

The final model shrank from 2,317,352 to 1,707,928 bytes (26.3%); gzip measures 1,244,591 bytes. Packed SHA-256: `ebb9b786bdd85c6e062fecd513effce529b33e820dfa3abdcefb5b9f0b9c2dcb`. The website registers Three's `MeshoptDecoder` with `GLTFLoader.setMeshoptDecoder()` before loading the packed file. Three already includes the decoder; it is not a website dependency on this build package. The final packed asset passed all 32 targeted browser tests, including eye/prop geometry changes and WebGL context loss/recovery.

Do not substitute the default glTF-Transform high-compression pipeline: POSITION quantization can move Head's mesh/morphs into a new anonymous child node, changing the interaction hierarchy.

Specification: [Khronos EXT_meshopt_compression](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_meshopt_compression). Encoder: [official Meshoptimizer JavaScript](https://github.com/zeux/meshoptimizer/tree/master/js).
