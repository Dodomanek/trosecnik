import * as THREE from 'three';

// Render-only upgrade. No positions, collision data, inventory or saves are modified.
export class NatureVisuals {
  constructor(renderer) {
    this.renderer=renderer;this.scene=renderer.scene;
    this.time={value:0};this.detailDistance={value:48};this.atlasReady={value:0};
    this.atlas=new THREE.TextureLoader().load('assets/textures/terrain-atlas.webp',()=>{this.atlasReady.value=1;},undefined,()=>console.info('Terrain atlas unavailable: procedural material retained.'));
    this.atlas.colorSpace=THREE.SRGBColorSpace;this.atlas.minFilter=THREE.LinearMipmapLinearFilter;
    this.atlas.anisotropy=Math.min(4,renderer.engine.capabilities.getMaxAnisotropy());
  }
  static smoothNormals(geometry) {
    if(geometry.userData.smoothed)return;
    const p=geometry.attributes.position,n=geometry.attributes.normal,groups=new Map();
    for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*10000)).join(',');let g=groups.get(key);if(!g){g={x:0,y:0,z:0,ids:[]};groups.set(key,g);}g.x+=n.getX(i);g.y+=n.getY(i);g.z+=n.getZ(i);g.ids.push(i);}
    for(const g of groups.values()){const length=Math.hypot(g.x,g.y,g.z)||1;for(const i of g.ids)n.setXYZ(i,g.x/length,g.y/length,g.z/length);}
    n.needsUpdate=true;geometry.userData.smoothed=true;
  }
  terrain(material) {
    material.map=null;material.vertexColors=false;material.color.set(0xffffff);
    material.onBeforeCompile=shader=>{
      shader.uniforms.terrainAtlas={value:this.atlas};shader.uniforms.atlasReady=this.atlasReady;
      shader.vertexShader='varying vec3 vNatureWorld; varying vec3 vNatureNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNatureWorld=(modelMatrix*vec4(position,1.0)).xyz;vNatureNormal=normalize(mat3(modelMatrix)*normal);');
      shader.fragmentShader=terrainFunctions+'\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',terrainColor);
    };
    material.customProgramCacheKey=()=> 'nature-terrain-v1';
  }
  surface(material,kind) {
    if(material.userData.nature)return;material.userData.nature=true;
    material.roughness=kind==='rock'?.94:.91;material.metalness=0;if(kind==='rock'&&!/moss/i.test(material.name))material.color.lerp(new THREE.Color(0x929a94),.3);
    material.onBeforeCompile=shader=>{
      shader.uniforms.terrainAtlas={value:this.atlas};shader.uniforms.atlasReady=this.atlasReady;
      shader.vertexShader='varying vec3 vNatureWorld; varying vec3 vNatureNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNatureWorld=(modelMatrix*vec4(position,1.0)).xyz;vNatureNormal=normalize(mat3(modelMatrix)*normal);');
      shader.fragmentShader=terrainFunctions+'\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',kind==='rock'?`
       vec3 stone=atlasTile((vNatureWorld.xz+vec2(vNatureWorld.y*.33))*.58,vec2(1.,0.));
       diffuseColor.rgb*=mix(vec3(1.),stone*2.3,atlasReady*.68);
      `:`
       float grain=natureNoise(vec2(vNatureWorld.x*21.+vNatureWorld.z*18.,vNatureWorld.y*.8));
       float ridges=natureNoise(vec2((vNatureWorld.x+vNatureWorld.z)*36.,vNatureWorld.y*.42));
       diffuseColor.rgb*=.88+.10*grain+.07*ridges;
      `);
    };
    material.customProgramCacheKey=()=> 'nature-surface-'+kind;
  }
  foliage(material) {
    material.roughness=.9;material.emissive=new THREE.Color(0x071305);material.emissiveIntensity=.18;
    material.onBeforeCompile=shader=>{shader.uniforms.natureTime=this.time;shader.vertexShader='uniform float natureTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(natureTime*1.3+position.y*1.5+position.z*.8)*.045;');};
    material.customProgramCacheKey=()=> 'nature-leaf-v1';
  }
  initGround(height,objects,trees) {
    const size=256,bytes=new Uint8Array(size*size*4);
    for(let z=0;z<size;z++)for(let x=0;x<size;x++){const h=height(x/(size-1)*170-85,z/(size-1)*170-85),i=(z*size+x)*4;bytes[i]=Math.round(Math.max(0,Math.min(1,(h+4)/12))*255);bytes[i+1]=bytes[i+2]=bytes[i];bytes[i+3]=255;}
    this.heightMap=new THREE.DataTexture(bytes,size,size);this.heightMap.minFilter=this.heightMap.magFilter=THREE.LinearFilter;this.heightMap.needsUpdate=true;

    const seed=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    const blocked=(x,z,r=2.4)=>objects.some(o=>Math.hypot(x-o.x,z-o.z)<r+(o.r||0));
    const positions=[];
    for(let i=0;i<3200;i++){
      let x=(seed(i*3.2)-.5)*122,z=(seed(i*6.1+7)-.5)*122;
      if(i<1800){x=(seed(i*3.2)-.5)*65;z=(seed(i*6.1+7)-.5)*62;}
      const y=height(x,z);if(y<.55||y>4.7||blocked(x,z)||Math.hypot(x+4,z+2)<4.8)continue;
      if(seed(i+500)<.35&&z<0)continue;
      positions.push({x,y,z,scale:.5+seed(i+77)*.75,angle:seed(i+88)*6.28});
    }
    const vertices=[],colors=[];
    const add=(a,b,c,color)=>{vertices.push(...a,...b,...c);for(let k=0;k<3;k++)colors.push(...color);};
    for(let j=0;j<7;j++){
      const a=j*2.4,l=.28+seed(j+23)*.24,w=.025+seed(j)*.023,dx=Math.cos(a),dz=Math.sin(a),px=-dz*w,pz=dx*w;
      const root=[dx*.055,0,dz*.055],mid=[dx*l*.28,l*.65,dz*l*.28],tip=[dx*l*.75,l,dz*l*.75];
      add([root[0]-px,0,root[2]-pz],[root[0]+px,0,root[2]+pz],[mid[0]+px*.65,mid[1],mid[2]+pz*.65],[.12,.23,.035]);
      add([root[0]-px,0,root[2]-pz],[mid[0]+px*.65,mid[1],mid[2]+pz*.65],[mid[0]-px*.65,mid[1],mid[2]-pz*.65],[.18,.32,.05]);
      add([mid[0]-px*.65,mid[1],mid[2]-pz*.65],[mid[0]+px*.65,mid[1],mid[2]+pz*.65],tip,[.33,.43,.10]);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.uniforms.natureTime=this.time;shader.uniforms.detailDistance=this.detailDistance;
      shader.vertexShader='uniform float natureTime;varying vec3 vGrassWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 anchor=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
      transformed.x+=sin(natureTime*1.35+anchor.x*.6+anchor.z*.3)*position.y*position.y*.13;
      vGrassWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;`);
      shader.fragmentShader='uniform float detailDistance;varying vec3 vGrassWorld;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(distance(cameraPosition,vGrassWorld)>detailDistance)discard;`);
    };
    this.grass=new THREE.InstancedMesh(geometry,material,positions.length);const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0);
    positions.forEach((p,i)=>{q.setFromAxisAngle(axis,p.angle);matrix.compose(new THREE.Vector3(p.x,p.y-.03,p.z),q,new THREE.Vector3(p.scale,p.scale,p.scale));this.grass.setMatrixAt(i,matrix);});
    this.grass.receiveShadow=true;this.grass.castShadow=false;this.scene.add(this.grass);
    this.addCampDetails(height);
    this.addCoast(height);
  }
  addCoast(height) {
    // Follow the actual existing coastline; this is a flat visual foam ribbon only.
    const p=[],c=[];
    for(let i=0;i<360;i++){
      const a=i*Math.PI/180,b=(i+1)*Math.PI/180;
      const radius=angle=>{let low=30,high=112;for(let k=0;k<12;k++){const mid=(low+high)/2;if(height(Math.cos(angle)*mid,Math.sin(angle)*mid)>-.60)low=mid;else high=mid;}return (low+high)/2;};
      const r=radius(a),r2=radius(b);const pts=[[Math.cos(a)*r,-.585,Math.sin(a)*r],[Math.cos(b)*r2,-.585,Math.sin(b)*r2],[Math.cos(b)*(r2+.7),-.585,Math.sin(b)*(r2+.7)],[Math.cos(a)*(r+.7),-.585,Math.sin(a)*(r+.7)]];
      for(const j of [0,1,2,0,2,3]){p.push(...pts[j]);c.push(.78,.9,.82);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geo.computeVertexNormals();
    this.foam=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}));this.scene.add(this.foam);
  }
  addCampDetails(height) {
    this.campGroups={};
    const wood=new THREE.MeshStandardMaterial({color:0x765438,roughness:.94});this.surface(wood,'wood');
    const cord=new THREE.MeshStandardMaterial({color:0xa58b55,roughness:1});
    const leaf=new THREE.MeshStandardMaterial({color:0x536538,roughness:.96,side:THREE.DoubleSide});
    const groupAt=(id,x,z)=>{const g=new THREE.Group();g.position.set(x,height(x,z),z);this.scene.add(g);this.campGroups[id]=g;return g;};
    const box=(g,x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
    const shelter=groupAt('shelter',-7,-1.4);
    for(let i=0;i<9;i++){const strip=box(shelter,(i-4)*.27,2.39,0,.29,.06,2.15,leaf);strip.rotation.z=.02*Math.sin(i);strip.position.y=2.56;}
    for(let i=0;i<10;i++)box(shelter,(i-4.5)*.21,.13,0,.19,.07,1.8,wood);
    for(const x of [-.95,.95])for(const z of [-.75,.75]){const m=new THREE.Mesh(new THREE.TorusGeometry(.078,.019,4,9),cord);m.position.set(x,1.85,z);m.rotation.x=Math.PI/2;shelter.add(m);}
    const bench=groupAt('workbench',-11,-3.5);for(let i=0;i<5;i++)box(bench,(i-2)*.3,1.47,0,.27,.06,.84,wood);
    box(bench,0,.42,0,1.5,.09,.12,wood);box(bench,-.5,1.55,.1,.18,.1,.32,cord);
    const rack=groupAt('dryingRack',-10,2);for(let i=0;i<6;i++)box(rack,0,1.47,(i-2.5)*.16,1.7,.045,.025,cord);
    for(const x of [-.7,.7])box(rack,x,.8,0,.07,1.55,.65,wood);
    const collector=groupAt('rainCollector',-1,5);for(let i=0;i<12;i++){const a=i*Math.PI/6;const slat=box(collector,Math.cos(a)*.34,.32,Math.sin(a)*.34,.07,.58,.12,wood);slat.rotation.y=-a;}
    for(const y of [.13,.50]){const m=new THREE.Mesh(new THREE.TorusGeometry(.35,.027,5,18),cord);m.rotation.x=Math.PI/2;m.position.y=y;collector.add(m);}
  }
  drawFlame(x,y,z,time) {
    if(!this.flame){
      this.flame=new THREE.Group();
      const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:this.time},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;varying vec2 vUv;void main(){float y=clamp(vUv.y,0.,1.);float sway=sin(y*14.-time*6.)*.045+sin(y*23.+time*4.)*.022;float width=(1.-y)*.34*(.83+sin(time*9.+y*18.)*.13);float a=1.-smoothstep(width-.08,width,abs(vUv.x-.5+sway));a*=smoothstep(0.,.12,y)*(1.-smoothstep(.68,1.,y));vec3 col=mix(vec3(1.,.16,.015),vec3(1.,.75,.16),pow(max(0.,1.-y),1.4));gl_FragColor=vec4(col,a*.78);}`});
      for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.78,1.2),material);m.rotation.y=i*Math.PI/3;m.position.y=.68;this.flame.add(m);}
      this.scene.add(this.flame);
    }
    this.flame.visible=true;this.flame.position.set(x,y,z);this.flame.scale.y=.9+Math.sin(time*7.)*.08;
  }
  update({time,quality,built}) {
    this.time.value=time;if(this.flame)this.flame.visible=false;this.detailDistance.value=quality==='low'?24:quality==='high'?58:42;
    if(this.grass)this.grass.count=quality==='low'?Math.floor(this.grass.instanceMatrix.count*.45):this.grass.instanceMatrix.count;
    if(this.foam)this.foam.material.opacity=.23+Math.sin(time*.8)*.055;
    for(const [id,g] of Object.entries(this.campGroups||{}))g.visible=built?.[id]===3;
  }
}
const terrainFunctions=`
uniform sampler2D terrainAtlas;uniform float atlasReady;
varying vec3 vNatureWorld;varying vec3 vNatureNormal;
float natureHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float natureNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(natureHash(i),natureHash(i+vec2(1.,0.)),f.x),mix(natureHash(i+vec2(0.,1.)),natureHash(i+1.),f.x),f.y);}
vec3 atlasTile(vec2 p,vec2 quadrant){vec2 uv=abs(fract(p*.5)*2.-1.);return texture2D(terrainAtlas,(quadrant+vec2(.004)+uv*.992)*.5).rgb;}
`;
const terrainColor=`
vec2 p=vNatureWorld.xz;float h=vNatureWorld.y;
float broad=natureNoise(p*.11),fine=natureNoise(p*.65);
float sandy=1.-smoothstep(.30,1.3,h+(broad-.5)*.5);
float camp=1.-smoothstep(3.5,7.,length(p-vec2(-4.,-2.)));
float pathOffset=(p.x+4.+sin(p.y*.18)*2.)/1.8;
float path=exp(-pathOffset*pathOffset)*smoothstep(-18.,-8.,p.y)*(1.-smoothstep(5.,20.,p.y));
float grassWeight=(1.-sandy)*smoothstep(.19,.65,broad+fine*.19)*(1.-camp*.92)*(1.-path*.84);
float stoneWeight=smoothstep(.18,.43,1.-abs(normalize(vNatureNormal).y))*.85;
stoneWeight=max(stoneWeight,smoothstep(3.5,5.5,h)*.52);
vec3 sand=mix(vec3(.66,.56,.38),atlasTile(p*.24,vec2(0.,1.))*.93,atlasReady);
vec3 soil=mix(vec3(.16,.105,.055),atlasTile(p*.32,vec2(1.,1.))*1.35,atlasReady);
vec3 grass=mix(vec3(.15,.24,.065),atlasTile(p*.32,vec2(0.,0.))*1.1,atlasReady);
vec3 stone=mix(vec3(.31,.33,.30),atlasTile(p*.26,vec2(1.,0.))*.95,atlasReady);
vec3 earth=mix(soil,sand,max(sandy,camp*.35));
earth=mix(earth,grass,grassWeight);earth=mix(earth,stone,stoneWeight);
float wet=1.-smoothstep(-.5,.12,h);earth*=1.-wet*.28;
diffuseColor.rgb*=earth*(.90+broad*.19);
`;
