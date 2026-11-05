"""Read-only inventory of an actual incoming model or its download archive."""
import argparse,json,sys,zipfile
from pathlib import Path
sys.dont_write_bytecode=True
from common import glb_inventory,sha256,output_path,resolve_input
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path)
parser.add_argument('--report',type=Path)
args=parser.parse_args();path=resolve_input(args.source)
if path.suffix.lower()=='.glb':report=glb_inventory(path)
elif zipfile.is_zipfile(path):
    with zipfile.ZipFile(path) as archive:
        report={'source':str(path),'sha256':sha256(path),'archive_entries':[{'path':i.filename,'bytes':i.file_size} for i in archive.infolist()],'note':'Inventory only; no archive contents extracted or executed.'}
else:report={'source':str(path),'sha256':sha256(path),'bytes':path.stat().st_size,'format':path.suffix,'note':'Use Blender prepare.py for geometry, material and animation inventory.'}
text=json.dumps(report,indent=2,ensure_ascii=False)
if args.report:output_path(args.report).write_text(text+'\n')
else:print(text)
