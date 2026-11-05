# Meshy v5 intake and editable Blender workflow

**Superseded authoring route:** the user subsequently chose an independent Blender
rebuild from Meshy’s visible multi-angle preview. Active authoring is in
`scripts/avatar-v6/`; this v5 importer remains an optional normal-download intake.

This is preparation tooling. **No v5 Meshy file has been downloaded or imported.**
The current Meshy UI result reportedly contains 42 geometry components, but its
N1 texture operation failed and the normal GLB download requires a subscription.
The user must resolve that account gate through Meshy. These scripts do not
access browser caches, hidden APIs or subscription workarounds. They do not
generate a substitute character or change the public v4 model.

## Source strategy

Inspect the first actual download before spending more generation credits. Keep
the unmodified textured GLB, generation ID, download provenance and SHA-256.
Meshy's [textured export guidance](https://help.meshy.ai/en/articles/15724161-how-to-export-meshy-models-with-colors-and-textures)
describes embedded PBR maps in GLB. A texture-failed preview does not establish
that a downloaded model has usable albedo, normal, roughness or metalness maps.

Use the original portrait's bust proportions and recognizable prop pose. Avoid
baking English stickers into the face; make the six small readable labels as
editable fitted Blender geometry after the face is approved. Preserve the narrow
face, hairstyle, grey polo and short bust crop. A list of separated components is
not proof of good fingers, true eyes, an open mouth or an animation rig.

If the first model's hands fail review, useful additional generations are:

- The **natural left hand gripping its apple**, including five fingers, palm and
  a short wrist. Keep grip and silhouette recognizable from the original.
- The **natural right hand gripping its phone**, including thumb opposition,
  finger contact, palm and a short wrist.
- Independent apple and bread assets with real back/edge thickness if their
  originals are fused to the hand/mouth. Preserve the untouched grip assembly as
  a pose reference. Do not replace a bad hand with v4 tube/sphere geometry.

Same-object side/back or open-hand views can resolve occlusion only when they
show consistent anatomy. Meshy's [multi-view guidance](https://help.meshy.ai/en/articles/12634481-how-to-use-multi-view)
supports a primary and up to three additional consistent images. Its
[face/hand guidance](https://help.meshy.ai/en/articles/16102152-fix-character-pose-face-and-hand-issues-in-meshy)
also describes pose/visibility limitations. A posed bust can preserve appearance
but needs actual DCC hand/facial rigging for release, blink and expression actions;
[automatic rigging](https://help.meshy.ai/en/articles/16231707-how-to-create-3d-animation-with-auto-rigging)
does not establish those features for this particular source.

## What is reusable

- `inspect_asset.py`: read-only source/archive inventory, SHA, embedded-image and
  topology/skin/morph/animation metadata. It does not extract or execute archives.
- `prepare.py`: import actual GLB/GLTF/FBX/OBJ/BLEND files; retain an untouched hidden
  source collection; copy working objects; preserve UVs/PBR, skin/morph and animation
  data; pack images; report every real object name. Source drivers and unusual
  constraints still need review after copying.
- `extract_faces.py`: separate an explicitly reviewed set of actual static source
  faces, preserving UV/material assignments. It refuses weighted/morphed meshes.
  It does not infer missing surfaces, cap cuts or recover fused fingers.
- `rig.py`: create stable groups for explicitly mapped rigid parts at measured
  pivots; record real surface anchors; validate existing morph/bone bindings and
  action references. It matches manifest source hashes against the prepared scene
  and checks clips assigned to working objects/shape keys. It refuses rigid
  reparenting of skinned meshes. Preserve an existing armature with `existing_node`
  or `bone` semantic bindings; perform actual skin/facial
  construction in Blender when the source has none.
- `export.py`: export only the working avatar as a review GLB. Preserve PBR, skins,
  morphs and animations; no v4 material rewrites, automatic decimation, lossy mesh
  quantization or texture resizing. Strip local intake paths from exported extras.
- `verify.py`: inventory the editable scene or actual round-trip GLB; optionally
  render front/±30°, face/hand details, measured eye gaze, existing blink/expression
  and hand morph/bone controls. Missing controls are reported as pending. This
  does not issue an artistic pass or invent a missing rig.
- `meshopt-lossless.mjs`: build-only packaging derived from the v4 exact-byte packer.
  Decode-check every compressed buffer view and preserve hierarchy, accessor data,
  images, skin, morphs and animation JSON. It rejects v4/non-v5 or already-packed
  inputs and writes only under `design/avatar-v5`.

These commands have syntax/guard checks, and Blender 5.2.2 LTS capabilities were
probed locally. **Real Meshy import, export, skin, material and render validation
remain unrun until an actual download exists.** No generated QA image exists yet.

## Commands after a normal download

Run from the repository root. All source paths may be absolute or repo-relative;
all output paths are restricted to `design/avatar-v5` by the preparation tools.
Untracked `incoming/`, `work/` and `qa/` hold raw files and temporary evidence. The
final packed editable scene is `design/avatar-v5/avatar-v5.blend` after actual QA.
No source `.blend` exists at present.

```sh
python3 scripts/avatar-v5/inspect_asset.py /path/to/actual-download.glb \
  --report design/avatar-v5/work/source-inventory.json

# Fill actual assets, source SHA, generation ID and download_provenance.
cp design/avatar-v5/import-manifest.example.json design/avatar-v5/work/import.json
BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender
"$BLENDER_BIN" --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python scripts/avatar-v5/prepare.py -- \
  --manifest design/avatar-v5/work/import.json

# Edit the measured mapping after inspecting the packed prepared.blend.
"$BLENDER_BIN" --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python scripts/avatar-v5/rig.py -- \
  --manifest design/avatar-v5/work/import.json

"$BLENDER_BIN" --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python scripts/avatar-v5/export.py --
"$BLENDER_BIN" --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python scripts/avatar-v5/verify.py -- \
  --input design/avatar-v5/work/avatar-v5.draft.glb --render

cd scripts/avatar-v5
npm ci
node meshopt-lossless.mjs ../../design/avatar-v5/work/avatar-v5.draft.glb \
  ../../design/avatar-v5/work/avatar-v5.meshopt.glb
```

The example deliberately has `assets=[]` and stops before scene creation. Fill
`normalization.reference_asset` with the real primary bust asset ID. Explicit
source orientation/assembly transforms occur in Blender coordinates **before**
the one uniform normalization. Imported assemblies need compatible placement;
separate generations cannot be aligned merely by matching their object names.

The measured primary bust height becomes 3.1 m, its bottom becomes runtime Y=0,
and its horizontal/depth center becomes X=Z=0. The exporter alone performs axis
conversion `(x,y,z) -> (x,z,-y)`. The total measured bbox includes all props/hands.
Runtime camera starts near `(0,1.55,6.6)`, target `(0,1.55,0)`, FOV 40°, then fits
the actual total bbox. Anatomical left/right refer to the subject's body.

## Mapping and real rig construction

Read actual object names from the intake report. A rigid part entry has this
shape; the values below describe the schema and must be replaced by measurements:

```json
{
  "Head": {
    "objects": [{"asset": "bust", "object": "actual_source_object_name"}],
    "pivot_blender_world": [0, 0, 0],
    "measured_from": "Actual measured head/neck pivot; record the measurement"
  }
}
```

Never map one welded mesh as both a moving hand and a moving apple. Use a reviewed
face selection or repair/retopologize it in Blender; retain the original assembly
for contact comparison. `extract_faces.py --selection` accepts JSON with `asset`,
`object`, explicit original `face_indices`, unique `part_source_name` and
`reviewed_by`. Cut-edge closure and UV/normal quality remain a manual requirement.

For a pre-existing rig, `parts` entries can instead use
`mode:"existing_node"` plus `asset/object` to rename the actual node canonically
while preserving skin/hierarchy, or `mode:"bone"` plus `asset/object/bone` to bind
a real unique joint without renaming its weights. Both require `measured_from`.
Bone aliases are exported in `runtimeBindings`; the frontend must resolve these
actual node names. Existing Gaze bindings also require measured local
`gaze_axes:{yaw:2,pitch:0}` (replace axes/signs with actual measurements). Bone
region close-ups and dynamic contacts remain pending explicit measured selection.

An anchor uses `parent` and `surface:{asset,object,vertex_index}` for an actual
base-mesh point. Alternatively record `point_blender_world` plus `measured_from`.
`contact_pairs` contain `anchors:[name1,name2]` and `tolerance_m` (normally 0.005).
The reported neutral distance is evidence only for those anchor coordinates;
deforming surface contact still needs evaluated pose/renders from both angles.

`facial_controls`/`hand_controls` map canonical controls to real source targets:

- A `morph` binding contains `asset`, `object`, actual `key`, and optional `min/max`.
- A `bone` binding contains the actual armature object selector, `bone`, a measured
  Euler `axis` (0/1/2) and measured `min_radians/max_radians`.
- A `bone_set` contains the armature selector and `bones:[...]` with that same
  measured bone data. `LeftGrip` must actually deform all five fingers; one bone
  name does not establish this. Validate weight influence and three grip states.

For independently rotating eyes, construct full curved eyeballs and actual sockets
and lids, with gaze pivots at the measured globe centers. Remove or properly cover
the original painted duplicate iris through real retopology; do not reuse v4's
surface iris stamps, anisotropic eye scaling or scaled cover-patch blinks. Open
the actual lip region for a mouth cavity, teeth and tongue with face deformation.
Do not place another dark mouth below the original closed-mouth texture.

Manually authored eye/lid/mouth retopology, labels or a phone flash are allowed
when they record `v5_source_id="authored"`, a unique `v5_source_name`,
`v5_authored_purpose` (`eye_globe`, `eyelid_retopology`, `mouth_retopology`,
`interactive_label`, `flash`) and `v5_authored_evidence` describing its measured
reference. This is explicit Blender authorship, never claimed as Meshy output.
Procedural replacement hands and props have no exception. Derived Meshy parts
retain their actual source ID and extraction/edit history.

`action_bindings` use a real `clip` + clip/NLA name, real animated `scene_frames` +
multiple `sample_frames`, or an existing `runtime_driver` + `driver_key` and
`implementation_path`. Naming an action does not create it. Blender pose-frame
sampling is supported; NLA clips must be sampled in their intended tracks or by
the actual runtime. The runtime must apply `initiallyHidden`: glTF does not encode
Blender `hide_render`. Release/catch needs continuous world transforms, actual
five-finger opening and grip contact; parenting alone does not create that action.

## Release evidence and size

Follow [VISUAL_ACCEPTANCE.md](VISUAL_ACCEPTANCE.md) and [rig-contract.json](rig-contract.json).
Compare the untouched source and final front/±30°/hand close-ups. Validate complete
apple release-flight-catch, face/wink, bread contact/bite and phone flash in the
actual browser, then recheck the exported skin/morph/clip data and initial state.
Control presence, a 5 mm anchor distance, topology count or 32 passing runtime
checks cannot by themselves certify the requested visual quality.

The 3,500,000-byte target is reported for each draft, before and after lossless
Meshopt. Actual v5 triangle count, texture bytes, transfer size and `.blend` size
are **unknown**. Review material usage and per-image resolution before any texture
conversion; preserve face/hands and normal/roughness/metalness color spaces. Keep
the high-quality raw source and packed editable scene reproducible. Do not carry
TripoSR weights, neural caches, previous v4 hand geometry or private download data
into a release. Publishing and frontend changes are outside this tool directory.
