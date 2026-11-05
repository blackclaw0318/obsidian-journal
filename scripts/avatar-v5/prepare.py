"""Import actual Meshy downloads without changing source topology or PBR materials."""
import sys
sys.dont_write_bytecode = True
import argparse, json, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Euler, Matrix, Vector
from common import ROOT, load_manifest, output_path, resolve_input, sha256, write_json
from blender_common import cli_arguments, inventory, mesh_bounds, parent_keep, runtime_bounds, save_packed


def import_model(path):
    before = set(bpy.data.objects)
    suffix = path.suffix.lower()
    if suffix in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=str(path), import_pack_images=True, merge_vertices=False,
                               import_merge_material_slots=False)
    elif suffix == '.fbx':
        bpy.ops.import_scene.fbx(filepath=str(path))
    elif suffix == '.obj':
        bpy.ops.wm.obj_import(filepath=str(path))
    elif suffix == '.blend':
        with bpy.data.libraries.load(str(path), link=False) as (source, target):
            target.objects = list(source.objects)
        for obj in target.objects:
            if obj:
                bpy.context.scene.collection.objects.link(obj)
    else:
        raise ValueError(f'Unsupported source format {suffix}; extract the actual GLB/FBX/OBJ/BLEND from the download first')
    objects = [obj for obj in bpy.data.objects if obj not in before]
    if not any(obj.type == 'MESH' for obj in objects):
        raise ValueError(f'No mesh imported from {path.name}')
    return objects


def move_collection(obj, collection):
    for previous in list(obj.users_collection):
        previous.objects.unlink(obj)
    collection.objects.link(obj)


def copy_working(originals, collection, asset_id, container):
    mapping = {}
    matrices = {obj: obj.matrix_world.copy() for obj in originals}
    names = {obj: obj.name for obj in originals}
    for original in originals:
        original.name = f'SRC::{asset_id}::{names[original]}'
        duplicate = original.copy()
        if original.data:
            duplicate.data = original.data.copy()
        if duplicate.animation_data and duplicate.animation_data.action:
            duplicate.animation_data.action = duplicate.animation_data.action.copy()
        duplicate.name = f'WORK::{asset_id}::{names[original]}'
        duplicate['v5_source_id'] = asset_id
        duplicate['v5_source_name'] = names[original]
        collection.objects.link(duplicate)
        mapping[original] = duplicate
    for original, duplicate in mapping.items():
        duplicate.parent = mapping.get(original.parent, container)
        duplicate.matrix_world = matrices[original]
        for modifier in duplicate.modifiers:
            for prop in ('object', 'target'):
                if hasattr(modifier, prop) and getattr(modifier, prop) in mapping:
                    setattr(modifier, prop, mapping[getattr(modifier, prop)])
        for constraint in duplicate.constraints:
            if hasattr(constraint, 'target') and constraint.target in mapping:
                constraint.target = mapping[constraint.target]
    return list(mapping.values())


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--manifest', required=True)
parser.add_argument('--output', default='design/avatar-v5/work/prepared.blend')
parser.add_argument('--report', default='design/avatar-v5/work/intake-report.json')
args = parser.parse_args(cli_arguments())
manifest = load_manifest(args.manifest)  # Empty/pending sources stop before clearing a scene.
output = output_path(args.output)
bpy.ops.wm.read_factory_settings(use_empty=True)
root = bpy.data.objects.new('AvatarV5Root', None)
bpy.context.scene.collection.objects.link(root)
root['v5_manifest'] = json.dumps(manifest)
provenance = []
working_by_id = {}
for asset in manifest['assets']:
    source = resolve_input(asset['source'])
    originals = import_model(source)
    original_collection = bpy.data.collections.new(f'SOURCE::{asset["id"]}')
    bpy.context.scene.collection.children.link(original_collection)
    for obj in originals:
        move_collection(obj, original_collection)
    work_collection = bpy.data.collections.new(f'WORK::{asset["id"]}')
    bpy.context.scene.collection.children.link(work_collection)
    container = bpy.data.objects.new(f'Asset::{asset["id"]}', None)
    work_collection.objects.link(container)
    parent_keep(container, root)
    working = copy_working(originals, work_collection, asset['id'], container)
    transform = asset.get('import_transform', {})
    scale = float(transform.get('uniform_scale', 1))
    if not math.isfinite(scale) or scale <= 0:
        raise ValueError('Import uniform_scale must be positive')
    rotation = Euler([math.radians(float(v)) for v in transform.get('rotate_euler_degrees', [0, 0, 0])], 'XYZ')
    translation = Vector(transform.get('translate', [0, 0, 0]))
    container.matrix_basis = Matrix.Translation(translation) @ rotation.to_matrix().to_4x4() @ Matrix.Scale(scale, 4)
    original_collection.hide_render = True
    original_collection.hide_viewport = True
    working_by_id[asset['id']] = working
    provenance.append({'id': asset['id'], 'provider': 'Meshy', 'generation_id': asset.get('generation_id'),
                       'download_provenance': asset['download_provenance'],
                       'source': str(source), 'sha256': sha256(source), 'bytes': source.stat().st_size,
                       'role': asset.get('role')})
bpy.context.view_layer.update()
normalization = manifest.get('normalization', {})
reference_id = normalization.get('reference_asset', manifest['assets'][0]['id'])
if reference_id not in working_by_id:
    raise ValueError('normalization.reference_asset is not an imported asset id')
before = mesh_bounds(working_by_id[reference_id])
height = before['size'][2]
if height <= 0:
    raise ValueError('Cannot normalize a zero-height reference model; check source orientation')
target = float(normalization.get('height_m', 3.1))
if not math.isfinite(target) or target <= 0:
    raise ValueError('Normalization height must be positive')
factor = target / height
center = before['center']
root.scale = (factor, factor, factor)
root.location = (-center[0] * factor, -center[1] * factor, -before['min'][2] * factor)
root['v5_provenance'] = json.dumps(provenance)
root['v5_normalization'] = json.dumps({'reference_asset': reference_id, 'source_bounds_blender': before,
                                     'uniform_scale': factor, 'height_m': target,
                                     'note': 'Orientation is explicit in import_transform; no guessed face direction.'})
bpy.context.view_layer.update()
objects = [root, *root.children_recursive]
bounds = mesh_bounds(objects)
report = {'status': 'imported_actual_sources_not_visually_approved', 'blender_version': bpy.app.version_string,
          'provenance': provenance, 'normalization': json.loads(root['v5_normalization']),
          'bounds_blender': bounds, 'bounds_runtime': runtime_bounds(bounds),
          'camera_runtime': {'position': [0, 1.55, 6.6], 'target': [0, 1.55, 0], 'fov_degrees': 40,
                             'fit': 'Use measured total bbox including hands and props; adjust distance if necessary'},
          'inventory': inventory(objects),
          'pending': ['Visual anatomy review', 'Explicit semantic part mapping', 'Measured pivots/contact surfaces',
                      'Real eye/lid, finger and mouth deformation controls', 'GLB round-trip QA']}
saved = save_packed(output)
report['editable_blend'] = str(saved)
write_json(args.report, report)
print(json.dumps({'saved': str(saved), 'report': args.report, 'status': report['status']}, indent=2))
