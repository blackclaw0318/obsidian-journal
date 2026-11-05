# Avatar v4: component model and editable Blender source

The deliverables are `public/models/avatar-v4.glb` and the self-contained,
texture-packed `design/avatar-v4/avatar-v4.blend`. The Blender source includes
all named parts, facial controls, a neutral preview camera, and studio lights.
Neural weights, intermediate fields, the Python environment, and reconstruction
meshes remain outside version control.

## Reexport the editable source

Run from the repository root with Blender 5.2 or later:

```sh
BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender
"$BLENDER_BIN" --background --python scripts/avatar-v4/build.py
```

By default, `build.py` opens the checked-in `.blend` and exports an uncompressed
`.local/model-lab-v4/avatar-v4.raw.glb` for Blender roundtrip QA.
It preserves the glTF alpha/material fixes needed by the independently moving
eyes and feathered eyelids. An alternate source or output can be passed after
Blender's `--` separator:

```sh
"$BLENDER_BIN" --background --python scripts/avatar-v4/build.py -- \
  --from-blend design/avatar-v4/avatar-v4.blend \
  --output .local/model-lab-v4/avatar-v4.raw.glb
```

## Rebuild geometry

`public/images/avatar-v4/head-clean.png` is the isolated source plate. It contains
no hands, apple, toast, phone, or labels. The head/bust density surface comes from
the official [TripoSR repository](https://github.com/VAST-AI-Research/TripoSR),
source commit `107cefdc244c39106fa830359024f6a2f1c78871`, and the official
[Stability AI TripoSR checkpoint](https://huggingface.co/stabilityai/TripoSR).
TripoSR code and pretrained weights are released under MIT. This repository does
not redistribute the checkpoint.

With an existing isolated Python environment and an external model directory
containing `TripoSR/`, `config.yaml`, `model.ckpt`, and `dino-config.json`:

```sh
python scripts/avatar-v4/reconstruct.py --model-lab /path/to/official-model-lab
"$BLENDER_BIN" --background --python scripts/avatar-v4/build.py -- --rebuild
```

The adapter runs official TripoSR on Apple MPS (CPU fallback is available),
extracts a 256-cubed density grid at threshold 10, and uses scikit-image marching
cubes to replace the CUDA-only extraction operation. `--work-dir`, `--source`,
`--mesh`, `--output`, and `--blend-out` accept explicit paths. The procedural
rebuild reads the cached PLY from `.local/model-lab-v4` by default. No user-home
path is hardcoded in these scripts.

Head and Torso are separate capped neural surfaces; the joining cut sits inside
the Polo collar. Head has `Surprise` and `Grin` morph targets. The source supplies
front appearance, while learned vertex colors shade inferred side/rear geometry.
Whites, irises, pupils, upper/lower visibility covers, mouth cavity, lips, teeth,
and tongue are independent geometry. The eye contour is calibrated against
roundtrip renders and follows the real head surface; iris layers sit in front of
the opaque sclera and rotate around pivots behind the eyes.

Apple, Phone, toast crust/crumb, actual scalloped bitten toast, connected hand
skin surfaces, nails, jewelry, and the six colored paper/text labels are separate
solid Blender meshes. Toast's upper-right back corner contacts the left lip
corner; both toast variants are Head children so that contact follows head motion.
The labels have real paper thickness, white borders, converted bold text, and
individual interaction anchors. The original portrait is never overwritten.

## Runtime contract and verification

`rig-contract.json` records node names, actual glTF-space centers, eye controls,
and default visibility. Coordinates are +Y up and +Z front. Keep camera orbit
within about 30 degrees of the front. The Three.js caller should preserve the
original materials and vertex alpha. In particular, keep `LidSkinLeft/Right`
unlit and hide each Lid group when open; set its absolute `scale.y` from .001 to 1
for a blink. MouthOpen, BreadBitten, Flash, and both open Lid groups start hidden.
For an open mouth, TeethUpper and Tongue can be shown independently. Head morphs
may reside on the mesh children of the Head group after GLTFLoader import.

```sh
"$BLENDER_BIN" --background --python scripts/avatar-v4/verify.py
```

`verify.py` imports the uncompressed export and writes transparent PNG proofs to
`.local/model-lab-v4`: neutral front, left/right 30 degrees, eye-only left/right
gaze, blink, silly, grin, wow, and apple/bread/flash actions. It supports `--model`,
`--out-dir`, and `--samples`. The front proof is the source of the web poster.

The model contains **59,785 triangles** (including inactive alternate parts).
The Blender export is 2,317,352 bytes; the public model is losslessly packed to
**1,707,928 bytes**, with all 139 nodes, morphs and PNG bytes unchanged. The
texture-packed editable Blender source is 2,461,966 bytes. Counts can be read
from `V4_EXPORTED` in the build output.

After visual QA, pack the web asset using the pinned build-only encoder:

```sh
npm ci --prefix scripts/avatar-v4 --ignore-scripts --no-audit --no-fund
node scripts/avatar-v4/meshopt-lossless.mjs \
  .local/model-lab-v4/avatar-v4.raw.glb public/models/avatar-v4.glb
```

Blender QA uses the raw export. The shipping `EXT_meshopt_compression` file is
verified with the decoder in the website's browser tests; see `OPTIMIZATION.md`.
The runtime limits eye yaw to ±0.15 to avoid edge clipping at extreme gaze.

This is an editable single-view inferred head with independently modeled props
and lightweight facial controls. Unseen rear anatomy, fine braid tips, skin
appearance, and large facial deformations have the limits of single-view input.
The side views have real thickness and parallax; a production 360-degree digital
double or a full anatomical facial rig is not claimed.
