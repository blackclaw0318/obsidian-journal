"""Blender-only helpers. Keep source PBR, topology, weights and transforms intact."""
import sys
sys.dont_write_bytecode = True
import math, json
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from common import output_path, write_json


def cli_arguments():
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def parent_keep(obj, parent):
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def descendants(root):
    return [root, *root.children_recursive]


def mesh_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects
              if obj.type == 'MESH' for corner in obj.bound_box]
    if not points:
        raise ValueError('No real mesh geometry in the requested objects')
    low = Vector([min(p[axis] for p in points) for axis in range(3)])
    high = Vector([max(p[axis] for p in points) for axis in range(3)])
    return {'min': list(low), 'max': list(high), 'center': list((low + high) / 2),
            'size': list(high - low)}


def runtime_point(point):
    # Blender exporter export_yup=True: (x, y, z) -> (x, z, -y).
    return [point[0], point[2], -point[1]]


def runtime_bounds(bounds):
    low, high = bounds['min'], bounds['max']
    return {'min': [low[0], low[2], -high[1]],
            'max': [high[0], high[2], -low[1]],
            'center': runtime_point(bounds['center']),
            'size': [bounds['size'][0], bounds['size'][2], bounds['size'][1]]}


def inventory(objects):
    rows = []
    materials = set()
    images = set()
    for obj in objects:
        row = {'name': obj.name, 'source_id': obj.get('v5_source_id'),
               'source_name': obj.get('v5_source_name'), 'type': obj.type,
               'authored_purpose': obj.get('v5_authored_purpose'),
               'authored_evidence': obj.get('v5_authored_evidence'),
               'parent': obj.parent.name if obj.parent else None,
               'world_origin_blender': list(obj.matrix_world.translation),
               'world_origin_runtime': runtime_point(obj.matrix_world.translation)}
        if obj.type == 'MESH':
            row.update(vertices=len(obj.data.vertices), polygons=len(obj.data.polygons),
                       triangles=sum(len(p.vertices) - 2 for p in obj.data.polygons),
                       uv_layers=list(obj.data.uv_layers.keys()),
                       vertex_groups=list(obj.vertex_groups.keys()),
                       max_vertex_influences=max((len([g for g in vertex.groups if g.weight > 0]) for vertex in obj.data.vertices), default=0),
                       morphs=list(obj.data.shape_keys.key_blocks.keys()) if obj.data.shape_keys else [],
                       bounds_blender=mesh_bounds([obj]),
                       materials=[m.name if m else None for m in obj.data.materials])
            materials.update(m for m in obj.data.materials if m)
        if obj.type == 'ARMATURE':
            row['bones'] = list(obj.data.bones.keys())
        if obj.animation_data:
            row['action'] = obj.animation_data.action.name if obj.animation_data.action else None
            row['nla_tracks'] = [{'name': t.name, 'strips': [s.action.name for s in t.strips if s.action]}
                                 for t in obj.animation_data.nla_tracks]
            row['drivers'] = len(obj.animation_data.drivers)
        rows.append(row)
    material_rows = []
    for material in sorted(materials, key=lambda m: m.name):
        textures = []
        if material.use_nodes:
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    image = node.image
                    images.add(image)
                    textures.append({'node': node.name, 'image': image.name,
                                     'color_space': image.colorspace_settings.name})
        material_rows.append({'name': material.name, 'textures': textures,
                              'uses_nodes': material.use_nodes})
    image_rows = [{'name': im.name, 'size': list(im.size),
                   'packed': bool(im.packed_file), 'source': im.source,
                   'filepath': im.filepath, 'color_space': im.colorspace_settings.name,
                   'has_data': bool(im.has_data)} for im in sorted(images, key=lambda im: im.name)]
    return {'objects': rows, 'materials': material_rows, 'images': image_rows,
            'actions': [{'name': action.name, 'frame_range': list(action.frame_range)}
                        for action in bpy.data.actions]}


def save_packed(path):
    path = output_path(path)
    if path.suffix.lower() != '.blend':
        raise ValueError('Editable output must have a .blend extension')
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(path), check_existing=False)
    return path


def scene_root():
    root = bpy.data.objects.get('AvatarV5Root')
    if not root:
        raise ValueError('No prepared AvatarV5Root; import an actual Meshy source first')
    return root


def open_prepared(path):
    path = output_path(path)
    if not path.is_file():
        raise FileNotFoundError(path)
    bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False, use_scripts=False)
    return scene_root()


def select_working(root):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in descendants(root):
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def find_source(source_id, source_name, root=None):
    candidates = descendants(root or scene_root())
    found = [obj for obj in candidates if obj.get('v5_source_id') == source_id
             and obj.get('v5_source_name') == source_name]
    if len(found) != 1:
        raise ValueError(f'Expected exactly one real source object {source_id}/{source_name}; got {len(found)}')
    return found[0]


def require_reviewable_source(root):
    if not root.get('v5_provenance'):
        raise ValueError('Prepared scene lacks actual source provenance')
    meshes = [obj for obj in descendants(root) if obj.type == 'MESH']
    source_ids = {row['id'] for row in json.loads(root['v5_provenance'])}
    authored = {'eye_globe', 'eyelid_retopology', 'mouth_retopology', 'interactive_label', 'flash'}
    invalid = [obj.name for obj in meshes if not (
        obj.get('v5_source_id') in source_ids or (
            obj.get('v5_source_id') == 'authored'
            and obj.get('v5_authored_purpose') in authored
            and obj.get('v5_authored_evidence') and obj.get('v5_source_name')))]
    if not meshes or invalid:
        raise ValueError('Unrecorded geometry (no procedural hand/prop substitutions): ' + ', '.join(invalid))


def validate_prepared_manifest(root, manifest):
    actual = {row['id']: row for row in json.loads(root.get('v5_provenance', '[]'))}
    expected = {row['id']: row for row in manifest['assets']}
    if actual.keys() != expected.keys():
        raise ValueError('Manifest asset IDs differ from the actual prepared scene; prepare the matching sources first')
    prepared = json.loads(root.get('v5_manifest', '{}'))
    prepared_assets = {row['id']: row for row in prepared.get('assets', [])}
    for identity, row in expected.items():
        for field in ('sha256', 'generation_id', 'provider'):
            if actual[identity].get(field) != row.get(field):
                raise ValueError(f'Prepared source {identity} has different {field}; no cross-source rig binding')
        if prepared_assets.get(identity, {}).get('import_transform', {}) != row.get('import_transform', {}):
            raise ValueError(f'{identity}: import_transform changed; prepare again before rigging')
    if prepared.get('normalization', {}) != manifest.get('normalization', {}):
        raise ValueError('Normalization changed; prepare again before rigging')


def working_animation_names(objects):
    """Names actually referenced by WORK objects/data, excluding hidden SOURCE."""
    names = set()
    for obj in objects:
        blocks = [obj]
        if obj.data:
            blocks.append(obj.data)
            if getattr(obj.data, 'shape_keys', None):
                blocks.append(obj.data.shape_keys)
        for block in blocks:
            animation = getattr(block, 'animation_data', None)
            if not animation:
                continue
            if animation.action:
                names.add(animation.action.name)
            for track in animation.nla_tracks:
                assigned = [strip.action.name for strip in track.strips if strip.action]
                if assigned:
                    names.add(track.name)
                    names.update(assigned)
    return names
