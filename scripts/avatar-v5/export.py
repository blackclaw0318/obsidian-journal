"""Export the real working avatar, retaining PBR, skin, morphs and animations.

Output stays in design/avatar-v5 until a separate visual/runtime release review.
No automatic simplification, global material rewrites or texture resizing occur.
"""
import sys
sys.dont_write_bytecode = True
import argparse, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from common import glb_inventory, output_path, read_json, SCRIPT, write_json
from blender_common import cli_arguments, descendants, inventory, mesh_bounds, open_prepared, require_reviewable_source, runtime_bounds, select_working

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', default='design/avatar-v5/avatar-v5.blend')
parser.add_argument('--output', default='design/avatar-v5/work/avatar-v5.draft.glb')
parser.add_argument('--report', default='design/avatar-v5/work/export-report.json')
parser.add_argument('--animation-mode', choices=['ACTIONS', 'NLA_TRACKS', 'ACTIVE_ACTIONS', 'SCENE'], default='ACTIONS')
parser.add_argument('--require-complete-bindings', action='store_true')
args = parser.parse_args(cli_arguments())
output = output_path(args.output)
if output.suffix.lower() != '.glb':
    raise ValueError('The review export must be a GLB')
root = open_prepared(args.input)
require_reviewable_source(root)
contract = read_json(SCRIPT / 'rig-contract.json')
bindings = json.loads(root.get('v5_bindings', '{}'))
controls = json.loads(root.get('v5_controls', '{}'))
actions = json.loads(root.get('v5_action_bindings', '{}'))
missing = {'parts': [n for n in contract['required_nodes'] if n not in bindings],
           'face_controls': [n for n in contract['face']['required_controls'] if n not in controls.get('facial_controls', {})],
           'hand_controls': [n for n in contract['hands']['required_controls'] if n not in controls.get('hand_controls', {})],
           'actions': [n for n in contract['required_actions'] if n not in actions]}
if args.require_complete_bindings and any(missing.values()):
    raise ValueError('Incomplete actual rig bindings: ' + json.dumps(missing))
objects = descendants(root)
before = inventory(objects)
images_missing = [im['name'] for im in before['images'] if not im['has_data']]
if images_missing:
    raise ValueError('Source PBR images are missing; fix paths before export: ' + ', '.join(images_missing))
select_working(root)
# Local provenance (including private absolute paths) belongs in the editable
# blend and reports, not in a downloadable web asset.
internal = {}
for obj in objects:
    internal[obj] = {key: obj[key] for key in list(obj.keys()) if key.startswith('v5_')}
    for key in internal[obj]:
        del obj[key]
root['avatarVersion'] = 5
root['rigStatus'] = 'draft_requires_visual_and_runtime_review'
root['initiallyHidden'] = json.dumps(contract['initially_hidden'])
root['runtimeControls'] = json.dumps(controls)
root['runtimeBindings'] = json.dumps(bindings)
root['runtimeActions'] = json.dumps({name: {key: value for key, value in binding.items() if key != 'implementation_path'} for name,binding in actions.items()})
root['boundsRuntime'] = json.dumps(runtime_bounds(mesh_bounds(objects)))
try:
    bpy.ops.export_scene.gltf(
        filepath=str(output), check_existing=False, export_format='GLB',
        use_selection=True, use_visible=False, use_renderable=False,
        export_yup=True, export_extras=True, export_apply=False,
        export_image_format='AUTO', export_keep_originals=True,
        export_texcoords=True, export_normals=True, export_tangents=True,
        export_materials='EXPORT', export_skins=True, export_all_influences=True,
        export_morph=True, export_morph_normal=True, export_morph_animation=True,
        export_animations=True, export_animation_mode=args.animation_mode,
        export_force_sampling=True, export_frame_step=1,
        export_def_bones=False, export_leaf_bone=False,
        export_hierarchy_flatten_bones=False, export_hierarchy_flatten_objs=False,
        export_draco_mesh_compression_enable=False,
        export_meshopt_compression_enable=False,
        export_use_gltfpack=False, export_cameras=False, export_lights=False)
finally:
    for obj, values in internal.items():
        for key, value in values.items():
            obj[key] = value
report = glb_inventory(output)
source_morphs = {key for row in before['objects'] for key in row.get('morphs', [])[1:]}
exported_morphs = {key for names in report['morph_targets'] for key in names}
warnings = []
missing_exported_clips = [binding['clip'] for binding in actions.values() if binding.get('kind') == 'clip' and binding['clip'] not in report['animations']]
if missing_exported_clips:
    warnings.append('Bound clips missing from actual GLB: ' + ', '.join(missing_exported_clips))
if source_morphs - exported_morphs:
    warnings.append('Morph names absent after export: ' + ', '.join(sorted(source_morphs-exported_morphs)))
if any(row.get('max_vertex_influences', 0) > 4 for row in before['objects']):
    warnings.append('Source has vertices with more than 4 skin influences; verify actual runtime skin support and appearance before reducing weights')
if any(row.get('action') or row.get('nla_tracks') for row in before['objects']) and not report['animations']:
    warnings.append('Source has animation data but no GLB clips; check selected actions/NLA mode')
if not report['standalone_glb']:
    warnings.append('External resources exist; GLB size alone is not the full transfer budget')
report.update(status='draft_not_visually_approved', missing_bindings=missing,
              round_trip_warnings=warnings,
              source_scene_inventory=before, animation_mode=args.animation_mode,
              exporter_note='Blender re-encodes mesh data; retain original downloads for fidelity comparison. No v4 material override or animation stripping.',
              next_required=['verify.py --input this.glb --render', 'Actual animation/contact sampling',
                             'VISUAL_ACCEPTANCE.md review', 'Browser runtime visibility and interaction QA'])
write_json(args.report, report)
if args.require_complete_bindings and missing_exported_clips:
    raise ValueError('Actual export omitted bound clips; see draft export-report.json')
print(json.dumps({'exported': str(output), 'bytes': report['bytes'], 'triangles': report['triangles'],
                  'animations': report['animations'], 'budget_exceeded': report['budget_exceeded'],
                  'missing_bindings': missing}, indent=2))
