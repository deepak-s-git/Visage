/* ═══════════════════════════════════════════════════════════════
   VISAGE · Cinematic Landing Scene — Neural Resonance Core
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

// --- GLSL Simplex Noise 3D ---
const noise3D = `
//
// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
{
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,7)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

// --- Shaders ---
const vertexShader = `
  ${noise3D}
  uniform float uTime;
  uniform float uScroll;
  uniform float uMouseIntensity;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vNoise;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Smooth, slow fluid noise for the base
    float noiseFreq = 1.2;
    float noiseAmp = 0.35 + (uMouseIntensity * 0.15); // React to mouse movement
    vec3 noisePos = vec3(position.x * noiseFreq + uTime * 0.2, position.y * noiseFreq + uTime * 0.3, position.z * noiseFreq);
    float n = snoise(noisePos);
    vNoise = n;
    
    // Displace vertices along normal
    vec3 newPosition = position + normal * (n * noiseAmp);
    
    // Scale down slightly on scroll
    newPosition *= (1.0 - (uScroll * 0.3));

    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uTime;
  uniform float uScroll;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vNoise;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Fresnel effect for rim lighting
    float fresnel = dot(viewDir, normal);
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    fresnel = pow(fresnel, 3.0);
    
    // Base color gradient influenced by noise
    vec3 baseColor = mix(uColor1, uColor2, vNoise * 0.5 + 0.5);
    
    // Inner glow / rim light
    vec3 rimColor = vec3(0.5, 0.8, 1.0) * fresnel * 1.5;
    
    // Final output combining base, fresnel, and fading on scroll
    vec3 finalColor = baseColor + rimColor;
    float alpha = 0.9 - (uScroll * 0.8);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function initLandingScene(canvas) {
  if (!canvas) return { dispose() {} };

  /* ── Scene ── */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  scene.fog = new THREE.FogExp2(0x020203, 0.035);

  /* ── Camera ── */
  const camera = new THREE.PerspectiveCamera(
    45, canvas.clientWidth / canvas.clientHeight, 0.1, 100
  );
  camera.position.set(0, 0, 6.5);

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  /* ── Neural Core Material (Fluid Shader) ── */
  const coreUniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uMouseIntensity: { value: 0 },
    uColor1: { value: new THREE.Color(0x0a0a0f) }, // Deep dark void
    uColor2: { value: new THREE.Color(0x1a2b4c) }  // Neural blue tint
  };

  const coreMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: coreUniforms,
    transparent: true,
    wireframe: false,
    side: THREE.FrontSide
  });

  /* ── Core Geometry ── */
  // High segment count for smooth liquid displacement
  const coreGeo = new THREE.IcosahedronGeometry(1.5, 32);
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreMesh);

  /* ── Wireframe / Neural Mesh Overlay ── */
  const wireMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: `
      uniform float uScroll;
      varying float vNoise;
      void main() {
        // Cyan-ish wireframe overlay
        vec3 color = mix(vec3(0.1, 0.3, 0.5), vec3(0.4, 0.8, 1.0), vNoise * 0.5 + 0.5);
        gl_FragColor = vec4(color, 0.15 - (uScroll * 0.15));
      }
    `,
    uniforms: coreUniforms, // Share uniforms so it displaces identically
    transparent: true,
    wireframe: true,
    blending: THREE.AdditiveBlending
  });
  
  // Slightly scaled up so the wireframe hovers over the liquid
  const wireMesh = new THREE.Mesh(coreGeo, wireMat);
  wireMesh.scale.setScalar(1.02);
  scene.add(wireMesh);

  /* ── Particle Field (Atmosphere) ── */
  const PARTICLE_COUNT = 3000;
  const posArr = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
    const x = (Math.random() - 0.5) * 30;
    const y = (Math.random() - 0.5) * 30;
    const z = (Math.random() - 0.5) * 20 - 5;
    posArr[i] = x;
    posArr[i+1] = y;
    posArr[i+2] = z;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x4a7a9c, size: 0.015, transparent: true, opacity: 0.3,
    sizeAttenuation: true, blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ── Mouse Tracking ── */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, velocity: 0 };
  let lastMouseTime = performance.now();
  
  const onMouseMove = (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    
    // Calculate rough velocity for shader interaction
    const now = performance.now();
    const dt = now - lastMouseTime;
    if (dt > 0) {
      const dx = mouse.tx - mouse.x;
      const dy = mouse.ty - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      mouse.velocity = Math.min(mouse.velocity + dist * 10, 1.0);
    }
    lastMouseTime = now;
  };
  window.addEventListener('mousemove', onMouseMove);

  /* ── Resize ── */
  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  /* ── Animation ── */
  let running = true;
  let scrollProgress = 0;
  const clock = new THREE.Clock();

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Smooth mouse interpolation
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    mouse.velocity *= 0.95; // Decay velocity

    // Update Uniforms
    coreUniforms.uTime.value = time;
    coreUniforms.uScroll.value = scrollProgress;
    coreUniforms.uMouseIntensity.value += (mouse.velocity - coreUniforms.uMouseIntensity.value) * 0.1;

    // Core slow rotation
    coreMesh.rotation.y = time * 0.05 + mouse.x * 0.2;
    coreMesh.rotation.x = Math.sin(time * 0.1) * 0.05 + mouse.y * 0.2;
    
    wireMesh.rotation.y = coreMesh.rotation.y;
    wireMesh.rotation.x = coreMesh.rotation.x;

    // Particles gentle drift and parallax
    particles.rotation.y = time * 0.015;
    particles.rotation.x = time * 0.005;
    particles.position.x = mouse.x * -1.5;
    particles.position.y = mouse.y * 1.5;

    // Camera scroll behavior - dive into the scene
    camera.position.z = 6.5 - scrollProgress * 3;
    camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 0.3 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();

  /* ── Public API ── */
  return {
    setScrollProgress(p) { scrollProgress = Math.max(0, Math.min(1, p)); },
    dispose() {
      running = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      coreGeo.dispose(); coreMat.dispose(); wireMat.dispose();
      particleGeo.dispose(); particleMat.dispose();
    }
  };
}
