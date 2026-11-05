"""Independent solid props, articulated hand surfaces, and paper labels for v4.
All object coordinates use Blender X horizontal, -Y front, +Z up.
"""
import bpy,math,random
from mathutils import Vector
random.seed(42)

def parent_keep(ob,parent):
    bpy.context.view_layer.update();world=ob.matrix_world.copy();ob.parent=parent;ob.matrix_world=world
    return ob

def empty(name,location=(0,0,0),parent=None):
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);ob.location=location
    return parent_keep(ob,parent) if parent else ob

def material(name,color,roughness=.8,metal=0,emission=0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metal
    p.inputs['Specular IOR Level'].default_value=.18 if metal==0 else .5
    p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m

def smooth(ob):
    for f in ob.data.polygons:f.use_smooth=True
    return ob

def mesh(name,verts,faces,mat,parent=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(mat)
    smooth(ob)
    if parent:parent_keep(ob,parent)
    return ob

def sphere(name,position,scale,mat,parent=None,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=position);ob=bpy.context.object;ob.name=name;ob.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(mat);smooth(ob)
    if parent:parent_keep(ob,parent)
    return ob

def cube(name,position,scale,mat,bevel=.025,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position);ob=bpy.context.object;ob.name=name;ob.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(mat)
    if bevel:
        mod=ob.modifiers.new('Soft machined edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    smooth(ob)
    if parent:parent_keep(ob,parent)
    return ob

def tube(name,points,radii,mat,parent=None,sides=10,steps=6):
    # Cubic Catmull-Rom interpolation with taper and elliptical cross sections.
    pts=[Vector(p) for p in points];positions=[];rs=[]
    for i in range(len(pts)-1):
        p0=pts[max(0,i-1)];p1=pts[i];p2=pts[i+1];p3=pts[min(len(pts)-1,i+2)]
        for k in range(steps):
            t=k/steps;positions.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t));rs.append(radii[i]*(1-t)+radii[i+1]*t)
    positions.append(pts[-1]);rs.append(radii[-1]);verts=[];faces=[]
    for i,p in enumerate(positions):
        tangent=(positions[min(i+1,len(positions)-1)]-positions[max(i-1,0)]).normalized();a=tangent.cross(Vector((0,1,0)))
        if a.length<.001:a=tangent.cross(Vector((1,0,0)))
        a.normalize();b=tangent.cross(a).normalized()
        for j in range(sides):
            ang=2*math.pi*j/sides;verts.append(p+rs[i]*(math.cos(ang)*a+math.sin(ang)*b))
    for i in range(len(positions)-1):
        for j in range(sides):k=i*sides+j;faces.append((k,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,k+sides))
    faces.append(tuple(range(sides-1,-1,-1)));faces.append(tuple((len(positions)-1)*sides+j for j in range(sides)))
    return mesh(name,verts,faces,mat,parent)

def apple(root,position=(-.95,-.37,.94)):
    parent=empty('Apple',position,root);red=material('Apple | lacquer red',(.47,.012,.019),.25,0,.07);stem=material('Apple | natural stem',(.075,.032,.012),.9);leafmat=material('Apple | leaf',(.025,.15,.035),.8)
    verts=[];faces=[];N=40;M=25
    for i in range(M+1):
        theta=math.pi*i/M
        for j in range(N):
            phi=2*math.pi*j/N;lobes=1+.035*math.cos(5*phi)*math.sin(theta)**1.3;r=.27*math.sin(theta)*lobes
            z=.285*math.cos(theta)-.047*math.exp(-(theta/.32)**2)+.018*math.exp(-((theta-math.pi)/.25)**2)
            verts.append((position[0]+r*math.cos(phi),position[1]+r*math.sin(phi),position[2]+z))
    for i in range(M):
        for j in range(N):a=i*N+j;b=i*N+(j+1)%N;faces.append((a,b,b+N,a+N))
    body=mesh('AppleBody',verts,faces,red,parent)
    # A varied red vertex field gives real side shading instead of a front decal.
    c=body.data.color_attributes.new(name='AppleSkin',type='BYTE_COLOR',domain='CORNER')
    for loop in body.data.loops:
        p=body.data.vertices[loop.vertex_index].co-Vector(position);h=.82+.18*(.5+.5*math.sin(p.x*34+p.z*18));c.data[loop.index].color=(h,.62+.35*h,.6+.4*h,1)
    tube('AppleStem',[(position[0],position[1],position[2]+.23),(position[0]-.025,position[1],position[2]+.33),(position[0]-.07,position[1]+.015,position[2]+.39)],[.017,.014,.009],stem,parent,8,4)
    leaf=mesh('AppleLeaf',[(position[0]-.025,position[1],position[2]+.30),(position[0]+.055,position[1]-.025,position[2]+.40),(position[0]+.16,position[1]-.005,position[2]+.37),(position[0]+.07,position[1]+.025,position[2]+.32)],[(0,1,2,3)],leafmat,parent)
    sol=leaf.modifiers.new('Leaf thickness','SOLIDIFY');sol.thickness=.006;bpy.context.view_layer.objects.active=leaf;bpy.ops.object.modifier_apply(modifier=sol.name)
    parent['action']='toss_catch';parent['toss_height']=.65;parent['toss_duration']=.8
    return parent

def bread(root,position=(-.27,-.48,.97)):
    crust=material('Toast | caramel crust',(.42,.17,.035),.88,0,.12);crumb=material('Toast | warm crumb',(.68,.48,.24),1,0,.08);dotmat=material('Toast | pores',(.48,.29,.10),1)
    # Slice outline in XZ: rounded square lower half, rounded crown upper half.
    outline=[(-.25,-.28),(.25,-.28),(.28,-.25),(.28,.12),(.34,.20),(.34,.28),(.29,.34),(.17,.38),(-.17,.38),(-.29,.34),(-.34,.28),(-.34,.20),(-.28,.12),(-.28,-.25)]
    def solid(name,scale,depth,mat,parent):
        xy=[(x*scale,z*scale) for x,z in outline];verts=[(position[0]+x,position[1]+y,position[2]+z) for y in [-depth/2,depth/2] for x,z in xy];N=len(xy);faces=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]
        for i in range(N):faces.append((i,(i+1)%N,(i+1)%N+N,i+N))
        ob=mesh(name,verts,faces,mat,parent);be=ob.modifiers.new('Soft bread edge','BEVEL');be.width=.012;be.segments=2;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=be.name);return ob
    def cut_bite(ob):
        # Three overlapping spherical tooth arcs remove actual volume from both crust and crumb.
        for i,(x,z,r) in enumerate([(.21,.30,.13),(.30,.21,.12),(.12,.36,.10)]):
            cutter=sphere('Temporary bite cutter',(position[0]+x,position[1]-.025,position[2]+z),(r,.20,r),crumb,None,20,12)
            mod=ob.modifiers.new('Actual scalloped bite','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    for bitten in [False,True]:
        name='BreadBitten' if bitten else 'BreadWhole';group=empty(name,position,root);outer=solid(name+'Crust',1,.12,crust,group);inner=solid(name+'Crumb',.90,.127,crumb,group)
        if bitten:
            cut_bite(outer);cut_bite(inner);group['initially_hidden']=True
        # Actual tiny dimples across the front surface; no static image applied.
        for i in range(18):
            x=random.uniform(-.2,.2);z=random.uniform(-.2,.26)
            if bitten and (x>.10 and z>.12):continue
            sphere(name+'Pore'+str(i),(position[0]+x,position[1]-.065,position[2]+z),(.007,.0015,.004),dotmat,group,8,6)
        group.rotation_euler.y=-.20;group.rotation_euler.z=-.12;group.scale=(.82,.82,.82)
    return bpy.data.objects['BreadWhole'],bpy.data.objects['BreadBitten']

def phone(root,position=(.93,-.21,1.27)):
    group=empty('Phone',position,root);case=material('Phone | graphite ceramic',(.036,.045,.052),.30,.35);edge=material('Phone | brushed aluminum',(.10,.12,.13),.35,.75);black=material('Phone | black glass',(.006,.009,.014),.12,.10);lens=material('Phone | camera glass',(.008,.023,.04),.13,.3);silver=material('Phone | lens trim',(.17,.19,.20),.27,.75);flashmat=material('Phone | flash emitter',(1,.93,.72),.3,0,5)
    cube('PhoneFrame',position,(.45,.085,.84),edge,.045,group);cube('PhoneBack',(position[0],position[1]-.047,position[2]),(.423,.018,.81),case,.035,group);cube('PhoneScreen',(position[0],position[1]+.047,position[2]),(.418,.012,.79),black,.029,group)
    cube('CameraIsland',(position[0]-.105,position[1]-.067,position[2]+.267),(.20,.025,.235),case,.035,group)
    for i,(x,z) in enumerate([(-.14,.315),(-.14,.205),(-.04,.258)]):
        sphere('CameraRim'+str(i),(position[0]+x,position[1]-.088,position[2]+z),(.045,.014,.045),silver,group,24,12);sphere('CameraLens'+str(i),(position[0]+x,position[1]-.102,position[2]+z),(.034,.006,.034),lens,group,20,10);sphere('CameraGlint'+str(i),(position[0]+x-.009,position[1]-.108,position[2]+z+.012),(.009,.001,.006),silver,group,12,8)
    flash=sphere('Flash',(position[0]-.041,position[1]-.101,position[2]+.333),(.022,.006,.022),flashmat,group,20,10);flash['initially_hidden']=True
    materialflash=material('Phone | flash bezel',(.72,.70,.60),.6)
    sphere('FlashBezel',(position[0]-.041,position[1]-.098,position[2]+.333),(.026,.005,.026),materialflash,group,20,10)
    cube('PhoneVolume',(position[0]-.23,position[1],position[2]+.10),(.012,.045,.12),edge,.005,group);cube('PhonePower',(position[0]+.23,position[1],position[2]+.10),(.012,.045,.095),edge,.005,group)
    group.rotation_euler.y=-.06;group.rotation_euler.z=.07
    return group

def hands(root):
    skin=material('Hands | warm matte skin',(.50,.28,.18),.9,0,.10);nails=material('Hands | natural nails',(.62,.37,.23),.75,0,.08);crease=material('Hands | subtle joint creases',(.38,.17,.10),1)
    # Each hand is a wrist-pivot group with rounded palm and individually tapered,
    # smoothly bent fingers. There are no full arms or oversized shoulder spheres.
    L=empty('HandLeft',(-1.0,-.03,.36),root)
    sphere('PalmLeft',(-1.13,-.16,.62),(.15,.087,.23),skin,L,24,16)
    tube('WristLeft',[(-1.0,.015,.22),(-1.09,-.02,.43),(-1.13,-.13,.63)],[.10,.112,.13],skin,L,14,7)
    lf=[
      ('Thumb',[(-1.04,-.18,.59),(-.92,-.43,.62),(-.73,-.51,.69)],[.069,.058,.043]),
      ('Index',[(-1.15,-.16,.79),(-1.24,-.47,.98),(-1.17,-.64,1.08),(-.90,-.69,1.12)],[.054,.050,.044,.035]),
      ('Middle',[(-1.17,-.14,.72),(-1.27,-.46,.89),(-1.20,-.66,.98),(-.86,-.68,1.02)],[.056,.051,.044,.036]),
      ('Ring',[(-1.17,-.12,.65),(-1.30,-.30,.77),(-1.25,-.52,.87),(-1.12,-.62,.93)],[.049,.045,.038,.032]),
      ('Little',[(-1.15,-.08,.60),(-1.32,-.20,.69),(-1.32,-.43,.78)],[.042,.035,.028])]
    R=empty('HandRight',(1.02,.04,.34),root)
    sphere('PalmRight',(1.12,-.11,.70),(.16,.09,.25),skin,R,24,16);tube('WristRight',[(1.01,.05,.21),(1.08,-.005,.44),(1.13,-.11,.71)],[.105,.115,.13],skin,R,14,7)
    rf=[
      ('Thumb',[(1.08,-.15,.72),(.90,-.39,.80),(.72,-.44,.86)],[.070,.058,.043]),
      ('Index',[(1.12,-.12,.92),(.99,-.38,1.34),(.75,-.37,1.49)],[.053,.045,.034]),
      ('Middle',[(1.20,-.10,.89),(1.09,-.43,1.15),(.81,-.45,1.23)],[.055,.045,.035]),
      ('Ring',[(1.24,-.08,.79),(1.22,-.43,.98),(.96,-.45,1.06)],[.05,.043,.034]),
      ('Little',[(1.25,-.045,.69),(1.33,-.32,.81),(1.16,-.42,.88)],[.041,.035,.028])]
    for side,group,fs in [('Left',L,lf),('Right',R,rf)]:
        for finger,pts,radii in fs:
            tube(finger+side,pts,radii,skin,group,12,8)
            sphere('Tip'+finger+side,pts[-1],(radii[-1],radii[-1],radii[-1]),skin,group,10,7)
            tip=Vector(pts[-1]);prev=Vector(pts[-2]);nail=sphere('Nail'+finger+side,tip+Vector((0,-radii[-1]*.88,.004)),(radii[-1]*.66,.005,radii[-1]*.85),nails,group,12,8)
            # Nail direction follows the last phalanx in the visible X/Z plane.
            d=tip-prev;nail.rotation_euler.y=math.atan2(d.x,max(.001,d.z))
    for side,group in [('Left',L),('Right',R)]:
        skinparts=[o for o in group.children_recursive if o.type=='MESH' and o.data.materials and o.data.materials[0]==skin]
        bpy.ops.object.select_all(action='DESELECT')
        for o in skinparts:o.select_set(True)
        bpy.context.view_layer.objects.active=skinparts[0];bpy.ops.object.join();joined=bpy.context.object;joined.name='Hand'+side+'Skin'
        mod=joined.modifiers.new('Connected skin volumes','REMESH');mod.mode='VOXEL';mod.voxel_size=.012;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
        sm=joined.modifiers.new('Natural skin transitions','SMOOTH');sm.factor=.35;sm.iterations=2;bpy.ops.object.modifier_apply(modifier=sm.name)
        de=joined.modifiers.new('Hand web budget','DECIMATE');de.ratio=.12;bpy.ops.object.modifier_apply(modifier=de.name);smooth(joined)
    return L,R
