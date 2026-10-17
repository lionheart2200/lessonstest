/* Stage3D — شخصيات ومشاهد ثلاثية الأبعاد بـ Three.js
   مُصيِّر WebGL واحد مشترك يرسم كل المشاهد ثم ينسخ الناتج إلى لوحات 2D (أخف على الجوال/WebView).
   الواجهة:  Stage3D.create(canvas, {player, scene, mode, model}) -> handle
   handle: setPlayer(p, modelUrl) · set({d,hi,safe,ring,active}) · play("cheer|sad|alarm|fall", ms) · destroy() */
(() => {
"use strict";
const T = window.THREE;
if (!T) { window.Stage3D = { ok: false }; return; }
let renderer;
try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); if (!renderer.getContext()) throw 0; }
catch (e) { window.Stage3D = { ok: false }; return; }
renderer.setClearColor(0x000000, 0);
renderer.setScissorTest(true);
renderer.domElement.addEventListener("webglcontextlost", e => e.preventDefault());
T.Cache.enabled = true;

const PI = Math.PI, H = 2.75; /* ارتفاع الشخصية */
const lam = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o));
const mk = (tr, geo, mat, par) => { const m = new T.Mesh(geo, mat); tr.push(geo, mat); if (par) par.add(m); return m; };
const free = tr => { tr.forEach(o => o.dispose && o.dispose()); tr.length = 0; };
const easeOut = u => 1 - Math.pow(1 - u, 3);
const backOut = u => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2);
const RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
const reduced = () => RM.matches || document.body.classList.contains("still");
const lerp = (a, b, k) => a + (b - a) * k;

const sky = (() => { const c = document.createElement("canvas"); c.width = 2; c.height = 128; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#8fe3ff"); g.addColorStop(1, "#e9fbff"); x.fillStyle = g; x.fillRect(0, 0, 2, 128); return new T.CanvasTexture(c); })();

/* ========== الشخصية (مجسّم من أشكال هندسية) ========== */
const EXP = {
  confident: { br: [-.15, .15], by: [.3, .3], es: [1, 1], m: "smile", ms: 1, mr: 0, mx: 0 },
  genius:    { br: [0, 0], by: [.36, .36], es: [1, 1], m: "smile", ms: .65, mr: 0, mx: 0 },
  naughty:   { br: [-.5, -.15], by: [.28, .37], es: [1, .75], m: "smile", ms: .8, mr: .38, mx: .06 },
  confused:  { br: [.3, -.1], by: [.3, .38], es: [1.3, .9], m: "flat", ms: .7, mr: -.15, mx: 0 }
};

function buildChar(p, tr) {
  const root = new T.Group(), P = {}, skin = p.skin || "#ffcf9f", col = p.color || "#ff6b6b", hairC = 0x4a2c1a;
  const M = (g, c, par, o) => mk(tr, g, lam(c, o), par);
  [-1, 1].forEach(s => {
    M(new T.CylinderGeometry(.13, .13, .55, 10), 0x34345a, root).position.set(s * .2, .3, 0);
    const shoe = M(new T.SphereGeometry(.2, 12, 8), 0x222233, root); shoe.scale.set(1, .55, 1.4); shoe.position.set(s * .2, .1, .08);
  });
  P.body = M(new T.CapsuleGeometry(.42, .35, 6, 14), col, root); P.body.position.y = 1.05; P.body.scale.z = .85;
  P.arm = [-1, 1].map(s => {
    const piv = new T.Group(); piv.position.set(s * .52, 1.5, 0); root.add(piv);
    M(new T.CapsuleGeometry(.11, .45, 4, 8), skin, piv).position.y = -.34;
    M(new T.SphereGeometry(.13, 10, 8), skin, piv).position.y = -.7;
    M(new T.CylinderGeometry(.14, .16, .24, 10), col, piv).position.y = -.1;
    return piv;
  });
  const head = new T.Group(); head.position.y = 2.1; root.add(head); P.head = head;
  M(new T.SphereGeometry(.62, 24, 18), skin, head);
  M(new T.SphereGeometry(.07, 10, 8), skin, head).position.set(0, -.04, .59);
  [-1, 1].forEach(s => { const b = M(new T.SphereGeometry(.085, 10, 8), 0xff8a8a, head, { transparent: true, opacity: .5 }); b.scale.set(1, .7, .35); b.position.set(s * .36, -.1, .47); b.rotation.y = s * .6; });
  P.eye = [-1, 1].map(s => {
    const g = new T.Group(); g.position.set(s * .2, .08, .54); head.add(g);
    const w = M(new T.SphereGeometry(.1, 12, 10), 0xffffff, g); w.scale.set(1, 1.15, .6);
    M(new T.SphereGeometry(.058, 10, 8), 0x1b1b2b, g).position.z = .045;
    return g;
  });
  P.brow = [-1, 1].map(s => { const b = M(new T.BoxGeometry(.22, .05, .05), hairC, head); b.position.set(s * .2, .3, .5); return b; });
  const mg = new T.Group(); mg.position.set(0, -.13, .57); mg.rotation.x = .3; head.add(mg);
  P.mouth = M(new T.TorusGeometry(.2, .035, 6, 16, PI), 0x7a2e2e, mg);
  P.mouthO = M(new T.TorusGeometry(.07, .035, 6, 12), 0x7a2e2e, mg); P.mouthO.position.y = -.05; P.mouthO.visible = false;
  /* الشعر */
  const hair = M(new T.SphereGeometry(.665, 24, 16, 0, PI * 2, 0, PI * .56), hairC, head); hair.rotation.x = -.28; hair.position.y = .03;
  if (p.gender === "female") { const b = M(new T.SphereGeometry(.66, 18, 14), hairC, head); b.scale.set(1.05, 1.35, .7); b.position.set(0, -.35, -.28); }
  else if (p.gender === "neutral") M(new T.SphereGeometry(.2, 12, 10), hairC, head).position.set(0, .72, -.12);
  /* الإكسسوارات */
  const a = p.accessory;
  if (a === "glasses" || p.expression === "genius") {
    [-1, 1].forEach(s => M(new T.TorusGeometry(.15, .022, 8, 18), 0x222222, head).position.set(s * .2, .08, .6));
    M(new T.BoxGeometry(.1, .025, .025), 0x222222, head).position.set(0, .1, .62);
  }
  if (a === "crown") {
    const cg = new T.Group(); cg.position.y = .68; head.add(cg);
    const gold = lam(0xffd23f, { emissive: 0x664400 });
    M(new T.CylinderGeometry(.34, .38, .14, 12), 0xffd23f, cg, { emissive: 0x664400 });
    for (let i = 0; i < 5; i++) { const c = mk(tr, new T.ConeGeometry(.08, .24, 8), gold, cg); const an = i / 5 * PI * 2; c.position.set(Math.cos(an) * .31, .18, Math.sin(an) * .31); }
    tr.push(gold);
  }
  if (a === "cap") {
    const c = M(new T.SphereGeometry(.7, 20, 12, 0, PI * 2, 0, PI * .5), 0x3a86ff, head); c.position.y = .1; c.rotation.x = -.18;
    const v = M(new T.BoxGeometry(.56, .05, .4), 0x2563c9, head); v.position.set(0, .2, .72); v.rotation.x = .18;
  }
  if (a === "bow") {
    const bg = new T.Group(); bg.position.set(0, 1.62, .36); root.add(bg);
    [-1, 1].forEach(s => { const c = M(new T.ConeGeometry(.13, .3, 8), 0xff6b6b, bg); c.rotation.z = -s * PI / 2; c.position.x = s * .16; });
    M(new T.SphereGeometry(.08, 10, 8), 0xff6b6b, bg);
  }
  return { root, P };
}

/* زخارف الحالات: درع، طوق نجاة، سهم الدور، تعجب، سحابة حزينة، بريق */
function buildDecor(tr, p) {
  const g = new T.Group(), D = { group: g };
  const L = (geo, mat, par) => mk(tr, geo, mat, par);
  D.shield = L(new T.SphereGeometry(1.75, 20, 14), new T.MeshBasicMaterial({ color: 0xffe36e, transparent: true, opacity: .2, depthWrite: false }), g); D.shield.position.y = 1.35; D.shield.visible = false;
  D.ring = L(new T.TorusGeometry(.56, .17, 10, 24), lam(0xff7043), g); D.ring.rotation.x = PI / 2; D.ring.position.y = 1; D.ring.visible = false;
  D.arrow = L(new T.ConeGeometry(.2, .42, 12), lam(0xffd23f, { emissive: 0x664400 }), g); D.arrow.rotation.x = PI; D.arrow.position.y = 3.55; D.arrow.visible = false;
  D.ex = new T.Group(); D.ex.position.y = 3.5; D.ex.visible = false; g.add(D.ex);
  L(new T.BoxGeometry(.14, .4, .1), lam(0xf04438, { emissive: 0x550000 }), D.ex).position.y = .18;
  L(new T.SphereGeometry(.08, 10, 8), lam(0xf04438, { emissive: 0x550000 }), D.ex).position.y = -.1;
  D.cloud = new T.Group(); D.cloud.position.y = 3.5; D.cloud.visible = false; g.add(D.cloud);
  const cm = lam(0x9aa3b5); [[-.32, 0, .28], [0, .08, .36], [.32, 0, .28]].forEach(([x, y, r]) => { L(new T.SphereGeometry(r, 12, 10), cm, D.cloud).position.set(x, y, 0); });
  const dm = lam(0x5fa8ff); D.drops = [0, 1, 2, 3].map(i => { const d = L(new T.SphereGeometry(.05, 8, 6), dm, D.cloud); d.userData.x = (i - 1.5) * .22; return d; });
  D.sp = new T.Group(); D.sp.position.y = 1.5; D.sp.visible = false; g.add(D.sp);
  for (let i = 0; i < 6; i++) { const s = L(new T.OctahedronGeometry(.11), lam(0xffd23f, { emissive: 0x886600 }), D.sp); const an = i / 6 * PI * 2; s.position.set(Math.cos(an) * 1.3, Math.sin(i * 1.7) * .6, Math.sin(an) * 1.3); }
  D.badge = L(new T.RingGeometry(.5, .66, 28), new T.MeshBasicMaterial({ color: p.color || "#ff6b6b", side: T.DoubleSide }), g); D.badge.rotation.x = -PI / 2; D.badge.position.y = .03; D.badge.visible = false;
  return D;
}

/* ========== المشاهد ========== */
const ground = (tr, g, w) => {
  mk(tr, new T.BoxGeometry(w, 2.75, 7), lam(0xc98a3d), g).position.set(0, -1.625, 0);
  mk(tr, new T.BoxGeometry(w + .05, .25, 7.05), lam(0x8fd96b), g).position.set(0, -.125, 0);
};
function common(h, tr, g) {
  const cm = lam(0xffffff, { emissive: 0x9fb8c8 }), E = {};
  E.clouds = [[-6, 4.6, -6, 1], [2, 5.6, -8, 1.3], [8, 4.2, -7, .9]].map(([x, y, z, s]) => {
    const c = new T.Group(); c.position.set(x, y, z); c.userData.x = x; g.add(c);
    [[0, 0, .7], [.8, -.1, .55], [-.8, -.15, .5]].forEach(([a, b, r]) => { const m = mk(tr, new T.SphereGeometry(r * s, 10, 8), cm, c); m.position.set(a * s, b * s, 0); }); return c;
  });
  [[-7, -2.4, -9, 4.2, 0x79d99a], [6, -2.8, -10, 5, 0x5fc48a]].forEach(([x, y, z, r, c]) => mk(tr, new T.SphereGeometry(r, 16, 12), lam(c), g).position.set(x, y, z));
  E.glow = mk(tr, new T.CircleGeometry(1.2, 28), new T.MeshBasicMaterial({ color: 0xfff3a8, transparent: true, opacity: .6 }), g); E.glow.rotation.x = -PI / 2; E.glow.position.y = .02; E.glow.visible = false;
  E.pill = new T.Group(); E.pill.visible = false; g.add(E.pill);
  [[-1.6, 0xffb3c7], [0, 0xffffff], [1.6, 0xb3d4ff]].forEach(([x, c]) => { const m = mk(tr, new T.SphereGeometry(1, 16, 12), lam(c), E.pill); m.scale.set(1.15, .4, 1); m.position.set(x, .25, 0); });
  return E;
}
function envSlime(h, tr, g) {
  const E = common(h, tr, g), dirt = lam(0xc98a3d), grass = lam(0x4fae3d), w1 = lam(0xb87a35), w2 = lam(0x9a6428);
  [-1, 1].forEach(s => { mk(tr, new T.BoxGeometry(4, 2.8, 6), dirt, g).position.set(s * 5, -1.6, 0); mk(tr, new T.BoxGeometry(4.05, .2, 6.05), grass, g).position.set(s * 5, -.1, 0); });
  for (let i = 0; i < 7; i++) mk(tr, new T.BoxGeometry(.84, .2, 1.8), i % 2 ? w1 : w2, g).position.set((i - 3) * .86, -.1, 0);
  [-1, 1].forEach(s => mk(tr, new T.CylinderGeometry(.07, .08, 1, 8), w2, g).position.set(s * 2.85, .5, -.8));
  mk(tr, new T.BoxGeometry(5.7, .05, .05), w2, g).position.set(0, .95, -.8);
  const pool = mk(tr, new T.BoxGeometry(6, 4, 6), lam(0x55c800, { emissive: 0x163d00 }), g);
  const bm = lam(0xd7ff7a), bub = [0, 1, 2, 3].map(i => { const b = mk(tr, new T.SphereGeometry(.13, 8, 6), bm, g); b.userData = { x: -2.2 + i * 1.45, z: 1.3 + (i % 2) * .9 }; return b; });
  return { E, update(t) {
    const top = Math.min(-.12, -1 + h.dv * .9 + h.al * .15 + (h.fx && h.fx.name === "fall" ? .15 : 0));
    pool.position.y = top - 2 + Math.sin(t * 2) * .02;
    bub.forEach((b, i) => { const ph = (t * .6 + i * .37) % 1; b.scale.setScalar(Math.max(.01, Math.sin(ph * PI))); b.position.set(b.userData.x, top + ph * .2, b.userData.z); });
  }, mode(m) { pool.visible = m !== "lose"; bub.forEach(b => b.visible = m !== "lose"); } };
}
function envRock(h, tr, g) {
  const E = common(h, tr, g); ground(tr, g, 18);
  const b = new T.Group(); g.add(b);
  const rock = mk(tr, new T.IcosahedronGeometry(1.05, 1), lam(0x8e8ea0, { flatShading: true }), b);
  const sh = mk(tr, new T.CircleGeometry(1, 20), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .25 }), g); sh.rotation.x = -PI / 2; sh.position.y = .02; sh.scale.set(1.3, 1, 1);
  return { E, update(t) {
    const x = 6.4 - 4.55 * h.dv - h.al * .45;
    b.position.set(x, 1.05 + Math.abs(Math.sin(t * 5)) * .06, 0); rock.rotation.z = -x / 1.05; sh.position.x = x;
  }, mode(m) { b.visible = sh.visible = m === "play"; } };
}
function envSnake(h, tr, g) {
  const E = common(h, tr, g); ground(tr, g, 18);
  const sn = new T.Group(), N = 9, segs = [], ga = lam(0x6bd16b), gb = lam(0xffd23f); g.add(sn);
  for (let i = 0; i < N; i++) { const r = Math.max(.17, .4 - i * .03); const s = mk(tr, new T.SphereGeometry(r, 14, 10), i % 2 ? gb : ga, sn); s.userData.r = r; segs.push(s); }
  const head = new T.Group(); sn.add(head);
  const hm = mk(tr, new T.SphereGeometry(.5, 16, 12), ga, head); hm.scale.set(1.1, .9, .95);
  [-1, 1].forEach(s => { const e = mk(tr, new T.SphereGeometry(.13, 10, 8), lam(0xffffff), head); e.position.set(-.3, .2, s * .3); mk(tr, new T.SphereGeometry(.07, 8, 6), lam(0x111111), head).position.set(-.4, .2, s * .31); });
  const tongue = mk(tr, new T.BoxGeometry(.32, .04, .08), lam(0xf04438), head); tongue.position.set(-.62, -.05, 0);
  return { E, update(t) {
    const hx = 6.3 - 4.6 * h.dv - h.al * .4, bob = Math.abs(Math.sin(t * 4)) * .06;
    head.position.set(hx, .5 + bob, 0); tongue.scale.x = .6 + Math.abs(Math.sin(t * 9)) * .6;
    segs.forEach((s, i) => s.position.set(hx + .5 + i * .52, s.userData.r + .02 + .1 * Math.sin(t * 4 - i * .9), .25 * Math.sin(t * 2.5 - i * .7)));
  }, mode(m) { sn.visible = m === "play"; } };
}
function envPreview(h, tr, g) {
  mk(tr, new T.CylinderGeometry(1.1, 1.2, .12, 28), lam(0xe9e4ff), g).position.y = -.06;
  return { E: { glow: null, pill: null, clouds: [] }, update() {}, mode() {} };
}
const ENVS = { slime: envSlime, rock: envRock, snake: envSnake, preview: envPreview };

/* ========== المقبض (Handle) ========== */
const handles = new Set();
const DUR = { cheer: 1500, sad: 1700, alarm: 1700, fall: 1200 };
let dpr = Math.min(window.devicePixelRatio || 1, 1.5), RW = 0, RH = 0;

function create(canvas, o) {
  const prev = o.scene === "preview";
  const h = { canvas, ctx: canvas.getContext("2d"), scene: new T.Scene(), cam: new T.PerspectiveCamera(30, 1.7, .1, 80),
    time: Math.random() * 10, seed: Math.random() * 6, flags: { d: .5, hi: false, safe: false, ring: false, active: false },
    dv: null, al: 0, mode: prev ? "preview" : (o.mode || "play"), sceneName: o.scene || "slime", fx: null, popT: -9, burstT: -9,
    vis: true, dead: false, char: null, ctr: [], etr: [], dtr: [], btr: [], sig: "", tok: 0, base: { y: prev ? .06 : 0 } };
  if (!prev) h.scene.background = sky;
  h.amb = new T.AmbientLight(0xffffff, .78); h.sun = new T.DirectionalLight(0xffffff, .85); h.sun.position.set(3, 6, 6);
  h.scene.add(h.amb, h.sun);
  const eg = new T.Group(); h.scene.add(eg);
  h.env = (ENVS[h.sceneName] || envSlime)(h, h.etr, eg); h.env.mode(h.mode);
  if (h.env.E.glow) h.env.E.glow.visible = h.mode === "win"; if (h.env.E.pill) h.env.E.pill.visible = h.mode === "lose";
  h.shadow = mk(h.etr, new T.CircleGeometry(.75, 20), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .28, depthWrite: false }), h.scene); h.shadow.rotation.x = -PI / 2; h.shadow.position.y = h.base.y + .03;
  /* قصاصات الاحتفال */
  h.bg = new T.Group(); h.scene.add(h.bg); const cols = [0xff6b6b, 0xffd23f, 0x2ec4b6, 0x8e5cf7, 0x3a86ff, 0xff9f1c].map(c => lam(c));
  h.bm = cols; h.bp = []; for (let i = 0; i < 18; i++) { const m = mk(h.btr, new T.BoxGeometry(.09, .14, .02), cols[i % 6], h.bg); m.visible = false; const a = Math.random() * PI * 2; m.userData = { vx: Math.cos(a) * (1 + Math.random() * 2.5), vy: 3 + Math.random() * 3, vz: Math.sin(a) * 1.5, sp: Math.random() * 10 }; h.bp.push(m); }
  h.cam.position.set(0, 1.7, 9.2);
  if ("IntersectionObserver" in window) { h.io = new IntersectionObserver(e => { h.vis = e[e.length - 1].isIntersecting; }); h.io.observe(canvas); }

  const burst = () => { h.burstT = h.time; };
  h.setPlayer = (p, url) => {
    const sig = [p.gender, p.accessory, p.expression, p.skin, p.color, url].join("|"); if (sig === h.sig) return; h.sig = sig; h.p = p;
    if (h.char) { h.scene.remove(h.char.root); free(h.ctr); free(h.dtr); h.char.dispose && h.char.dispose(); }
    const c = buildChar(p, h.ctr); c.D = buildDecor(h.dtr, p); c.root.add(c.D.group); c.exp = EXP[p.expression] || EXP.confident; h.scene.add(c.root); h.char = c;
    const tok = ++h.tok; if (url && T.GLTFLoader) loadGLB(h, p, url, tok);
  };
  h.set = f => { if (f.d != null && h.dv == null) h.dv = f.d; Object.assign(h.flags, f); };
  h.play = (n, ms) => { if (h.dead) return; h.fx = { name: n, t0: h.time, d: (ms || DUR[n] || 1500) / 1000 }; if (n === "cheer") burst(); };
  h.setMode = m => { h.mode = m; h.env.mode(m); if (h.env.E.glow) h.env.E.glow.visible = m === "win"; if (h.env.E.pill) h.env.E.pill.visible = m === "lose"; };
  h.destroy = () => { h.dead = true; handles.delete(h); h.io && h.io.disconnect(); if (h.char) h.char.dispose && h.char.dispose(); free(h.ctr); free(h.dtr); free(h.etr); free(h.btr); h.scene.clear(); };
  h.setPlayer(o.player, o.model);
  handles.add(h); start();
  return h;
}

/* نماذج GLB اختيارية: تُضبط على ارتفاع الشخصية تلقائيًا ويُستخدم أي Animation مطابق للاسم */
function loadGLB(h, p, url, tok) {
  new T.GLTFLoader().load(url, gltf => {
    if (h.dead || tok !== h.tok) return;
    const obj = gltf.scene, box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const k = H / (size.y || 1); obj.scale.multiplyScalar(k); obj.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
    const root = new T.Group(); root.add(obj); const old = h.char, D = old.D;
    root.add(D.group); D.badge.visible = true; h.scene.remove(old.root); free(h.ctr);
    const c = { root, P: null, D, glb: true, exp: old.exp, mixer: null, acts: {}, cur: "" };
    if (gltf.animations && gltf.animations.length) {
      c.mixer = new T.AnimationMixer(obj);
      const pick = re => gltf.animations.find(a => re.test(a.name));
      const set = (key, clip) => { if (clip) c.acts[key] = c.mixer.clipAction(clip); };
      set("idle", pick(/idle|stand|breath/i) || gltf.animations[0]); set("cheer", pick(/cheer|win|dance|happy|jump|wave|victory|celebr/i));
      set("sad", pick(/sad|lose|defeat|cry|death|dead|lie/i)); set("alarm", pick(/run|scare|panic|hit|fear|shock|react/i));
    }
    c.dispose = () => obj.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) [].concat(n.material).forEach(m => { m.map && m.map.dispose(); m.dispose(); }); });
    h.scene.add(root); h.char = c;
  }, undefined, err => console.warn("تعذّر تحميل نموذج GLB، سيُستخدم المجسّم الافتراضي:", url, err));
}

/* ملامح الوجه حسب المزاج */
function faceSet(P, ex, mood, blink) {
  let br = ex.br, by = ex.by, es = ex.es, m = ex.m, ms = ex.ms, mr = ex.mr, mx = ex.mx, O = false;
  if (mood === "happy") { m = "smile"; ms = 1.35; mr = 0; mx = 0; by = [by[0] + .05, by[1] + .05]; es = [1.05, 1.05]; }
  else if (mood === "sad") { m = "frown"; ms = .9; mr = 0; mx = 0; br = [.4, -.4]; by = [.3, .3]; es = [.85, .85]; }
  else if (mood === "worry") { m = "frown"; ms = .55; mr = 0; mx = 0; br = [.3, -.3]; es = [1.1, 1.1]; }
  else if (mood === "shock") { O = true; br = [0, 0]; by = [.4, .4]; es = [1.4, 1.4]; }
  P.brow.forEach((b, i) => { b.rotation.z = br[i]; b.position.y = by[i]; });
  P.eye.forEach((e, i) => e.scale.set(es[i], es[i] * blink, es[i]));
  P.mouth.visible = !O; P.mouthO.visible = O;
  if (O) return;
  if (m === "frown") { P.mouth.rotation.z = 0; P.mouth.position.set(0, -.1 * ms, 0); P.mouth.scale.set(ms, ms, 1); }
  else if (m === "flat") { P.mouth.rotation.z = PI + mr; P.mouth.position.set(0, .02, 0); P.mouth.scale.set(ms, .2, 1); }
  else { P.mouth.rotation.z = PI + mr; P.mouth.position.set(mx, .1 * ms, 0); P.mouth.scale.set(ms, ms, 1); }
}

/* حركة الشخصية في كل إطار */
function animate(h, dt) {
  const t = h.time, c = h.char, R = c.root, P = c.P, D = c.D, red = reduced(), F = h.flags, mode = h.mode;
  let u = 0, fxn = "";
  if (h.fx) { u = (t - h.fx.t0) / h.fx.d; fxn = h.fx.name; if (u >= 1) { if (fxn === "fall") h.popT = t; h.fx = null; fxn = ""; u = 0; } }
  const lose = mode === "lose", win = mode === "win";
  let aL = -.15, aR = .15, aXL = 0, aXR = 0, hx = 0, hy = 0, bsy = 1, rx = 0, ry = 0, rrz = 0, rry = 0, sc = 1, mood = "idle", ex = false, cl = false, hide = false;
  if (!red) { const sw = Math.sin(t * 2 + h.seed); ry += Math.sin(t * 2.2 + h.seed) * .04; aL += sw * .05; aR -= sw * .05; if (F.active && mode === "play") ry += Math.abs(Math.sin(t * 3)) * .06; }
  if (F.ring && mode === "play") { ry += .08; mood = "worry"; }
  if (F.hi && mode === "play") { if (!red) rx += Math.sin(t * 38) * .025; mood = "worry"; }
  if (win) { mood = "happy"; aL = -(PI - .5 + (red ? 0 : Math.sin(t * 8) * .25)); aR = -aL; if (!red) ry += Math.abs(Math.sin(t * 4)) * .4; if (!red && t - h.burstT > 2.4) h.burstT = t; }
  if (lose) { mood = "sad"; hx = .3; aL = -.05; aR = .05; if (!red) ry += Math.sin(t * 1.5) * .03; }
  if (!win && !lose && fxn) {
    if (fxn === "cheer") { ry += Math.abs(Math.sin(u * PI * 3)) * (1 - u * .4) * .85; rry = easeOut(Math.min(1, u * 1.4)) * PI * 2; const w = Math.sin(t * 16) * .25; aL = -(PI - .5 + w); aR = PI - .5 - w; hy = Math.sin(t * 10) * .15; mood = "happy"; }
    else if (fxn === "sad") { hx = .45; hy = Math.sin(t * 5) * .25; aL = -.05; aR = .05; bsy = .94; ry -= .06; mood = "sad"; cl = true; }
    else if (fxn === "alarm") { rx += Math.sin(t * 55) * .07; rrz = Math.sin(t * 13) * .22; aL = -(.4 + (Math.sin(t * 22) + 1) * 1.1); aR = .4 + (Math.sin(t * 22 + 1.7) + 1) * 1.1; hy = Math.sin(t * 30) * .3; ry += Math.abs(Math.sin(t * 18)) * .15; mood = "shock"; ex = true; }
    else if (fxn === "fall") {
      mood = "shock"; aL = -2.2; aR = 2.2;
      if (h.sceneName === "slime") { ry += Math.sin(Math.min(u * 3, 1) * PI) * .4 - u * u * 3.6; rrz = u * 5; }
      else { rx -= u * 7; ry += Math.sin(u * PI) * 2.2 - u * .6; rrz = u * 9; }
      hide = u > .88;
    }
  }
  const pop = t - h.popT; if (pop < .35) sc = Math.max(.01, backOut(pop / .35));
  R.visible = !hide; R.scale.setScalar(sc);
  R.position.set(rx + (lose ? -1.4 : 0), h.base.y + ry + (lose ? 1.1 : 0), 0);
  R.rotation.set(0, rry + (h.mode === "preview" && !red ? Math.sin(t * .8) * .6 : 0), rrz + (lose ? -1.5 : 0));
  if (P) {
    P.arm[0].rotation.set(aXL, 0, aL); P.arm[1].rotation.set(aXR, 0, aR); P.head.rotation.set(hx, hy, 0); P.body.scale.y = bsy;
    const bl = (t + h.seed) % 3.6 < .12 ? .12 : 1; faceSet(P, c.exp, mood, mood === "shock" ? 1 : bl);
  }
  if (c.mixer) {
    const want = lose ? "sad" : (win || fxn === "cheer") ? "cheer" : fxn === "sad" ? "sad" : (fxn === "alarm" || fxn === "fall") ? "alarm" : "idle", k = c.acts[want] ? want : "idle";
    if (c.cur !== k && c.acts[k]) { const n = c.acts[k], o = c.acts[c.cur]; n.reset().play(); o && o.crossFadeTo(n, .25, false); c.cur = k; }
    c.mixer.update(dt);
  }
  D.group.visible = !hide;
  const play = mode === "play";
  D.arrow.visible = F.active && play && !fxn; D.arrow.position.y = 3.55 + Math.sin(t * 5) * .1;
  D.ring.visible = F.ring && play; D.shield.visible = F.safe && (play || win); D.shield.scale.setScalar(1 + Math.sin(t * 3) * .03);
  D.ex.visible = ex; D.ex.position.y = 3.25 + Math.abs(Math.sin(t * 20)) * .08;
  D.cloud.visible = cl; if (cl) D.drops.forEach((d, i) => { const ph = (t * 1.4 + i * .27) % 1; d.position.set(d.userData.x, -.3 - ph * 1.1, .1); d.visible = ph < .9; });
  D.sp.visible = win; D.sp.rotation.y = t * 1.5;
  h.shadow.visible = !lose && !hide; h.shadow.position.x = R.position.x; h.shadow.scale.setScalar(Math.max(.4, 1 - ry * .35));
  /* وميض الإنذار */
  const fl = fxn === "alarm" ? (Math.sin(t * 18) > 0 ? .55 : 0) : 0; h.amb.color.setRGB(1, 1 - fl, 1 - fl);
  /* قصاصات */
  const tau = t - h.burstT;
  h.bp.forEach(m => { const d = m.userData; if (tau < 0 || tau > 1.5) { m.visible = false; return; } m.visible = true; m.position.set(d.vx * tau, 1.8 + d.vy * tau - 4.5 * tau * tau, .4 + d.vz * tau); m.rotation.set(tau * d.sp, tau * d.sp * .7, 0); });
}

/* ========== الحلقة الرئيسية ========== */
let last = 0, ema = 0, on = false;
function start() { if (on) return; on = true; requestAnimationFrame(loop); }
function loop(ts) {
  requestAnimationFrame(loop);
  if (document.hidden || ts - last < 30) return;
  const dt = Math.min(.1, (ts - last) / 1000 || .033); last = ts;
  const t0 = performance.now(); let n = 0;
  handles.forEach(h => {
    if (h.dead || !h.vis || !h.canvas.isConnected) return;
    const cw = h.canvas.clientWidth, ch = h.canvas.clientHeight; if (!cw || !ch) return;
    const w = Math.max(1, Math.round(cw * dpr)), hh = Math.max(1, Math.round(ch * dpr));
    if (h.canvas.width !== w || h.canvas.height !== hh) {
      h.canvas.width = w; h.canvas.height = hh; h.cam.aspect = w / hh;
      const a = h.cam.aspect, pv = h.sceneName === "preview";
      h.cam.fov = pv ? 30 : 34; h.cam.position.set(0, pv ? 1.7 : 1.7, (pv ? 7.4 : 9.2) * Math.max(1, (pv ? 1.1 : 1.7) / a)); h.cam.lookAt(0, pv ? 1.4 : 1.1, 0); h.cam.updateProjectionMatrix();
    }
    if (w > RW || hh > RH) { RW = Math.max(RW, w); RH = Math.max(RH, hh); renderer.setSize(RW, RH, false); }
    h.time += dt;
    if (h.dv == null) h.dv = h.flags.d; h.dv += (h.flags.d - h.dv) * (1 - Math.exp(-dt * 4));
    h.al += ((h.fx && h.fx.name === "alarm" ? 1 : 0) - h.al) * (1 - Math.exp(-dt * 8));
    h.env.update(h.time); (h.env.E.clouds || []).forEach(c => { c.position.x = ((c.userData.x + h.time * .15 + 12) % 24) - 12; });
    animate(h, dt);
    renderer.setViewport(0, 0, w, hh); renderer.setScissor(0, 0, w, hh); renderer.render(h.scene, h.cam);
    h.ctx.clearRect(0, 0, w, hh); h.ctx.drawImage(renderer.domElement, 0, RH - hh, w, hh, 0, 0, w, hh); n++;
  });
  if (n) { ema = ema ? ema * .9 + (performance.now() - t0) * .1 : performance.now() - t0; if (ema > 24 && dpr > 1) { dpr = 1; ema = 0; } else if (ema > 34 && dpr > .75) { dpr = .75; ema = 0; } }
}

window.Stage3D = { ok: true, create, _handles: handles };
})();
