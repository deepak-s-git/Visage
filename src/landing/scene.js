/* ═══════════════════════════════════════════════════════════════
   VISAGE · Landing Scene — Three.js Reactive Orb + Particles
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export function initLandingScene(canvas) {
  if (!canvas) return { dispose() {} };

  /* ── Scene ── */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080808);
  scene.fog = new THREE.FogExp2(0x080808, 0.04);

  /* ── Camera ── */
  const camera = new THREE.PerspectiveCamera(
    55, canvas.clientWidth / canvas.clientHeight, 0.1, 100
  );
  camera.position.set(0, 0, 5.5);

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  /* ── Wireframe Orb (outer) ── */
  const orbGeo = new THREE.IcosahedronGeometry(1.6, 3);
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
    metalness: 0.9,
    roughness: 0.2
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  scene.add(orb);

  /* ── Solid Inner Orb ── */
  const innerGeo = new THREE.IcosahedronGeometry(1.15, 2);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.95,
    roughness: 0.15,
    transparent: true,
    opacity: 0.6
  });
  const innerOrb = new THREE.Mesh(innerGeo, innerMat);
  scene.add(innerOrb);

  /* ── Outer Ring (emotional waveform orbit) ── */
  const ringGeo = new THREE.TorusGeometry(2.4, 0.005, 16, 200);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x555555, transparent: true, opacity: 0.25
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.2;
  scene.add(ring);

  /* ── Particle Field ── */
  const PARTICLE_COUNT = 1200;
  const posArr = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
    posArr[i] = (Math.random() - 0.5) * 25;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xd4c9b8, size: 0.018, transparent: true, opacity: 0.5,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ── Lighting ── */
  scene.add(new THREE.AmbientLight(0x404040, 0.4));
  const keyLight = new THREE.PointLight(0xf5e6d3, 2.0, 25);
  keyLight.position.set(4, 3, 6);
  scene.add(keyLight);
  const fillLight = new THREE.PointLight(0xc8bfb0, 0.8, 20);
  fillLight.position.set(-4, -2, 4);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0x6a6a8a, 0.5, 15);
  rimLight.position.set(0, 4, -5);
  scene.add(rimLight);

  /* ── Mouse Tracking ── */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMouseMove = (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
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
  let time = 0;
  let scrollProgress = 0;

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    time += 0.008;

    // Smooth mouse interpolation
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    // Orb rotation + mouse parallax
    orb.rotation.y = time * 0.3 + mouse.x * 0.4;
    orb.rotation.x = Math.sin(time * 0.2) * 0.15 + mouse.y * 0.3;
    innerOrb.rotation.y = -time * 0.2;
    innerOrb.rotation.x = Math.cos(time * 0.15) * 0.1;

    // Ring orbit
    ring.rotation.z = time * 0.15;
    ring.rotation.x = Math.PI / 2.2 + Math.sin(time * 0.3) * 0.08;

    // Orb subtle breathing
    const breathe = 1 + Math.sin(time * 0.8) * 0.03;
    orb.scale.setScalar(breathe);
    innerOrb.scale.setScalar(breathe * 0.98);

    // Particles gentle drift
    particles.rotation.y = time * 0.04;
    particles.rotation.x = time * 0.02;

    // Camera parallax
    camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.03;
    camera.position.y += (-mouse.y * 0.2 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    // Light follow
    keyLight.position.x = 4 + mouse.x * 1.5;
    keyLight.position.y = 3 + mouse.y * 1;

    // Scroll-driven zoom
    camera.position.z = 5.5 - scrollProgress * 2;
    orb.material.opacity = 0.18 * (1 - scrollProgress * 0.5);

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
      orbGeo.dispose(); orbMat.dispose();
      innerGeo.dispose(); innerMat.dispose();
      ringGeo.dispose(); ringMat.dispose();
      particleGeo.dispose(); particleMat.dispose();
    }
  };
}
