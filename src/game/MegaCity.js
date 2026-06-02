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
          // Distance fade
          float dist = length(vWorldPos.xz) / 3000.0;
          float fade = 1.0 - smoothstep(0.0, 1.0, dist);
          
          vec3 finalColor = mix(color * 0.1, glowColor, grid * 0.3);
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
    
    // Base Tower (Dark Glass)
    const baseGeo = new THREE.CylinderGeometry(80, 120, 600, 8);
    const darkGlass = new THREE.MeshStandardMaterial({
      color: 0x000205,
      roughness: 0.1,
      metalness: 0.9,
    });
    const base = new THREE.Mesh(baseGeo, darkGlass);
    base.position.y = 300;
    spireGroup.add(base);

    // Glowing Neon Edges
    const edgesGeo = new THREE.EdgesGeometry(baseGeo);
    const neonMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeo, neonMat);
    edges.position.y = 300;
    spireGroup.add(edges);

    // Energy Core
    const coreGeo = new THREE.CylinderGeometry(20, 20, 500, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 250;
    spireGroup.add(core);

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
    
    // Add moving traffic
    this.addTraffic(new THREE.Vector3(0, 2, -2000), new THREE.Vector3(0, 2, 2000), 100);
    this.addTraffic(new THREE.Vector3(-2000, 2, 0), new THREE.Vector3(2000, 2, 0), 100);
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

        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
        }

        void main() {
          float bRand = hash(vInstancePos);
          
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
          
          // Initialize light parameters
          float isLit = 0.0;
          vec3 activeGlowColor = traceColor;
          
          // 1. TOP FACE: Silicon Chip connection pins or Concentric Logic Rings
          float topGlow = 0.0;
          if (vLocalNormal.y > 0.5) {
            if (vScale.y <= 35.0) {
              // Flat Silicon Chip: Grid of pins
              float gridSpacing = 4.0;
              vec2 topGrid = vLocalPos.xz / gridSpacing;
              vec2 topFract = fract(topGrid);
              vec2 topId = floor(topGrid);
              
              // Draw a tiny circular pin/pad at center of grid cell
              float distToPinCenter = length(topFract - vec2(0.5));
              float isPin = smoothstep(0.2, 0.15, distToPinCenter);
              
              // Only illuminate some pins
              float pinRand = hash(vec3(topId, hash(vInstancePos)));
              topGlow = isPin * step(pinRand, 0.5);
              activeGlowColor = neonColor;
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
            }
          }
          
          // 2. SIDE FACES: Animated streams (Spires) or Circuit board traces (Blocks/Chips)
          float sideGlow = 0.0;
          if (abs(vLocalNormal.y) <= 0.5) {
            float distToEdgeH = (abs(vLocalNormal.x) > 0.5) ? distToEdgeZ : distToEdgeX;
            float distToEdgeV = distToEdgeY;
            
            // Only draw inside building bounds (clear of border edges)
            if (distToEdgeH > 0.6 && distToEdgeV > 0.6) {
              if (vScale.y > 100.0) {
                // Animated vertical falling data streams (Data Spires)
                float flowSpeed = 35.0; // Units per second
                float flowCoord = vertCoord - time * flowSpeed;
                float dataGridY = flowCoord / 8.0;
                float dataIdY = floor(dataGridY);
                float dataFractY = fract(dataGridY);
                
                float dataGridX = horizCoord / 3.0;
                float dataIdX = floor(dataGridX);
                float dataFractX = fract(dataGridX);
                
                float isStream = step(0.4, dataFractX) * step(dataFractX, 0.6) * 
                                 step(0.2, dataFractY) * step(dataFractY, 0.8);
                
                float streamRand = hash(vec3(dataIdX, dataIdY, hash(vInstancePos)));
                float isStreamActive = step(streamRand, 0.4) * (0.4 + 0.6 * sin(time * 6.0 + streamRand * 10.0));
                
                sideGlow = isStream * isStreamActive;
                activeGlowColor = mix(neonColor, vec3(1.0), 0.3); // extra white-hot core intensity
                
              } else {
                // Circuit board logic lines and intersection pads
                float gridSpacing = 6.0;
                float traceX = horizCoord / gridSpacing;
                float traceY = vertCoord / gridSpacing;
                vec2 traceId = floor(vec2(traceX, traceY));
                vec2 traceFract = fract(vec2(traceX, traceY));
                
                // Draw grid lines
                float lineThickness = 0.05;
                float isLine = step(traceFract.x, lineThickness) + step(traceFract.y, lineThickness);
                
                // Randomly activate 35% of the lines
                float lineRand = hash(vec3(traceId, hash(vInstancePos)));
                isLine *= step(lineRand, 0.35);
                
                // Draw circular contact pad at intersections
                float dotRadius = 0.15;
                float distToIntersection = length(traceFract - vec2(0.0));
                float isDot = smoothstep(dotRadius, dotRadius - 0.03, distToIntersection);
                // 25% of intersections have dots
                isDot *= step(hash(vec3(traceId + 0.5, hash(vInstancePos))), 0.25);
                
                sideGlow = max(isLine, isDot);
                activeGlowColor = mix(traceColor, neonColor, isDot);
              }
            }
          }
          
          // Assemble lighting layers
          vec3 finalColor = baseColor;
          
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

    const instancedMesh = new THREE.InstancedMesh(geometry, this.buildingMaterial, buildingCount);
    
    const dummy = new THREE.Object3D();
    let index = 0;

    // Distribute buildings, avoiding the hero structures and roads
    while (index < buildingCount) {
      const x = (Math.random() - 0.5) * 4000;
      const z = (Math.random() - 0.5) * 4000;
      
      // Exclude Central Spire
      if (Math.abs(x) < 300 && Math.abs(z) < 300) continue;
      // Exclude Cross Highways
      if (Math.abs(x) < 80 || Math.abs(z) < 80) continue;
      if (Math.abs(x - z) < 80 || Math.abs(x + z) < 80) continue;
      // Exclude Disc Stadium
      if (Math.hypot(x - (-600), z - (-400)) < 250) continue;
      // Exclude Grid Arena
      if (x > 400 && x < 800 && z > 200 && z < 600) continue;
      // Exclude Cloverleaf
      if (x > -700 && x < -300 && z > 200 && z < 600) continue;

      // Determine height based on distance from center (denser/taller near center)
      const distToCenter = Math.hypot(x, z);
      const maxHeight = Math.max(20, 400 - (distToCenter * 0.15));
      
      let width, height, depth;
      const structRand = Math.random();
      
      if (structRand < 0.15) {
        // Structural Spire (Tall, thin capacitor)
        width = 6 + Math.random() * 8;
        depth = 6 + Math.random() * 8;
        height = (120 + Math.random() * 150) * (maxHeight / 400.0);
        height = Math.max(80, height); // ensure they are sufficiently tall spires
      } else if (structRand < 0.30) {
        // Silicon Chip (Flat, low block)
        width = 35 + Math.random() * 35;
        depth = 35 + Math.random() * 35;
        height = 10 + Math.random() * 15;
      } else {
        // Logic Block (Standard monolithic motherboard component)
        width = 15 + Math.random() * 20;
        depth = 15 + Math.random() * 20;
        height = (35 + Math.random() * 60) * (maxHeight / 400.0);
        height = Math.max(20, height);
      }

      dummy.position.set(x, height / 2, z);
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();
      
      instancedMesh.setMatrixAt(index, dummy.matrix);
      index++;
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedMesh);
  }

  // Add moving light nodes representing traffic
  addTraffic(startPoint, endPoint, count) {
    const geo = new THREE.BoxGeometry(4, 2, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const instancedMesh = new THREE.InstancedMesh(geo, mat, count);
    this.scene.add(instancedMesh);
    
    this.trafficNodes.push({
      mesh: instancedMesh,
      count: count,
      start: startPoint,
      end: endPoint,
      progress: Array.from({ length: count }, () => Math.random()),
      speeds: Array.from({ length: count }, () => 0.001 + Math.random() * 0.003)
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
