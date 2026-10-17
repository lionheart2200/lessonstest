(() => {
const C = window.GAME_CONFIG, G = C.game, M = C.messages, O = C.options, J = C.jokers;
const $ = s => document.querySelector(s);
const fmt = (t, n) => t.replace("{name}", n);
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TYPES = { mcq: "اختر الإجابة", tf: "صح أم خطأ", fill: "أكمل", why: "علّل" };
const ansText = q => q.type === "mcq" ? q.opts[q.correct] : q.type === "tf" ? (q.correct ? "صح" : "خطأ") : q.a;
let cfg = C.players.map(p => ({ ...p })), S, muted = !G.sound, tick, uid = 0;
/* ثلاثي الأبعاد: إن لم يتوفر WebGL تعود اللعبة تلقائيًا للمشهد ثنائي الأبعاد */
const S3 = window.Stage3D && window.Stage3D.ok ? window.Stage3D : null;
let AH = [], PH = [];
const MODEL = p => p.model || (C.models && C.models[p.gender]) || "";
const killAH = () => { AH.forEach(h => h.destroy()); AH = []; };
const mount3d = (sel, list, scene) => [...document.querySelectorAll(sel + " .c3d")].map((cv, i) => S3.create(cv, { player: list[i], scene, model: MODEL(list[i]) }));
const react = (i, n) => { const h = AH[i]; if (h) h.play(n); };

const r = document.documentElement.style, P = C.palette;
r.setProperty("--bg", P.bg); r.setProperty("--card", P.card); r.setProperty("--ink", P.ink);
r.setProperty("--accent", P.accent); r.setProperty("--ok", P.ok); r.setProperty("--no", P.no);
$("#title").textContent = C.title; $("#subtitle").textContent = C.subtitle; $("#desc").textContent = C.description; document.title = C.title;

/* الصوت */
let ac;
function beep(f, d = .15, t = "sine", v = .12) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = t; o.frequency.value = f; g.gain.value = v;
    o.connect(g); g.connect(ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d); o.stop(ac.currentTime + d);
  } catch (e) {}
}
const jingle = a => a.forEach((f, i) => setTimeout(() => beep(f, .18, "triangle"), i * 130));
const siren = () => { beep(55, 1.4, "sawtooth", .25); for (let i = 0; i < 7; i++) setTimeout(() => beep(i % 2 ? 480 : 820, .2, "square", .1), i * 210); };
$("#bSound").textContent = muted ? "🔇" : "🔊";
$("#bSound").onclick = () => { muted = !muted; $("#bSound").textContent = muted ? "🔇" : "🔊"; beep(660); };
if (!document.fullscreenEnabled) $("#bFull").hidden = true;
$("#bFull").onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();

/* الشخصية */
function face(p) {
  const id = "g" + (uid++), hair = "#4a2c1a", e = p.expression, k = p.gender;
  const back = k === "female" ? `<path d="M22 50q-6 44 8 58h40q14-14 8-58z" fill="${hair}"/>` : "";
  const top = k === "neutral" ? `<circle cx="50" cy="20" r="8" fill="${hair}"/><path d="M26 42q4-20 24-20t24 20q-24-9-48 0z" fill="${hair}"/>` : `<path d="M25 44q3-26 25-26t25 26q-25-11-50 0z" fill="${hair}"/>`;
  const mouth = { confident: "M39 61q11 9 22 0", genius: "M42 61q8 5 16 0", naughty: "M38 60q14 12 24-5", confused: "M38 62q6-5 12 0t12 0" }[e];
  const brow = { confident: "M33 38l12-2M55 36l12 2", genius: "M34 34h10M56 34h10", naughty: "M33 40l11-5M56 35l11 5", confused: "M33 36l11 3M56 39l11-3" }[e];
  const glasses = p.accessory === "glasses" || e === "genius" ? `<g fill="none" stroke="#222" stroke-width="2.5"><circle cx="40" cy="49" r="8"/><circle cx="60" cy="49" r="8"/><path d="M48 49h4"/></g>` : "";
  const acc = { crown: `<path d="M32 22l6-12 6 8 6-12 6 12 6-8 6 12z" fill="#ffd23f" stroke="#c98a00" stroke-width="2"/>`,
    cap: `<path d="M26 34q24-26 48 0z" fill="#3a86ff"/><path d="M60 33h26q-2 6-26 5z" fill="#2563c9"/>`,
    bow: `<path d="M50 78l-12-7v14zM50 78l12-7v14z" fill="#ff6b6b" stroke="#a8271d" stroke-width="1.5"/>` }[p.accessory] || "";
  return `<svg viewBox="0 0 100 124" aria-hidden="true"><defs>
<radialGradient id="${id}h" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="${p.skin}"/><stop offset="1" stop-color="${p.skin}" stop-opacity=".75"/></radialGradient>
<linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${p.color}"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
${back}<path class="arm l" d="M31 80q-12 6-10 24" stroke="${p.skin}" stroke-width="9" fill="none" stroke-linecap="round"/><path class="arm r" d="M69 80q12 6 10 24" stroke="${p.skin}" stroke-width="9" fill="none" stroke-linecap="round"/>
<rect x="27" y="74" width="46" height="42" rx="16" fill="url(#${id}b)"/>
<circle cx="50" cy="48" r="27" fill="url(#${id}h)"/>${top}
<circle cx="40" cy="49" r="${e === "confused" ? 4.5 : 3.2}" fill="#222"/><circle cx="60" cy="49" r="3.2" fill="#222"/>
<path d="${brow}" stroke="${hair}" stroke-width="3" stroke-linecap="round"/><path d="${mouth}" fill="none" stroke="#7a2e2e" stroke-width="3" stroke-linecap="round"/>${glasses}${acc}</svg>`;
}

/* شاشة البداية */
const sel = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("");
function buildSetup() {
  $("#setup").innerHTML = cfg.map((p, i) => `<div class="card pv" data-i="${i}"><div class="pvs"></div>
<label>الاسم<input data-f="name" value="${esc(p.name)}" maxlength="22"></label>
<label>الشخصية<select data-f="gender">${sel(O.genders, p.gender)}</select></label>
<label>الإكسسوار<select data-f="accessory">${sel(O.accessories, p.accessory)}</select></label>
<label>الأسلوب<select data-f="expression">${sel(O.expressions, p.expression)}</select></label>
<label>لون البشرة</label><div class="sw" data-f="skin"></div><label>لون الملابس</label><div class="sw" data-f="color"></div></div>`).join("");
  document.querySelectorAll("#setup .card").forEach(card => {
    const i = +card.dataset.i, pvs = card.querySelector(".pvs");
    if (S3) { pvs.innerHTML = '<div class="s3 s3p"><canvas class="c3d"></canvas></div>'; PH[i] = S3.create(pvs.querySelector(".c3d"), { player: cfg[i], scene: "preview", model: MODEL(cfg[i]) }); }
    const draw = () => S3 ? PH[i].setPlayer(cfg[i], MODEL(cfg[i])) : pvs.innerHTML = face(cfg[i]);
    ["skin", "color"].forEach(f => {
      const box = card.querySelector(`.sw[data-f=${f}]`);
      box.innerHTML = O[f + "s"].map(c => `<button type="button" style="background:${c}" data-c="${c}" aria-label="${c}" aria-pressed="${c === cfg[i][f]}"></button>`).join("");
      box.onclick = e => { const b = e.target.closest("button"); if (!b) return; cfg[i][f] = b.dataset.c; box.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); };
    });
    card.addEventListener("input", e => { const f = e.target.dataset.f; if (f) { cfg[i][f] = e.target.value; draw(); } });
    draw();
  });
}
const nums = (a, v) => a.map(n => `<option value="${n}"${n === v ? " selected" : ""}>${n}</option>`).join("");
$("#oCount").innerHTML = nums(G.countChoices, G.questionCount); $("#oTime").innerHTML = nums(G.timeChoices, G.timeSeconds); $("#oScene").innerHTML = sel(O.scenes, G.scene);
buildSetup();
const show = id => { ["start", "play", "end"].forEach(s => $("#s-" + s).hidden = s !== id); window.scrollTo(0, 0); };
const stat = v => M.status.find(s => v >= s.min);
const clamp = v => Math.max(0, Math.min(100, v));

/* المشهد */
function stage(p, scene, cls = "") {
  if (S3) return `<div class="s3"><canvas class="c3d" role="img" aria-label="${esc(p.name)}"></canvas></div>`;
  return `<div class="stage scene-${scene} ${cls}" style="--d:${1 - p.safety / 100}"><div class="slime"><b></b><b></b><b></b></div><div class="hazard">${scene === "rock" ? "🪨" : "🐍"}</div><div class="bridge"></div><div class="ground"></div><div class="shield"></div><div class="char">${face(p)}</div><div class="ringb">🛟</div><div class="flash"></div><div class="wow">😱</div></div>`;
}
function buildArena() {
  $("#arena").innerHTML = S.pl.map(p => `<div class="card pl"><div class="head"><span>${p.name}</span><b class="pt"></b></div>${stage(p, S.scene)}<div class="meter" role="meter" aria-label="مستوى الأمان" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="st"></div></div>`).join("");
  killAH(); if (S3) AH = mount3d("#arena", S.pl, S.scene);
}
function upd() {
  document.querySelectorAll("#arena .pl").forEach((el, i) => {
    const p = S.pl[i], st = stat(p.safety), sg = el.querySelector(".stage"), h = AH[i];
    el.classList.toggle("on", S.act === i && S.phase !== "done");
    if (h) h.set({ d: 1 - p.safety / 100, hi: p.safety > 0 && p.safety < 30, safe: p.safety >= 80, ring: p.safety <= 0 && !p.falling, active: S.act === i && S.phase !== "done" });
    else if (sg) {
      sg.style.setProperty("--d", 1 - p.safety / 100);
      sg.classList.toggle("hi", p.safety > 0 && p.safety < 30); sg.classList.toggle("safe", p.safety >= 80); sg.classList.toggle("ring", p.safety <= 0 && !p.falling);
    }
    el.querySelector(".pt").textContent = "⭐ " + p.points;
    el.querySelector(".meter i").style.width = p.safety + "%"; el.querySelector(".meter").setAttribute("aria-valuenow", p.safety);
    el.querySelector(".st").textContent = `${st.icon} ${st.text} (${p.safety}%)` + (S.act === i && S.phase !== "done" ? (S.phase === "steal" ? " • فرصة السرقة" : " • دوره الآن") : "");
  });
}
/* السقوط: إنذار + ترنّح ثم سقوط فعلي إذا انتهى الأمان */
function danger(i, falls) {
  const sg = document.querySelectorAll("#arena .stage")[i], p = S.pl[i], h = AH[i];
  siren(); navigator.vibrate && navigator.vibrate([150, 80, 150, 80, 300]);
  if (h) h.play("alarm", 1700); else if (sg) sg.classList.add("alarm");
  setTimeout(() => {
    if (sg) sg.classList.remove("alarm");
    if (!falls) { if (h) h.play("sad"); return; }
    p.falling = true; upd(); if (h) h.play("fall", 1200); else if (sg) sg.classList.add("fall"); beep(300, .5, "sine", .2);
    setTimeout(() => { if (sg) sg.classList.remove("fall"); p.falling = false; upd(); }, 1200);
  }, 1700);
}

/* بناء الجولات: كل جولة سؤالان من النوع نفسه وبالنقاط نفسها، واحد لكل فريق */
function buildSeq(n) {
  let qs = C.questions.slice(); if (G.shuffle) qs.sort(() => Math.random() - .5);
  const by = {}; qs.forEach(q => (by[q.type || "fill"] = by[q.type || "fill"] || []).push(q));
  const ps = Object.values(by).map(a => { a = a.slice().sort((x, y) => x.points - y.points); const r = []; for (let i = 0; i + 1 < a.length; i += 2) r.push([a[i], { ...a[i + 1], points: a[i].points }]); return r; });
  const out = []; while (out.length < n && ps.some(x => x.length)) ps.forEach(x => { if (x.length && out.length < n) out.push(x.shift()); });
  return out.flatMap(([a, b], i) => [{ q: a, t: i % 2 }, { q: b, t: 1 - i % 2 }]);
}
function start() {
  const seq = buildSeq(+$("#oCount").value);
  if (!seq.length) return alert("أضف أسئلة بأزواج من كل نوع من المحرّر أولًا.");
  const jk = () => Object.fromEntries(Object.keys(J).map(k => [k, J[k].count]));
  S = { pl: cfg.map(p => ({ ...p, points: 0, safety: G.startSafety, jk: jk() })), seq, time: +$("#oTime").value, scene: $("#oScene").value, i: 0, act: 0, phase: "ask" };
  show("play"); buildArena(); question();
}
function question() {
  const { q, t } = S.seq[S.i];
  Object.assign(S, { q, act: t, phase: "ask", left: S.time, dbl: false, hid: [], bad: [], ju: {} });
  $("#qTurn").textContent = fmt(M.turn, S.pl[t].name); $("#qCat").textContent = TYPES[q.type] + " • " + q.cat; $("#qPts").textContent = q.points + " نقطة";
  $("#qText").textContent = q.q; $("#qAns").hidden = true; $("#qMsg").textContent = "";
  $("#bNext").hidden = true; setUI(); runTimer();
}
function setUI() { opts(); $("#judge").hidden = S.phase === "done" || S.q.type === "mcq" || S.q.type === "tf"; jokers(); upd(); }
function opts() {
  const q = S.q, done = S.phase === "done", L = ["أ", "ب", "ج", "د"]; let items = [];
  if (q.type === "mcq") items = q.opts.map((o, i) => [i, `${L[i]}) ${esc(o)}`]).filter(([i]) => !S.hid.includes(i));
  if (q.type === "tf") items = [[1, "✔ صح"], [0, "✖ خطأ"]];
  $("#qOpts").innerHTML = items.map(([i, t]) => {
    const right = q.type === "mcq" ? i === q.correct : i === (q.correct ? 1 : 0), bad = S.bad.includes(i);
    return `<button class="opt ${done && right ? "right" : ""} ${bad ? "bad" : ""}" data-v="${i}" ${done || bad ? "disabled" : ""}>${done && right ? "✅ " : bad ? "❌ " : ""}${t}</button>`;
  }).join("");
}
$("#qOpts").onclick = e => {
  const b = e.target.closest(".opt"); if (!b || S.phase === "done") return;
  const v = +b.dataset.v, q = S.q, ok = q.type === "mcq" ? v === q.correct : v === (q.correct ? 1 : 0);
  if (!ok) S.bad.push(v); judge(ok);
};
function jokers() {
  const box = $("#jk"), p = S.pl[S.act];
  if (S.phase !== "ask") { box.innerHTML = ""; return; }
  box.innerHTML = Object.keys(J).map(k => {
    const off = !p.jk[k] || S.ju[k] || (k === "hide2" && S.q.type !== "mcq");
    return `<button class="jkb" data-k="${k}" ${off ? "disabled" : ""}>${J[k].label} (${p.jk[k]})</button>`;
  }).join("");
}
$("#jk").onclick = e => {
  const b = e.target.closest(".jkb"); if (!b) return; const k = b.dataset.k, p = S.pl[S.act];
  p.jk[k]--; S.ju[k] = true; beep(900, .15, "triangle");
  if (k === "hide2") { const w = S.q.opts.map((_, i) => i).filter(i => i !== S.q.correct && !S.hid.includes(i)).sort(() => Math.random() - .5); S.hid.push(w[0], w[1]); }
  if (k === "time") { S.left += J.time.seconds; $("#qTime").textContent = S.left; }
  if (k === "double") { S.dbl = true; $("#qMsg").textContent = "نقاط مضاعفة لهذا السؤال!"; }
  setUI();
};
function runTimer() {
  clearInterval(tick); const el = $("#qTime");
  const paint = () => { el.textContent = S.left; el.classList.toggle("low", S.left <= 5); }; paint();
  tick = setInterval(() => {
    S.left--; paint(); if (S.left <= 5 && S.left > 0) beep(880, .06);
    if (S.left <= 0) { clearInterval(tick); beep(180, .4, "sawtooth"); $("#qMsg").textContent = M.timeUp; if (S.q.type === "mcq" || S.q.type === "tf") judge(false); }
  }, 1000);
}
function judge(ok) {
  const q = S.q; clearInterval(tick);
  if (S.phase === "ask") {
    const me = S.pl[S.act], before = me.safety, a = S.act;
    if (ok) { me.points += q.points * (S.dbl ? 2 : 1); me.safety = clamp(me.safety + G.safetyStep); $("#qMsg").textContent = M.correct; jingle([523, 659, 784]); react(a, "cheer"); return finish(); }
    me.points = Math.max(0, me.points - Math.round(q.points * G.wrongPenalty)); me.safety = clamp(me.safety - G.safetyStep);
    danger(a, me.safety <= 0 && before > 0);
    if (G.steal && q.type !== "tf") { S.phase = "steal"; S.act = 1 - a; S.left = S.time; $("#qMsg").textContent = fmt(M.stealAsk, S.pl[S.act].name); setUI(); return runTimer(); }
    $("#qMsg").textContent = M.wrong; return finish();
  }
  const me = S.pl[S.act];
  if (ok) { me.points += Math.round(q.points * G.stealPoints); me.safety = clamp(me.safety + G.stealSafety); $("#qMsg").textContent = M.stealWin; jingle([659, 784, 988]); react(S.act, "cheer"); }
  else { $("#qMsg").textContent = M.bothWrong; react(S.act, "sad"); }
  finish();
}
function finish() {
  const q = S.q; S.phase = "done";
  $("#qAns").innerHTML = `✅ الإجابة النموذجية: ${esc(ansText(q))}` + (q.note ? `<br><small>${esc(q.note)}</small>` : ""); $("#qAns").hidden = false;
  $("#bNext").hidden = false; $("#bNext").textContent = S.i + 1 >= S.seq.length ? "عرض النتيجة" : "التالي"; setUI(); $("#bNext").focus();
}
$("#bOk").onclick = () => judge(true); $("#bNo").onclick = () => judge(false);
$("#bNext").onclick = () => { S.i++; if (S.i >= S.seq.length) return end(); question(); };

/* النهاية */
function end() {
  clearInterval(tick); const [a, b] = S.pl, tie = a.points === b.points, w = a.points > b.points ? 0 : 1;
  document.body.classList.remove("still"); show("end");
  $("#endTitle").textContent = tie ? M.tie : fmt(M.win, S.pl[w].name);
  killAH();
  $("#endArena").innerHTML = S.pl.map((p, i) => { const win = tie || i === w;
    return `<div class="card pl"><div class="head"><span>${p.name}</span><span>⭐ ${p.points}</span></div>${stage({ ...p, safety: win ? 100 : 40 }, S.scene, win ? "win safe" : "lose")}<div class="st">${win ? "🏆 نجا!" : fmt(M.lose, p.name)}</div></div>`; }).join("");
  if (S3) { AH = mount3d("#endArena", S.pl, S.scene); AH.forEach((h, i) => { const win = tie || i === w; h.setMode(win ? "win" : "lose"); h.set({ d: win ? 0 : .6, safe: win }); if (win) h.play("cheer"); }); }
  $("#endScore").textContent = `${a.name}: ${a.points} — ${b.name}: ${b.points}`;
  const cf = $("#confetti"); cf.innerHTML = "";
  for (let i = 0; i < 40; i++) { const e = document.createElement("i");
    e.style.cssText = `left:${Math.random() * 100}%;background:hsl(${Math.random() * 360},90%,60%);animation-duration:${2 + Math.random() * 3}s;animation-delay:${Math.random()}s`; cf.appendChild(e); }
  jingle([523, 659, 784, 1046]);
}
$("#bSkip").onclick = () => { document.body.classList.add("still"); $("#confetti").innerHTML = ""; };
$("#bAgain").onclick = start;
const reset = () => { clearInterval(tick); $("#confetti").innerHTML = ""; show("start"); };
$("#bNew").onclick = reset; $("#bReset").onclick = reset;
$("#bStart").onclick = () => { cfg.forEach((p, i) => p.name = p.name.trim() || C.players[i].name); start(); };
})();
