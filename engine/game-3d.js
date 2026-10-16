/* Three.js presentation layer. GLB is optional; geometric characters are the offline fallback. */
import * as THREE from "https://unpkg.com/three@0.169.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.169.0/examples/jsm/loaders/GLTFLoader.js";

const worlds = new Map();
const loader = new GLTFLoader();
const mat = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const sphere = new THREE.SphereGeometry(1, 20, 14);
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 20);
const temp = new THREE.Object3D();

function addMesh(parent, geometry, material, pos, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function makeCharacter(p) {
  const root = new THREE.Group(), skin = mat(p.skin || "#ffcf9f"), cloth = mat(p.color || "#ff6b6b", .52), dark = mat("#47301f");
  addMesh(root, sphere, cloth, [0, .82, 0], [.42, .52, .32]);
  addMesh(root, sphere, skin, [0, 1.55, 0], [.39, .43, .36]);
  addMesh(root, sphere, dark, [0, 1.83, -.015], [.4, .2, .38]);
  // Eyes, nose and smile face the camera (positive Z).
  const eye = mat("#211a21"), white = mat("#fffdf4");
  for (const x of [-.13, .13]) {
    addMesh(root, sphere, white, [x, 1.59, .315], [.07, .085, .035]);
    addMesh(root, sphere, eye, [x, 1.585, .345], [.035, .05, .022]);
  }
  addMesh(root, sphere, mat("#c66f55"), [0, 1.47, .355], [.055, .045, .035]);
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * .37, 1.15, 0); root.add(pivot); arms.push(pivot);
    addMesh(pivot, cylinder, skin, [0, -.24, 0], [.17, .55, .17]).rotation.z = side * -.18;
    const leg = addMesh(root, cylinder, mat("#39415e"), [side * .17, .28, 0], [.2, .48, .2]);
    leg.rotation.z = side * -.06;
  }
  const accessory = p.accessory;
  if (accessory === "crown") {
    const gold = mat("#ffd23f", .3, .45);
    addMesh(root, cylinder, gold, [0, 1.99, 0], [.34, .18, .32]);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; addMesh(root, sphere, gold, [Math.sin(a) * .27, 2.13, Math.cos(a) * .24], [.065, .15, .065]); }
  } else if (accessory === "cap") {
    addMesh(root, sphere, mat("#3076d2"), [0, 1.91, -.02], [.43, .14, .4]);
    addMesh(root, box, mat("#3076d2"), [0, 1.88, .29], [.52, .055, .34]);
  } else if (accessory === "glasses") {
    const frame = new THREE.MeshStandardMaterial({ color: "#252633", metalness: .55, roughness: .3 });
    for (const x of [-.13, .13]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.09, .018, 6, 18), frame); ring.position.set(x, 1.59, .36); root.add(ring); }
    addMesh(root, box, frame, [0, 1.59, .36], [.1, .025, .025]);
  }
  root.userData.arms = arms;
  return root;
}
function makeWorld(stage, character) {
  const scene = new THREE.Scene();
  const bg = stage.dataset.scene === "snake" ? 0xccefdc : stage.dataset.scene === "rock" ? 0xd9e9ff : 0xc9f5fb;
  scene.background = new THREE.Color(bg); scene.fog = new THREE.Fog(bg, 9, 22);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 40); camera.position.set(0, 3.05, 8.4); camera.lookAt(0, 1.05, 0);
  const renderer = new THREE.WebGLRenderer({ canvas: stage.querySelector("canvas"), antialias: false, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(stage.clientWidth || 320, stage.clientHeight || 210, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x718295, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(-3, 7, 5); scene.add(sun);
  const floor = addMesh(scene, new THREE.CircleGeometry(5, 40), mat("#b3d995"), [0, -.1, 0], [1, 1, 1]); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  // Small floating island and a timber bridge create a clear, readable game stage.
  addMesh(scene, cylinder, mat("#9a7049"), [0, .05, 0], [3.7, .28, 1.75]);
  const bridge = addMesh(scene, box, mat("#c98a4e"), [0, .38, -.1], [3.2, .12, .7]);
  for (let x = -1.35; x <= 1.35; x += .34) addMesh(scene, box, mat("#79522f"), [x, .45, -.1], [.035, .07, .73]);
  const pondMat = new THREE.MeshStandardMaterial({ color: 0x64cadd, roughness: .32, metalness: .12 });
  addMesh(scene, new THREE.CylinderGeometry(1.45, 1.55, .12, 32), pondMat, [0, -.17, -1.15], [1, 1, .55]);
  const hazard = new THREE.Group(); scene.add(hazard);
  if (stage.dataset.scene === "rock") {
    const rock = addMesh(hazard, new THREE.DodecahedronGeometry(.56, 1), mat("#858998"), [1.38, .66, -.22], [1, .9, 1]);
    rock.rotation.set(.2, .2, .1);
  } else if (stage.dataset.scene === "snake") {
    for (let i = 0; i < 4; i++) { const coil = addMesh(hazard, new THREE.TorusGeometry(.36 + i * .04, .12, 8, 24), mat(i % 2 ? "#45a66c" : "#5dba76"), [1.34, .42 + i * .02, -.25], [1, 1, .62]); coil.rotation.x = Math.PI / 2; }
    addMesh(hazard, sphere, mat("#55b972"), [1.28, .75, .05], [.36, .3, .32]);
    addMesh(hazard, sphere, mat("#fff"), [1.16, .81, .32], [.06, .075, .035]); addMesh(hazard, sphere, mat("#fff"), [1.37, .81, .32], [.06, .075, .035]);
  } else {
    for (let i = 0; i < 5; i++) addMesh(hazard, sphere, mat(i % 2 ? "#8bdc35" : "#b0ec4a"), [Math.cos(i * 1.25) * 1.35, .36, Math.sin(i * 1.25) * .42 - .2], [.42, .25, .42]);
  }
  const actor = makeCharacter(character); actor.position.set(-.15, .45, .32); scene.add(actor);
  return { stage, scene, camera, renderer, actor, hazard, bridge, clock: new THREE.Clock(), mood: "idle", start: performance.now(), character };
}
function loadModel(world, url) {
  if (!url) return;
  loader.load(url, gltf => {
    if (!worlds.has(world.stage)) return;
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.95 / Math.max(size.x, size.y, size.z, .01); model.scale.setScalar(scale); model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = true; } });
    const fitted = new THREE.Group(); fitted.add(model); fitted.position.set(-.15, .45, .32);
    world.scene.remove(world.actor); world.actor = fitted; world.scene.add(fitted);
  }, undefined, err => console.warn("تعذر تحميل نموذج الشخصية:", url, err));
}
let raf = 0;
function frame() {
  raf = 0;
  if (document.hidden) return;
  const now = performance.now();
  for (const w of worlds.values()) {
    const t = (now - w.start) / 1000;
    w.actor.position.y = .45 + (w.mood === "happy" ? Math.abs(Math.sin(t * 7)) * .48 : Math.sin(t * 2.2) * .035);
    w.actor.rotation.z = w.mood === "sad" ? Math.sin(t * 8) * .1 : Math.sin(t * 1.5) * .035;
    if (w.actor.userData.arms) w.actor.userData.arms.forEach((arm, i) => { arm.rotation.z = w.mood === "happy" ? Math.sin(t * 9 + i * Math.PI) * .72 : w.mood === "sad" ? -.35 : 0; });
    w.hazard.rotation.y = Math.sin(t * 1.2) * .12;
    w.renderer.render(w.scene, w.camera);
  }
  if (worlds.size) raf = requestAnimationFrame(frame);
}
function startLoop() { if (!raf && !document.hidden && worlds.size) raf = requestAnimationFrame(frame); }
function mountAll(stages) {
  for (const stage of stages) {
    if (!stage.querySelector("canvas") || worlds.has(stage)) continue;
    try {
      const character = JSON.parse(stage.dataset.character || "{}");
      const world = makeWorld(stage, character); worlds.set(stage, world);
      loadModel(world, character.modelUrl || window.GAME_CONFIG?.models?.character);
      const resize = new ResizeObserver(() => { if (!stage.isConnected) return; world.renderer.setSize(stage.clientWidth || 320, stage.clientHeight || 210, false); world.camera.aspect = (stage.clientWidth || 320) / (stage.clientHeight || 210); world.camera.updateProjectionMatrix(); });
      resize.observe(stage); world.resize = resize;
    } catch (err) { console.warn("تعذر إنشاء WebGL renderer:", err); stage.classList.add("webgl-fallback"); }
  }
  startLoop();
}
function animate(stage, mood) { const world = worlds.get(stage); if (!world) return; world.mood = mood; world.start = performance.now(); if (mood !== "idle") setTimeout(() => { if (worlds.get(stage) === world) world.mood = "idle"; }, 1800); }
function disposeAll() { for (const w of worlds.values()) { w.resize?.disconnect(); w.renderer.dispose(); } worlds.clear(); if (raf) cancelAnimationFrame(raf); raf = 0; }
document.addEventListener("visibilitychange", () => document.hidden ? (raf && cancelAnimationFrame(raf), raf = 0) : startLoop());
export { mountAll, animate, disposeAll };
