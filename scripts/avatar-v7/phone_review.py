"""Read-only phone measurements and real-source front/back close-up renders."""
import bpy,sys,json,math
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];LAB=ROOT/'.local/meshy-v7';OUT=LAB/'phone-analysis';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(LAB/'avatar-v7.source-review.blend'))
ob=bpy.data.objects['MeshyV7Working'];me=ob.data
repaired='--repaired' in sys.argv
if repaired:
    sys.path.insert(0,str(Path(__file__).parent))
    from phone import repair_phone_screen
    result=repair_phone_screen(ob,ob.parent)
positions=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',positions);positions=positions.reshape(-1,3);M=np.array(ob.matrix_world);p=positions@M[:3,:3].T+M[:3,3]
np.save(OUT/'source-positions-world.npy',p)
roi=(p[:,0]>.43)&(p[:,0]<1.08)&(p[:,2]>1.05)&(p[:,2]<2.25)
report={'coordinate_system':'Blender normalized, +Z up, -Y front/visitor, height3.1','phone_roi_bounds':{'min':p[roi].min(axis=0).tolist(),'max':p[roi].max(axis=0).tolist()},'y_slices':[]}
for xlo,xhi in [(.48,.58),(.60,.72),(.75,.87),(.90,1.0)]:
    for zlo,zhi in [(1.15,1.30),(1.40,1.60),(1.70,1.90),(1.98,2.12)]:
        q=p[(p[:,0]>xlo)&(p[:,0]<xhi)&(p[:,2]>zlo)&(p[:,2]<zhi)]
        report['y_slices'].append({'x':[xlo,xhi],'z':[zlo,zhi],'vertices':len(q),'y_quantiles':np.quantile(q[:,1],[0,.1,.25,.5,.75,.9,1]).tolist() if len(q) else []})
(OUT/'source-phone-measurement.json').write_text(json.dumps(report,indent=2))
print('PHONE_MEASUREMENT',json.dumps(report),flush=True)
scene=bpy.context.scene;scene.cycles.samples=16;scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.type='ORTHO';cam.data.ortho_scale=1.40;target=Vector((.75,-.42,1.67))
for label,pos in [('visitor',(1.20,-4.0,1.72)),('person',(1.40,3.0,1.72)),('person-flat',(.75,3.0,1.67)),('edge',(3.75,-.40,1.72))]:
    cam.location=pos;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/f'{"repaired" if repaired else "source"}-phone-{label}.png');bpy.ops.render.render(write_still=True)
if repaired:bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'phone-screen-review.blend'),compress=True)
print('PHONE_REVIEW_READY',flush=True)
