"""Repair only the person-facing phone plane in the genuine Meshy geometry.

Coordinates are the v7 intake frame: Blender +Z up, -Y visitor, 3.1 bust
height. The real shell, outside camera backplate, hand and contact geometry
are retained. Only original inward planar triangles get a local material;
independent glass and vector lock-screen nodes sit 0.002–0.004 in front.
"""
import bpy,math,json
from mathutils import Vector

PHONE={'inner_y':-.68854,'outer_y':-.79062,'center_x':.744,'center_z':1.648,
       'screen_width':.436,'screen_height':1.004,'screen_radius':.052}


def _material(name,color,roughness=.3,metallic=0,emission=0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
    p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if p is None:
        p=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');out=m.node_tree.nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(p.outputs['BSDF'],out.inputs['Surface'])
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metallic;p.inputs['Specular IOR Level'].default_value=.3
    p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m


def _mesh(name,vertices,faces,material,parent=None):
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(material)
    if parent:
        bpy.context.view_layer.update();world=ob.matrix_world.copy();ob.parent=parent;ob.matrix_world=world
    return ob


def _rounded(name,x,y,z,w,h,r,material,parent=None):
    # Vertices run clockwise in X/Z, so the visible normal points toward +Y.
    verts=[(x,y,z)];outline=[]
    for cx,cz,start in [(x+w/2-r,z+h/2-r,0),(x-w/2+r,z+h/2-r,90),(x-w/2+r,z-h/2+r,180),(x+w/2-r,z-h/2+r,270)]:
        for j in range(9):
            a=math.radians(start+j*90/8);outline.append((cx+r*math.cos(a),y,cz+r*math.sin(a)))
    verts+=outline;faces=[(0,1+(i+1)%len(outline),1+i) for i in range(len(outline))]
    return _mesh(name,verts,faces,material,parent)


def _text(name,text,x,y,z,size,material,parent):
    curve=bpy.data.curves.new(name,'FONT');curve.body=text;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';curve.resolution_u=4;curve.fill_mode='FRONT';curve.extrude=0
    ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);ob.location=(x,y,z);ob.rotation_euler=(math.pi/2,0,math.pi);ob.data.materials.append(material)
    bpy.context.view_layer.update();world=ob.matrix_world.copy();ob.parent=parent;ob.matrix_world=world
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
    return bpy.context.object


def _join(name,objects,parent):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name
    bpy.context.view_layer.update();world=ob.matrix_world.copy();ob.parent=parent;ob.matrix_world=world
    return ob


def repair_phone_screen(source_mesh,phone_parent=None,material_factory=None):
    """Return PhoneScreen/PhoneScreenContent without replacing the real phone.

    source_mesh may be the normalized complete Meshy working mesh or the real
    separated phone object. Its matrix_world must already be in the intake
    height-3.1 frame. Supply the real Phone node as phone_parent when available.
    """
    mat=material_factory or _material
    parent=phone_parent or source_mesh.parent
    x=PHONE['center_x'];z=PHONE['center_z'];y=PHONE['inner_y']
    glass=mat('V7 | person-facing phone glass',(.008,.017,.014),.22,0,.10)
    p=next(n for n in glass.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Coat Weight'].default_value=.16;p.inputs['Coat Roughness'].default_value=.23
    # Change only near-perfect inward flat phone triangles. Skin, shell side
    # bevels, outward cameras and every other atlas region remain untouched.
    source_mesh.data.materials.append(glass);slot=len(source_mesh.data.materials)-1
    normal_matrix=source_mesh.matrix_world.to_3x3().inverted().transposed()
    changed=0
    for face in source_mesh.data.polygons:
        q=source_mesh.matrix_world@face.center;n=(normal_matrix@face.normal).normalized()
        if .509<q.x<.979 and 1.128<q.z<2.167 and abs(q.y-y)<.0012 and n.y>.998:
            face.material_index=slot;changed+=1
    screen=_rounded('PhoneScreen',x,y+.0020,z,PHONE['screen_width'],PHONE['screen_height'],PHONE['screen_radius'],glass,parent)
    # The display is a physical opaque emissive surface, never a black fallback.
    # Subtle green gives clear differentiation from the retained outer backplate.
    displaymat=mat('V7 | sage lock-screen OLED',(.021,.044,.035),.34,0,.34)
    display=_rounded('PhoneDisplay',x,y+.0028,z,.418,.986,.047,displaymat,parent)
    ivory=mat('V7 | lock-screen warm ivory pixels',(.73,.80,.69),.5,0,.65)
    muted=mat('V7 | lock-screen sage pixels',(.12,.24,.18),.55,0,.40)
    black=mat('V7 | front camera island',(.003,.005,.004),.28)
    pieces=[display]
    # All text faces the character (+Y), including when viewed from behind.
    pieces.append(_text('PhoneClock','09:41',x,y+.0040,1.993,.106,ivory,parent))
    pieces.append(_text('PhoneClockSubtitle','MAKE SOMETHING',x,y+.0040,1.900,.020,ivory,parent))
    # Small music widget with vector waveform, not a notification or user data.
    pieces.append(_rounded('PhoneMusicPanel',x,y+.0034,1.525,.342,.110,.025,muted,parent))
    for j,height in enumerate([.014,.026,.041,.052,.034,.020,.044,.060,.037,.022,.030]):
        pieces.append(_rounded('PhoneWave'+str(j),x+(j-5)*.020,y+.0040,1.525,.006,height,.0029,ivory,parent))
    # Quiet geometric creative motif; no fake personal notifications.
    for j in range(3):
        pieces.append(_rounded('PhoneCreativeLine'+str(j),x-.075+j*.075,y+.0038,1.746+j*.035,.008,.12,.0038,muted,parent))
    pieces.append(_rounded('PhoneHomeIndicator',x,y+.0040,1.182,.128,.007,.0034,ivory,parent))
    content=_join('PhoneScreenContent',pieces,parent)
    camera=_rounded('PhoneFrontCameraIsland',x,y+.0043,2.108,.086,.019,.009,black,parent)
    # Tiny true front-camera optical dot, facing the character on the screen.
    lens=mat('V7 | front camera glass',(.008,.014,.018),.18,.15)
    _rounded('PhoneFrontCameraLens',x+.023,y+.0045,2.108,.008,.008,.0038,lens,parent)
    screen['v7_provenance']='Original Meshy shell/hand unchanged; duplicate person-facing camera-back texture corrected locally into physical glass screen'
    content['screen_content']='09:41 / MAKE SOMETHING / simple waveform; vector geometry, no notifications or user information'
    content['flash_response']='Temporarily brighten these independent emissive screen materials only'
    screen['inward_surface_y']=y;screen['local_source_triangles_reassigned']=changed
    print('PHONE_SCREEN_REPAIRED',changed,'source planar triangles; geometry retained; screen +Y',flush=True)
    return {'screen':screen,'content':content,'camera':camera,'source_faces_reassigned':changed,'measurement':dict(PHONE)}
