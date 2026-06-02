import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';

export class MegaCity {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    // Deep atmospheric blue/black fog to match the cinematic depth
    this.scene.background = new THREE.Color(0x000510);
    this.scene.fog = new THREE.FogExp2(0x000a1a, 0.0015);

    // High aerial cinematic perspective matching the reference
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
    // Positioned high up and far back, looking down at the center
    this.camera.position.set(0, 800, 1200);
    this.camera.lookAt(0, 0, 0);

    // Store original camera position for the hyper-dive transition
    this.originalCamPos = this.camera.position.clone();
    this.baseCameraPos = this.camera.position.clone(); // GSAP will tween this
    this.originalCamTarget = new THREE.Vector3(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.initPostProcessing();
    this.initLighting();

    // Arrays for animation
    this.trafficNodes = [];
    this.energyStreams = [];
    this.clock = new THREE.Clock();
    
    this.active = false;
    this.frameId = null;

    // --- BUILD THE 1:1 MEGACITY BLUEPRINT ---
    this.heroGroup = new THREE.Group();
    this.scene.add(this.heroGroup);

    this.buildGridTerrain();
    this.buildCentralSpire();
    this.buildHighways();
    this.buildCloverleaf();
    this.buildCircularStadium();
    this.buildRectangularArena();
    this.buildDenseCityBlocks();
    this.buildMinorGridTraffic();
    this.buildSkyHighways();

    // Event Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    // Subtle parallax mouse movement
    this.mouseX = 0;
    this.mouseY = 0;
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Intense UnrealBloom to create the glowing neon Tron effect
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      2.5,  // strength
      0.8,  // radius
      0.2   // threshold
    );
    this.composer.addPass(this.bloomPass);
  }

  initLighting() {
    const ambient = new THREE.AmbientLight(0x001133, 2.0);
    this.scene.add(ambient);

    // Main central core light
    const coreLight = new THREE.PointLight(0x00ffff, 50000, 2000);
    coreLight.position.set(0, 50, 0);
    this.scene.add(coreLight);

    // Stadium accent lights
    const stadiumLight = new THREE.PointLight(0x0088ff, 30000, 1500);
    stadiumLight.position.set(-600, 100, -200);
    this.scene.add(stadiumLight);
  }

  // 1. The Hexagonal / Angular Grid Floor
  buildGridTerrain() {
    const planeGeo = new THREE.PlaneGeometry(6000, 6000, 100, 100);
    
    // Custom shader for the glowing floor grid
    const gridMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x002244) },
        glowColor: { value: new THREE.Color(0x00ffff) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform vec3 glowColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        // Create a hexagonal-like futuristic grid pattern
        float hexGrid(vec2 uv) {
          vec2 p = uv * 50.0;
          vec2 q = vec2(p.x * 2.0 / 1.7320508, p.y + p.x / 1.7320508);
          vec2 i = floor(q);
          vec2 f = fract(q);
          float v = mod(i.x + i.y, 3.0);
          float d = 1.0;
          if (v == 0.0) d = min(f.x, f.y);
          if (v == 1.0) d = min(1.0 - f.x, f.y);
          if (v == 2.0) d = min(f.x, 1.0 - f.y);
          return smoothstep(0.05, 0.0, d);
        }

        void main() {
          float grid = hexGrid(vUv);
          // Distance from center
          float dist = length(vWorldPos.xz);
          
          // Distance fade
          float normalizedDist = dist / 3000.0;
          float fade = 1.0 - smoothstep(0.0, 1.0, normalizedDist);
          
          // Heartbeat wave: starts at center, propagates outward every 4 seconds
          float wavePos = mod(time, 4.0) * 600.0; // speed is 600 units/sec
          float waveDist = dist - wavePos;
          float waveWindow = smoothstep(-300.0, 0.0, waveDist) * smoothstep(80.0, 0.0, waveDist);
          float ripple = sin(waveDist * 0.08) * 0.5 + 0.5;
          float waveFade = clamp(1.0 - dist / 2200.0, 0.0, 1.0);
          float waveGlow = ripple * waveWindow * waveFade * 1.5;
          
          // Combine base grid and the heartbeat ripple
          vec3 finalColor = mix(color * 0.1, glowColor, grid * (0.3 + waveGlow * 1.5));
          // Add secondary direct neon color wave for the glowing grid lines
          finalColor += glowColor * waveGlow * 0.4;
          
          gl_FragColor = vec4(finalColor, 1.0) * fade;
        }
      `,
      transparent: true,
      wireframe: false
    });

    const floor = new THREE.Mesh(planeGeo, gridMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5; // Slightly below roads
    this.scene.add(floor);
    
    // Store for animation
    this.floorMat = gridMat;
  }

  // 2. Central Massive Spire (The core of the city)
  buildCentralSpire() {
    const spireGroup = new THREE.Group();
    
    // Materials
    const spireShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color(0x00ffff) },
        edgeColor: { value: new THREE.Color(0x0088ff) },
        baseColor: { value: new THREE.Color(0x000103) } // Pure monolithic dark obsidian
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 glowColor;
        uniform vec3 edgeColor;
        uniform vec3 baseColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying vec2 vUv;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewDir);
          
          // 1. Thin Fresnel Rim Glow (Elegantly outlines the silhouette edges)
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
          vec3 rimGlow = glowColor * fresnel * 0.45;
          
          // 2. Subtle upward-scrolling circuit logic lines
          float gridX = sin(vWorldPos.x * 0.15) * 0.5 + 0.5;
          float gridY = sin(vWorldPos.y * 0.12 - time * 3.0) * 0.5 + 0.5;
          float gridZ = sin(vWorldPos.z * 0.15) * 0.5 + 0.5;
          
          float circuitLines = step(0.98, gridX) + step(0.98, gridY) + step(0.98, gridZ);
          circuitLines = clamp(circuitLines, 0.0, 1.0);
          vec3 circuitGlow = edgeColor * circuitLines * 0.25;
          
          // Combine layers (no dense grids of window ports, keeping it clean and monolithic)
          vec3 finalColor = baseColor + rimGlow + circuitGlow;
          
          // Add specular highlights from key point lights
          vec3 lightPos1 = vec3(0.0, 290.0, 0.0);
          vec3 lightDir1 = normalize(lightPos1 - vWorldPos);
          vec3 halfDir1 = normalize(lightDir1 + viewDir);
          float spec1 = pow(max(dot(normal, halfDir1), 0.0), 32.0) * 0.5;

          vec3 lightPos2 = vec3(0.0, 450.0, 0.0);
          vec3 lightDir2 = normalize(lightPos2 - vWorldPos);
          vec3 halfDir2 = normalize(lightDir2 + viewDir);
          float spec2 = pow(max(dot(normal, halfDir2), 0.0), 32.0) * 0.5;
          
          finalColor += vec3(1.0) * (spec1 + spec2);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.spireMat = spireShaderMat;
    
    const neonLineMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2
    });

    const glowNeonMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });

    // Helper to add styled parts and their neon outline segments
    const addPart = (geom, pos, rot = null) => {
      const mesh = new THREE.Mesh(geom, spireShaderMat);
      mesh.position.copy(pos);
      if (rot) {
        mesh.rotation.copy(rot);
      }
      spireGroup.add(mesh);

      const edges = new THREE.EdgesGeometry(geom);
      const lineSegments = new THREE.LineSegments(edges, neonLineMat);
      lineSegments.position.copy(pos);
      if (rot) {
        lineSegments.rotation.copy(rot);
      }
      spireGroup.add(lineSegments);
      return mesh;
    };

    // --- 1. EXTRUDED MONOLITHIC CORE SHAPE ---
    const coreShape = new THREE.Shape();
    coreShape.moveTo(0, 0);
    // Outer buttress wide base
    coreShape.lineTo(-180, 0);
    // Sweeping curves defining the sloping buttress footing
    coreShape.quadraticCurveTo(-140, 80, -90, 135);
    // Inward sweep transition to vertical tower ascent columns
    coreShape.quadraticCurveTo(-45, 180, -35, 360);
    // Horn geometry crown tapering at the top pinnacle (360m to 450m)
    coreShape.quadraticCurveTo(-38, 410, -45, 450);
    coreShape.lineTo(-20, 450);
    coreShape.quadraticCurveTo(-15, 410, -15, 360);
    // Central cavity slot vertical descent down to Y = 135 (30% fortress base)
    coreShape.lineTo(-15, 135);
    coreShape.lineTo(0, 135);
    
    // Mirror on the right side
    coreShape.lineTo(15, 135);
    coreShape.lineTo(15, 360);
    coreShape.quadraticCurveTo(15, 410, 20, 450);
    coreShape.lineTo(45, 450);
    coreShape.quadraticCurveTo(38, 410, 35, 360);
    coreShape.quadraticCurveTo(45, 180, 90, 135);
    coreShape.quadraticCurveTo(140, 80, 180, 0);
    coreShape.closePath();

    const coreExtrudeSettings = {
      depth: 60,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 1,
      bevelSegments: 2,
      steps: 1
    };

    const coreGeom = new THREE.ExtrudeGeometry(coreShape, coreExtrudeSettings);
    addPart(coreGeom, new THREE.Vector3(0, 0, -30));

    // --- 2. EXTRUDED FRONT & BACK BUTTRESS WEDGES (For solid 4-way ground base) ---
    const buttressShape = new THREE.Shape();
    buttressShape.moveTo(30, 0);
    buttressShape.lineTo(160, 0);
    buttressShape.quadraticCurveTo(150, 25, 120, 40);
    buttressShape.quadraticCurveTo(75, 80, 30, 135);
    buttressShape.closePath();

    const buttressExtrudeSettings = {
      depth: 80,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 1,
      bevelSegments: 2,
      steps: 1
    };

    const buttressGeom = new THREE.ExtrudeGeometry(buttressShape, buttressExtrudeSettings);
    
    // Front Buttress wedge (slopes towards +Z)
    addPart(buttressGeom, new THREE.Vector3(40, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0));

    // Back Buttress wedge (slopes towards -Z)
    addPart(buttressGeom, new THREE.Vector3(-40, 0, 0), new THREE.Euler(0, Math.PI / 2, 0));

    // --- 3. SWEEPING VOLUMETRIC GLOW TUBES (Along 4 buttress curves) ---
    const addGlowTube = (p1, p2, p3) => {
      const curve = new THREE.QuadraticBezierCurve3(p1, p2, p3);
      const geom = new THREE.TubeGeometry(curve, 32, 2.5, 8, false);
      const mesh = new THREE.Mesh(geom, glowNeonMat);
      spireGroup.add(mesh);
    };

    // Front edge curves (Z = 30.5)
    addGlowTube(new THREE.Vector3(-180, 2, 30.5), new THREE.Vector3(-140, 80, 30.5), new THREE.Vector3(-90, 135, 30.5));
    addGlowTube(new THREE.Vector3(180, 2, 30.5), new THREE.Vector3(140, 80, 30.5), new THREE.Vector3(90, 135, 30.5));

    // Back edge curves (Z = -30.5)
    addGlowTube(new THREE.Vector3(-180, 2, -30.5), new THREE.Vector3(-140, 80, -30.5), new THREE.Vector3(-90, 135, -30.5));
    addGlowTube(new THREE.Vector3(180, 2, -30.5), new THREE.Vector3(140, 80, -30.5), new THREE.Vector3(90, 135, -30.5));

    // --- 4. GLOWING CONDUIT LINES (Up column faces) ---
    const conduitGeo = new THREE.BoxGeometry(2, 225, 1);
    
    // Front column lines
    const fcL = new THREE.Mesh(conduitGeo, glowNeonMat);
    fcL.position.set(-25, 247.5, 30.5);
    spireGroup.add(fcL);
    
    const fcR = new THREE.Mesh(conduitGeo, glowNeonMat);
    fcR.position.set(25, 247.5, 30.5);
    spireGroup.add(fcR);
    
    // Back column lines
    const bcL = new THREE.Mesh(conduitGeo, glowNeonMat);
    bcL.position.set(-25, 247.5, -30.5);
    spireGroup.add(bcL);
    
    const bcR = new THREE.Mesh(conduitGeo, glowNeonMat);
    bcR.position.set(25, 247.5, -30.5);
    spireGroup.add(bcR);

    // --- 5. GLOWING STRUCTURAL POWER NODES ---
    const nodeGeo = new THREE.BoxGeometry(8, 8, 8);
    const addPowerNode = (x, y, z) => {
      const mesh = new THREE.Mesh(nodeGeo, glowNeonMat);
      mesh.position.set(x, y, z);
      spireGroup.add(mesh);
    };

    // Buttress feet nodes
    addPowerNode(-180, 4, 30.5);
    addPowerNode(180, 4, 30.5);
    addPowerNode(-180, 4, -30.5);
    addPowerNode(180, 4, -30.5);

    // Crown pinnacle tip nodes
    addPowerNode(-32.5, 450, 0);
    addPowerNode(32.5, 450, 0);

    // --- 6. GLOWING ENERGY SLIT (Multi-layer white-hot core & cyan glow) ---
    const innerSlitMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White-hot core
    const outerSlitMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8 }); // Cyan outer glow
    
    const outerSlitGeo = new THREE.BoxGeometry(10, 315, 12);
    const outerMesh = new THREE.Mesh(outerSlitGeo, outerSlitMat);
    outerMesh.position.set(0, 135 + 315/2, 0);
    spireGroup.add(outerMesh);

    const innerSlitGeo = new THREE.BoxGeometry(3, 315, 14); // White-hot core
    this.energyCoreMesh = new THREE.Mesh(innerSlitGeo, innerSlitMat);
    this.energyCoreMesh.position.set(0, 135 + 315/2, 0);
    spireGroup.add(this.energyCoreMesh);

    // --- 7. CELESTIAL SKY BEAM (ShaderMaterial for minimal, upward pulsating beam) ---
    const beamShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00f0ff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          // Upward wave: wavelength is 12.0, speed is 10.0
          float pulse = sin(vUv.y * 12.0 - time * 10.0) * 0.5 + 0.5;
          // Minimal beam: fade out completely towards the top (Y = 1.0)
          float fade = pow(1.0 - vUv.y, 2.5);
          // Horizontal edge fade to look volumetric and soft
          float edgeFade = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          
          vec3 finalColor = mix(color, vec3(1.0), pulse * 0.3) * (0.6 + pulse * 0.9) * 1.5;
          gl_FragColor = vec4(finalColor, (0.15 + pulse * 0.85) * fade * edgeFade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.skyBeamMat = beamShaderMat;

    const beamGeo = new THREE.PlaneGeometry(8, 600); // 8m wide, 600m high (minimal)
    const skyBeam1 = new THREE.Mesh(beamGeo, beamShaderMat);
    skyBeam1.position.set(0, 450 + 300, 0); // centered above the 450m crown
    spireGroup.add(skyBeam1);

    const skyBeam2 = skyBeam1.clone();
    skyBeam2.rotation.y = Math.PI / 2;
    spireGroup.add(skyBeam2);

    // --- 8. POWERFUL ACCENT POINT LIGHTS ---
    const cavityLight = new THREE.PointLight(0x00ffff, 120000, 800);
    cavityLight.position.set(0, 290, 0);
    spireGroup.add(cavityLight);

    const crownLight = new THREE.PointLight(0x00ffff, 150000, 1000);
    crownLight.position.set(0, 450, 0);
    spireGroup.add(crownLight);

    this.heroGroup.add(spireGroup);
  }

  // 3. The Cross-Highways (Dividing the city)
  buildHighways() {
    const roadMat = new THREE.MeshBasicMaterial({ color: 0x000511 });
    const glowEdgeMat = new THREE.MeshBasicMaterial({ color: 0x0088ff });

    const createRoad = (width, length, x, z, rotY) => {
      const group = new THREE.Group();
      
      const road = new THREE.Mesh(new THREE.PlaneGeometry(width, length), roadMat);
      road.rotation.x = -Math.PI / 2;
      group.add(road);

      // Glowing edges
      const edgeL = new THREE.Mesh(new THREE.PlaneGeometry(2, length), glowEdgeMat);
      edgeL.rotation.x = -Math.PI / 2;
      edgeL.position.set(-width/2, 1, 0);
      group.add(edgeL);

      const edgeR = new THREE.Mesh(new THREE.PlaneGeometry(2, length), glowEdgeMat);
      edgeR.rotation.x = -Math.PI / 2;
      edgeR.position.set(width/2, 1, 0);
      group.add(edgeR);

      group.position.set(x, 0, z);
      group.rotation.y = rotY;
      return group;
    };

    // Main X-Axis Highway
    this.heroGroup.add(createRoad(60, 4000, 0, 0, 0));
    // Main Z-Axis Highway
    this.heroGroup.add(createRoad(60, 4000, 0, 0, Math.PI / 2));
    
    // Diagonal Highways (Creating the star pattern)
    this.heroGroup.add(createRoad(40, 4000, 0, 0, Math.PI / 4));
    this.heroGroup.add(createRoad(40, 4000, 0, 0, -Math.PI / 4));
    
    // Add moving traffic flowing OUTWARD from center (0, 2, 0) along 8 directions
    const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 0.75, Math.PI, -Math.PI * 0.75, -Math.PI / 2, -Math.PI / 4];
    angles.forEach(angle => {
      const start = new THREE.Vector3(0, 2, 0);
      const end = new THREE.Vector3(2000 * Math.sin(angle), 2, 2000 * Math.cos(angle));
      this.addTraffic(start, end, 20); // 20 packets per highway track = 160 total packets
    });
  }

  // 4. The Cloverleaf Interchange (Bottom Left of Reference)
  // 4. Disc Combat Arena (Bottom Left - Repurposed from Cloverleaf)
  buildCloverleaf() {
    const arenaGroup = new THREE.Group();
    arenaGroup.position.set(-500, 0, 400); // Bottom-left quadrant

    const darkMat = new THREE.MeshStandardMaterial({ 
      color: 0x050a12, 
      metalness: 0.8, 
      roughness: 0.15 
    });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    
    // --- Custom Shaders for Holographic Wall and Floor ---
    this.holoWallMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00eaff) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;
        void main() {
          vUv = uv;
          vLocalPos = position;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;
        void main() {
          float gridH = sin(vUv.y * 30.0) * 0.5 + 0.5;
          float isGridH = step(0.95, gridH);
          float gridV = sin(vUv.x * 12.0) * 0.5 + 0.5;
          float isGridV = step(0.94, gridV);
          float border = step(0.98, vUv.x) + step(vUv.x, 0.02) + step(0.96, vUv.y) + step(vUv.y, 0.04);
          border = clamp(border, 0.0, 1.0);
          float intensity = max(isGridH, isGridV) * 0.35 + border * 0.85;
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
          intensity += fresnel * 0.55;
          float pulse = 0.85 + 0.15 * sin(time * 6.0 + vLocalPos.y * 0.1);
          vec3 finalColor = color * intensity * pulse;
          gl_FragColor = vec4(finalColor, (0.1 + intensity * 0.6) * pulse);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.platformShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cyanColor: { value: new THREE.Color(0x00ffff) },
        orangeColor: { value: new THREE.Color(0xff5500) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vLocalPos;
        void main() {
          vUv = uv;
          vLocalPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 cyanColor;
        uniform vec3 orangeColor;
        varying vec2 vUv;
        varying vec3 vLocalPos;
        void main() {
          float dist = length(vUv - vec2(0.5));
          float ring1 = step(0.44, dist) * step(dist, 0.46);
          float ring2 = step(0.33, dist) * step(dist, 0.34);
          float ring3 = step(0.20, dist) * step(dist, 0.21);
          float centerNode = step(dist, 0.05);
          float concentricGlow = max(max(max(ring1, ring2), ring3), centerNode);
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float gridR = sin(angle * 12.0) * 0.5 + 0.5;
          float isGridR = step(0.98, gridR) * step(dist, 0.45) * step(0.1, dist);
          float rimTrim = step(0.48, dist) * step(dist, 0.50);
          float glow = max(concentricGlow, isGridR) * 0.65 + rimTrim * 0.95;
          vec3 baseColor = (vLocalPos.x < 0.0) ? cyanColor : orangeColor;
          vec3 finalColor = mix(baseColor * 0.12, vec3(1.0), glow);
          finalColor += baseColor * glow * 1.5;
          float pulse = 0.8 + 0.2 * sin(time * 8.0);
          finalColor += baseColor * concentricGlow * pulse * 0.5;
          gl_FragColor = vec4(finalColor, 0.9);
        }
      `
    });

    const glowCyanMat = new THREE.MeshBasicMaterial({ 
      color: 0x0088ff, 
      transparent: true, 
      opacity: 0.6, 
      blending: THREE.AdditiveBlending 
    });
    const brightCyanLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });

    // --- 1. HOLOGRAPHIC OUTER WALLS (Hexadecagon shape, R=220, height=75) ---
    const wallHeight = 75;
    const wallRadius = 220;
    const numWallSegments = 16;
    const segmentWidth = 2 * wallRadius * Math.sin(Math.PI / numWallSegments) - 6;
    
    const wallSegmentGeo = new THREE.BoxGeometry(segmentWidth, wallHeight, 10);
    
    for (let i = 0; i < numWallSegments; i++) {
      if (i === 4 || i === 12) continue; // Entrance Gates
      
      const angle = (i / numWallSegments) * Math.PI * 2;
      const x = Math.cos(angle) * wallRadius;
      const z = Math.sin(angle) * wallRadius;
      
      // Holographic glowing panels
      const wallMesh = new THREE.Mesh(wallSegmentGeo, this.holoWallMat);
      wallMesh.position.set(x, wallHeight / 2, z);
      wallMesh.rotation.y = -angle + Math.PI / 2;
      arenaGroup.add(wallMesh);
      
      // Glowing joints
      const jointGeo = new THREE.BoxGeometry(3, wallHeight + 4, 11);
      const joint = new THREE.Mesh(jointGeo, neonCyanMat);
      joint.position.set(x, wallHeight / 2, z);
      joint.rotation.y = -angle + Math.PI / 2;
      arenaGroup.add(joint);
    }
    
    // --- 2. TOWERING ARCHED RIBS ---
    const archRadius = 220;
    const archTube = 5;
    const archGeo = new THREE.TorusGeometry(archRadius, archTube, 8, 48, Math.PI);
    const glowArchGeo = new THREE.TorusGeometry(archRadius + 2.5, 1.5, 8, 48, Math.PI);
    
    const numArches = 4;
    for (let k = 0; k < numArches; k++) {
      const angle = (k / numArches) * Math.PI;
      
      const arch = new THREE.Mesh(archGeo, new THREE.MeshBasicMaterial({ color: 0x001133, transparent: true, opacity: 0.6 }));
      arch.rotation.y = angle;
      arenaGroup.add(arch);
      
      const glowArch = new THREE.Mesh(glowArchGeo, neonCyanMat);
      glowArch.rotation.y = angle;
      arenaGroup.add(glowArch);
    }

    // --- 3. SPECTATOR SEATING TIER RINGS (Glowing cyan) ---
    const tierGeo1 = new THREE.TorusGeometry(195, 10, 8, 48);
    const tier1 = new THREE.Mesh(tierGeo1, glowCyanMat);
    tier1.rotation.x = -Math.PI / 2;
    tier1.position.y = 22;
    arenaGroup.add(tier1);
    
    const l1 = new THREE.LineSegments(new THREE.EdgesGeometry(tierGeo1), brightCyanLineMat);
    l1.rotation.x = -Math.PI / 2;
    l1.position.y = 22;
    arenaGroup.add(l1);
    
    const tierGeo2 = new THREE.TorusGeometry(160, 8, 8, 48);
    const tier2 = new THREE.Mesh(tierGeo2, new THREE.MeshBasicMaterial({ color: 0x0044bb, transparent: true, opacity: 0.6 }));
    tier2.rotation.x = -Math.PI / 2;
    tier2.position.y = 14;
    arenaGroup.add(tier2);
    
    const l2 = new THREE.LineSegments(new THREE.EdgesGeometry(tierGeo2), brightCyanLineMat);
    l2.rotation.x = -Math.PI / 2;
    l2.position.y = 14;
    arenaGroup.add(l2);
    
    const tierGeo3 = new THREE.TorusGeometry(125, 6, 8, 48);
    const tier3 = new THREE.Mesh(tierGeo3, new THREE.MeshBasicMaterial({ color: 0x002288, transparent: true, opacity: 0.6 }));
    tier3.rotation.x = -Math.PI / 2;
    tier3.position.y = 7;
    arenaGroup.add(tier3);
    
    const l3 = new THREE.LineSegments(new THREE.EdgesGeometry(tierGeo3), brightCyanLineMat);
    l3.rotation.x = -Math.PI / 2;
    l3.position.y = 7;
    arenaGroup.add(l3);
    
    // Spectators instanced
    const specCount = 350;
    const specGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const specMesh = new THREE.InstancedMesh(specGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), specCount);
    arenaGroup.add(specMesh);
    
    const dummy = new THREE.Object3D();
    for (let i = 0; i < specCount; i++) {
      const tierRand = Math.random();
      let radius, height;
      if (tierRand < 0.4) {
        radius = 195;
        height = 27;
      } else if (tierRand < 0.75) {
        radius = 160;
        height = 18;
      } else {
        radius = 125;
        height = 10;
      }
      
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * (radius + (Math.random() - 0.5) * 6);
      const z = Math.sin(angle) * (radius + (Math.random() - 0.5) * 6);
      
      dummy.position.set(x, height, z);
      dummy.updateMatrix();
      specMesh.setMatrixAt(i, dummy.matrix);
      
      const color = Math.random() < 0.55 ? new THREE.Color(0x00ffff) : new THREE.Color(0xff5500);
      specMesh.setColorAt(i, color);
    }
    specMesh.instanceMatrix.needsUpdate = true;
    if (specMesh.instanceColor) specMesh.instanceColor.needsUpdate = true;
    
    // --- 4. CENTRAL COMBAT PLATFORM ---
    const platformRadius = 85;
    const platformHeight = 12;
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(platformRadius, platformRadius + 8, platformHeight, 32), this.platformShaderMat);
    platform.position.y = platformHeight / 2;
    arenaGroup.add(platform);
    
    // Support columns under platform
    const subColGeo = new THREE.CylinderGeometry(6, 6, platformHeight, 8);
    for (let j = 0; j < 8; j++) {
      const angle = (j / 8) * Math.PI * 2;
      const x = Math.cos(angle) * (platformRadius - 15);
      const z = Math.sin(angle) * (platformRadius - 15);
      const subCol = new THREE.Mesh(subColGeo, darkMat);
      subCol.position.set(x, platformHeight / 2, z);
      arenaGroup.add(subCol);
    }

    // Central dividing line
    const dividerGeo = new THREE.BoxGeometry(4, 0.4, platformRadius * 2 - 4);
    const divider = new THREE.Mesh(dividerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    divider.position.set(0, platformHeight + 0.3, 0);
    arenaGroup.add(divider);

    // --- 5. GLOWING PATHWAYS LEADING IN ---
    const createEntrancePath = (xOffset, zOffset, length, rotY) => {
      const roadGeo = new THREE.PlaneGeometry(40, length);
      const roadMat = new THREE.MeshBasicMaterial({ 
        color: 0x003366, 
        transparent: true, 
        opacity: 0.8,
        blending: THREE.AdditiveBlending 
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      
      const edgeL = new THREE.Mesh(new THREE.PlaneGeometry(2.5, length), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      edgeL.rotation.x = -Math.PI / 2;
      edgeL.position.set(-18.5, 0.2, 0);
      
      const edgeR = new THREE.Mesh(new THREE.PlaneGeometry(2.5, length), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      edgeR.rotation.x = -Math.PI / 2;
      edgeR.position.set(18.5, 0.2, 0);
      
      const lane1 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, length), new THREE.MeshBasicMaterial({ color: 0x00bfff }));
      lane1.rotation.x = -Math.PI / 2;
      lane1.position.set(-6, 0.15, 0);
      
      const lane2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, length), new THREE.MeshBasicMaterial({ color: 0x00bfff }));
      lane2.rotation.x = -Math.PI / 2;
      lane2.position.set(6, 0.15, 0);
      
      const centerStrip = new THREE.Mesh(new THREE.PlaneGeometry(2, length), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      centerStrip.rotation.x = -Math.PI / 2;
      centerStrip.position.set(0, 0.2, 0);
      
      const pathGroup = new THREE.Group();
      pathGroup.add(road);
      pathGroup.add(edgeL);
      pathGroup.add(edgeR);
      pathGroup.add(lane1);
      pathGroup.add(lane2);
      pathGroup.add(centerStrip);
      
      pathGroup.position.set(xOffset, 1.5, zOffset);
      pathGroup.rotation.y = rotY;
      return pathGroup;
    };
    
    arenaGroup.add(createEntrancePath(0, 240, 120, 0));
    arenaGroup.add(createEntrancePath(0, -240, 120, 0));

    // --- 6. FLOATING HOLOGRAPHIC SCOREBOARDS ---
    this.holoScoreboards = [];
    const holoMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ffff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float gridX = sin(vUv.x * 30.0) * 0.5 + 0.5;
          float gridY = sin(vUv.y * 15.0) * 0.5 + 0.5;
          float grid = step(0.96, gridX) + step(0.96, gridY);
          float border = step(0.97, vUv.x) + step(vUv.x, 0.03) + step(0.95, vUv.y) + step(vUv.y, 0.05);
          border = clamp(border, 0.0, 1.0);
          float flicker = 0.8 + 0.2 * sin(time * 25.0 + vUv.y * 10.0);
          float scanline = sin(vUv.y * 120.0 + time * 8.0) * 0.15 + 0.85;
          float mask = grid * 0.2 + border * 0.8;
          gl_FragColor = vec4(color * (0.5 + mask * 1.5) * scanline * flicker, (0.15 + mask * 0.7) * flicker);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const holoGeo = new THREE.PlaneGeometry(70, 30);
    const numHolo = 4;
    for (let i = 0; i < numHolo; i++) {
      const angle = (i / numHolo) * Math.PI * 2;
      const x = Math.cos(angle) * 130;
      const z = Math.sin(angle) * 130;
      
      const scoreboard = new THREE.Mesh(holoGeo, holoMat);
      scoreboard.position.set(x, 95, z);
      scoreboard.lookAt(new THREE.Vector3(-500, 30, 400));
      scoreboard.rotation.x = -0.25;
      
      arenaGroup.add(scoreboard);
      this.holoScoreboards.push({
        mesh: scoreboard,
        angle: angle,
        radius: 130,
        baseY: 95
      });
    }

    // --- 7. HOLOGRAPHIC COMBAT DISC ---
    const discGeo = new THREE.TorusGeometry(12, 1.6, 8, 24);
    this.combatDisc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    this.combatDisc.rotation.x = -Math.PI / 2;
    this.combatDisc.position.set(-15, platformHeight + 5, -15);
    arenaGroup.add(this.combatDisc);

    // --- 8. OUTER PANEL RIM SIGNAGE ---
    const rimTextGeo = new THREE.TorusGeometry(220, 2, 8, 64);
    const rimTextMesh = new THREE.Mesh(rimTextGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    rimTextMesh.rotation.x = -Math.PI / 2;
    rimTextMesh.position.y = wallHeight + 1.0;
    arenaGroup.add(rimTextMesh);
    
    const numPanels = 18;
    const panelGeo = new THREE.BoxGeometry(20, 4, 3);
    const panelGlowGeo = new THREE.BoxGeometry(16, 2.5, 0.5);
    for (let p = 0; p < numPanels; p++) {
      const angle = (p / numPanels) * Math.PI * 2;
      const x = Math.cos(angle) * 221;
      const z = Math.sin(angle) * 221;
      
      const panel = new THREE.Mesh(panelGeo, darkMat);
      panel.position.set(x, wallHeight - 2, z);
      panel.rotation.y = -angle + Math.PI / 2;
      arenaGroup.add(panel);
      
      const isCyan = Math.random() < 0.7;
      const rimPanelGlowMat = new THREE.MeshBasicMaterial({ color: isCyan ? 0x00ffff : 0xffaa00 });
      const pGlow = new THREE.Mesh(panelGlowGeo, rimPanelGlowMat);
      pGlow.position.set(x, wallHeight - 2, z + (z > 0 ? 1.6 : -1.6));
      pGlow.rotation.y = -angle + Math.PI / 2;
      arenaGroup.add(pGlow);
    }

    // --- 9. CYAN VOLUMETRIC WAYPOINT BEACON ---
    const beaconGeo = new THREE.PlaneGeometry(12, 600);
    const beaconShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00f0ff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float pulse = sin(vUv.y * 20.0 - time * 12.0) * 0.5 + 0.5;
          float fade = pow(1.0 - vUv.y, 2.0);
          float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          vec3 finalColor = color * (0.8 + pulse * 0.6) * 1.5;
          gl_FragColor = vec4(finalColor, (0.15 + pulse * 0.6) * fade * edgeFade * 0.7);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const beacon1 = new THREE.Mesh(beaconGeo, beaconShaderMat);
    beacon1.position.set(0, 250, 0);
    arenaGroup.add(beacon1);
    
    const beacon2 = beacon1.clone();
    beacon2.rotation.y = Math.PI / 2;
    arenaGroup.add(beacon2);
    
    this.discArenaBeaconMat = beaconShaderMat;

    this.heroGroup.add(arenaGroup);
  }

  // 5. Submerged Industrial Generator (Top Left - Repurposed from Empty Ring)
  buildCircularStadium() {
    const stadiumGroup = new THREE.Group();
    stadiumGroup.position.set(-600, 0, -400);

    const ringY = 15;

    // Main Outer Industrial Ring (Torus) - Dark Metallic Matte
    const bowlGeo = new THREE.TorusGeometry(140, 25, 16, 64);
    const darkMat = new THREE.MeshStandardMaterial({ 
      color: 0x070c14, 
      metalness: 0.4, 
      roughness: 0.8 
    });
    const bowl = new THREE.Mesh(bowlGeo, darkMat);
    bowl.rotation.x = -Math.PI / 2;
    bowl.position.y = ringY;
    stadiumGroup.add(bowl);

    // Subtle edge lines - Dim electric blue
    const ringEdges = new THREE.EdgesGeometry(bowlGeo);
    const ringEdgeLines = new THREE.LineSegments(
      ringEdges, 
      new THREE.LineBasicMaterial({ color: 0x004477, linewidth: 1 })
    );
    ringEdgeLines.rotation.x = -Math.PI / 2;
    ringEdgeLines.position.y = ringY;
    stadiumGroup.add(ringEdgeLines);

    // Concrete support pillars
    const pillarGeo = new THREE.CylinderGeometry(8, 12, ringY + 10, 8);
    const numPillars = 8;
    for (let i = 0; i < numPillars; i++) {
      const angle = (i / numPillars) * Math.PI * 2;
      const x = Math.cos(angle) * 140;
      const z = Math.sin(angle) * 140;
      
      const pillar = new THREE.Mesh(pillarGeo, darkMat);
      pillar.position.set(x, (ringY + 10) / 2 - 5, z);
      stadiumGroup.add(pillar);
      
      const bracketGeo = new THREE.CylinderGeometry(13, 13, 3, 8);
      const bracket = new THREE.Mesh(bracketGeo, darkMat);
      bracket.position.set(x, ringY - 2, z);
      stadiumGroup.add(bracket);
    }

    // Central generator component
    const coreGeo = new THREE.CylinderGeometry(60, 70, 20, 16);
    const generatorCore = new THREE.Mesh(coreGeo, darkMat);
    generatorCore.position.y = 10;
    stadiumGroup.add(generatorCore);

    // Dim, slow-pulsing circular status indicators
    const ringGeo2 = new THREE.TorusGeometry(80, 2, 8, 64);
    const dimGlowMat = new THREE.MeshBasicMaterial({ color: 0x003366 });
    const ring2 = new THREE.Mesh(ringGeo2, dimGlowMat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 15;
    stadiumGroup.add(ring2);

    // Connect to city fabric with industrial conduits
    const pipeGeo = new THREE.CylinderGeometry(4, 4, 160, 8);
    const directions = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    directions.forEach(angle => {
      const pipe = new THREE.Mesh(pipeGeo, darkMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.rotation.y = angle;
      pipe.position.set(80 * Math.cos(angle), 5, 80 * Math.sin(angle));
      stadiumGroup.add(pipe);
      
      const lineGeo = new THREE.BoxGeometry(160, 0.5, 0.5);
      const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0x003366 }));
      line.rotation.y = angle;
      line.position.set(80 * Math.cos(angle), 9.5, 80 * Math.sin(angle));
      stadiumGroup.add(line);
    });

    this.heroGroup.add(stadiumGroup);
  }

  // 6. Light-Race Complex (Bottom Right - Repurposed from Rectangular Arena)
  buildRectangularArena() {
    const arenaGroup = new THREE.Group();
    arenaGroup.position.set(600, 0, 400);

    const darkMat = new THREE.MeshStandardMaterial({ 
      color: 0x050a12, 
      metalness: 0.85, 
      roughness: 0.15 
    });
    const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const glowingOrangeStructMat = new THREE.MeshBasicMaterial({ 
      color: 0xff5500, 
      transparent: true, 
      opacity: 0.25,
      blending: THREE.AdditiveBlending 
    });
    const brightOrangeLineMat = new THREE.LineBasicMaterial({ color: 0xff7700, linewidth: 2 });
    
    // --- 1. DEFINING THE ANTI-GRAVITY 3D LOOP PATH (Sky-weaving Monumental) ---
    const trackPoints = [
      new THREE.Vector3(-140, 10, -220),
      new THREE.Vector3(120, 12, -220),
      new THREE.Vector3(260, 45, -120),
      new THREE.Vector3(240, 110, 40),
      new THREE.Vector3(80, 180, 160),
      new THREE.Vector3(-120, 130, 240),
      new THREE.Vector3(-240, 80, 120),
      new THREE.Vector3(-200, 30, -30),
      new THREE.Vector3(-240, 15, -120),
    ];
    
    this.raceCurve = new THREE.CatmullRomCurve3(trackPoints);
    this.raceCurve.closed = true;

    // --- 2. GENERATING THE TRACK GEOMETRY ---
    this.raceTrackMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        orangeColor: { value: new THREE.Color(0xff5500) },
        cyanColor: { value: new THREE.Color(0x00ffff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 orangeColor;
        uniform vec3 cyanColor;
        varying vec2 vUv;
        
        void main() {
          float uScroll = vUv.x * 80.0 - time * 12.0;
          float vCenter = fract(vUv.y * 2.0);
          float distToCenter = abs(vCenter - 0.5) * 2.0;
          
          float chevron = sin(uScroll - distToCenter * 4.0) * 0.5 + 0.5;
          float chevronActive = step(0.92, chevron) * step(distToCenter, 0.7);
          float borderLanes = step(0.85, distToCenter);
          float centerDash = step(0.97, sin(uScroll)) * step(distToCenter, 0.08);
          
          float trackGlow = max(max(chevronActive * 0.8, borderLanes * 0.95), centerDash * 1.0);
          vec3 baseColor = orangeColor;
          if (centerDash > 0.5) {
            baseColor = cyanColor;
          }
          
          vec3 finalColor = mix(orangeColor * 0.05, vec3(1.0), trackGlow);
          finalColor += baseColor * trackGlow * 2.0;
          
          gl_FragColor = vec4(finalColor, 0.65 + trackGlow * 0.35);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide
    });

    const tubeGeo = new THREE.TubeGeometry(this.raceCurve, 128, 25, 8, true);
    this.raceTrackMesh = new THREE.Mesh(tubeGeo, this.raceTrackMat);
    this.raceTrackMesh.scale.set(1.0, 0.08, 1.0);
    arenaGroup.add(this.raceTrackMesh);

    // Glowing rails
    const railMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const railGeoLeft = new THREE.TubeGeometry(this.raceCurve, 128, 3.0, 4, true);
    const railLeft = new THREE.Mesh(railGeoLeft, railMat);
    railLeft.scale.set(1.04, 0.1, 1.04);
    arenaGroup.add(railLeft);

    const railRight = new THREE.Mesh(railGeoLeft, new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    railRight.scale.set(0.96, 0.1, 0.96);
    arenaGroup.add(railRight);

    // --- 3. STARTING GRID & START ARCH ---
    const gridStartPos = new THREE.Vector3(-10, 2, -220);
    
    const gridPadGeo = new THREE.BoxGeometry(180, 0.5, 50);
    const gridPad = new THREE.Mesh(gridPadGeo, glowingOrangeStructMat);
    gridPad.position.copy(gridStartPos);
    arenaGroup.add(gridPad);
    
    const linesPad = new THREE.LineSegments(new THREE.EdgesGeometry(gridPadGeo), brightOrangeLineMat);
    linesPad.position.copy(gridStartPos);
    arenaGroup.add(linesPad);
    
    const gridLinesGeo = new THREE.BoxGeometry(160, 0.2, 2);
    for (let j = -20; j <= 20; j += 8) {
      const line = new THREE.Mesh(gridLinesGeo, new THREE.MeshBasicMaterial({ color: 0xff9900 }));
      line.position.copy(gridStartPos).add(new THREE.Vector3(0, 0.4, j));
      arenaGroup.add(line);
    }
    
    const archGroup = new THREE.Group();
    const columnGeo = new THREE.BoxGeometry(10, 85, 10);
    
    const colL = new THREE.Mesh(columnGeo, glowingOrangeStructMat);
    colL.position.set(-50, 42.5, 0);
    archGroup.add(colL);
    
    const linesL = new THREE.LineSegments(new THREE.EdgesGeometry(columnGeo), brightOrangeLineMat);
    linesL.position.set(-50, 42.5, 0);
    archGroup.add(linesL);
    
    const colR = new THREE.Mesh(columnGeo, glowingOrangeStructMat);
    colR.position.set(50, 42.5, 0);
    archGroup.add(colR);
    
    const linesR = new THREE.LineSegments(new THREE.EdgesGeometry(columnGeo), brightOrangeLineMat);
    linesR.position.set(50, 42.5, 0);
    archGroup.add(linesR);
    
    const beamGeo = new THREE.BoxGeometry(110, 10, 12);
    const beam = new THREE.Mesh(beamGeo, glowingOrangeStructMat);
    beam.position.set(0, 85, 0);
    archGroup.add(beam);
    
    const linesBeam = new THREE.LineSegments(new THREE.EdgesGeometry(beamGeo), brightOrangeLineMat);
    linesBeam.position.set(0, 85, 0);
    archGroup.add(linesBeam);
    
    const signGeo = new THREE.BoxGeometry(80, 4, 13);
    const sign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    sign.position.set(0, 80, 0);
    archGroup.add(sign);
    
    archGroup.position.copy(gridStartPos);
    arenaGroup.add(archGroup);

    // --- 4. PIT LANES ---
    const pitGroup = new THREE.Group();
    pitGroup.position.set(-10, 1, -260);
    
    const pitBaseGeo = new THREE.BoxGeometry(220, 6, 35);
    const pitBase = new THREE.Mesh(pitBaseGeo, glowingOrangeStructMat);
    pitGroup.add(pitBase);
    
    const linesPitBase = new THREE.LineSegments(new THREE.EdgesGeometry(pitBaseGeo), brightOrangeLineMat);
    pitGroup.add(linesPitBase);
    
    const bayGeo = new THREE.BoxGeometry(32, 18, 25);
    const bayGlowGeo = new THREE.BoxGeometry(28, 14, 1);
    for (let k = 0; k < 5; k++) {
      const xOffset = -80 + k * 40;
      const bay = new THREE.Mesh(bayGeo, glowingOrangeStructMat);
      bay.position.set(xOffset, 9, 0);
      pitGroup.add(bay);
      
      const linesBay = new THREE.LineSegments(new THREE.EdgesGeometry(bayGeo), brightOrangeLineMat);
      linesBay.position.set(xOffset, 9, 0);
      pitGroup.add(linesBay);
      
      const bayGlow = new THREE.Mesh(bayGlowGeo, new THREE.MeshBasicMaterial({ color: 0xff4400 }));
      bayGlow.position.set(xOffset, 9, 12.6);
      pitGroup.add(bayGlow);
    }
    arenaGroup.add(pitGroup);

    // --- 5. ELEVATED GRANDSTAND ---
    const grandstand = new THREE.Group();
    grandstand.position.set(-10, 1, -165);
    
    const baseStepGeo = new THREE.BoxGeometry(220, 10, 40);
    const step1 = new THREE.Mesh(baseStepGeo, glowingOrangeStructMat);
    step1.position.y = 5;
    grandstand.add(step1);
    
    const linesStep1 = new THREE.LineSegments(new THREE.EdgesGeometry(baseStepGeo), brightOrangeLineMat);
    linesStep1.position.y = 5;
    grandstand.add(linesStep1);
    
    const step2Geo = new THREE.BoxGeometry(220, 10, 25);
    const step2 = new THREE.Mesh(step2Geo, glowingOrangeStructMat);
    step2.position.set(0, 15, -7.5);
    grandstand.add(step2);
    
    const linesStep2 = new THREE.LineSegments(new THREE.EdgesGeometry(step2Geo), brightOrangeLineMat);
    linesStep2.position.set(0, 15, -7.5);
    grandstand.add(linesStep2);
    
    const canopyGeo = new THREE.BoxGeometry(230, 4, 45);
    const canopy = new THREE.Mesh(canopyGeo, glowingOrangeStructMat);
    canopy.position.set(0, 40, -5);
    grandstand.add(canopy);
    
    const linesCanopy = new THREE.LineSegments(new THREE.EdgesGeometry(canopyGeo), brightOrangeLineMat);
    linesCanopy.position.set(0, 40, -5);
    grandstand.add(linesCanopy);
    
    const canopyGlow = new THREE.Mesh(new THREE.BoxGeometry(220, 0.5, 38), neonOrangeMat);
    canopyGlow.position.set(0, 37.8, -5);
    grandstand.add(canopyGlow);
    
    const grandColumnGeo = new THREE.CylinderGeometry(2, 2, 40, 8);
    for (let c = -100; c <= 100; c += 200) {
      const col = new THREE.Mesh(grandColumnGeo, glowingOrangeStructMat);
      col.position.set(c, 20, 15);
      col.rotation.z = -c * 0.001;
      grandstand.add(col);
    }
    arenaGroup.add(grandstand);

    // --- 6. RACING LIGHT CYCLES WITH SOLID LIGHT TRAILS ---
    const numCycles = 4;
    const cycleGeo = new THREE.BoxGeometry(3.5, 1.4, 7.0);
    
    this.lightCycles = [];
    
    for (let i = 0; i < numCycles; i++) {
      const color = i < 2 ? 0xff5500 : 0x00ffff;
      const mat = new THREE.MeshBasicMaterial({ color: color });
      
      const cycleMesh = new THREE.Mesh(cycleGeo, mat);
      arenaGroup.add(cycleMesh);
      
      const trails = [];
      for (let t = 0; t < 4; t++) {
        const trailGeo = new THREE.BoxGeometry(0.4, 6, 12);
        const trailMesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ 
          color: color, 
          transparent: true, 
          opacity: 0.9 - t * 0.22,
          blending: THREE.AdditiveBlending
        }));
        arenaGroup.add(trailMesh);
        trails.push(trailMesh);
      }
      
      this.lightCycles.push({
        mesh: cycleMesh,
        trails: trails,
        progress: (i / numCycles) * 0.9,
        speed: 0.0035 + Math.random() * 0.0015
      });
    }

    // --- 7. ORANGE VOLUMETRIC WAYPOINT BEACON ---
    const beaconGeo = new THREE.PlaneGeometry(12, 600);
    const beaconShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xff5500) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float pulse = sin(vUv.y * 20.0 - time * 12.0) * 0.5 + 0.5;
          float fade = pow(1.0 - vUv.y, 2.0);
          float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          vec3 finalColor = color * (0.8 + pulse * 0.6) * 1.5;
          gl_FragColor = vec4(finalColor, (0.15 + pulse * 0.6) * fade * edgeFade * 0.7);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const beacon1 = new THREE.Mesh(beaconGeo, beaconShaderMat);
    beacon1.position.set(0, 250, 0);
    arenaGroup.add(beacon1);
    
    const beacon2 = beacon1.clone();
    beacon2.rotation.y = Math.PI / 2;
    arenaGroup.add(beacon2);
    
    this.raceComplexBeaconMat = beaconShaderMat;

    this.heroGroup.add(arenaGroup);
  }

  // 7. Dense City Blocks (Thousands of Buildings via Instancing)
  buildDenseCityBlocks() {
    const buildingCount = 15000;
    
    // Simple box geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Instead of using complex edges on 15000 buildings, we use a custom shader material
    // that simulates glowing edges on a dark box (Wireframe projection)
    this.buildingMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x00aaff) },
        baseColor: { value: new THREE.Color(0x000205) },
        buildProgress: { value: 0.0 },
        time: { value: 0.0 }
      },
      vertexShader: `
        uniform float buildProgress;
        varying vec3 vPosition;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec3 vInstancePos;
        varying vec3 vScale;
        varying vec3 vWorldPos;

        void main() {
          vPosition = position;
          vLocalNormal = normal;
          
          // Distance from center based on instance matrix translation
          vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          vInstancePos = instancePos;
          
          float dist = length(instancePos.xz);
          
          // Shockwave delay based on distance (center builds first)
          float delay = dist / 4000.0; 
          float localProgress = clamp((buildProgress - delay) * 2.5, 0.0, 1.0);
          
          // Smooth curve
          float easeProgress = localProgress * localProgress * (3.0 - 2.0 * localProgress);
          
          // Extract building scale from the instance matrix
          vScale = vec3(
            length(instanceMatrix[0].xyz),
            length(instanceMatrix[1].xyz),
            length(instanceMatrix[2].xyz)
          );
          
          // Static local position for stable procedural textures during growth
          vLocalPos = position * vScale;
          
          vec3 pos = position;
          // Scale height from the bottom up (-0.5 to 0.5)
          pos.y = (pos.y + 0.5) * easeProgress - 0.5;
          
          // Calculate world position
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform vec3 baseColor;
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec3 vInstancePos;
        varying vec3 vScale;
        varying vec3 vWorldPos;

        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
        }

        void main() {
          float bRand = hash(vInstancePos);
          float distToCore = length(vInstancePos.xz);
          
          // Spatial density scaling: closer to spire = higher density (5x higher base energy density)
          float density = mix(0.2, 1.0, smoothstep(2000.0, 100.0, distToCore));
          
          // Radial Heartbeat pulse wave propagation
          float wavePos = mod(time, 4.0) * 600.0;
          float waveDist = distToCore - wavePos;
          float waveWindow = smoothstep(-300.0, 0.0, waveDist) * smoothstep(80.0, 0.0, waveDist);
          float ripple = sin(waveDist * 0.08) * 0.5 + 0.5;
          float waveFade = clamp(1.0 - distToCore / 2200.0, 0.0, 1.0);
          float waveGlow = ripple * waveWindow * waveFade * 1.5;
          
          // Modulate neon brightness dynamically with the heartbeat wave and density
          float neonIntensity = mix(0.4, 1.5, density) * (1.0 + waveGlow * 2.0);
          
          // Calculate distance to edges in local units (meters)
          float distToEdgeX = vScale.x * 0.5 - abs(vLocalPos.x);
          float distToEdgeY = vScale.y * 0.5 - abs(vLocalPos.y);
          float distToEdgeZ = vScale.z * 0.5 - abs(vLocalPos.z);
          
          // Setup orientation coordinates
          float horizCoord = (abs(vLocalNormal.x) > 0.5) ? vLocalPos.z : vLocalPos.x;
          float vertCoord = vLocalPos.y;
          
          // Define physical edge distance for the active face
          float edgeDist = 999.0;
          if (abs(vLocalNormal.y) > 0.5) {
            edgeDist = min(distToEdgeX, distToEdgeZ);
          } else if (abs(vLocalNormal.x) > 0.5) {
            edgeDist = min(distToEdgeY, distToEdgeZ);
          } else {
            edgeDist = min(distToEdgeY, distToEdgeX);
          }
          
          // Crisp neon border (constant thickness of 0.35m)
          float borderThickness = 0.35;
          float isNeonBorder = smoothstep(borderThickness, 0.0, edgeDist);
          
          // Tron Color Palette setup
          vec3 neonColor = vec3(0.0, 0.75, 1.0); // Tron Cyan
          vec3 traceColor = vec3(0.0, 0.45, 0.9); // Tron Electric Blue
          
          // 10% of buildings belong to the Orange enemy sector
          float bColorRand = fract(bRand * 7.13);
          if (bColorRand < 0.1) {
            neonColor = vec3(1.0, 0.45, 0.0); // Tron Orange
            traceColor = vec3(1.0, 0.25, 0.0); // Deep Orange
          }
          
          // Apply neon intensity modulation
          neonColor *= neonIntensity;
          traceColor *= neonIntensity;
          
          // Initialize light parameters
          float isLit = 0.0;
          float isGroove = 0.0; // Dark shadow groove surrounding glowing circuits for 3D depth
          vec3 activeGlowColor = traceColor;
          
          // 1. TOP FACE: Silicon Chip connection pins or Concentric Logic Rings
          float topGlow = 0.0;
          if (vLocalNormal.y > 0.5) {
            if (vScale.y <= 35.0) {
              // Flat Silicon Chip: Grid of pins
              float gridSpacing = 10.0;
              vec2 topGrid = vLocalPos.xz / gridSpacing;
              vec2 topFract = fract(topGrid);
              vec2 topId = floor(topGrid);
              
              // Draw a circular pin/pad at center of grid cell
              float distToPinCenter = length(topFract - vec2(0.5));
              float isPin = smoothstep(0.22, 0.16, distToPinCenter);
              
              // Only illuminate some pins
              float pinRand = hash(vec3(topId, hash(vInstancePos)));
              float pinActive = step(pinRand, 0.5);
              topGlow = isPin * pinActive;
              activeGlowColor = neonColor;
              
              // 3D Sunken Pin Socket Shadow
              isGroove = smoothstep(0.3, 0.22, distToPinCenter) * pinActive;
            } else {
              // Tall Spire/Logic Tower: Concentric circular target rings
              float centerDist = length(vLocalPos.xz);
              float minDim = min(vScale.x, vScale.z);
              float r1 = minDim * 0.2;
              float r2 = minDim * 0.35;
              
              float ring1 = smoothstep(0.4, 0.0, abs(centerDist - r1));
              float ring2 = smoothstep(0.4, 0.0, abs(centerDist - r2));
              topGlow = max(ring1, ring2) * 0.8;
              activeGlowColor = neonColor;
              
              // Concentric 3D Grooves
              float ringGroove1 = smoothstep(0.8, 0.4, abs(centerDist - r1));
              float ringGroove2 = smoothstep(0.8, 0.4, abs(centerDist - r2));
              isGroove = max(ringGroove1, ringGroove2) * 0.5;
            }
          }
          
          // 2. SIDE FACES: Animated streams (Spires) or Circuit board traces (Blocks/Chips)
          float sideGlow = 0.0;
          if (abs(vLocalNormal.y) <= 0.5) {
            float distToEdgeH = (abs(vLocalNormal.x) > 0.5) ? distToEdgeZ : distToEdgeX;
            float distToEdgeV = distToEdgeY;
            
            // Only draw inside building bounds (clear of border edges)
            if (distToEdgeH > 1.2 && distToEdgeV > 1.2) {
              if (vScale.y > 100.0) {
                // Animated vertical falling data streams (Data Spires) - speed scales with density
                float flowSpeed = mix(15.0, 50.0, density); // Units per second
                float flowCoord = vertCoord - time * flowSpeed;
                float dataGridY = flowCoord / 20.0;
                float dataIdY = floor(dataGridY);
                float dataFractY = fract(dataGridY);
                
                float dataGridX = horizCoord / 6.0;
                float dataIdX = floor(dataGridX);
                float dataFractX = fract(dataGridX);
                
                float isStream = step(0.4, dataFractX) * step(dataFractX, 0.6) * 
                                 step(0.2, dataFractY) * step(dataFractY, 0.8);
                
                float streamRand = hash(vec3(dataIdX, dataIdY, hash(vInstancePos)));
                
                // Pulse frequency scales with density
                float pulseSpeed = mix(2.0, 8.0, density);
                float isStreamActive = step(streamRand, 0.4) * (0.4 + 0.6 * sin(time * pulseSpeed + streamRand * 10.0));
                
                sideGlow = isStream * isStreamActive;
                activeGlowColor = mix(neonColor, vec3(1.0) * neonIntensity, 0.3); // white-hot core
                
                // Vertical groove shadow
                float isGrooveH = step(0.3, dataFractX) * step(dataFractX, 0.7);
                float isGrooveV = step(0.1, dataFractY) * step(dataFractY, 0.9);
                isGroove = isGrooveH * isGrooveV * (1.0 - sideGlow) * step(streamRand, 0.4) * 0.6;
                
              } else {
                // Circuit board logic lines and intersection pads - line density scales with density
                float gridSpacing = 12.0;
                float traceX = horizCoord / gridSpacing;
                float traceY = vertCoord / gridSpacing;
                vec2 traceId = floor(vec2(traceX, traceY));
                vec2 traceFract = fract(vec2(traceX, traceY));
                
                // Draw grid lines
                float lineThickness = 0.035;
                float isLine = step(traceFract.x, lineThickness) + step(traceFract.y, lineThickness);
                
                // Randomly activate lines (probability scales with density)
                float lineRand = hash(vec3(traceId, hash(vInstancePos)));
                float lineThreshold = 0.15 + 0.35 * density;
                isLine *= step(lineRand, lineThreshold);
                
                // Draw circular contact pad at intersections
                float dotRadius = 0.16;
                float distToIntersection = length(traceFract - vec2(0.0));
                float isDot = smoothstep(dotRadius, dotRadius - 0.03, distToIntersection);
                
                // 25% of intersections have dots
                float dotActive = step(hash(vec3(traceId + 0.5, hash(vInstancePos))), 0.25);
                isDot *= dotActive;
                
                sideGlow = max(isLine, isDot);
                activeGlowColor = mix(traceColor, neonColor, isDot);
                
                // Circuit board carved groove shadow
                float lineGroove = (step(traceFract.x, 0.08) + step(traceFract.y, 0.08)) * step(lineRand, lineThreshold);
                float dotGroove = smoothstep(0.24, 0.16, distToIntersection) * dotActive;
                isGroove = max(lineGroove, dotGroove) * (1.0 - sideGlow) * 0.7;
              }
            }
          }
          
          // 3. Volumetric Specular & Diffuse shading
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 normal = normalize(vLocalNormal);
          
          // Specular highlight from the central spire core (at x=0, y=150, z=0)
          vec3 lightPos = vec3(0.0, 150.0, 0.0);
          vec3 lightDir = normalize(lightPos - vWorldPos);
          
          // Diffuse shading (Lambertian + Rim Shading from the Spire core)
          float diffuse = max(dot(normal, lightDir), 0.0);
          // Add directional key light from top-left (for distinct 3D volume/edges)
          vec3 keyLightDir = normalize(vec3(-0.5, 0.8, 0.3));
          float keyDiffuse = max(dot(normal, keyLightDir), 0.0);
          float totalDiffuse = mix(0.1, 0.65, diffuse * 0.6 + keyDiffuse * 0.4);
          
          // Fresnel effect (glass rim reflection)
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
          vec3 glassReflection = neonColor * fresnel * 0.45;
          
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
          vec3 specularHighlight = vec3(0.9, 0.95, 1.0) * spec * 0.65;
          
          // Deepen grooves (carved depth shadows)
          float grooveFactor = 1.0 - isGroove;
          
          // Base metallic structure with ambient and volumetric diffuse shading
          vec3 structuralColor = vec3(0.04, 0.07, 0.12) * totalDiffuse * grooveFactor;
          
          // Assemble lighting layers
          vec3 finalColor = structuralColor + glassReflection * grooveFactor + specularHighlight;
          
          // Neon border glow
          finalColor = mix(finalColor, neonColor, isNeonBorder * 0.95);
          
          // Top face logic glow
          if (vLocalNormal.y > 0.5) {
            finalColor = mix(finalColor, activeGlowColor, topGlow);
          }
          
          // Side face trace / stream glow
          if (abs(vLocalNormal.y) <= 0.5) {
            finalColor = mix(finalColor, activeGlowColor, sideGlow * 0.95);
          }
          
          // Apply atmospheric fog / height fade (darker at bottom)
          float heightFade = smoothstep(-0.5, 0.5, vPosition.y);
          float glowFade = mix(0.15, 1.0, heightFade);
          finalColor = mix(baseColor, finalColor, glowFade);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const maxBuildings = 2000;
    const instancedMesh = new THREE.InstancedMesh(geometry, this.buildingMaterial, maxBuildings);
    
    const dummy = new THREE.Object3D();
    let index = 0;

    const gridSize = 80;
    
    for (let x = -2000; x <= 2000; x += gridSize) {
      for (let z = -2000; z <= 2000; z += gridSize) {
        if (index >= maxBuildings) break;

        // Exclude Central Spire
        if (Math.abs(x) < 300 && Math.abs(z) < 300) continue;
        // Exclude Cross Highways (X and Z axes)
        if (Math.abs(x) < 90 || Math.abs(z) < 90) continue;
        // Exclude Diagonal Highways
        if (Math.abs(x - z) < 90 || Math.abs(x + z) < 90) continue;
        // Exclude Submerged Industrial Generator
        if (Math.hypot(x - (-600), z - (-400)) < 120) continue;
        // Exclude Grid Arena (Monumental Ground Base)
        if (x > 360 && x < 840 && z > 100 && z < 700) continue;
        // Exclude Cloverleaf (Monumental Disc Arena)
        if (Math.hypot(x - (-500), z - 400) < 250) continue;
        
        // Circular city boundary
        const distToCenter = Math.hypot(x, z);
        if (distToCenter > 2000) continue;
        
        // Randomly skip 22% of sites (slightly higher density) to create natural motherboard gaps
        if (Math.random() < 0.22) continue;
        
        // We have a valid grid cell! Let's place a building:
        const structRand = Math.random();
        let width, height, depth;
        
        // Scale height based on distance
        const maxHeight = Math.max(40, 500 - (distToCenter * 0.2));
        
        if (structRand < 0.15) {
          // Data Spire (Tall, slender capacitor)
          width = 16 + Math.random() * 6;
          depth = 16 + Math.random() * 6;
          height = (230 + Math.random() * 200) * (maxHeight / 500.0);
          height = Math.max(160, height);
        } else if (structRand < 0.35) {
          // Silicon Chip (Flat, low block)
          width = 54 + Math.random() * 10;
          depth = 54 + Math.random() * 10;
          height = 12 + Math.random() * 8;
        } else {
          // Logic Block (Standard monolithic motherboard component)
          width = 30 + Math.random() * 18;
          depth = 30 + Math.random() * 18;
          height = (80 + Math.random() * 140) * (maxHeight / 500.0);
          height = Math.max(40, height);
        }
        
        // Footprint safety limits inside 80m grid cell (min 16m street gap width)
        width = Math.min(width, gridSize - 16);
        depth = Math.min(depth, gridSize - 16);
        
        // Slight offset within the cell for natural variation
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetZ = (Math.random() - 0.5) * 4;
        
        dummy.position.set(x + offsetX, height / 2, z + offsetZ);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        
        instancedMesh.setMatrixAt(index, dummy.matrix);
        index++;
      }
    }

    instancedMesh.count = index;
    instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedMesh);
  }

  // Add moving light nodes representing traffic
  addTraffic(startPoint, endPoint, count) {
    const geo = new THREE.BoxGeometry(1.5, 0.5, 20); // Long, thin cyan data pulses
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    
    const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
    this.scene.add(instancedMesh);
    
    this.trafficNodes.push({
      mesh: instancedMesh,
      count: count,
      start: startPoint.clone(),
      end: endPoint.clone(),
      progress: Array.from({ length: count }, () => Math.random()),
      speeds: Array.from({ length: count }, () => 0.002 + Math.random() * 0.004) // Elegant flow speed
    });
  }

  updateTraffic() {
    const dummy = new THREE.Object3D();
    
    this.trafficNodes.forEach(node => {
      for (let i = 0; i < node.count; i++) {
        node.progress[i] += node.speeds[i];
        if (node.progress[i] > 1) node.progress[i] = 0;

        const currentPos = new THREE.Vector3().lerpVectors(node.start, node.end, node.progress[i]);
        
        dummy.position.copy(currentPos);
        dummy.lookAt(node.end);
        dummy.updateMatrix();
        
        node.mesh.setMatrixAt(i, dummy.matrix);
      }
      node.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  buildMinorGridTraffic() {
    const minorTrafficGeo = new THREE.BoxGeometry(0.8, 0.4, 3.0);
    const minorTrafficMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const count = 400;
    this.minorTrafficMesh = new THREE.InstancedMesh(minorTrafficGeo, minorTrafficMat, count);
    this.heroGroup.add(this.minorTrafficMesh);
    
    this.minorTrafficNodes = [];
    
    const gridSize = 80;
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 1500) {
      attempts++;
      const gridX = (Math.floor(Math.random() * 40) - 20) * gridSize;
      const gridZ = (Math.floor(Math.random() * 40) - 20) * gridSize;
      if (Math.hypot(gridX, gridZ) > 1800) continue;
      
      // Determine if horizontal (along X) or vertical (along Z) street
      const isHorizontal = Math.random() < 0.5;
      let start, end;
      
      if (isHorizontal) {
        start = new THREE.Vector3(gridX - gridSize/2, 1.5, gridZ + 40);
        end = new THREE.Vector3(gridX + gridSize/2, 1.5, gridZ + 40);
      } else {
        start = new THREE.Vector3(gridX + 40, 1.5, gridZ - gridSize/2);
        end = new THREE.Vector3(gridX + 40, 1.5, gridZ + gridSize/2);
      }
      
      const colorType = Math.random() < 0.15 ? 'orange' : 'cyan';
      
      this.minorTrafficNodes.push({
        start: start,
        end: end,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.007,
        colorType: colorType
      });
      
      const col = colorType === 'orange' ? new THREE.Color(0xff6600) : new THREE.Color(0x00ffff);
      this.minorTrafficMesh.setColorAt(placed, col);
      placed++;
    }
    this.minorTrafficMesh.count = placed;
    this.minorTrafficMesh.instanceMatrix.needsUpdate = true;
    if (this.minorTrafficMesh.instanceColor) {
      this.minorTrafficMesh.instanceColor.needsUpdate = true;
    }
  }

  updateMinorTraffic() {
    if (!this.minorTrafficMesh) return;
    
    const dummy = new THREE.Object3D();
    const colorCyan = new THREE.Color(0x00ffff);
    const colorOrange = new THREE.Color(0xff6600);
    const colorWhite = new THREE.Color(0xffffff);
    
    for (let i = 0; i < this.minorTrafficNodes.length; i++) {
      const node = this.minorTrafficNodes[i];
      node.progress += node.speed;
      if (node.progress > 1) {
        node.progress = 0;
      }
      
      const pos = new THREE.Vector3().lerpVectors(node.start, node.end, node.progress);
      dummy.position.copy(pos);
      dummy.lookAt(node.end);
      dummy.updateMatrix();
      
      this.minorTrafficMesh.setMatrixAt(i, dummy.matrix);
      
      // Keep colors stable but occasionally flicker a white packet for data activity look
      const baseCol = node.colorType === 'orange' ? colorOrange : colorCyan;
      const col = Math.random() < 0.001 ? colorWhite : baseCol;
      this.minorTrafficMesh.setColorAt(i, col);
    }
    
    this.minorTrafficMesh.instanceMatrix.needsUpdate = true;
    if (this.minorTrafficMesh.instanceColor) {
      this.minorTrafficMesh.instanceColor.needsUpdate = true;
    }
  }

  buildSkyHighways() {
    const skyCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1000, 300, -1000),
      new THREE.Vector3(0, 400, -500),
      new THREE.Vector3(1000, 350, -1000),
      new THREE.Vector3(500, 300, 0),
      new THREE.Vector3(1000, 450, 1000),
      new THREE.Vector3(0, 350, 500),
      new THREE.Vector3(-1000, 400, 1000),
      new THREE.Vector3(-500, 320, 0),
    ]);
    skyCurve1.closed = true;
    
    const skyCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-800, 250, 800),
      new THREE.Vector3(800, 300, 800),
      new THREE.Vector3(800, 270, -800),
      new THREE.Vector3(-800, 320, -800),
    ]);
    skyCurve2.closed = true;
    
    const packetGeo = new THREE.BoxGeometry(2, 0.5, 6);
    this.skyPackets = [];
    
    const setupSkyTraffic = (curve, count, colorHex) => {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8 });
      const mesh = new THREE.InstancedMesh(packetGeo, mat, count);
      this.heroGroup.add(mesh);
      
      const nodes = Array.from({ length: count }, (_, idx) => ({
        progress: idx / count,
        speed: 0.001 + Math.random() * 0.0008
      }));
      
      this.skyPackets.push({
        mesh: mesh,
        curve: curve,
        nodes: nodes
      });
    };
    
    setupSkyTraffic(skyCurve1, 30, 0x00ffff);
    setupSkyTraffic(skyCurve2, 20, 0xffaa00);
  }

  updateSkyTraffic() {
    if (!this.skyPackets) return;
    
    const dummy = new THREE.Object3D();
    
    this.skyPackets.forEach(highway => {
      const curve = highway.curve;
      const nodes = highway.nodes;
      const mesh = highway.mesh;
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.progress += node.speed;
        if (node.progress > 1) node.progress = 0;
        
        const pos = curve.getPointAt(node.progress);
        const tangent = curve.getTangentAt(node.progress);
        
        dummy.position.copy(pos);
        dummy.lookAt(pos.clone().add(tangent));
        dummy.updateMatrix();
        
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  setBuildProgress(progress) {
    if (this.buildingMaterial) {
      this.buildingMaterial.uniforms.buildProgress.value = progress;
    }
    if (this.heroGroup) {
      // Emergence animation: rise from deep underground as the city builds
      const yOffset = -500 * (1.0 - progress);
      this.heroGroup.position.y = yOffset;
      // Slight scale-up for extra impact
      const scale = 0.8 + (0.2 * progress);
      this.heroGroup.scale.set(scale, scale, scale);
    }
  }

  onMouseMove(e) {
    // Parallax mouse effect
    this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.clock.start();
    this.animate();
  }

  stop() {
    this.active = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  animate() {
    if (!this.active) return;
    this.frameId = requestAnimationFrame(this.animate.bind(this));

    const time = this.clock.getElapsedTime();
    if (this.floorMat) this.floorMat.uniforms.time.value = time;
    if (this.buildingMaterial) this.buildingMaterial.uniforms.time.value = time;

    // Animate Tron Spire elements
    if (this.skyBeamMat) this.skyBeamMat.uniforms.time.value = time;
    if (this.spireMat) this.spireMat.uniforms.time.value = time;
    if (this.energyCoreMesh) {
      const pulse = 1.0 + 0.12 * Math.sin(time * 5.0);
      this.energyCoreMesh.scale.set(pulse, 1.0, pulse);
    }

    this.updateTraffic();

    // Animate holographic scoreboards rotation
    if (this.holoScoreboards) {
      const radius = 130;
      this.holoScoreboards.forEach(sb => {
        sb.angle += 0.003;
        const x = Math.cos(sb.angle) * radius;
        const z = Math.sin(sb.angle) * radius;
        sb.mesh.position.set(x, sb.baseY + Math.sin(time * 1.5 + sb.angle) * 2.5, z);
        
        const localCenter = new THREE.Vector3(0, 30, 0);
        sb.mesh.lookAt(localCenter.applyMatrix4(sb.mesh.parent.matrixWorld));
      });
    }

    // Animate Battle Disc rotation & floating
    if (this.combatDisc) {
      this.combatDisc.rotation.z += 0.05;
      this.combatDisc.position.y = 15.0 + Math.sin(time * 3.0) * 3.0;
      
      const discAngle = time * 1.2;
      this.combatDisc.position.x = Math.cos(discAngle) * 45;
      this.combatDisc.position.z = Math.sin(discAngle * 2) * 25;
    }

    // Update beacons time uniforms
    if (this.discArenaBeaconMat) this.discArenaBeaconMat.uniforms.time.value = time;
    if (this.raceComplexBeaconMat) this.raceComplexBeaconMat.uniforms.time.value = time;
    if (this.holoWallMat) this.holoWallMat.uniforms.time.value = time;
    if (this.platformShaderMat) this.platformShaderMat.uniforms.time.value = time;
    if (this.raceTrackMat) this.raceTrackMat.uniforms.time.value = time;

    // Animate Light Cycles along track spline
    if (this.lightCycles && this.raceCurve) {
      this.lightCycles.forEach(cycle => {
        const prevPositions = [];
        const stepCount = cycle.trails ? cycle.trails.length : 0;
        
        for (let t = 1; t <= stepCount; t++) {
          let trailProg = cycle.progress - (t * 0.015);
          let normalizedProg = trailProg % 1.0;
          if (normalizedProg < 0) normalizedProg += 1.0;
          if (isNaN(normalizedProg)) normalizedProg = 0;
          
          try {
            const pt = this.raceCurve.getPointAt(normalizedProg);
            if (pt) prevPositions.push(pt);
          } catch (e) {
            // Ignore points that fail
          }
        }

        cycle.progress += cycle.speed;
        if (isNaN(cycle.progress)) cycle.progress = 0;
        let progressWrapped = cycle.progress % 1.0;
        if (progressWrapped < 0) progressWrapped += 1.0;
        
        try {
          const currentPos = this.raceCurve.getPointAt(progressWrapped);
          const tangent = this.raceCurve.getTangentAt(progressWrapped);
          
          if (currentPos && tangent) {
            cycle.mesh.position.copy(currentPos);
            cycle.mesh.lookAt(currentPos.clone().add(tangent));
          }
        } catch (e) {
          // Ignore curve failures
        }
        
        if (cycle.trails) {
          cycle.trails.forEach((trail, idx) => {
            const pos = prevPositions[idx];
            if (pos && trail) {
              trail.position.copy(pos);
              // Stand solid-light walls upright on the track surface (height is 6m, offset by 3m)
              trail.position.y += 3.0;
              
              const nextPos = prevPositions[idx + 1];
              if (nextPos) {
                try {
                  const targetLook = nextPos.clone().add(new THREE.Vector3(0, 3.0, 0));
                  trail.lookAt(targetLook);
                } catch (e) {
                  // Ignore lookAt failures
                }
              }
            }
          });
        }
      });
    }

    // Update minor street traffic
    this.updateMinorTraffic();

    // Update sky lane traffic
    this.updateSkyTraffic();

    // Cinematic Camera Drift
    // Instead of being perfectly still, the camera constantly drifts like a drone
    const targetX = this.mouseX * 100;
    const targetY = this.mouseY * 50;
    
    // Apply parallax ON TOP of the base position (which GSAP can tween safely)
    this.camera.position.x += ((this.baseCameraPos.x + targetX) - this.camera.position.x) * 0.05;
    this.camera.position.y += ((this.baseCameraPos.y + targetY) - this.camera.position.y) * 0.05;
    this.camera.position.z += ((this.baseCameraPos.z) - this.camera.position.z) * 0.05;
    
    this.camera.lookAt(this.originalCamTarget);

    this.composer.render();
  }

  // Triggered when user clicks [ENTER THE GRID]
  hyperDive() {
    // 1. Extreme focal blur
    gsap.to(this.bloomPass, {
      strength: 8,
      radius: 2,
      duration: 1.5,
      ease: "power3.in"
    });

    // 2. Violent camera plunge into the central core
    gsap.to(this.baseCameraPos, {
      x: 0,
      y: 50,
      z: 50,
      duration: 1.5,
      ease: "power4.in"
    });
    
    // 3. Screen flash to white/cyan
    const targetColor = new THREE.Color(0x00ffff);
    gsap.to(this.scene.fog.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: 1.5,
      ease: "power2.in"
    });
    gsap.to(this.scene.fog, {
      near: 0.1,
      far: 100,
      duration: 1.5,
      ease: "power2.in"
    });

      setTimeout(() => {
      const darkWorld = document.getElementById('dark-grid-world');
      if (darkWorld) {
        darkWorld.classList.remove('hidden-world');
        darkWorld.classList.add('visible-world');
        
        // Reset scene silently in background
        this.baseCameraPos.copy(this.originalCamPos);
        this.camera.position.copy(this.originalCamPos);
        this.bloomPass.strength = 2.5;
        this.scene.fog.color.setHex(0x000a1a);
        this.scene.fog.far = 5000;
      }
    }, 1500);
  }

  // Triggered when user clicks [< EXIT SIMULATION]
  reverseDive() {
    // We are returning from the silent reset. Place base back down at the core instantly.
    this.baseCameraPos.set(0, 50, 50);
    this.camera.position.set(0, 50, 50);
    
    // Extreme focal blur
    this.bloomPass.strength = 8;
    this.bloomPass.radius = 2;
    gsap.to(this.bloomPass, {
      strength: 2.5,
      radius: 0.8,
      duration: 1.5,
      ease: "power3.out"
    });

    // Fly camera UP to original position
    gsap.to(this.baseCameraPos, {
      x: this.originalCamPos.x,
      y: this.originalCamPos.y,
      z: this.originalCamPos.z,
      duration: 1.5,
      ease: "power3.out"
    });
    
    // Screen flash from white/cyan back to normal
    this.scene.fog.near = 0.1;
    this.scene.fog.far = 100;
    this.scene.fog.color.setHex(0x00ffff);
    
    const targetColorBack = new THREE.Color(0x000a1a);
    gsap.to(this.scene.fog.color, {
      r: targetColorBack.r,
      g: targetColorBack.g,
      b: targetColorBack.b,
      duration: 1.5,
      ease: "power2.out"
    });
    gsap.to(this.scene.fog, {
      far: 5000,
      duration: 1.5,
      ease: "power2.out"
    });
  }
}
