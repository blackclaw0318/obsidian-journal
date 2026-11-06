"""Import the actual normal-download Meshy v7 source; preserve an untouched copy.

Only intake, source/working separation, non-mutating connected-component
analysis and source-quality review renders occur here. No v4/v6 geometry enters.
"""
import bpy,sys,json,hashlib,math,time
from pathlib import Path
import numpy as np
from mathutils import Vector,Matrix
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];LAB=ROOT/'.local/meshy-v7';AN=LAB/'analysis';AN.mkdir(parents=True,exist_ok=True)
SOURCE=LAB/'source/meshy-snack-selfie-original.glb';EXPECTED='692955345bb830e46779c5dd2a2b48f8243b6681bb9e7445c8f5800705866375'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED,'Source hash mismatch'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE),import_pack_images=True,merge_vertices=False,import_merge_material_slots=False)
originals=list(bpy.context.scene.objects);meshes=[o for o in originals if o.type=='MESH'];assert len(meshes)==1
source_collection=bpy.data.collections.new('SOURCE | genuine Meshy download (untouched)');bpy.context.scene.collection.children.link(source_collection)
for ob in originals:
    for col in list(ob.users_collection):col.objects.unlink(ob)
    source_collection.objects.link(ob);ob['v7_source_sha256']=EXPECTED;ob['v7_original_name']=ob.name
provenance={'status':'actual_meshy_glb_imported_not_yet_modified','source_file':SOURCE.name,'source_sha256':EXPECTED,'download_filename':'Meshy_AI_Snack_Selfie_1106014205_texture.glb','download_method':'Normal Meshy workspace GLB download; saved browser download file','model':'Meshy 7.1 Flagship / ultra detail / native Meshy7 textures','original_bytes':SOURCE.stat().st_size,'imported_blender':bpy.app.version_string}
bpy.context.scene['v7_provenance']=json.dumps(provenance,ensure_ascii=False)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(LAB/'source/meshy-v7-import-untouched.blend'),compress=True)
print('V7_UNTOUCHED_SOURCE_SAVED',flush=True)
# Independent work mesh and materials. Images remain read-only source data here.
root=bpy.data.objects.new('AvatarV7Root',None);bpy.context.scene.collection.objects.link(root);root['v7_provenance']=json.dumps(provenance,ensure_ascii=False)
work_collection=bpy.data.collections.new('WORK | real Meshy geometry');bpy.context.scene.collection.children.link(work_collection)
work=meshes[0].copy();work.data=meshes[0].data.copy();work.name='MeshyV7Working';work['v7_source_sha256']=EXPECTED;work['v7_source_object']=meshes[0].name;work_collection.objects.link(work)
for index,slot in enumerate(work.material_slots):
    if slot.material:slot.material=slot.material.copy()
work.parent=root;work.matrix_world=meshes[0].matrix_world.copy()
source_collection.hide_render=True;source_collection.hide_viewport=True
corners=[work.matrix_world@Vector(c) for c in work.bound_box];low=Vector([min(p[i] for p in corners)for i in range(3)]);high=Vector([max(p[i]for p in corners)for i in range(3)]);center=(low+high)/2;factor=3.1/(high.z-low.z)
root.scale=(factor,)*3;root.location=(-center.x*factor,-center.y*factor,-low.z*factor)
bpy.context.view_layer.update()
me=work.data;nv=len(me.vertices);ne=len(me.edges);nf=len(me.polygons)
positions=np.empty(nv*3,dtype=np.float32);me.vertices.foreach_get('co',positions);positions=positions.reshape(-1,3)
M=np.array(work.matrix_world,dtype=np.float64);world=positions@M[:3,:3].T+M[:3,3]
edges=np.empty(ne*2,dtype=np.int32);me.edges.foreach_get('vertices',edges);edges=edges.reshape(-1,2)
parents=list(range(nv));sizes=[1]*nv
def find(a):
    while parents[a]!=a:parents[a]=parents[parents[a]];a=parents[a]
    return a
def union(a,b):
    a=find(a);b=find(b)
    if a!=b:
        if sizes[a]<sizes[b]:a,b=b,a
        parents[b]=a;sizes[a]+=sizes[b]
for a,b in edges:union(int(a),int(b))
labels=np.array([find(i)for i in range(nv)],dtype=np.int32)
unique,counts=np.unique(labels,return_counts=True);raw_index_count=len(unique);print('V7_INDEX_CONNECTED_COMPONENTS',len(unique),'vertices',nv,'edges',ne,'faces',nf,flush=True)
# Analysis-only weld of coincident split vertices. Never mutate source UV seams.
quant=np.rint(world/1e-6).astype(np.int32)
_,first,inverse=np.unique(quant,axis=0,return_index=True,return_inverse=True)
for i,idx in enumerate(inverse):
    j=int(first[idx])
    if j!=i:union(i,j)
labels=np.array([find(i)for i in range(nv)],dtype=np.int32)
unique,counts=np.unique(labels,return_counts=True)
loopvertices=np.empty(len(me.loops),dtype=np.int32);me.loops.foreach_get('vertex_index',loopvertices)
starts=np.empty(nf,dtype=np.int32);me.polygons.foreach_get('loop_start',starts);face_labels=labels[loopvertices[starts]]
np.save(AN/'vertex-component-labels.npy',labels);np.save(AN/'face-component-labels.npy',face_labels)
components=[]
for index in np.argsort(-counts)[:80]:
    label=int(unique[index]);mask=labels==label;p=world[mask];lo=p.min(axis=0);hi=p.max(axis=0)
    components.append({'component':label,'vertices':int(counts[index]),'faces':int(np.count_nonzero(face_labels==label)),'bounds_blender':{'min':lo.tolist(),'max':hi.tolist(),'center':((lo+hi)/2).tolist(),'size':(hi-lo).tolist()}})
images=[{'name':im.name,'size':list(im.size),'color_space':im.colorspace_settings.name,'packed':bool(im.packed_file)}for im in bpy.data.images if im.has_data]
materials=[]
for mat in work.data.materials:
    textures=[]
    if mat and mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image:textures.append({'node':node.name,'image':node.image.name,'colorspace':node.image.colorspace_settings.name,'links_to':[l.to_node.type+':'+l.to_socket.name for o in node.outputs for l in o.links]})
    materials.append({'name':mat.name if mat else None,'textures':textures})
report={'provenance':provenance,'status':'intake_only_no_eye_or_prop_edits','vertices':nv,'triangles':nf,'indexed_components':raw_index_count,'coincident_welded_analysis_components':len(unique),'analysis_weld_tolerance_m':1e-6,'normalization':{'height':3.1,'uniform_scale':factor,'root_location':list(root.location),'source_bounds':{'min':list(low),'max':list(high)}},'images':images,'materials':materials,'largest_components':components,'note':'Component labels are analysis-only, mesh geometry/UV/PBR unmodified. Semantic object separation is pending measured selection.'}
(AN/'intake-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('V7_GEOMETRIC_COMPONENTS',len(unique),'TOP',[(x['component'],x['vertices'],x['faces'])for x in components[:12]],flush=True)
# Save before studio setup so work remains a clean editable source import.
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(LAB/'avatar-v7.imported.blend'),compress=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX'
worlddata=bpy.data.worlds.new('Neutral source comparison studio');worlddata.use_nodes=True
bg=worlddata.node_tree.nodes.new('ShaderNodeBackground');out=worlddata.node_tree.nodes.new('ShaderNodeOutputWorld');worlddata.node_tree.links.new(bg.outputs['Background'],out.inputs['Surface']);bg.inputs[0].default_value=(.82,.86,.88,1);bg.inputs[1].default_value=.45;scene.world=worlddata
for name,pos,energy,size in [('Large softbox',(-3,-4,5),450,5),('Fill',(3,-2,3),220,4),('Rim',(0,2,4),330,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);ob=bpy.context.object;ob.name=name;ob.data.energy=energy;ob.data.size=size;ob.rotation_euler=(Vector((0,0,1.6))-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-6,1.55));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=3.8;target=Vector((0,0,1.55))
for name,angle in [('front',0),('left30',-30),('right30',30),('back',180)]:
    a=math.radians(angle);camera.location=(6*math.sin(a),-6*math.cos(a),1.55);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(AN/('source-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V7_SOURCE_RENDER',name,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(LAB/'avatar-v7.source-review.blend'),compress=True)
print('V7_INTAKE_DONE',flush=True)
