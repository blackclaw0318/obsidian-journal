"""Inventory and optionally render the actual v5 blend or exported GLB.

Produces evidence, not an automatic artistic pass. Missing controls are pending;
it never manufactures cover-patch blinks or substitute hand motions.
"""
import sys
sys.dont_write_bytecode = True
import argparse, json, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector
from common import output_path, read_json, resolve_input, SCRIPT, write_json, glb_inventory
from blender_common import (cli_arguments, descendants, inventory, mesh_bounds, open_prepared,
                            runtime_bounds, scene_root)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', default='design/avatar-v5/avatar-v5.blend')
parser.add_argument('--output-dir', default='design/avatar-v5/qa')
parser.add_argument('--render', action='store_true')
parser.add_argument('--size', type=int, default=900)
args = parser.parse_args(cli_arguments())
path = resolve_input(args.input)
if not path.is_file():
    raise FileNotFoundError('No actual v5 asset to verify: ' + str(path))
output = output_path(Path(args.output_dir) / 'verification.json').parent
binary_inventory = None
if path.suffix.lower() == '.blend':
    root = open_prepared(path)
elif path.suffix.lower() == '.glb':
    binary_inventory = glb_inventory(path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path), import_pack_images=True)
    root = scene_root()
    if root.get('avatarVersion') != 5:
        raise ValueError('Expected an exported v5 root; do not treat another model as a Meshy v5 result')
else:
    raise ValueError('Verify an actual .blend or .glb')
objects = descendants(root)
if not any(obj.type == 'MESH' for obj in objects):
    raise ValueError('No real avatar mesh to verify')
contract = read_json(SCRIPT / 'rig-contract.json')
controls = json.loads(root.get('v5_controls', root.get('runtimeControls', '{}')))
actions = json.loads(root.get('v5_action_bindings', root.get('runtimeActions', '{}')))
bindings = json.loads(root.get('v5_bindings', root.get('runtimeBindings', '{}')))
def semantic_target(name):
    binding = bindings.get(name, {})
    if binding.get('kind') == 'bone':
        rig = bpy.data.objects.get(binding['runtime_armature'])
        return rig.pose.bones.get(binding['bone']) if rig and rig.type == 'ARMATURE' else None
    return bpy.data.objects.get(binding.get('runtime_node', name))
control_map = {**controls.get('facial_controls', {}), **controls.get('hand_controls', {})}
hidden = json.loads(root.get('v5_initially_hidden', root.get('initiallyHidden', '[]')))
bounds = mesh_bounds(objects)
report = {'status': 'evidence_generated_requires_visual_review', 'input': str(path),
          'blender_version': bpy.app.version_string, 'bounds_blender': bounds,
          'bounds_runtime': runtime_bounds(bounds), 'inventory': inventory(objects),
          'glb_inventory': binary_inventory,
          'runtime_bindings': bindings,
          'missing_nodes': [name for name in contract['required_nodes'] if semantic_target(name) is None],
          'missing_face_controls': [name for name in contract['face']['required_controls'] if name not in control_map],
          'missing_hand_controls': [name for name in contract['hands']['required_controls'] if name not in control_map],
          'missing_action_bindings': [name for name in contract['required_actions'] if name not in actions],
          'initially_hidden': hidden, 'evidence': [], 'pending': []}
for name in hidden:
    obj = semantic_target(name)
    if obj and isinstance(obj, bpy.types.Object):
        for child in descendants(obj):
            child.hide_render = True

def control(name, value):
    spec = control_map[name]
    obj = bpy.data.objects.get(spec.get('runtime_object'))
    if not obj:
        raise ValueError('Control target missing after round trip: ' + name)
    if spec['kind'] == 'morph':
        key = obj.data.shape_keys.key_blocks[spec['key']]
        low, high = spec.get('min', 0), spec.get('max', 1)
        key.value = low + value * (high - low)
    elif spec['kind'] in ('bone', 'bone_set'):
        bindings = [spec] if spec['kind'] == 'bone' else spec['bones']
        for binding in bindings:
            bone = obj.pose.bones[binding['bone']]
            bone.rotation_mode = 'XYZ'
            axis = binding['axis']
            bone.rotation_euler[axis] = binding['min_radians'] + value * (binding['max_radians'] - binding['min_radians'])
    else:
        raise ValueError('Unsupported real control type: ' + spec['kind'])

transforms = {o: o.matrix_basis.copy() for o in objects}
visibility = {o: o.hide_render for o in objects}
morphs = [(o.data.shape_keys, [key.value for key in o.data.shape_keys.key_blocks])
          for o in objects if o.type == 'MESH' and o.data.shape_keys]
bone_poses = [(o, {b.name: (b.rotation_mode, b.matrix_basis.copy()) for b in o.pose.bones})
              for o in objects if o.type == 'ARMATURE']
def reset():
    for obj, matrix in transforms.items():
        obj.matrix_basis = matrix
        obj.hide_render = visibility[obj]
    for keys, values in morphs:
        for key, value in zip(keys.key_blocks, values):
            key.value = value
    for obj, bones in bone_poses:
        for name, (mode, matrix) in bones.items():
            obj.pose.bones[name].rotation_mode = mode
            obj.pose.bones[name].matrix_basis = matrix
    bpy.context.view_layer.update()

if args.render:
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = scene.render.resolution_y = max(256, min(args.size, 2400))
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new('QAWorld')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.35, .35, .35, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5
    for name, location, energy, size in [('QAKey',(-3,-4,6),500,4), ('QAFill',(4,-2,3),250,4), ('QARim',(1,3,4),400,3)]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy, data.shape, data.size = energy, 'DISK', size
        light = bpy.data.objects.new(name, data)
        scene.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector(bounds['center']) - light.location).to_track_quat('-Z','Y').to_euler()
    camera_data = bpy.data.cameras.new('QACamera')
    camera = bpy.data.objects.new('QACamera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.lens_unit = 'FOV'
    camera_data.angle = math.radians(40)
    center = Vector(bounds['center'])
    radius = max(Vector(corner).length for corner in [Vector(bounds['size']) / 2])
    distance = max(6.6, radius / math.sin(camera_data.angle / 2) * 1.08)
    def render(name, angle=0, target=None, close_distance=None):
        focus = Vector(target) if target is not None else center
        d = close_distance or distance
        radians = math.radians(angle)
        camera.location = focus + Vector((math.sin(radians)*d, -math.cos(radians)*d, 0))
        camera.rotation_euler = (focus-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath = str(output / (name + '.png'))
        bpy.context.view_layer.update()
        bpy.ops.render.render(write_still=True)
        report['evidence'].append({'name': name, 'path': scene.render.filepath,
                                   'camera_blender': list(camera.location), 'review': 'pending'})
    for angle, name in [(0,'front'), (-30,'left30'), (30,'right30')]:
        reset(); render(name, angle)
    for name in ('HandLeft','HandRight','Head'):
        obj = semantic_target(name)
        if obj and isinstance(obj, bpy.types.Object):
            part = mesh_bounds(descendants(obj))
            part_radius = Vector(part['size']).length / 2
            reset(); render(name.lower()+'-detail', target=part['center'], close_distance=max(.4, part_radius / math.sin(camera_data.angle/2)*1.1))
        elif obj:
            report['pending'].append(name + ': bone-driven region needs measured close-up camera selection')
    if all(semantic_target(name) is not None for name in ('GazeLeft','GazeRight')):
        for yaw,pitch,name in [(-.15,0,'gaze-left'),(.15,0,'gaze-right'),(0,.10,'gaze-up'),(0,-.10,'gaze-down'),(.15,.10,'gaze-corner')]:
            reset()
            for gaze in ('GazeLeft','GazeRight'):
                obj = semantic_target(gaze)
                axes = bindings.get(gaze, {}).get('gaze_axes')
                if not axes:
                    report['pending'].append(gaze + ': missing measured local gaze axes'); continue
                obj.rotation_mode='XYZ'
                obj.rotation_euler[axes['yaw']] += yaw * axes.get('yaw_sign', 1)
                obj.rotation_euler[axes['pitch']] += pitch * axes.get('pitch_sign', 1)
            render(name)
    else:
        report['pending'].append('Actual complete eyeballs and measured GazeLeft/Right globe-center pivots')
    for amount in (.5, 1):
        if all(n in control_map for n in ('BlinkLeft','BlinkRight')):
            reset(); control('BlinkLeft',amount); control('BlinkRight',amount); render('blink-'+str(amount))
    poses = {'wink': {'BlinkLeft':1}, 'silly': {'BlinkLeft':1,'JawOpen':.65,'TongueOut':1},
             'grin': {'Smile':1,'JawOpen':.3}, 'hand-open': {'LeftGrip':0}, 'hand-half': {'LeftGrip':.5}, 'hand-grip': {'LeftGrip':1}}
    for name, values in poses.items():
        missing = [n for n in values if n not in control_map]
        if missing:
            report['pending'].append(name + ' lacks actual controls: ' + ', '.join(missing)); continue
        reset()
        for key,value in values.items(): control(key,value)
        render(name)
    for name,spec in actions.items():
        if spec.get('kind') != 'scene_frames' or not spec.get('sample_frames'):
            report['pending'].append(name + ': actual clip/runtime sampling plan still required'); continue
        for frame in spec['sample_frames']:
            reset(); scene.frame_set(frame); render(name+'-'+str(frame))
    reset()
else:
    report['pending'].append('Render evidence: run with --render on the actual source or round-trip GLB')
report['pending'].extend(['All visual acceptance gates remain human review',
                          'Moving contact needs actual evaluated surfaces and release/catch runtime evidence',
                          'Browser initial visibility, textures, morphs/skin and animation sampling'])
write_json(output / 'verification.json', report)
print(json.dumps({'report': str(output/'verification.json'), 'evidence_count': len(report['evidence']),
                  'missing_nodes': report['missing_nodes'], 'status': report['status']}, indent=2))
