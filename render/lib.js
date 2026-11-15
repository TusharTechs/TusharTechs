// Shared 3D building blocks for the profile renders.
// Every animated thing is a pure function of the loop phase t in [0, 1),
// so frame N and frame 0 line up and the WebP loops seamlessly.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };
const TAU = Math.PI * 2;
const loader = new THREE.TextureLoader();

export function loadTex(url, srgb = true) {
  return new Promise((res, rej) => loader.load(url, (t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    res(t);
  }, undefined, rej));
}

export function makeRenderer(canvas, w, h, dpr) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(dpr);
  r.setSize(w, h, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

// ------------------------------------------------------------------ noise (GLSL)
export const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*snoise(p);p*=2.03;a*=.5;}return s;}
float ridged(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*(1.-abs(snoise(p)));p*=2.1;a*=.5;}return s;}
`;

// ------------------------------------------------------------------ stars + nebula
export function makeStarfield(count = 5000, radius = 400, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const size = new Float32Array(count), phase = new Float32Array(count);
  const palette = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.92, 0.8], [1, 0.8, 0.65], [0.7, 0.8, 1]];
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1, th = rnd() * TAU, r = Math.sqrt(1 - u * u);
    pos.set([radius * r * Math.cos(th), radius * u, radius * r * Math.sin(th)], i * 3);
    const c = palette[Math.floor(rnd() * palette.length)];
    col.set(c, i * 3);
    const m = rnd();
    size[i] = m < 0.92 ? 0.6 + rnd() * 1.1 : 1.8 + rnd() * 2.2; // a few bright ones
    phase[i] = rnd() * TAU;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uPx: { value: 1.5 } },
    vertexShader: `attribute float size;attribute float phase;attribute vec3 color;varying vec3 vC;varying float vA;
      uniform float uT;uniform float uPx;
      void main(){vC=color;float tw=.65+.35*sin(6.2831853*uT*2.+phase);vA=tw;
      vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*uPx;}`,
    fragmentShader: `varying vec3 vC;varying float vA;
      void main(){vec2 d=gl_PointCoord-.5;float r=length(d);float a=smoothstep(.5,0.,r);a=pow(a,1.6);
      gl_FragColor=vec4(vC*vA*1.4,a*vA);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.update = (t, dpr) => { mat.uniforms.uT.value = t; mat.uniforms.uPx.value = dpr; };
  return pts;
}

// Full-screen nebula backdrop (rendered first, no depth).
export function makeNebula(colA = '#3b1d6e', colB = '#0e4a6b', colC = '#5a1240', strength = 0.55, seed = 1) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 }, uA: { value: new THREE.Color(colA) }, uB: { value: new THREE.Color(colB) },
      uC: { value: new THREE.Color(colC) }, uS: { value: strength }, uSeed: { value: seed }, uAspect: { value: 1 },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: NOISE + `varying vec2 vUv;uniform float uT,uS,uSeed,uAspect;uniform vec3 uA,uB,uC;
      void main(){vec2 p=vec2(vUv.x*uAspect,vUv.y)*1.6;
        vec3 q=vec3(p,uSeed)+vec3(.15*cos(6.2831853*uT),.15*sin(6.2831853*uT),0.);
        float n1=fbm(q*1.1),n2=fbm(q*2.3+4.),n3=fbm(q*.7-2.);
        float dust=smoothstep(-.1,.6,fbm(q*3.+9.));
        vec3 c=uA*smoothstep(-.2,.8,n1)+uB*smoothstep(-.1,.9,n2)*.8+uC*smoothstep(0.,1.,n3)*.6;
        c*=mix(.35,1.,dust);c*=uS;
        float vig=smoothstep(1.25,.25,length(vUv-.5)*1.4);
        gl_FragColor=vec4(c*vig,1.);}`,
    depthWrite: false, depthTest: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  m.update = (t, aspect) => { mat.uniforms.uT.value = t; mat.uniforms.uAspect.value = aspect; };
  return m;
}

// ------------------------------------------------------------------ Earth
export async function makeEarth(base = 'textures/') {
  const [day, night, spec, clouds, normal] = await Promise.all([
    loadTex(base + 'earth_atmos_2048.jpg'), loadTex(base + 'earth_lights_2048.png'),
    loadTex(base + 'earth_specular_2048.jpg', false), loadTex(base + 'earth_clouds_1024.png'),
    loadTex(base + 'earth_normal_2048.jpg', false),
  ]);
  const sun = new THREE.Vector3(1, 0.2, -0.3).normalize();
  const group = new THREE.Group();

  const surf = new THREE.ShaderMaterial({
    uniforms: { uDay: { value: day }, uNight: { value: night }, uSpec: { value: spec }, uNorm: { value: normal },
      uClouds: { value: clouds }, uSun: { value: sun }, uCloudRot: { value: 0 } },
    vertexShader: `varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vT;
      void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);
      vec3 tang=normalize(vec3(-sin(uv.x*6.2831853),0.,cos(uv.x*6.2831853)));vT=normalize(mat3(modelMatrix)*tang);
      vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform sampler2D uDay,uNight,uSpec,uNorm,uClouds;uniform vec3 uSun;uniform float uCloudRot;
      varying vec2 vUv;varying vec3 vN,vW,vT;
      void main(){
        vec3 N=normalize(vN);vec3 T=normalize(vT-N*dot(vT,N));vec3 B=cross(N,T);
        vec3 nm=texture2D(uNorm,vUv).xyz*2.-1.;vec3 Np=normalize(T*nm.x*.6+B*nm.y*.6+N*nm.z);
        vec3 V=normalize(cameraPosition-vW);
        float ndl=dot(N,uSun);float ndlP=max(dot(Np,uSun),0.);
        float dayMix=smoothstep(-.18,.22,ndl);
        vec3 day=texture2D(uDay,vUv).rgb;vec3 night=texture2D(uNight,vUv).rgb;
        float spec=texture2D(uSpec,vUv).r;
        // cloud shadow
        float cl=texture2D(uClouds,vUv+vec2(uCloudRot+.002,0.)).r;
        vec3 col=day*(ndlP*1.25+.02)*(1.-cl*.35);
        vec3 H=normalize(uSun+V);float sp=pow(max(dot(N,H),0.),60.)*spec*1.4;
        col+=vec3(1.,.9,.75)*sp*dayMix;
        vec3 Ln=max(night-vec3(.07),0.)/.93;vec3 lights=pow(Ln,vec3(1.5))*vec3(1.,.74,.44)*5.0*(1.-cl*.85);
        col=mix(lights,col,dayMix);
        col=mix(col,vec3(.28,.48,.9)*(.15+max(ndl,0.)),.18*dayMix);
        // terminator glow
        float term=exp(-pow(ndl*14.,2.));col+=vec3(.9,.35,.12)*term*.05;
        // atmospheric haze toward the limb
        float fr=pow(1.-max(dot(N,V),0.),3.);
        col=mix(col,vec3(.35,.6,1.)*(smoothstep(-.3,.4,ndl)+.05),fr*.7);
        gl_FragColor=vec4(col,1.);}`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 192), surf);
  group.add(earth);

  const cloudMat = new THREE.ShaderMaterial({
    uniforms: { uClouds: { value: clouds }, uSun: { value: sun } },
    vertexShader: `varying vec2 vUv;varying vec3 vN,vW;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);
      vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform sampler2D uClouds;uniform vec3 uSun;varying vec2 vUv;varying vec3 vN,vW;
      void main(){float a=texture2D(uClouds,vUv).r;vec3 N=normalize(vN);float ndl=dot(N,uSun);
      float lit=smoothstep(-.15,.35,ndl);vec3 c=mix(vec3(.02,.03,.06),vec3(1.)*(.15+max(ndl,0.)),lit);
      c+=vec3(1.,.45,.2)*exp(-pow(ndl*6.,2.))*.35;
      gl_FragColor=vec4(c,a*.92);}`,
    transparent: true, depthWrite: false,
  });
  const cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(1.006, 160, 160), cloudMat);
  group.add(cloudsMesh);

  group.add(makeAtmosphere(1.045, sun, new THREE.Color(0.32, 0.58, 1.0), 1.6));
  group.sun = sun;
  group.update = (t) => {
    earth.rotation.y = TAU * t;
    cloudsMesh.rotation.y = TAU * t + 0.6;
    surf.uniforms.uCloudRot.value = -0.6 / TAU;
  };
  return group;
}

// Fresnel rim shell; brighter on the sun side, warm at the terminator.
export function makeAtmosphere(r, sun, color, power = 1.4) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uC: { value: color }, uP: { value: power } },
    vertexShader: `varying vec3 vN,vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);
      vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 uSun,uC;uniform float uP;varying vec3 vN,vW;
      void main(){vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);
      float rim=pow(1.-abs(dot(N,V)),4.5);float ndl=dot(N,uSun);
      float lit=smoothstep(-.45,.35,ndl);vec3 warm=vec3(1.,.5,.22)*exp(-pow((ndl+.05)*4.,2.));
      vec3 c=(uC*lit+warm*.9)*rim*uP;
      gl_FragColor=vec4(c,1.);}`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(r, 128, 128), mat);
}

// ------------------------------------------------------------------ sun / flare
function radialTex(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function streakTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 32;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, 'rgba(120,170,255,0)'); gr.addColorStop(.5, 'rgba(210,230,255,1)'); gr.addColorStop(1, 'rgba(120,170,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 32);
  const v = g.getImageData(0, 0, 512, 32);
  for (let y = 0; y < 32; y++) { const f = Math.exp(-Math.pow((y - 15.5) / 3.2, 2)); for (let x = 0; x < 512; x++) v.data[(y * 512 + x) * 4 + 3] *= f; }
  g.putImageData(v, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeSun(position, scale = 1) {
  const g = new THREE.Group();
  const add = (tex, s, occluded, opacity = 1, sx = 1) => {
    const m = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false,
      depthTest: occluded, transparent: true, opacity });
    const sp = new THREE.Sprite(m); sp.scale.set(s * sx * scale, s * scale, 1); sp.position.copy(position); g.add(sp); return sp;
  };
  const core = add(radialTex([[0, '#ffffff'], [.12, '#fff6e0'], [.3, 'rgba(255,200,120,.55)'], [1, 'rgba(255,120,40,0)']]), 9, true);
  const halo = add(radialTex([[0, 'rgba(255,230,190,.55)'], [.35, 'rgba(255,170,90,.18)'], [1, 'rgba(255,120,60,0)']]), 34, false, .8);
  const streak = add(streakTex(), 3, false, .3, 12);
  g.update = (t) => {
    const p = .5 + .5 * Math.sin(TAU * t);
    halo.material.opacity = .6 + .15 * p; streak.material.opacity = .22 + .1 * p;
  };
  return g;
}

// ------------------------------------------------------------------ procedural planets
const PLANET_FRAG = NOISE + `
uniform int uType;uniform vec3 uC1,uC2,uC3,uSun;uniform float uSeed,uRot,uFreq;
varying vec3 vP,vN,vW;
vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
void main(){
  vec3 pn=rotY(normalize(vP),uRot);vec3 p=pn*uFreq+vec3(uSeed);vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);
  float ndl=dot(N,uSun);float light=smoothstep(-.12,.5,ndl)*(.25+.95*max(ndl,0.));
  vec3 col;vec3 emit=vec3(0.);float specAmt=0.;
  if(uType==0){ // gas giant
    float w=fbm(p*vec3(2.,6.,2.))*.6;float b=sin((p.y-uSeed)*16.+w*5.);float b2=sin((p.y-uSeed)*37.+fbm(p*5.)*3.);
    col=mix(uC1,uC2,smoothstep(-1.,1.,b));col=mix(col,uC3,smoothstep(.3,1.,b2)*.45);
    float storm=smoothstep(.16,.0,length(vec2(atan(p.z-uSeed,p.x-uSeed)-1.2,(p.y-uSeed+.25)*2.6)));
    col=mix(col,uC3*1.15,storm*.8);
  } else if(uType==1){ // terran
    float h=fbm(p*1.6);float land=smoothstep(.02,.06,h);
    vec3 sea=mix(uC1*.55,uC1,smoothstep(-.6,.05,h));vec3 ground=mix(uC2,uC3,smoothstep(.1,.5,fbm(p*4.)));
    ground=mix(ground,vec3(.95),smoothstep(.72,.9,abs(pn.y)));
    col=mix(sea,ground,land);specAmt=1.-land;
    float cl=smoothstep(.1,.55,fbm(p*2.6+7.));col=mix(col,vec3(1.),cl*.85);specAmt*=1.-cl;
  } else if(uType==2){ // rocky / desert
    float h=fbm(p*2.2);float r=ridged(p*3.);col=mix(uC1,uC2,smoothstep(-.4,.5,h));col=mix(col,uC3,smoothstep(.55,.9,r)*.6);
    float cr=smoothstep(.06,.0,abs(fract(fbm(p*5.)*3.)-.5)-.4);col*=1.-cr*.15;
    col=mix(col,vec3(.92,.9,.88),smoothstep(.82,.95,abs(pn.y))*.9*step(uFreq,1.5));
  } else if(uType==3){ // ice
    float r=ridged(p*3.5);col=mix(uC1,uC2,smoothstep(.3,.9,fbm(p*2.)+.5));col=mix(col,uC3,smoothstep(.75,.95,r));specAmt=.6;
  } else { // lava
    float r=ridged(p*3.2);float crack=smoothstep(.82,.98,r);col=mix(uC1,uC2,smoothstep(-.3,.6,fbm(p*2.5)))*.9;
    emit=uC3*crack*2.2+uC3*smoothstep(.6,.9,r)*.25;
  }
  vec3 H=normalize(uSun+V);float sp=pow(max(dot(N,H),0.),40.)*specAmt*.8;
  vec3 c=col*light+vec3(1.,.95,.85)*sp*step(0.,ndl)+emit;
  float fr=pow(1.-max(dot(N,V),0.),2.5);c=mix(c,uC1*1.3*smoothstep(-.3,.5,ndl),fr*.55);
  gl_FragColor=vec4(c,1.);}`;

export function makePlanet({ type, c1, c2, c3, atmo, seed = 0, rings = null, freq = 1, atmoPower = 1.3 }, sun) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uType: { value: type }, uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) },
      uC3: { value: new THREE.Color(c3) }, uSun: { value: sun }, uSeed: { value: seed }, uRot: { value: 0 }, uFreq: { value: freq } },
    vertexShader: `varying vec3 vP,vN,vW;void main(){vP=position;vN=normalize(mat3(modelMatrix)*normal);
      vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: PLANET_FRAG,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 160), mat);
  g.add(body);
  if (atmoPower > 0) g.add(makeAtmosphere(1.04, sun, new THREE.Color(atmo), atmoPower));
  if (rings) {
    const rg = new THREE.RingGeometry(1.35, 2.25, 256, 1);
    const pos = rg.attributes.position, uv = rg.attributes.uv;
    for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 1.35) / 0.9, 0.5); }
    const rm = new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Color(rings) }, uSun: { value: sun } },
      vertexShader: `varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;
        gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader: NOISE + `uniform vec3 uC,uSun;varying vec2 vUv;varying vec3 vW;
        void main(){float r=vUv.x;float bands=.55+.45*sin(r*90.)*sin(r*23.+1.);float n=snoise(vec3(r*40.,0.,0.))*.5+.5;
        float a=bands*n*smoothstep(0.,.06,r)*smoothstep(1.,.85,r)*(1.-smoothstep(.42,.46,r)*smoothstep(.5,.46,r));
        // planet shadow on the far side of the ring
        vec3 toSun=uSun;vec3 p=vW;float d=length(p-dot(p,toSun)*toSun);float sh=(dot(p,toSun)<0.&&d<1.)?.15:1.;
        gl_FragColor=vec4(uC*(.6+.5*n)*sh,a*.85);}`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(rg, rm);
    ring.rotation.x = -Math.PI / 2 + 0.38;
    ring.rotation.y = 0.25;
    g.add(ring);
  }
  g.update = (t) => { mat.uniforms.uRot.value = TAU * t; };
  return g;
}

// ------------------------------------------------------------------ medals
// One environment map per renderer: GPU textures can't be shared across WebGL contexts.
const envs = new WeakMap();
export function envFor(renderer) {
  if (!envs.has(renderer)) envs.set(renderer, new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture);
  return envs.get(renderer);
}
function starShape(R = 0.5, r = 0.21) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath(); return s;
}
export function makeMedal(color, renderer) {
  const env = envFor(renderer);
  const metal = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.22, envMap: env, envMapIntensity: 1.4,
    clearcoat: 0.6, clearcoatRoughness: 0.15 });
  const g = new THREE.Group();
  const prof = [[0, .055], [.74, .055], [.78, .085], [.93, .095], [1, .06], [1, -.06], [.93, -.095], [.78, -.085], [.74, -.055], [0, -.055]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const coin = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), metal);
  coin.rotation.x = Math.PI / 2;
  g.add(coin);
  const sg = new THREE.ExtrudeGeometry(starShape(), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 4 });
  for (const side of [1, -1]) {
    const st = new THREE.Mesh(sg, metal);
    st.position.z = side * 0.05; if (side < 0) st.rotation.y = Math.PI;
    g.add(st);
  }
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 4);
  return { group: g, light: key };
}
