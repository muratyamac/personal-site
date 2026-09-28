// A LEGO F1 car that assembles as you scroll. Units: 1 = one stud pitch.
import * as THREE from "three";

const BRICK_H = 1.2;
const PLATE_H = 0.4;

const C = {
  yellow: 0xffd400,
  red: 0xc8102e,
  black: 0x1b1b1d,
  grey: 0x5d6168,
  white: 0xf2f2ee,
  tyre: 0x121214,
};

// [x, z, y, w, d, h, color, stage] — x along the car (rear → nose), z across,
// y is the bottom of the piece. stage matches the build log step (0–5).
const PARTS = [
  // 0 Floor
  [0, -3, 0, 14, 6, PLATE_H, C.black, 0],
  [14, -1, 0, 2, 2, PLATE_H, C.black, 0],
  [2, -2, PLATE_H, 10, 4, PLATE_H, C.grey, 0],
  // 1 Sidepods
  [3, -3, PLATE_H, 6, 1, BRICK_H, C.red, 1],
  [3, 2, PLATE_H, 6, 1, BRICK_H, C.red, 1],
  [4, -3, PLATE_H + BRICK_H, 4, 1, PLATE_H, C.white, 1],
  [4, 2, PLATE_H + BRICK_H, 4, 1, PLATE_H, C.white, 1],
  // 2 Power unit / engine cover
  [0, -1, PLATE_H * 2, 5, 2, BRICK_H, C.red, 2],
  [1, -1, PLATE_H * 2 + BRICK_H, 4, 2, BRICK_H, C.red, 2],
  [2, -1, PLATE_H * 2 + BRICK_H * 2, 2, 2, PLATE_H, C.black, 2],
  // 3 Nose & wings
  [9, -1, PLATE_H * 2, 5, 2, BRICK_H, C.red, 3],
  [14, -1, PLATE_H, 2, 2, PLATE_H * 2, C.red, 3],
  [16, -4, 0, 2, 8, PLATE_H, C.red, 3],
  [16, -1, PLATE_H, 2, 2, PLATE_H, C.red, 3],
  [16, -4, PLATE_H, 2, 1, BRICK_H, C.yellow, 3],
  [16, 3, PLATE_H, 2, 1, BRICK_H, C.yellow, 3],
  [-1, -1, PLATE_H, 1, 1, BRICK_H * 2, C.black, 3],
  [-1, 0, PLATE_H, 1, 1, BRICK_H * 2, C.black, 3],
  [-2, -3, PLATE_H + BRICK_H * 2, 2, 6, PLATE_H, C.red, 3],
  [-2, -3, PLATE_H * 2 + BRICK_H * 2, 2, 6, PLATE_H, C.black, 3],
  // 4 Cockpit — the yellow helmet
  [5, -1, PLATE_H * 2, 4, 2, BRICK_H, C.black, 4],
  [6, -1, PLATE_H * 2 + BRICK_H, 2, 2, BRICK_H, C.yellow, 4],
  [5, -1, PLATE_H * 2 + BRICK_H * 2, 1, 2, PLATE_H, C.white, 4],
  [8, -1, PLATE_H * 2 + BRICK_H, 1, 2, PLATE_H, C.grey, 4],
];

// Wheels: [x, z, stage]
const WHEELS = [
  [2.5, -4.2, 5],
  [2.5, 4.2, 5],
  [12.5, -4.2, 5],
  [12.5, 4.2, 5],
];

const STAGES = 6;

export function createLego(canvas, { reducedMotion = false, onCount } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  // lights
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1208, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(12, 22, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd400, 1.2);
  rim.position.set(-14, 6, -10);
  scene.add(rim);

  // floor catches the shadow only
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // baseplate grid
  const grid = new THREE.GridHelper(40, 40, 0x2e333d, 0x1a1d22);
  grid.position.y = 0.001;
  scene.add(grid);

  const car = new THREE.Group();
  scene.add(car);

  const mats = new Map();
  const mat = (color) => {
    if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.02 }));
    return mats.get(color);
  };
  const studGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.18, 20);
  const boxCache = new Map();
  const boxGeo = (w, h, d) => {
    const k = `${w}|${h}|${d}`;
    if (!boxCache.has(k)) boxCache.set(k, new RoundedBox(w - 0.04, h - 0.02, d - 0.04));
    return boxCache.get(k);
  };

  const pieces = [];
  const [cx, cz] = [8, 0]; // centre of the car on the plate

  for (const [x, z, y, w, d, h, color, stage] of PARTS) {
    const g = new THREE.Group();
    const m = mat(color);
    const body = new THREE.Mesh(boxGeo(w, h, d), m);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    // studs, with instancing per piece
    const studs = new THREE.InstancedMesh(studGeo, m, w * d);
    studs.castShadow = true;
    const t = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < w; i++)
      for (let j = 0; j < d; j++) {
        t.makeTranslation(i - w / 2 + 0.5, h / 2 + 0.09, j - d / 2 + 0.5);
        studs.setMatrixAt(n++, t);
      }
    g.add(studs);
    const target = new THREE.Vector3(x + w / 2 - cx, y + h / 2, z + d / 2 - cz);
    pieces.push(makePiece(g, target, stage));
  }

  const tyreGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.3, 32);
  const hubGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.34, 24);
  for (const [x, z, stage] of WHEELS) {
    const g = new THREE.Group();
    const tyre = new THREE.Mesh(tyreGeo, mat(C.tyre));
    const hub = new THREE.Mesh(hubGeo, mat(C.yellow));
    tyre.castShadow = true;
    g.add(tyre, hub);
    g.rotation.x = Math.PI / 2;
    const target = new THREE.Vector3(x - cx, 1.5, z - cz);
    pieces.push(makePiece(g, target, stage, true));
  }

  // order: by stage, then bottom-up, so it builds like real instructions
  pieces.sort((a, b) => a.stage - b.stage || a.target.y - b.target.y);
  const byStage = Array.from({ length: STAGES }, (_, s) => pieces.filter((p) => p.stage === s));
  byStage.forEach((list) => list.forEach((p, i) => (p.slot = [i, list.length])));

  function makePiece(obj, target, stage, isWheel = false) {
    const seed = Math.random();
    obj.visible = false;
    car.add(obj);
    return {
      obj,
      target,
      stage,
      isWheel,
      from: new THREE.Vector3(target.x + (seed - 0.5) * 10, target.y + 14 + seed * 6, target.z + (Math.random() - 0.5) * 10),
      spin: (seed - 0.5) * 2.4,
      baseRotX: obj.rotation.x,
    };
  }

  // ——— animation state ———
  let progress = 0;
  let shown = 0; // eased progress
  let pointerX = 0;
  let pointerY = 0;
  let visible = true;
  let t0 = performance.now();
  let camDist = 34;

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const bounce = (t) => {
    // lands with a little click
    const e = ease(t);
    return e + Math.sin(t * Math.PI) * 0.06 * (1 - t);
  };

  function layout() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < 700;
    camera.fov = narrow ? 44 : 30;
    camDist = w / h < 1 ? 34 / Math.max(0.55, w / h) : 34; // portrait: back off so the car fits
    camera.updateProjectionMatrix();
    // push the car right on wide screens so captions sit on the left
    car.position.x = narrow ? 0 : Math.min(7, (w / h) * 2.4);
    car.position.z = narrow ? 0 : -1;
  }
  new ResizeObserver(layout).observe(canvas);
  layout();

  addEventListener("pointermove", (e) => {
    pointerX = e.clientX / innerWidth - 0.5;
    pointerY = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) loop();
  }).observe(canvas);

  let lastCount = -1;
  let rafId = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    shown += (progress - shown) * (reducedMotion ? 1 : Math.min(1, dt * 6));

    let count = 0;
    for (const p of pieces) {
      const [i, n] = p.slot;
      // each stage owns 1/STAGES of progress; pieces within it are staggered
      const stageStart = p.stage / STAGES;
      const local = (shown - stageStart) * STAGES; // 0..1 across the stage
      const start = (i / n) * 0.6;
      const t = Math.min(1, Math.max(0, (local - start) / 0.4));
      p.obj.visible = t > 0;
      if (t >= 1) count++;
      if (!p.obj.visible) continue;
      const e = bounce(t);
      p.obj.position.lerpVectors(p.from, p.target, e);
      p.obj.rotation.y = p.spin * (1 - ease(t));
      p.obj.rotation.x = p.baseRotX + (p.isWheel ? 0 : p.spin * 0.3 * (1 - ease(t)));
    }

    // camera orbits gently; done = slow turntable
    const time = now / 1000;
    const done = shown > 0.995;
    const baseAngle = -0.75 + shown * 1.1 + (done && !reducedMotion ? Math.sin(time * 0.25) * 0.35 : 0);
    const angle = baseAngle + pointerX * 0.35;
    const r = camDist;
    camera.position.set(Math.sin(angle) * r + car.position.x * 0.2, 15 + pointerY * -4, Math.cos(angle) * r);
    camera.lookAt(car.position.x * 0.55, 1.2, 0);

    renderer.render(scene, camera);

    if (count !== lastCount) {
      lastCount = count;
      onCount?.(count, Math.round((count / pieces.length) * 100));
    }
  }

  function loop() {
    cancelAnimationFrame(rafId);
    const tick = (now) => {
      frame(now);
      if (visible) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }
  loop();

  return {
    total: pieces.length,
    setProgress(p) {
      progress = p;
    },
    /** Snap-build the whole car (terminal `build` command). */
    buildAll() {
      progress = 1;
      document.querySelector("#build")?.scrollIntoView({ behavior: "smooth", block: "end" });
    },
  };
}

// Box with softly bevelled edges — LEGO plastic catches light on the corners.
class RoundedBox extends THREE.BufferGeometry {
  constructor(w, h, d, r = 0.06) {
    super();
    const shape = new THREE.Shape();
    const x = -w / 2, y = -d / 2;
    r = Math.min(r, w / 2, d / 2);
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + d - r);
    shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    shape.lineTo(x + r, y + d);
    shape.quadraticCurveTo(x, y + d, x, y + d - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const bevel = Math.min(0.05, h / 4);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: h - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.6,
      bevelSegments: 2,
      curveSegments: 3,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -h / 2 + bevel, 0);
    geo.computeVertexNormals();
    this.copy(geo);
    geo.dispose();
  }
}
