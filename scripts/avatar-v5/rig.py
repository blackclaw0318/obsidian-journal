"""Bind measured real parts/anchors and record existing deformation controls.

This does not invent eye globes, hidden fingers, lip topology or a facial rig.
Missing anatomy must be repaired in the editable scene or regenerated first.
"""
import sys
sys.dont_write_bytecode = True
import argparse, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Matrix, Vector
from common import load_manifest, read_json, SCRIPT, write_json
from blender_common import (cli_arguments, descendants, find_source, mesh_bounds, open_prepared,
                            parent_keep, require_reviewable_source, runtime_bounds, runtime_point, save_packed,
                            validate_prepared_manifest, working_animation_names)


def source(selector, root):
    return find_source(selector['asset'], selector['object'], root)


def observed_surface(spec, root):
    if 'surface' in spec:
        selector = spec['surface']
        obj = source(selector, root)
        if obj.type != 'MESH':
            raise ValueError('Surface anchor requires an actual mesh')
        index = int(selector['vertex_index'])
        if index < 0 or index >= len(obj.data.vertices):
            raise ValueError(f'Out-of-range surface vertex: {obj.name}/{index}')
        vertex = obj.data.vertices[index]
        point = obj.matrix_world @ vertex.co
        normal = (obj.matrix_world.to_3x3().inverted().transposed() @ vertex.normal).normalized()
        evidence = {'kind': 'actual_source_vertex', 'object': obj.name, 'vertex_index': index,
                    'normal_blender_world': list(normal),
                    'note': 'Base mesh vertex; animated deformation still requires pose render/surface verification'}
    else:
        if 'point_blender_world' not in spec or not spec.get('measured_from'):
            raise ValueError('Explicit world points require measured_from evidence; do not invent contact coordinates')
        point = Vector(spec['point_blender_world'])
        evidence = {'kind': 'manually_measured_world_point', 'measured_from': spec['measured_from'],
                    'note': 'Coordinate alone is not proof of surface contact'}
    return point, evidence


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--manifest', required=True)
parser.add_argument('--input', default='design/avatar-v5/work/prepared.blend')
parser.add_argument('--output', default='design/avatar-v5/avatar-v5.blend')
parser.add_argument('--report', default='design/avatar-v5/work/rig-report.json')
args = parser.parse_args(cli_arguments())
manifest = load_manifest(args.manifest)
root = open_prepared(args.input)
require_reviewable_source(root)
validate_prepared_manifest(root, manifest)
contract = read_json(SCRIPT / 'rig-contract.json')
bindings, used = {}, set()
for name, spec in manifest.get('parts', {}).items():
    mode = spec.get('mode', 'rigid_group')
    if not spec.get('measured_from'):
        raise ValueError(f'{name}: record measured_from evidence for the actual part/pivot')
    if mode in ('existing_node', 'bone'):
        if name in ('GazeLeft', 'GazeRight') and not spec.get('gaze_axes'):
            raise ValueError(f'{name}: record measured local gaze_axes for the existing rig')
        obj = source(spec, root)
        if mode == 'bone':
            bone = spec['bone']
            if obj.type != 'ARMATURE' or bone not in obj.pose.bones:
                raise ValueError(f'{name}: actual semantic bone does not exist')
            duplicate_names = sum(bone in other.data.bones for other in descendants(root) if other.type == 'ARMATURE')
            if duplicate_names != 1 or bpy.data.objects.get(bone):
                raise ValueError(f'{name}: bone name is ambiguous for runtime lookup: {bone}')
            point = obj.matrix_world @ obj.pose.bones[bone].head
            bindings[name] = {'kind': 'bone', 'runtime_node': bone, 'runtime_armature': obj.name,
                              'bone': bone, 'source': {'asset': spec['asset'], 'object': spec['object']},
                              'pivot_blender_world': list(point), 'pivot_runtime_world': runtime_point(point),
                              'measured_from': spec['measured_from']}
        else:
            if obj in used:
                raise ValueError('A real object cannot be two independently movable parts')
            existing = bpy.data.objects.get(name)
            if existing and existing != obj:
                raise ValueError(f'{name}: canonical node name collides with another object')
            obj.name = name  # Preserve actual parent, skin and object-space pivot.
            used.add(obj)
            bindings[name] = {'kind': 'existing_node', 'runtime_node': obj.name,
                              'source': {'asset': spec['asset'], 'object': spec['object']},
                              'pivot_blender_world': list(obj.matrix_world.translation),
                              'pivot_runtime_world': runtime_point(obj.matrix_world.translation),
                              'measured_from': spec['measured_from']}
        if spec.get('gaze_axes'):
            if any(spec['gaze_axes'].get(axis) not in (0, 1, 2) for axis in ('yaw', 'pitch')):
                raise ValueError('gaze_axes yaw/pitch must identify actual measured local axes 0/1/2')
            bindings[name]['gaze_axes'] = spec['gaze_axes']
        if spec.get('detail_radius_m'):
            bindings[name]['detail_radius_m'] = spec['detail_radius_m']
        continue
    if mode != 'rigid_group':
        raise ValueError('Part mode must be rigid_group, existing_node or bone')
    if not spec.get('objects'):
        raise ValueError(f'{name}: map actual source objects; empty semantic placeholders are not parts')
    if name in bpy.data.objects:
        raise ValueError(f'{name} already exists; rig a fresh prepared scene or edit the existing binding')
    objects = [source(selector, root) for selector in spec['objects']]
    if any(obj in used for obj in objects):
        raise ValueError('A real source object cannot be two movable parts. Split its actual faces first.')
    if any(obj.find_armature() or obj.parent_type == 'BONE' for obj in objects if obj.type == 'MESH'):
        raise ValueError(f'{name}: skinned geometry must retain its rig hierarchy. Bind actual bones in hand_controls/facial_controls; do not rigidly reparent it.')
    if 'pivot_blender_world' not in spec:
        raise ValueError(f'{name}: record a measured pivot_blender_world and measured_from evidence')
    group = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(group)
    group.matrix_world = Matrix.Translation(Vector(spec['pivot_blender_world']))
    parent_keep(group, root)
    group['v5_semantic_part'] = name
    group['v5_pivot_evidence'] = spec['measured_from']
    for obj in objects:
        parent_keep(obj, group)
        used.add(obj)
    bindings[name] = {'kind': 'rigid_group', 'runtime_node': group.name, 'objects': [obj.name for obj in objects],
                      'pivot_blender_world': list(group.matrix_world.translation),
                      'pivot_runtime_world': runtime_point(group.matrix_world.translation),
                      'measured_from': spec['measured_from'],
                      'gaze_axes': spec.get('gaze_axes', {'yaw': 2, 'pitch': 0})}

def attach_to_binding(obj, binding):
    if binding['kind'] == 'bone':
        world = obj.matrix_world.copy()
        obj.parent = bpy.data.objects[binding['runtime_armature']]
        obj.parent_type = 'BONE'
        obj.parent_bone = binding['bone']
        bpy.context.view_layer.update()
        obj.matrix_world = world
    else:
        parent_keep(obj, bpy.data.objects[binding['runtime_node']])

for binding in bindings.values():
    if binding['kind'] == 'bone':
        binding['runtime_armature'] = source(binding['source'], root).name
for name, parent in contract['parents'].items():
    if name in bindings and parent in bindings and bindings[name]['kind'] == 'rigid_group':
        attach_to_binding(bpy.data.objects[bindings[name]['runtime_node']], bindings[parent])
anchors = {}
for name, spec in manifest.get('anchors', {}).items():
    if name in bpy.data.objects:
        raise ValueError(f'Anchor name already exists: {name}')
    parent_binding = bindings.get(spec['parent'])
    parent = bpy.data.objects.get(spec['parent']) if not parent_binding else None
    if not parent_binding and parent not in descendants(root):
        raise ValueError(f'Anchor parent is not in working avatar: {spec["parent"]}')
    point, evidence = observed_surface(spec, root)
    anchor = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(anchor)
    anchor.empty_display_type = 'SPHERE'
    anchor.empty_display_size = .012
    anchor.matrix_world = Matrix.Translation(point)
    if parent_binding:
        attach_to_binding(anchor, parent_binding)
    else:
        parent_keep(anchor, parent)
    anchor['v5_anchor_evidence'] = json.dumps(evidence)
    anchors[name] = {'parent': spec['parent'], 'point_blender_world': list(point),
                     'point_runtime_world': runtime_point(point), 'evidence': evidence}
controls = {}
for category in ('facial_controls', 'hand_controls'):
    controls[category] = {}
    for name, spec in manifest.get(category, {}).items():
        obj = source(spec, root)
        kind = spec['kind']
        if kind == 'morph':
            key = spec['key']
            if obj.type != 'MESH' or not obj.data.shape_keys or key not in obj.data.shape_keys.key_blocks:
                raise ValueError(f'No actual morph {obj.name}/{key}')
            if key == obj.data.shape_keys.key_blocks[0].name:
                raise ValueError('The Basis key is not an expression control')
        elif kind in ('bone', 'bone_set'):
            bones = [spec] if kind == 'bone' else spec['bones']
            if not bones:
                raise ValueError('A bone set must identify actual measured deformation bones')
            for binding in bones:
                bone = binding['bone']
                if obj.type != 'ARMATURE' or bone not in obj.pose.bones:
                    raise ValueError(f'No actual weighted bone {obj.name}/{bone}')
                if not obj.data.bones[bone].use_deform:
                    raise ValueError(f'{obj.name}/{bone} is not a deformation bone; validate its driven deformation explicitly before binding')
                if 'min_radians' not in binding or 'max_radians' not in binding or binding.get('axis') not in (0, 1, 2):
                    raise ValueError('Bone controls require measured axis, min_radians and max_radians')
        else:
            raise ValueError('Controls must identify an existing morph or actual bone')
        controls[category][name] = {**spec, 'runtime_object': obj.name}
contacts = []
for pair in manifest.get('contact_pairs', []):
    first, second = pair['anchors']
    if first not in anchors or second not in anchors:
        raise ValueError(f'Contact pair uses an unmeasured anchor: {first}/{second}')
    distance = (bpy.data.objects[first].matrix_world.translation - bpy.data.objects[second].matrix_world.translation).length
    tolerance = float(pair.get('tolerance_m', .005))
    contacts.append({**pair, 'distance_m': distance, 'within_anchor_tolerance': distance <= tolerance,
                     'visual_surface_contact': 'pending_pose_render_review'})
action_bindings = manifest.get('action_bindings', {})
working_clips = working_animation_names(descendants(root))
for name, binding in action_bindings.items():
    kind = binding.get('kind')
    if kind == 'clip':
        clip = binding.get('clip')
        if clip not in working_clips:
            raise ValueError(f'Action {name}: clip is not assigned to actual working objects/shape keys: {clip}')
    elif kind == 'scene_frames':
        frames = binding.get('sample_frames', [])
        if len(frames) < 2 or not working_clips:
            raise ValueError(f'Action {name}: provide real animated scene data and multiple sample_frames')
    elif kind == 'runtime_driver':
        if not binding.get('driver_key') or not binding.get('implementation_path'):
            raise ValueError(f'Action {name}: identify a real runtime driver and implementation_path')
        from common import resolve_input
        if not resolve_input(binding['implementation_path']).is_file():
            raise ValueError(f'Action {name}: runtime implementation file is missing')
    else:
        raise ValueError(f'Action {name}: bind an actual clip, animated scene_frames, or existing runtime_driver')
missing = [name for name in contract['required_nodes'] if name not in bindings]
root['v5_bindings'] = json.dumps(bindings)
root['v5_controls'] = json.dumps(controls)
root['v5_anchors'] = json.dumps(anchors)
root['v5_contact_pairs'] = json.dumps(manifest.get('contact_pairs', []))
root['v5_action_bindings'] = json.dumps(action_bindings)
root['v5_qa_poses'] = json.dumps(manifest.get('qa_poses', {}))
root['v5_initially_hidden'] = json.dumps([n for n in contract['initially_hidden'] if n in bindings])
# glTF does not encode Blender hide_render. Runtime must explicitly apply these
# names, and QA must check startup before calling this a complete interaction.
root['v5_status'] = 'mapped_actual_parts_requires_visual_and_animation_review'
bpy.context.view_layer.update()
bounds = mesh_bounds(descendants(root))
report = {'status': root['v5_status'], 'bindings': bindings, 'anchors': anchors,
          'controls': controls, 'contact_measurements': contacts, 'missing_semantic_parts': missing,
          'bounds_runtime': runtime_bounds(bounds),
          'required_face_controls_missing': [n for n in contract['face']['required_controls'] if n not in controls['facial_controls']],
          'required_hand_controls_missing': [n for n in contract['hands']['required_controls'] if n not in controls['hand_controls']],
          'required_action_bindings_missing': [n for n in contract['required_actions'] if n not in manifest.get('action_bindings', {})],
          'note': 'Binding names and small anchor distances do not certify anatomical quality, rig weights or actual grip.'}
save_packed(args.output)
write_json(args.report, report)
print(json.dumps({'saved': args.output, 'report': args.report, 'missing_parts': missing}, indent=2))
