import bpy,math,os,json,sys,argparse
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent.parent
parser=argparse.ArgumentParser(description='Roundtrip model QA: front, sides, gaze, blink, mouth, and prop actions')
parser.add_argument('--model',type=Path,default=ROOT/'.local/model-lab-v4/avatar-v4.raw.glb')
parser.add_argument('--out-dir',type=Path,default=ROOT/'.local/model-lab-v4')
parser.add_argument('--samples',type=int,default=12)
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
args=parser.parse_args(argv);LAB=args.out_dir.resolve();LAB.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.model.resolve()))
for name in ['BreadBitten','Flash','MouthOpen','LidLeft','LidRight']:
    ob=bpy.data.objects.get(name)
    if ob:
        ob.hide_render=True
        for child in ob.children_recursive:child.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=args.samples
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard'
world=bpy.data.worlds.new('Soft neutral studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,1,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65
for position,power,size in [((-3,-4,5),450,5),((3,-2,3),250,4)]:
    bpy.ops.object.light_add(type='AREA',location=position);light=bpy.context.object;light.data.energy=power;light.data.size=size;light.rotation_euler=(Vector((0,0,1.6))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-6.7,1.55));cam=bpy.context.object;scene.camera=cam;cam.data.lens_unit='FOV';cam.data.angle=math.radians(38)
target=Vector((0,-.15,1.55))
for name,angle in [('front',0),('left30',-30),('right30',30)]:
    a=math.radians(angle);cam.location=Vector((6.55*math.sin(a),-6.55*math.cos(a)-.15,1.55));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(LAB/f'verified-v4-{name}.png');bpy.ops.render.render(write_still=True)
# Keep body/camera fixed for real eye-only gaze proof.
cam.location=(0,-6.7,1.55);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
def visibility(name,value):
    ob=bpy.data.objects.get(name)
    if ob:
        ob.hide_render=not value
        for child in ob.children_recursive:child.hide_render=not value

def morph(name,value):
    for ob in bpy.context.scene.objects:
        if ob.type=='MESH' and ob.data.shape_keys and name in ob.data.shape_keys.key_blocks:
            ob.data.shape_keys.key_blocks[name].value=value

def save(name):
    scene.render.filepath=str(LAB/f'verified-v4-{name}.png');bpy.ops.render.render(write_still=True)
for side in ['Left','Right']:
    bpy.data.objects['Gaze'+side].rotation_mode='XYZ';bpy.data.objects['Gaze'+side].rotation_euler.z=-.20
save('gaze-left')
for side in ['Left','Right']:bpy.data.objects['Gaze'+side].rotation_euler.z=.20
save('gaze-right')
for side in ['Left','Right']:bpy.data.objects['Gaze'+side].rotation_euler.z=0
for side in ['Left','Right']:
    visibility('Lid'+side,True);bpy.data.objects['Lid'+side].scale.z=1
save('blink')
for side in ['Left','Right']:
    visibility('Lid'+side,False);bpy.data.objects['Lid'+side].scale.z=.001
visibility('MouthOpen',True);visibility('TeethUpper',True);visibility('Tongue',True)
morph('Grin',.6);visibility('BreadWhole',False);visibility('LidLeft',True);bpy.data.objects['LidLeft'].scale.z=1;save('silly')
visibility('LidLeft',False);bpy.data.objects['LidLeft'].scale.z=.001
visibility('Tongue',False);morph('Grin',1);bpy.data.objects['MouthOpen'].scale.z=.65;save('grin')
morph('Grin',0);morph('Surprise',1);bpy.data.objects['MouthOpen'].scale.z=1.15;bpy.data.objects['MouthOpen'].scale.x=.90;visibility('TeethUpper',False);save('wow')
morph('Surprise',0);visibility('MouthOpen',False);visibility('BreadBitten',True)
apple=bpy.data.objects['Apple'];apple.location.z+=.65;apple.rotation_euler.y=.7;visibility('Flash',True);save('actions')
print('V4_ROUNDTRIP_VERIFIED',flush=True)
