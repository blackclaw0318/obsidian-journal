"""Shared, data-preserving helpers for real Meshy asset intake."""
from pathlib import Path
import hashlib,json,math,re,struct

ROOT=Path(__file__).resolve().parents[2]
DESIGN=ROOT/'design/avatar-v5'
SCRIPT=Path(__file__).resolve().parent

def read_json(path):return json.loads(Path(path).read_text())
def resolve_input(value):
    path=Path(value).expanduser()
    return path.resolve() if path.is_absolute() else (ROOT/path).resolve()
def output_path(value):
    path=resolve_input(value)
    if not path.is_relative_to(DESIGN.resolve()):raise ValueError('v5 preparation writes only inside design/avatar-v5')
    path.parent.mkdir(parents=True,exist_ok=True)
    return path

def write_json(path,value):
    path=output_path(path);path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n');return path

def sha256(path):
    digest=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
    return digest.hexdigest()

def load_manifest(path,require_assets=True):
    manifest=read_json(resolve_input(path))
    if manifest.get('version')!=5:raise ValueError('Expected manifest version 5')
    assets=manifest.get('assets',[])
    if require_assets and not assets:raise ValueError('Awaiting actual Meshy download: assets is empty; no character will be generated')
    ids=set()
    for asset in assets:
        if asset['id'] in ids:raise ValueError('Duplicate asset id: '+asset['id'])
        ids.add(asset['id'])
        source=asset.get('source')
        if not source:raise ValueError('Missing actual source for '+asset['id'])
        source=resolve_input(source)
        if not source.is_file():raise FileNotFoundError(source)
        digest=asset.get('sha256')
        if not isinstance(digest,str) or not re.fullmatch(r'[0-9a-f]{64}',digest):raise ValueError('Record the actual lowercase SHA256 before importing: '+asset['id'])
        if sha256(source)!=digest:raise ValueError('Source SHA256 mismatch: '+asset['id'])
        if not asset.get('generation_id') or asset['generation_id']=='RECORD_FROM_DOWNLOAD_WHEN_AVAILABLE':raise ValueError('Record the actual Meshy generation ID: '+asset['id'])
        if not asset.get('download_provenance'):raise ValueError('Record normal Meshy download provenance: '+asset['id'])
        if asset.get('provider')!='Meshy':raise ValueError('Real v5 asset sources must be explicitly identified as Meshy; no v4 geometry fallback')
    return manifest

def load_glb(path):
    raw=Path(path).read_bytes()
    if len(raw)<20 or raw[:4]!=b'glTF':raise ValueError('Not a binary glTF file')
    magic,version,size=struct.unpack_from('<4sII',raw,0)
    if version!=2 or size!=len(raw):raise ValueError('Invalid GLB version or length')
    offset=12;chunks=[]
    while offset<len(raw):
        size,kind=struct.unpack_from('<II',raw,offset);offset+=8
        if offset+size>len(raw):raise ValueError('Truncated GLB chunk')
        chunks.append((kind,raw[offset:offset+size]));offset+=size
    doc=json.loads(next(data for kind,data in chunks if kind==0x4e4f534a));binary=next((data for kind,data in chunks if kind==0x004e4942),b'')
    return doc,binary,raw

def glb_inventory(path):
    doc,binary,raw=load_glb(path)
    triangles=0
    for mesh in doc.get('meshes',[]):
        for primitive in mesh.get('primitives',[]):
            if primitive.get('mode',4)==4:
                index=primitive.get('indices');count=doc['accessors'][index]['count'] if index is not None else doc['accessors'][primitive['attributes']['POSITION']]['count']
                triangles+=count//3
    images=[]
    for index,image in enumerate(doc.get('images',[])):
        view=doc.get('bufferViews',[])[image['bufferView']] if 'bufferView' in image else None
        images.append({'index':index,'name':image.get('name'),'mime':image.get('mimeType'),'uri':image.get('uri'),'embedded_bytes':view['byteLength'] if view else None})
    external_uris=[item['uri'] for category in ('images','buffers') for item in doc.get(category,[]) if item.get('uri') and not item['uri'].startswith('data:')]
    return {
      'source':str(Path(path).resolve()),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'asset':doc.get('asset'),
      'triangles':triangles,'nodes':len(doc.get('nodes',[])),'meshes':len(doc.get('meshes',[])),'materials':len(doc.get('materials',[])),
      'skins':len(doc.get('skins',[])),'animations':[a.get('name',str(i)) for i,a in enumerate(doc.get('animations',[]))],
      'node_names':[n.get('name',str(i)) for i,n in enumerate(doc.get('nodes',[]))],
      'morph_targets':[m.get('extras',{}).get('targetNames',[]) for m in doc.get('meshes',[]) if any(p.get('targets') for p in m.get('primitives',[]))],
      'images':images,'extensions_required':doc.get('extensionsRequired',[]),
      'external_resource_uris':external_uris,'standalone_glb':not external_uris,
      'budget_target_bytes':3500000,'budget_exceeded':len(raw)>3500000,
      'provenance_note':'Inventory of the provided bytes. Provider authenticity comes from recorded download provenance, not a guessed generator string.'
    }
