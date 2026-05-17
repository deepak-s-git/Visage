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
  uniform float uArousal;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vNoise;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Smooth fluid noise
    // High arousal = faster, more erratic, spikier waves
    float noiseFreq = 1.2 + (uArousal * 0.8);
    float noiseAmp = 0.35 + (uMouseIntensity * 0.15) + (uArousal * 0.25);
    
    vec3 noisePos = vec3(
      position.x * noiseFreq + uTime * (0.2 + uArousal * 0.3), 
      position.y * noiseFreq + uTime * (0.3 + uArousal * 0.3), 
      position.z * noiseFreq
    );
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
  uniform float uValence;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vNoise;

  // HSL to RGB conversion helper
  vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
      return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Fresnel effect for rim lighting
    float fresnel = dot(viewDir, normal);
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    fresnel = pow(fresnel, 3.0);
    
    // Valence controls the hue shift.
    // Base colors are deep blue. Valence < 0 shifts to purple/red. Valence > 0 shifts to bright cyan/yellow.
    vec3 col1 = mix(uColor1, vec3(0.8, 0.1, 0.2), clamp(-uValence, 0.0, 1.0)); // Negative valence
    col1 = mix(col1, vec3(0.1, 0.8, 0.6), clamp(uValence, 0.0, 1.0)); // Positive valence
    
    vec3 col2 = mix(uColor2, vec3(0.4, 0.0, 0.3), clamp(-uValence, 0.0, 1.0));
    col2 = mix(col2, vec3(0.9, 0.8, 0.2), clamp(uValence, 0.0, 1.0));

    // Base color gradient influenced by noise
    vec3 baseColor = mix(col1, col2, vNoise * 0.5 + 0.5);
    
    // Inner glow / rim light
    vec3 rimColor = vec3(0.5, 0.8, 1.0) * fresnel * (1.5 + abs(uValence));
    
    // Final output combining base, fresnel
    vec3 finalColor = baseColor + rimColor;
    
    // Core should remain strongly visible during scroll, pulse slightly based on arousal
    float alpha = 0.85 + (uArousal * 0.1) - (uScroll * 0.1);
    
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
    uValence: { value: 0 },
    uArousal: { value: 0 },
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
  // Higher segment count for an impossibly smooth, organic membrane
  const coreGeo = new THREE.IcosahedronGeometry(1.6, 48);
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreMesh);

  /* ── Wireframe / Neural Mesh Overlay ── */
  const wireMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: `
      uniform float uScroll;
      varying float vNoise;
      void main() {
        // High-contrast cyan/blue neural energy
        vec3 color = mix(vec3(0.0, 0.2, 0.4), vec3(0.6, 0.9, 1.0), vNoise * 0.5 + 0.5);
        gl_FragColor = vec4(color, 0.25); // Keeps wireframe visible during scroll
      }
    `,
    uniforms: coreUniforms,
    transparent: true,
    wireframe: true,
    blending: THREE.AdditiveBlending
  });
  
  // Slightly scaled up so the wireframe hovers over the liquid
  const wireMesh = new THREE.Mesh(coreGeo, wireMat);
  wireMesh.scale.setScalar(1.03);
  scene.add(wireMesh);

  /* ── Inner Solid Core (Depth) ── */
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x010103 });
  const innerCore = new THREE.Mesh(coreGeo, innerMat);
  scene.add(innerCore);
  scene.innerCore = innerCore; // Store reference

  /* ── Core Particle Shell ── */
  const pGeo = new THREE.BufferGeometry();
  const pCount = 500;
  const positions = new Float32Array(pCount * 3);
  const aOriginal = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    // Random point on sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = 2.6; // Slightly outside the core
    const px = r * Math.sin(phi) * Math.cos(theta);
    const py = r * Math.sin(phi) * Math.sin(theta);
    const pz = r * Math.cos(phi);
    positions[i*3] = px; positions[i*3+1] = py; positions[i*3+2] = pz;
    aOriginal[i*3] = px; aOriginal[i*3+1] = py; aOriginal[i*3+2] = pz;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('aOriginal', new THREE.BufferAttribute(aOriginal, 3));
  
  const pMat = new THREE.PointsMaterial({
    color: 0x64b4ff,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreParticles = new THREE.Points(pGeo, pMat);
  scene.add(coreParticles);
  scene.coreParticles = coreParticles; // Store reference

  /* ── Outer Resonance Aura (Atmospheric light wrapping) ── */
  const auraMat = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uValence;
      uniform float uArousal;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        // Soft glow based on normal falloff
        float intensity = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
        
        // Base nebula color (deep space blue)
        vec3 color = vec3(0.05, 0.1, 0.25);
        
        // React to valence (red/purple for negative, cyan/green for positive)
        color = mix(color, vec3(0.4, 0.05, 0.2), clamp(-uValence, 0.0, 1.0));
        color = mix(color, vec3(0.05, 0.35, 0.25), clamp(uValence, 0.0, 1.0));
        
        // Add a slow pulse
        float pulse = sin(uTime * 0.5) * 0.1 + 0.9;
        
        gl_FragColor = vec4(color * pulse * intensity, intensity * 0.3);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  });
  const auraMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 16), auraMat);
  scene.add(auraMesh);

  /* ── Distant Star Field ── */
  const STAR_COUNT = 4000;
  const starPosArr = new Float32Array(STAR_COUNT * 3);
  const starColorsArr = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = (Math.random() - 0.5) * 60;
    const y = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 40 - 10;
    starPosArr[i*3] = x; starPosArr[i*3+1] = y; starPosArr[i*3+2] = z;
    
    // Slight color variations
    const col = new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.8, 0.6 + Math.random()*0.4);
    starColorsArr[i*3] = col.r; starColorsArr[i*3+1] = col.g; starColorsArr[i*3+2] = col.b;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPosArr, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColorsArr, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.04, transparent: true, opacity: 0.8,
    vertexColors: true, sizeAttenuation: true, blending: THREE.AdditiveBlending
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ── Shooting Stars / Meteors (Cinematic Lines) ── */
  const METEOR_COUNT = 8;
  const meteorsList = [];
  for (let i = 0; i < METEOR_COUNT; i++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(6); // 2 points (head and tail)
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xe0f0ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });
    const line = new THREE.Line(geo, mat);
    line.userData = { life: 0, vx: 0, vy: 0 };
    scene.add(line);
    meteorsList.push(line);
  }

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
  let coreScale = 0.0;
  let targetCoreScale = 0.0; // Wait for revealCore()
  let isBlackhole = false;
  let blackholeProgress = 0;
  const clock = new THREE.Clock();

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();

    // Smooth mouse interpolation
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    mouse.velocity *= 0.95; // Decay velocity

    // Smooth core reveal
    coreScale += (targetCoreScale - coreScale) * 0.03;

    // Update Uniforms
    coreUniforms.uTime.value = time;
    coreUniforms.uScroll.value = scrollProgress;
    coreUniforms.uMouseIntensity.value += (mouse.velocity - coreUniforms.uMouseIntensity.value) * 0.1;

    // Core slow rotation
    coreMesh.rotation.y = time * 0.05 + mouse.x * 0.2;
    coreMesh.rotation.x = Math.sin(time * 0.1) * 0.05 + mouse.y * 0.2;
    
    wireMesh.rotation.y = coreMesh.rotation.y;
    wireMesh.rotation.x = coreMesh.rotation.x;

    // Apply scale: Core stays relatively stable during scroll, only small pulse
    const dynamicScale = coreScale * 1.0; // Removed massive growth
    
    coreMesh.scale.setScalar(dynamicScale);
    wireMesh.scale.setScalar(dynamicScale * 1.05);

    // If inner core and particle shell exist, update them
    if (scene.innerCore) {
      scene.innerCore.rotation.y = -time * 0.1;
      scene.innerCore.rotation.x = -time * 0.1;
      scene.innerCore.scale.setScalar(dynamicScale * 0.6);
    }
    if (scene.coreParticles) {
      scene.coreParticles.rotation.y = time * 0.05 + mouse.x * 0.5;
      scene.coreParticles.rotation.z = time * 0.05;
      scene.coreParticles.scale.setScalar(dynamicScale * 1.15);
      // Pulse particles
      const positions = scene.coreParticles.geometry.attributes.position.array;
      const original = scene.coreParticles.geometry.attributes.aOriginal.array;
      for(let i=0; i<positions.length; i+=3) {
        const offset = Math.sin(time * 3.0 + i) * 0.02 * coreUniforms.uArousal.value;
        positions[i] = original[i] * (1.0 + offset);
        positions[i+1] = original[i+1] * (1.0 + offset);
        positions[i+2] = original[i+2] * (1.0 + offset);
      }
      scene.coreParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Aura pulse
    auraMesh.scale.setScalar(dynamicScale * (1.0 + Math.sin(time * 0.5) * 0.05 + mouse.velocity * 0.1));
    auraMesh.material.opacity = coreScale * (0.15 + Math.sin(time * 0.25) * 0.05); // Stable opacity

    // Stars depth parallax
    stars.rotation.y = time * 0.002;
    stars.rotation.x = time * 0.001;
    stars.position.x = mouse.x * -2.5;
    stars.position.y = mouse.y * 2.5;

    // Shooting Stars / Meteors logic
    for (let i = 0; i < METEOR_COUNT; i++) {
      const m = meteorsList[i];
      if (m.userData.life <= 0) {
        if (Math.random() < 0.015) { // Spawn
          m.userData.life = 1.0;
          const x = (Math.random() - 0.5) * 60.0 + 20; // Start mostly top right
          const y = 30.0 + Math.random() * 15;
          const z = (Math.random() - 0.5) * 10.0 - 5.0;
          
          const pos = m.geometry.attributes.position.array;
          pos[0] = x; pos[1] = y; pos[2] = z; // Head
          pos[3] = x; pos[4] = y; pos[5] = z; // Tail
          
          // Fast diagonal travel
          m.userData.vx = -1.5 - Math.random() * 1.5;
          m.userData.vy = -1.5 - Math.random() * 1.5;
        }
        m.material.opacity = 0;
      } else {
        m.userData.life -= 0.02; // Cinematic fast fade
        const pos = m.geometry.attributes.position.array;
        
        // Stretch: Tail follows head but slower
        pos[3] += (pos[0] - pos[3]) * 0.15;
        pos[4] += (pos[1] - pos[4]) * 0.15;
        pos[5] += (pos[2] - pos[5]) * 0.15;
        
        // Head moves fast
        pos[0] += m.userData.vx;
        pos[1] += m.userData.vy;
        
        m.geometry.attributes.position.needsUpdate = true;
        m.material.opacity = m.userData.life * 0.8;
      }
    }

    // Camera scroll behavior - dive into the scene
    if (!isBlackhole) {
      camera.position.z = 6.5 - scrollProgress * 3;
      camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (-mouse.y * 0.3 - camera.position.y) * 0.05;
    } else {
      // Blackhole collapse animation
      blackholeProgress += 0.015;
      
      // Pull camera inside the core
      camera.position.z += (0.1 - camera.position.z) * 0.1;
      
      // Spin the entire scene crazily
      scene.rotation.z += blackholeProgress * 0.1;
      scene.rotation.y += blackholeProgress * 0.05;
      
      // Suck stars inward
      stars.scale.setScalar(Math.max(0.1, 1.0 - blackholeProgress));
      
      // Distort the core to engulf everything
      targetCoreScale = 15.0 + blackholeProgress * 20.0;
      coreUniforms.uArousal.value = 5.0; // Max chaos
      coreUniforms.uMouseIntensity.value = 5.0;
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  animate();

  /* ── Public API ── */
  return {
    setScrollProgress(p) { scrollProgress = Math.max(0, Math.min(1, p)); },
    setEmotionState({ valence = 0, arousal = 0 }) {
      if (isBlackhole) return;
      coreUniforms.uValence.value += (valence - coreUniforms.uValence.value) * 0.1;
      coreUniforms.uArousal.value += (arousal - coreUniforms.uArousal.value) * 0.1;
    },
    revealCore() {
      if (!isBlackhole) targetCoreScale = 1.0;
    },
    triggerBlackhole() {
      isBlackhole = true;
    },
    dispose() {
      running = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      coreGeo.dispose(); coreMat.dispose(); wireMat.dispose();
      starGeo.dispose(); starMat.dispose();
      for (const m of meteorsList) {
        m.geometry.dispose();
        m.material.dispose();
      }
    }
  };
}
