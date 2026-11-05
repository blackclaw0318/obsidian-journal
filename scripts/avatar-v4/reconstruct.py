"""Official MIT TripoSR inference with an Apple-MPS / CPU marching-cubes adapter.

No weights or model cache are shipped in this repository. --model-lab points to
an existing official TripoSR checkout, config.yaml, model.ckpt, dino-config.json.
Only the isolated clean head/bust plate is reconstructed; props are built apart.
"""
import os,sys,types,time,argparse
from pathlib import Path
os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK','1')
os.environ.setdefault('TOKENIZERS_PARALLELISM','false')
ROOT=Path(__file__).resolve().parent.parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--model-lab',type=Path,required=True)
parser.add_argument('--source',type=Path,default=ROOT/'public/images/avatar-v4/head-clean.png')
parser.add_argument('--work-dir',type=Path,default=ROOT/'.local/model-lab-v4')
parser.add_argument('--resolution',type=int,default=256)
parser.add_argument('--threshold',type=float,default=10)
parser.add_argument('--device',default='mps')
parser.add_argument('--reuse',action='store_true')
args=parser.parse_args();LAB=args.work_dir.resolve();LAB.mkdir(parents=True,exist_ok=True);MODEL=args.model_lab.resolve()
import numpy as np
import torch
from PIL import Image
from skimage.measure import marching_cubes
sys.path.insert(0,str(MODEL/'TripoSR'))
sys.modules['rembg']=types.ModuleType('rembg')
adapter=types.ModuleType('torchmcubes')
def cpu_mc(level,threshold):
    verts,faces,_,_=marching_cubes(level.detach().cpu().numpy(),level=threshold)
    return torch.from_numpy(verts[:,[2,1,0]].copy()),torch.from_numpy(faces.astype(np.int64).copy())
adapter.marching_cubes=cpu_mc;sys.modules['torchmcubes']=adapter
from tsr.system import TSR
from tsr.utils import resize_foreground
import tsr.models.tokenizers.image as tokenizer
tokenizer.hf_hub_download=lambda **kwargs:str(MODEL/'dino-config.json')
device=args.device
if device=='mps' and not torch.backends.mps.is_available():device='cpu'
torch.set_num_threads(8)
print('Loading official TripoSR on',device,flush=True)
model=TSR.from_pretrained(str(MODEL),'config.yaml','model.ckpt');model.eval().to(device);model.renderer.set_chunk_size(16384)
cache=LAB/'v4-scene-code.pt'
if args.reuse and cache.exists():codes=torch.load(cache,map_location=device)
else:
    image=resize_foreground(Image.open(args.source).convert('RGBA'),.85)
    data=np.asarray(image).astype(np.float32)/255;rgb=data[:,:,:3]*data[:,:,3:4]+.5*(1-data[:,:,3:4]);image=Image.fromarray((rgb*255).astype('uint8'))
    image.save(LAB/'v4-prepared.png')
    with torch.inference_mode():codes=model([image],device=device)
    torch.save(codes.cpu(),cache)
with torch.inference_mode():mesh=model.extract_mesh(codes,has_vertex_color=True,resolution=args.resolution,threshold=args.threshold)[0]
if mesh.volume<0:mesh.invert()
path=LAB/f'reconstruction-v4-{args.resolution}-t{args.threshold:g}.ply';mesh.export(path)
print('Reconstruction complete:',path,len(mesh.vertices),'vertices,',len(mesh.faces),'triangles',flush=True)
