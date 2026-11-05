"""Separate explicitly selected faces of a real static source mesh, preserving UV/PBR.

Use only after visual face selection. Loose-part/material guessing cannot recover
occluded fingers or convert a fused hand+apple into a valid animated grip.
"""
import sys
sys.dont_write_bytecode = True
import argparse, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from common import read_json, resolve_input, write_json
from blender_common import cli_arguments, find_source, open_prepared, save_packed

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', default='design/avatar-v5/work/prepared.blend')
parser.add_argument('--selection', required=True, help='JSON: asset, object, face_indices, part_source_name, reviewed_by')
parser.add_argument('--output', default='design/avatar-v5/work/split.blend')
parser.add_argument('--report', default='design/avatar-v5/work/split-report.json')
args = parser.parse_args(cli_arguments())
spec = read_json(resolve_input(args.selection))
if not spec.get('reviewed_by'):
    raise ValueError('Face extraction requires a recorded visual selection review')
root = open_prepared(args.input)
obj = find_source(spec['asset'], spec['object'], root)
if obj.type != 'MESH' or obj.data.shape_keys or obj.find_armature() or obj.vertex_groups:
    raise ValueError('Automatic face extraction supports static unweighted meshes only; preserve/rework weights and morphs manually in Blender')
faces = set(spec['face_indices'])
if not faces or min(faces) < 0 or max(faces) >= len(obj.data.polygons) or len(faces) == len(obj.data.polygons):
    raise ValueError('Select an explicit proper nonempty subset of real source faces')
if any(o.get('v5_source_id') == spec['asset'] and o.get('v5_source_name') == spec['part_source_name'] for o in root.children_recursive):
    raise ValueError('part_source_name must be unique within its actual source')
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.context.tool_settings.mesh_select_mode = (False, False, True)
for vertex in obj.data.vertices:
    vertex.select = False
for edge in obj.data.edges:
    edge.select = False
for polygon in obj.data.polygons:
    polygon.select = polygon.index in faces
before = set(bpy.data.objects)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.separate(type='SELECTED')
bpy.ops.object.mode_set(mode='OBJECT')
created = [o for o in bpy.data.objects if o not in before]
if len(created) != 1:
    raise RuntimeError('Expected one actual separated part')
part = created[0]
part.name = f'WORK::{spec["asset"]}::{spec["part_source_name"]}'
part['v5_source_id'] = spec['asset']
part['v5_source_name'] = spec['part_source_name']
part['v5_extracted_faces'] = json.dumps({'original_source_name': spec['object'],
                                        'face_indices': sorted(faces), 'reviewed_by': spec['reviewed_by']})
save_packed(args.output)
write_json(args.report, {'status': 'actual_faces_separated_not_reconstructed', 'source': spec,
                        'created_object': part.name, 'remaining_polygons': len(obj.data.polygons),
                        'extracted_polygons': len(part.data.polygons),
                        'limitations': ['No missing surfaces reconstructed', 'Cut boundaries need manual inspection/capping',
                                        'Natural finger anatomy and grip remain a visual requirement']})
