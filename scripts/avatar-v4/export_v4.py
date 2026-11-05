"""Shared Blender -> glTF export contract for the editable avatar v4 source."""
from pathlib import Path
import bpy,json,struct

def export_asset(output):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in bpy.context.scene.objects:
        if ob.type in {'MESH','EMPTY'}:ob.select_set(True)
    path=Path(output).resolve();path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_animations=False,export_morph=True,export_morph_normal=False,export_texcoords=True,export_normals=True)
    blob=path.read_bytes();jl=struct.unpack_from('<I',blob,12)[0];doc=json.loads(blob[20:20+jl]);rest=blob[20+jl:]
    frontindex=next(i for i,m in enumerate(doc['materials']) if m['name']=='Head | matte source surface')
    fm=doc['materials'][frontindex];fm['alphaMode']='MASK';fm['alphaCutoff']=.12;fm['pbrMetallicRoughness']['baseColorFactor']=[.65,.65,.65,1]
    for m in doc['materials']:
        if m['name'].startswith('LidSkin'):
            m['extensions']={'KHR_materials_unlit':{}};m['pbrMetallicRoughness']['baseColorFactor']=[.90,.90,.90,1];m['alphaMode']='BLEND'
    if 'KHR_materials_unlit' not in doc.setdefault('extensionsUsed',[]):doc['extensionsUsed'].append('KHR_materials_unlit')
    for me in doc['meshes']:
        for pr in me['primitives']:
            if pr.get('material')==frontindex:pr['attributes'].pop('COLOR_0',None)
            if me['name'].startswith('BlinkCover') and 'COLOR_1' in pr['attributes']:pr['attributes']['COLOR_0']=pr['attributes'].pop('COLOR_1')
    raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4);path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(raw)+len(rest))+struct.pack('<II',len(raw),0x4E4F534A)+raw+rest)
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    print('V4_EXPORTED',path.stat().st_size,'bytes;',triangles,'triangles;',len(doc['nodes']),'nodes',flush=True)
