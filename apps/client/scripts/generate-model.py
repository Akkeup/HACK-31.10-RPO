"""Generate the small, original offline GLB explorer. No downloaded assets."""
import json, struct
from pathlib import Path
faces = [((1,0,0),[(.5,-.5,-.5),(.5,.5,-.5),(.5,.5,.5),(.5,-.5,.5)]),((-1,0,0),[(-.5,-.5,.5),(-.5,.5,.5),(-.5,.5,-.5),(-.5,-.5,-.5)]),((0,1,0),[(-.5,.5,-.5),(-.5,.5,.5),(.5,.5,.5),(.5,.5,-.5)]),((0,-1,0),[(-.5,-.5,.5),(-.5,-.5,-.5),(.5,-.5,-.5),(.5,-.5,.5)]),((0,0,1),[(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]),((0,0,-1),[(.5,-.5,-.5),(-.5,-.5,-.5),(-.5,.5,-.5),(.5,.5,-.5)])]
positions=[];normals=[]
for normal, vertices in faces:
 for index in [0,1,2,0,2,3]:
  positions.extend(vertices[index]);normals.extend(normal)
binary=struct.pack('<'+ 'f'*(len(positions)+len(normals)),*(positions+normals))
colors=[[.62,.36,.22,1],[.87,.67,.47,1],[.25,.31,.26,1],[.73,.62,.4,1]]
parts=[('coat',[0,1.15,0],[.72,.85,.46],0),('head',[0,1.91,0],[.48,.48,.48],1),('hat',[0,2.19,0],[.72,.12,.65],0),('left_leg',[-.2,.44,0],[.25,.7,.28],2),('right_leg',[.2,.44,0],[.25,.7,.28],2),('left_arm',[-.47,1.15,0],[.18,.72,.23],0),('right_arm',[.47,1.15,0],[.18,.72,.23],0),('backpack',[0,1.18,.35],[.45,.52,.22],3)]
gltf={'asset':{'version':'2.0','generator':'Discovery original procedural explorer'},'scene':0,'scenes':[{'nodes':list(range(len(parts)))}], 'nodes':[{'name':n,'translation':p,'scale':s,'mesh':m} for n,p,s,m in parts], 'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'material':i}]} for i in range(4)],'materials':[{'pbrMetallicRoughness':{'baseColorFactor':c,'metallicFactor':0,'roughnessFactor':.85}} for c in colors],'buffers':[{'byteLength':len(binary)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(positions)*4,'target':34962},{'buffer':0,'byteOffset':len(positions)*4,'byteLength':len(normals)*4,'target':34962}],'accessors':[{'bufferView':0,'componentType':5126,'count':36,'type':'VEC3','min':[-.5,-.5,-.5],'max':[.5,.5,.5]},{'bufferView':1,'componentType':5126,'count':36,'type':'VEC3'}]}
data=json.dumps(gltf,separators=(',',':')).encode();data+=b' '*((-len(data))%4)
output=struct.pack('<III',0x46546c67,2,12+8+len(data)+8+len(binary))+struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(binary),0x004e4942)+binary
Path(__file__).resolve().parents[3].joinpath('assets/models/explorer.glb').write_bytes(output)
