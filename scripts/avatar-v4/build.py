"""Build a component-based v4 bust with neural head and independent solid props.

Input plate contains no props, hands, or stickers. Only Head/Torso use the neural
surface. Props, hands, eye mechanics, mouth, and paper labels are separate meshes.
No source image is overwritten. Blender export is reimported by verify-v4.py.
"""
import bpy,bmesh,math,sys,json,struct,os
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
SCRIPT_DIR=Path(__file__).resolve().parent
ROOT=SCRIPT_DIR.parent.parent
sys.dont_write_bytecode=True
sys.path.insert(0,str(SCRIPT_DIR))
from parts_v4 import *
from export_v4 import export_asset
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--rebuild',action='store_true',help='Rebuild parts from the neural PLY, rather than reexport the editable .blend')
parser.add_argument('--from-blend',type=Path,help='Editable Blender source; defaults to design/avatar-v4/avatar-v4.blend')
parser.add_argument('--source',type=Path,default=ROOT/'public/images/avatar-v4/head-clean.png')
parser.add_argument('--mesh',type=Path,help='Official TripoSR PLY from reconstruct.py')
parser.add_argument('--work-dir',type=Path,default=ROOT/'.local/model-lab-v4')
parser.add_argument('--output',type=Path,default=ROOT/'.local/model-lab-v4/avatar-v4.raw.glb')
parser.add_argument('--blend-out',type=Path,default=ROOT/'design/avatar-v4/avatar-v4.blend')
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
args=parser.parse_args(argv)
LAB=args.work_dir.resolve();LAB.mkdir(parents=True,exist_ok=True)
SOURCE=args.source.resolve()
blend_source=(args.from_blend or ROOT/'design/avatar-v4/avatar-v4.blend').resolve()
if not args.rebuild and blend_source.exists():
    bpy.ops.wm.open_mainfile(filepath=str(blend_source));export_asset(args.output);raise SystemExit(0)
MESH=(args.mesh or LAB/'reconstruction-v4-256-t10.ply').resolve()
if not MESH.exists():raise FileNotFoundError('Run reconstruct.py first or pass --mesh /path/to/reconstruction.ply')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
source=bpy.data.images.load(str(SOURCE));W,H=source.size
pixels=np.asarray(source.pixels[:],dtype=np.float32).reshape(H,W,4)
yy,xx=np.where(pixels[:,:,3]>.001)
# Image pixels are bottom-up in Blender; match upstream PIL crop in top-down.
x1=int(xx.min());x2=int(xx.max());y1=H-1-int(yy.max());y2=H-1-int(yy.min())
fgw=x2-x1;fgh=y2-y1;side=max(fgw,fgh);prepared=int(side/.85)
pad=(prepared-side)//2
xoffset=(side-fgw)//2+pad-x1;yoffset=(side-fgh)//2+pad-y1
projection_cx=prepared/2-xoffset;projection_cy=prepared/2-yoffset
distance=1.9;tan=math.tan(math.radians(20))
# Texture scaling occurs in Blender memory for packaging; SOURCE remains intact.
texture=source.copy();texture.name='AvatarV4Head768';texture.scale(640,640);texture.pack()

bpy.ops.wm.ply_import(filepath=str(MESH))
body=bpy.context.object;body.name='NeuralBustWorking'
dec=body.modifiers.new('Web topology budget','DECIMATE');dec.ratio=.165;bpy.ops.object.modifier_apply(modifier=dec.name)
sm=body.modifiers.new('Clean surface normals','SMOOTH');sm.factor=.28;sm.iterations=2;bpy.ops.object.modifier_apply(modifier=sm.name)
raw_bounds=[min(v.co.z for v in body.data.vertices),max(v.co.z for v in body.data.vertices)]
S=3.1/(raw_bounds[1]-raw_bounds[0]);ZOFFSET=.08-raw_bounds[0]*S

def world(raw):return Vector((raw[1]*S,-raw[0]*S,raw[2]*S+ZOFFSET))
def raw_point(px,py,depth):
    return Vector((depth,(px-projection_cx)/prepared*2*tan*(distance-depth),(projection_cy-py)/prepared*2*tan*(distance-depth)))
def source_pixel(p):
    x=-p.y/S;y=p.x/S;z=(p.z-ZOFFSET)/S
    return (projection_cx+y/(2*tan*(distance-x))*prepared,projection_cy-z/(2*tan*(distance-x))*prepared)
def projection_uv(raw):
    x,y,z=raw
    return ((projection_cx+y/(2*tan*(distance-x))*prepared)/W,1-(projection_cy-z/(2*tan*(distance-x))*prepared)/H)

front=bpy.data.materials.new('Head | matte source surface');front.use_nodes=True
p=front.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.95;p.inputs['Specular IOR Level'].default_value=.07
tex=front.node_tree.nodes.new('ShaderNodeTexImage');tex.image=texture;tex.extension='CLIP'
front.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);front.node_tree.links.new(tex.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.35
front.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha']);front.surface_render_method='DITHERED'
rear=bpy.data.materials.new('Head | learned side and rear');rear.use_nodes=True
rp=rear.node_tree.nodes.get('Principled BSDF');rp.inputs['Roughness'].default_value=1;rp.inputs['Specular IOR Level'].default_value=.05
vc=rear.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name=body.data.color_attributes[0].name;rear.node_tree.links.new(vc.outputs['Color'],rp.inputs['Base Color'])
body.data.materials.clear();body.data.materials.append(front);body.data.materials.append(rear)
uv=body.data.uv_layers.new(name='CalibratedPlateProjection')
for face in body.data.polygons:
    face.material_index=0 if face.center.x>-.055 else 1
    face.use_smooth=True
    for li in face.loop_indices:uv.data[li].uv=projection_uv(body.data.vertices[body.data.loops[li].vertex_index].co)
for v in body.data.vertices:v.co=world(v.co)

root=empty('AvatarV4Root')
root['asset_version']=4;root['recommended_orbit_degrees']=30
root['provenance']='Official TripoSR MIT isolated bust reconstruction, independent Blender solid parts and facial controls; front limited-angle asset.'
# Split the neural bust at the lower neck; cap both real cross-section boundaries.
split_z=world((0,0,-.40)).z
for upper,name in [(False,'Torso'),(True,'Head')]:
    ob=body.copy();ob.data=body.data.copy();bpy.context.collection.objects.link(ob);ob.name=name
    bm=bmesh.new();bm.from_mesh(ob.data)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.0001,plane_co=(0,0,split_z),plane_no=(0,0,1),clear_inner=upper,clear_outer=not upper)
    edges=[e for e in bm.edges if e.is_boundary and all(abs(v.co.z-split_z)<.002 for v in e.verts)]
    if edges:
        result=bmesh.ops.holes_fill(bm,edges=edges,sides=0)
        for face in result.get('faces',[]):face.material_index=1
    bm.to_mesh(ob.data);bm.free();ob.data.update();parent_keep(ob,root)
bpy.data.objects.remove(body,do_unlink=True)
head=bpy.data.objects['Head'];torso=bpy.data.objects['Torso']
face_bvh=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons],all_triangles=False)
world_camera=world((distance,0,0))
def face_point(px,py,front_offset=.0):
    ray=(world(raw_point(px,py,0))-world_camera).normalized();hit,n,index,dist=face_bvh.ray_cast(world_camera,ray,20)
    if hit is None:
        # Nearby silhouette regions may have no hit after neural decimation.
        return world(raw_point(px,py,.18))+Vector((0,-front_offset,0))
    return hit+Vector((0,-front_offset,0))
# Head origin at the neck makes small look motions independent of the torso.
pivot=Vector((0,0,split_z))
for v in head.data.vertices:v.co-=pivot
head.location=pivot
basis=head.shape_key_add(name='Basis')
for keyname in ['Surprise','Grin']:
    key=head.shape_key_add(name=keyname)
    for i,v in enumerate(head.data.vertices):
        pos=v.co+pivot;px,py=source_pixel(pos)
        if pos.y>-.15:continue
        if keyname=='Surprise':
            # Raise actual forehead/brow topology and slightly widen the jaw/mouth.
            brow=math.exp(-((py-489)/80)**2)*max(math.exp(-((px-505)/100)**2),math.exp(-((px-751)/100)**2))
            mouth=math.exp(-((px-628)/150)**2-((py-780)/75)**2)
            key.data[i].co.z+=.075*brow-.035*mouth
            key.data[i].co.x+=(pos.x)*.055*mouth
        else:
            cheek=math.exp(-((py-719)/90)**2)*max(math.exp(-((px-481)/110)**2),math.exp(-((px-771)/110)**2))
            corner=math.exp(-((py-778)/45)**2)*max(math.exp(-((px-549)/55)**2),math.exp(-((px-701)/55)**2))
            key.data[i].co.z+=.035*cheek+.045*corner
head['morph_targets']='Surprise, Grin; combine with MouthOpen/Tongue visibility for larger expressions'

skin=material('Face controls | warm skin',(.69,.39,.26),.95,0,.12)
white=material('Eyes | warm sclera',(.58,.56,.51),.8,0,.08)
iris=material('Eyes | rich dark brown',(.045,.012,.006),.6,0,.05)
irisinner=material('Eyes | amber iris',(.12,.045,.012),.7,0,.05)
ink=material('Eyes | pupils and lash',(.005,.003,.002),.85)
glint=material('Eyes | catchlight',(.95,.93,.84),.3,0,.3)
EYES={
 'Left':dict(x0=444,x1=570,y0=580,y1=594,top=554,bottom=607,cx=513,cy=578),
 'Right':dict(x0=685,x1=810,y0=594,y1=576,top=554,bottom=607,cx=744,cy=578)
}
for side,e in EYES.items():
    center=face_point(e['cx'],e['cy'],.048);eye=empty('Eye'+side,center,head)
    whites=[];faces=[];NX=32;NY=10
    for i in range(NX+1):
        t=i/NX;px=e['x0']+(e['x1']-e['x0'])*t;base=e['y0']*(1-t)+e['y1']*t;arch=math.sin(math.pi*t)**.72;top=base-(base-e['top'])*arch;bottom=base+(e['bottom']-base)*arch
        for j in range(NY+1):
            q=j/NY;py=top*(1-q)+bottom*q;pt=face_point(px,py,.030+.020*math.sin(math.pi*t)*math.sin(math.pi*q));whites.append(pt)
    for i in range(NX):
        for j in range(NY):a=i*(NY+1)+j;faces.append((a,a+1,a+NY+2,a+NY+1))
    mesh('EyeWhite'+side,whites,faces,white,eye)
    gaze=empty('Gaze'+side,center+Vector((0,.16,0)),eye);gaze['yaw_limit_radians']=.22;gaze['pitch_limit_radians']=.14
    sphere('IrisOuter'+side,center+Vector((0,-.017,0)),(.062,.007,.062),iris,gaze,20,12)
    sphere('IrisInner'+side,center+Vector((0,-.025,-.004)),(.049,.005,.049),irisinner,gaze,20,12)
    sphere('Pupil'+side,center+Vector((0,-.031,0)),(.028,.004,.036),ink,gaze,20,10)
    sphere('Catchlight'+side,center+Vector((-.022,-.036,.026)),(.014,.002,.014),glint,gaze,12,8)
    # Independent actual eyelid cover uses a small curved patch and feathered alpha.
    lid=empty('Lid'+side,face_point(e['cx'],e['top']-12,.035),eye)
    lid['open_scale_y']=.001;lid['closed_scale_y']=1;lid['hide_when_open']=True
    verts=[];faces=[];uvs=[];alphas=[];LX=32;LY=12
    for i in range(LX+1):
        t=i/LX;px=e['x0']-15+(e['x1']-e['x0']+30)*t;base=e['y0']*(1-t)+e['y1']*t;arch=math.sin(math.pi*t)**.55;top=base-(base-e['top']+10)*arch;bottom=base+(e['bottom']+10-base)*arch
        for j in range(LY+1):
            q=j/LY;py=top+(bottom-top)*q;pt=face_point(px,py,.048);pt.y=min(pt.y,center.y-.045);verts.append(pt);uvs.append((px/W,1-(e['bottom']+14+(q-.5)*4)/H));fade=max(0,min(1,min(px-(e['x0']-15),e['x1']+15-px,py-top,bottom-py)/6));alphas.append(fade*fade*(3-2*fade))
    for i in range(LX):
        for j in range(LY):a=i*(LY+1)+j;faces.append((a,a+1,a+LY+2,a+LY+1))
    lm=bpy.data.materials.new('LidSkin'+side);lm.use_nodes=True;lp=lm.node_tree.nodes.get('Principled BSDF');lp.inputs['Roughness'].default_value=1;lp.inputs['Specular IOR Level'].default_value=0
    lt=lm.node_tree.nodes.new('ShaderNodeTexImage');lt.image=texture;lm.node_tree.links.new(lt.outputs['Color'],lp.inputs['Base Color']);lm.surface_render_method='DITHERED'
    ob=mesh('BlinkCover'+side,verts,faces,lm,lid);lu=ob.data.uv_layers.new(name='CleanSkin');ca=ob.data.color_attributes.new(name='EdgeFade',type='FLOAT_COLOR',domain='CORNER')
    for loop in ob.data.loops:lu.data[loop.index].uv=uvs[loop.vertex_index];ca.data[loop.index].color=(1,1,1,alphas[loop.vertex_index])
    at=lm.node_tree.nodes.new('ShaderNodeVertexColor');at.layer_name='EdgeFade';lm.node_tree.links.new(at.outputs['Alpha'],lp.inputs['Alpha'])
    crease=[]
    for i in range(15):
        t=i/14;px=e['x0']+(e['x1']-e['x0'])*t;py=e['cy']+8+10*math.sin(math.pi*t);pt=face_point(px,py,.055);pt.y=min(pt.y,center.y-.052);crease.append(pt)
    tube('WinkCrease'+side,crease,[.0025]*len(crease),ink,lid,6,1)
    lid.scale.z=.001

# QA calibration against the exact rendered painted eye contours: the inferred
# socket surface is vertically compressed and partly occludes the upper patch.
# Match the measured contour, then refit depth in world X/Z rather than leaving
# the upper half behind the neural forehead surface. No painted eye remains
# visible behind the opaque real sclera; no transparent hole is required.
for side in ['Left','Right']:
    eye=bpy.data.objects['Eye'+side];eye.scale.z=1.50;eye.location.z+=.045
    bpy.context.view_layer.update()
    sclera=bpy.data.objects['EyeWhite'+side]
    for v in sclera.data.vertices:
        pt=sclera.matrix_world@v.co
        hit,n,idx,dist=face_bvh.ray_cast(Vector((pt.x,-5,pt.z)),Vector((0,1,0)),20)
        if hit is not None:pt.y=hit.y-.028
        v.co=sclera.matrix_world.inverted()@pt
    irisob=bpy.data.objects['IrisOuter'+side];iriscenter=irisob.matrix_world.translation
    hit,n,idx,dist=face_bvh.ray_cast(Vector((iriscenter.x,-5,iriscenter.z)),Vector((0,1,0)),20)
    if hit is not None:bpy.data.objects['Gaze'+side].location.y+=(hit.y-.045-iriscenter.y)
    bpy.context.view_layer.update()
    bpy.data.objects['Gaze'+side].scale=(1.15,1,1.15/1.50);bpy.context.view_layer.update()
    # Every iris/pupil layer follows the new sclera curvature, with a minimum
    # forward gap. This prevents the upper sclera from clipping a flat iris.
    for feature,gap in [('IrisOuter',.018),('IrisInner',.024),('Pupil',.030),('Catchlight',.035)]:
        ob=bpy.data.objects[feature+side];cy=ob.matrix_world.translation.y
        for v in ob.data.vertices:
            pt=ob.matrix_world@v.co;thickness=max(-.003,min(.003,pt.y-cy))
            hit,n,idx,dist=face_bvh.ray_cast(Vector((pt.x,-5,pt.z)),Vector((0,1,0)),20)
            if hit is not None:pt.y=hit.y-.028-gap+thickness
            v.co=ob.matrix_world.inverted()@pt
    bpy.context.view_layer.update()
    for name in ['BlinkCover'+side,'WinkCrease'+side]:
        ob=bpy.data.objects[name]
        # The open lid is compressed, so evaluate its fully closed world geometry.
        lid=bpy.data.objects['Lid'+side];base=lid.scale.z;lid.scale.z=1;bpy.context.view_layer.update()
        for v in ob.data.vertices:
            pt=ob.matrix_world@v.co;hit,n,idx,dist=face_bvh.ray_cast(Vector((pt.x,-5,pt.z)),Vector((0,1,0)),20)
            if hit is not None:pt.y=hit.y-(.100 if name.startswith('BlinkCover') else .108)
            v.co=ob.matrix_world.inverted()@pt
        lid.scale.z=base;bpy.context.view_layer.update()

# Independent mouth cavity, lips, and tongue for expressive geometry actions.
mouthanchor=face_point(628,779,.022);mouthcenter=mouthanchor+Vector((0,0,-.11));mouth=empty('MouthOpen',mouthanchor,head);mouth['initially_hidden']=True
cavity=material('Mouth | dark cavity',(.022,.002,.004),.9);lips=material('Mouth | warm lip',(.46,.11,.065),.85,0,.08);tonguemat=material('Mouth | tongue',(.70,.14,.19),.8,0,.08)
sphere('MouthCavity',mouthcenter+Vector((0,-.012,0)),(.23,.032,.12),cavity,mouth,32,18)
ring=[]
for i in range(41):a=2*math.pi*i/40;ring.append(mouthcenter+Vector((.235*math.cos(a),-.04,.125*math.sin(a))))
tube('MouthLipRim',ring,[.014]*len(ring),lips,mouth,8,1)
tongue=sphere('Tongue',mouthcenter+Vector((-.045,-.082,-.135)),(.095,.028,.15),tonguemat,mouth,24,14);tongue.rotation_euler.y=-.25
teeth=empty('TeethUpper',mouthcenter,mouth);teethmat=material('Mouth | warm ivory teeth',(.86,.82,.69),.65,0,.10)
for i in range(8):
    u=(i-3.5)/3.5;x=u*.175;z=.055-.032*(abs(u)**1.5);y=-.053+.018*u*u
    tooth=cube('UpperTooth'+str(i+1),mouthcenter+Vector((x,y,z)),(.046,.025,.064),teethmat,.009,teeth)
    tooth.rotation_euler.y=-u*.12

# Independent solid props and anatomically proportioned hand assemblies.
a=apple(root);b1,b2=bread(root);ph=phone(root);hl,hr=hands(root)
for group in [a,b1,b2,ph,hl,hr]:group.location.y-=.40
bpy.context.view_layer.update()
# Seat the actual back/top-right toast corner against the original left mouth
# corner. Parenting to Head preserves this contact during subtle head motion.
corner=b1.matrix_world@Vector((.29,.06,.34));contact=face_point(552,779,.004);delta=contact-corner
b1.location+=delta;b2.location+=delta
parent_keep(b1,head);parent_keep(b2,head)

# Each sticker is a small curved paper solid following real face depth.
labelspec=[
 ('LabelCoder','CODER',612,421,138,43,-.13,(.65,.83,.025)),
 ('LabelMusician','MUSICIAN',778,426,170,43,.10,(1,.20,.12)),
 ('LabelVideo','VIDEO CREATOR',470,659,145,43,-.12,(1,.89,.62)),
 ('LabelChristian','CHRISTIAN',778,662,150,43,.12,(.05,.62,.74)),
 ('LabelDreamer','DREAMER',512,730,135,40,.09,(1,.24,.16)),
 ('LabelWork','WORK',744,732,100,40,-.13,(.65,.83,.025))]
labelink=material('Labels | charcoal ink',(.006,.006,.008),1,0,.05)
labelwhite=material('Labels | warm white border',(.93,.92,.87),1,0,.12)
fontpath='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font=bpy.data.fonts.load(fontpath) if Path(fontpath).exists() else None
outline=[(-.5,-.35),(-.41,-.5),(.34,-.5),(.5,-.28),(.5,.30),(.36,.5),(-.39,.5),(-.5,.32)]
for name,text,cx,cy,pw,hh,angle,papercolor in labelspec:
    anchor=face_point(cx,cy,.024);group=empty(name,anchor,head);group['text']=text;group['interaction']='focus_label';group['paper_thickness']=.006
    papermat=material('Labels | '+name,papercolor,.95,0,.15)
    center_depth=-anchor.y/S
    xp=face_point(cx+18,cy);xm=face_point(cx-18,cy);zp=face_point(cx,cy-18);zm=face_point(cx,cy+18)
    slope_x=max(-.75,min(.75,(xp.y-xm.y)/max(.001,xp.x-xm.x)))
    slope_z=max(-.75,min(.75,(zp.y-zm.y)/max(.001,zp.z-zm.z)))
    clearance=[0.0]
    def fitted_y(x,z):
        dx=x-anchor.x;dz=z-anchor.z
        return anchor.y+slope_x*dx+slope_z*dz+.35*dx*dx+.25*dz*dz-clearance[0]
    for uu in [-.58,-.25,0,.25,.58]:
        for vv in [-.58,0,.58]:
            dx=uu*pw;dy=vv*hh;px=cx+dx*math.cos(angle)-dy*math.sin(angle);py=cy+dx*math.sin(angle)+dy*math.cos(angle)
            pt=world(raw_point(px,py,center_depth));hit,n,idx,dist=face_bvh.ray_cast(Vector((pt.x,-5,pt.z)),Vector((0,1,0)),20)
            if hit is not None:clearance[0]=max(clearance[0],fitted_y(pt.x,pt.z)+clearance[0]-hit.y+.012)
    def sticker_point(px,py,offset):
        point=world(raw_point(px,py,center_depth));point.y=fitted_y(point.x,point.z)-offset;return point
    for border in [True,False]:
        scale=1.10 if border else 1.;offset=.022 if border else .029
        verts=[sticker_point(cx,cy,offset)];faces=[];perimeter=[]
        for k,p0 in enumerate(outline):
            p1=outline[(k+1)%len(outline)]
            for j in range(4):
                t=j/4;u=(p0[0]*(1-t)+p1[0]*t)*scale;v=(p0[1]*(1-t)+p1[1]*t)*scale
                dx=u*pw;dy=v*hh;px=cx+dx*math.cos(angle)-dy*math.sin(angle);py=cy+dx*math.sin(angle)+dy*math.cos(angle)
                perimeter.append(sticker_point(px,py,offset))
        verts+=perimeter
        for k in range(len(perimeter)):faces.append((0,k+1,(k+1)%len(perimeter)+1))
        paper=mesh(name+('Border' if border else 'Paper'),verts,faces,labelwhite if border else papermat,group)
        sol=paper.modifiers.new('Real paper thickness','SOLIDIFY');sol.thickness=.005;bpy.context.view_layer.objects.active=paper;bpy.ops.object.modifier_apply(modifier=sol.name)
    bpy.ops.object.text_add(location=anchor);tx=bpy.context.object;tx.name=name+'Text';tx.data.body=text;tx.data.align_x='CENTER';tx.data.align_y='CENTER';tx.data.size=.11;tx.data.extrude=.0008;tx.data.resolution_u=2
    if font:tx.data.font=font
    tx.rotation_euler=(math.pi/2,angle,0);tx.data.materials.append(labelink);bpy.context.view_layer.update()
    width=abs(world(raw_point(cx+pw/2,cy,.2)).x-world(raw_point(cx-pw/2,cy,.2)).x)*.85
    scale=width/max(.001,tx.dimensions.x);tx.scale=(scale,scale,scale)
    bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for v in tx.data.vertices:
        wp=tx.matrix_world@v.co;wp.y=fitted_y(wp.x,wp.z)-.040
        v.co=tx.matrix_world.inverted()@wp
    parent_keep(tx,group)

# Small jewelry is actual mesh, independent from source painted accents.
silver=material('Jewelry | matte silver',(.43,.47,.49),.35,.7)
cp=face_point(858,765,.035)
tube('CrossVertical',[cp+Vector((0,0,.06)),cp-Vector((0,0,.09))],[.009,.009],silver,head,8,1)
tube('CrossHorizontal',[cp+Vector((-.05,0,.02)),cp+Vector((.05,0,.02))],[.008,.008],silver,head,8,1)

# Write actual glTF-space interaction centers for the front-end camera contract.
contract=json.loads((SCRIPT_DIR/'rig-contract.json').read_text());contract['nodes'].pop('LabelVideoCreator',None);contract['nodes']['LabelVideo']='Curved physical VIDEO CREATOR sticker, child of Head'
contract['defaultCamera']={'position':[0,1.55,6.6],'target':[0,1.55,0],'fov':40}
contract['measuredAnchors']={}
for name in ['Head','Torso','EyeLeft','EyeRight','Apple','BreadWhole','BreadBitten','Phone','HandLeft','HandRight','MouthOpen']+[x[0] for x in labelspec]:
    ob=bpy.data.objects[name];p=ob.matrix_world.translation;contract['measuredAnchors'][name]=[round(p.x,5),round(p.z,5),round(-p.y,5)]
contract['nodes']['TeethUpper']='Independent warm ivory upper teeth arc, child of MouthOpen; silly/grin show, wow hide'
contract['nodes']['MouthOpen']='Independent cavity/lips group, child of Head; hidden for neutral'
contract['nodes']['Tongue']='Tongue mesh, child of MouthOpen; show for silly only'
contract['runtime']['breadParent']='Bread variants are Head children to preserve physical lip-corner contact.'
contract['morphTargets']={'Head':['Surprise','Grin']};contract['runtime']['initiallyHidden']=['BreadBitten','Flash','MouthOpen','LidLeft','LidRight'];contract['runtime']['openLids']='LidLeft/Right visible=false while blink amount<.01; absolute scale.y=.001+(1-.001)*amount when closing.'
(LAB/'rig-contract.json').write_text(json.dumps(contract,indent=2))
# Keep initially hidden actions out of QA neutral; export all nodes explicitly below.
for name in ['BreadBitten','Flash','MouthOpen','LidLeft','LidRight']:
    ob=bpy.data.objects[name];ob['initially_hidden']=True

# Store a compressed, self-contained editable source with a neutral render view.
for name in ['BreadBitten','Flash','MouthOpen','LidLeft','LidRight']:
    ob=bpy.data.objects[name];ob.hide_render=True
    for child in ob.children_recursive:child.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard'
preview_world=bpy.data.worlds.new('Avatar matte studio');scene.world=preview_world;preview_world.use_nodes=True
preview_world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,1,1);preview_world.node_tree.nodes['Background'].inputs[1].default_value=.65
for name,position,power,size in [('PreviewKey',(-3,-4,5),450,5),('PreviewFill',(3,-2,3),250,4)]:
    bpy.ops.object.light_add(type='AREA',location=position);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.size=size;light.rotation_euler=(Vector((0,0,1.6))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-6.7,1.55));camera=bpy.context.object;camera.name='PreviewCamera';camera.rotation_euler=(Vector((0,-.15,1.55))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens_unit='FOV';camera.data.angle=math.radians(38);scene.camera=camera
# The source portrait is already packed in the in-memory resized texture; remove
# its unused full-size datablock before storing the editable scene.
if source.users==0:bpy.data.images.remove(source)
bpy.ops.file.pack_all()
args.blend_out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(args.blend_out.resolve()),compress=True)
export_asset(args.output)
# Keep a local copy for inspection without requiring the public model to exist.
if args.output.resolve()!=(LAB/'avatar-v4.glb').resolve():
    import shutil
    shutil.copy2(args.output,LAB/'avatar-v4.glb')
