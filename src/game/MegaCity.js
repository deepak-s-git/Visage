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
  buildCloverleaf() {
    const cloverGroup = new THREE.Group();
    cloverGroup.position.set(-500, 0, 400); // Bottom-left quadrant

    const curveMat = new THREE.MeshBasicMaterial({ color: 0x000511 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });

    // Helper to create a curved highway ramp
    const createRamp = (radius, height, startAngle, endAngle) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, startAngle, endAngle, false, 0);
      const points = curve.getPoints(50);
      // Convert to 3D points
      const points3d = points.map((p, i) => {
        const progress = i / points.length;
        // Parabolic height curve
        const y = Math.sin(progress * Math.PI) * height; 
        return new THREE.Vector3(p.x, y, p.y);
      });

      const path = new THREE.CatmullRomCurve3(points3d);
      const tubeGeo = new THREE.TubeGeometry(path, 64, 10, 8, false);
      
      const mesh = new THREE.Mesh(tubeGeo, curveMat);
      
      // Add glowing edges
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tubeGeo), edgeMat);
      mesh.add(edges);
      
      return mesh;
    };

    // Create 4 intersecting loops
    cloverGroup.add(createRamp(100, 40, 0, Math.PI * 1.5));
    
    const ramp2 = createRamp(120, 60, 0, Math.PI * 1.5);
    ramp2.rotation.y = Math.PI / 2;
    cloverGroup.add(ramp2);

    const ramp3 = createRamp(80, 80, 0, Math.PI * 1.5);
    ramp3.rotation.y = Math.PI;
    cloverGroup.add(ramp3);

    const ramp4 = createRamp(140, 50, 0, Math.PI * 1.5);
    ramp4.rotation.y = -Math.PI / 2;
    cloverGroup.add(ramp4);

    this.heroGroup.add(cloverGroup);
  }

  // 5. Disc Combat Stadium (Circular Arena, Top Left)
  buildCircularStadium() {
    const stadiumGroup = new THREE.Group();
    stadiumGroup.position.set(-600, 0, -400);

    // Main Outer Bowl
    const bowlGeo = new THREE.TorusGeometry(150, 40, 16, 64);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x000a1a, metalness: 0.8, roughness: 0.2 });
    const bowl = new THREE.Mesh(bowlGeo, darkMat);
    bowl.rotation.x = -Math.PI / 2;
    bowl.position.y = 40;
    stadiumGroup.add(bowl);

    // Glowing Rings inside
    const ringGeo1 = new THREE.TorusGeometry(120, 2, 8, 64);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const ring1 = new THREE.Mesh(ringGeo1, glowMat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 10;
    stadiumGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(80, 1, 8, 64);
    const ring2 = new THREE.Mesh(ringGeo2, glowMat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 5;
    stadiumGroup.add(ring2);

    // Glowing pitch (center)
    const pitchGeo = new THREE.CircleGeometry(60, 32);
    const pitchMat = new THREE.MeshBasicMaterial({ color: 0x002244 });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 1;
    stadiumGroup.add(pitch);

    this.heroGroup.add(stadiumGroup);
  }

  // 6. Rectangular Grid Arena (Bottom Right)
  buildRectangularArena() {
    const arenaGroup = new THREE.Group();
    arenaGroup.position.set(600, 0, 400);

    // Floor Base
    const baseGeo = new THREE.BoxGeometry(300, 10, 400);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x000511, metalness: 0.9, roughness: 0.1 });
    const base = new THREE.Mesh(baseGeo, darkMat);
    arenaGroup.add(base);

    // Glowing Perimeter Wall
    const wallGeo = new THREE.BoxGeometry(320, 40, 420);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(wallGeo), new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }));
    edges.position.y = 15;
    arenaGroup.add(edges);

    // Glowing Inner Grid
    const gridHelper = new THREE.GridHelper(300, 10, 0x00ffff, 0x0088ff);
    gridHelper.position.y = 6;
    arenaGroup.add(gridHelper);

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
        // Exclude Disc Stadium
        if (Math.hypot(x - (-600), z - (-400)) < 260) continue;
        // Exclude Grid Arena
        if (x > 380 && x < 820 && z > 180 && z < 620) continue;
        // Exclude Cloverleaf
        if (x > -720 && x < -280 && z > 180 && z < 620) continue;
        
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
