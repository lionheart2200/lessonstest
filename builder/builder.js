(() => {
const O = window.GAME_CONFIG.options;
const L = new URLSearchParams(location.search).get("lesson") || "lesson-1", KEY = "quizDraft:" + L;
const DEF = JSON.parse(JSON.stringify(window.GAME_CONFIG));
let cfg = JSON.parse(JSON.stringify(DEF)), loadedDraft = false;
try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) { cfg = d; loadedDraft = true; } } catch (e) {}
const $ = s => document.querySelector(s);
const TY = { mcq: "اختيار من 4", tf: "صح أم خطأ", fill: "أكمل", why: "علّل" };
const get = p => p.split(".").reduce((o, k) => o && o[k], cfg);
const set = (p, v) => { const k = p.split("."), l = k.pop(); k.reduce((o, x) => o[x], cfg)[l] = v; };
const opt = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}"${k == v ? " selected" : ""}>${t}</option>`).join("");
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const say = t => { $("#bmsg").textContent = t; };

const groups = () => [
  ["النصوص", [["title", "text", "عنوان اللعبة"], ["subtitle", "text", "العنوان الفرعي"], ["description", "text", "الوصف"]]],
  ["قواعد اللعب", [["game.questionCount", "num", "عدد الجولات (كل فريق يأخذ سؤالًا من النوع نفسه)"], ["game.timeSeconds", "num", "وقت السؤال بالثواني"],
    ["game.scene", "sel:scenes", "مشهد المغامرة"], ["game.shuffle", "chk", "خلط الأسئلة"], ["game.startSafety", "num", "مستوى الأمان الابتدائي (0-100)"],
    ["game.safetyStep", "num", "تغيّر الأمان لكل إجابة"], ["game.wrongPenalty", "num", "خصم الخطأ (0 إلى 1 من نقاط السؤال)"],
    ["game.steal", "chk", "فرصة للفريق الآخر بعد الخطأ"], ["game.stealPoints", "num", "نسبة نقاط السرقة (0.5 = النصف)"], ["game.stealSafety", "num", "أمان إضافي للسارق"], ["game.sound", "chk", "الصوت مفعّل مبدئيًا"]]],
  ["الجواكر (0 = معطّل)", [["jokers.hide2.count", "num", "حذف إجابتين: العدد لكل فريق"], ["jokers.time.count", "num", "وقت إضافي: العدد"], ["jokers.time.seconds", "num", "ثواني الوقت الإضافي"], ["jokers.double.count", "num", "نقاط مضاعفة: العدد"]]],
  ...cfg.players.map((p, i) => ["اللاعب " + (i + 1), [[`players.${i}.name`, "text", "الاسم"], [`players.${i}.gender`, "sel:genders", "الشخصية"], [`players.${i}.accessory`, "sel:accessories", "الإكسسوار"],
    [`players.${i}.expression`, "sel:expressions", "الأسلوب"], [`players.${i}.skin`, "color", "لون البشرة"], [`players.${i}.color`, "color", "لون الملابس"]]]),
  ["الألوان", [["palette.bg", "text", "الخلفية (CSS gradient)"], ["palette.accent", "color", "لون التمييز"], ["palette.ink", "color", "لون النص"], ["palette.ok", "color", "لون الصحيح"], ["palette.no", "color", "لون الخطأ"]]],
  ["الرسائل ({name} = اسم اللاعب)", ["correct", "wrong", "win", "tie", "lose"].map(k => ["messages." + k, "text", k])]
];
function fld([p, t, l]) {
  const v = get(p); let c;
  if (t === "chk") c = `<input type="checkbox" data-p="${p}" ${v ? "checked" : ""}>`;
  else if (t === "num") c = `<input type="number" step="any" data-p="${p}" value="${esc(v)}">`;
  else if (t === "color") c = `<input type="color" data-p="${p}" value="${esc(v)}">`;
  else if (t.startsWith("sel:")) c = `<select data-p="${p}">${opt(O[t.slice(4)], v)}</select>`;
  else c = `<input data-p="${p}" value="${esc(v)}">`;
  return `<label>${l}${c}</label>`;
}
function renderBB() {
  $("#bb").innerHTML = groups().map(([g, it], i) => `<details class="card" ${i < 2 ? "open" : ""}><summary>${g}</summary><div class="fg">${it.map(fld).join("")}</div></details>`).join("");
}
$("#bb").addEventListener("input", e => {
  const el = e.target, p = el.dataset.p; if (!p) return;
  set(p, el.type === "checkbox" ? el.checked : el.type === "number" ? +el.value : el.value);
});

/* الأسئلة */
const body = (q, i) => q.type === "mcq"
  ? [0, 1, 2, 3].map(j => `<div class="row"><input type="radio" name="r${i}" data-k="correct" data-j="${j}" ${q.correct === j ? "checked" : ""} aria-label="هذه هي الإجابة الصحيحة"><input data-k="opt" data-j="${j}" value="${esc(q.opts[j])}" placeholder="الاختيار ${j + 1}"></div>`).join("")
  : q.type === "tf" ? `<select data-k="tfc"><option value="1" ${q.correct ? "selected" : ""}>الإجابة: صح</option><option value="0" ${q.correct ? "" : "selected"}>الإجابة: خطأ</option></select>`
  : `<textarea data-k="a" rows="2" placeholder="الإجابة النموذجية">${esc(q.a)}</textarea>`;
function renderQ() {
  $("#qs").innerHTML = cfg.questions.map((q, i) => `<div class="qc" data-i="${i}"><div class="row"><b>${i + 1}</b>
<select data-k="type" aria-label="النوع">${opt(TY, q.type)}</select><input data-k="cat" value="${esc(q.cat)}" placeholder="التصنيف" aria-label="التصنيف">
<input data-k="points" type="number" value="${q.points}" style="width:90px" aria-label="النقاط"><button class="mini" data-del aria-label="حذف السؤال">🗑</button></div>
<textarea data-k="q" rows="2" placeholder="نص السؤال">${esc(q.q)}</textarea>${body(q, i)}<input data-k="note" value="${esc(q.note)}" placeholder="شرح اختياري"></div>`).join("");
  const n = {}; cfg.questions.forEach(q => n[q.type] = (n[q.type] || 0) + 1);
  const odd = Object.keys(n).filter(t => n[t] % 2).map(t => TY[t]);
  $("#warn").textContent = odd.length ? `⚠️ عدد أسئلة (${odd.join("، ")}) فردي: سيُهمل سؤال واحد. أضف سؤالًا ليكتمل الزوج.` : `✅ كل الأنواع مكتملة الأزواج (${cfg.questions.length / 2} جولة كحد أقصى).`;
}
const fresh = t => ({ type: t, cat: "", q: "", points: 10, note: "", ...(t === "mcq" ? { opts: ["", "", "", ""], correct: 0 } : t === "tf" ? { correct: true } : { a: "" }) });
$("#newT").innerHTML = opt(TY, "mcq");
$("#addQ").onclick = () => { cfg.questions.push(fresh($("#newT").value)); renderQ(); say("تمت إضافة سؤال جديد في آخر القائمة."); };
$("#qs").addEventListener("click", e => { if (!e.target.closest("[data-del]")) return; cfg.questions.splice(+e.target.closest(".qc").dataset.i, 1); renderQ(); });
$("#qs").addEventListener("input", e => {
  const el = e.target, k = el.dataset.k; if (!k) return;
  const q = cfg.questions[+el.closest(".qc").dataset.i];
  if (k === "type") { Object.assign(q, fresh(el.value), { cat: q.cat, q: q.q, points: q.points, note: q.note }); return renderQ(); }
  if (k === "points") q.points = +el.value; else if (k === "correct") q.correct = +el.dataset.j;
  else if (k === "opt") q.opts[+el.dataset.j] = el.value; else if (k === "tfc") q.correct = el.value === "1"; else q[k] = el.value;
});

/* الحفظ والتصدير */
const file = (name, txt) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" })); a.download = name; a.click(); };
$("#save").onclick = () => { let ok = true; try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { ok = false; } say(ok ? "تم حفظ مسودة في هذا المتصفح. للنشر نزّل config.js." : "تعذّر حفظ المسودة. نزّل config.js بدلًا من ذلك."); };
$("#dl").onclick = () => { file("config.js", "/* أُنشئ بواسطة محرّر اللعبة */\nwindow.GAME_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n"); say("ضع الملف في lessons/" + L + "/ ثم شغّل: python publish.py " + L); };
$("#exp").onclick = () => file("quiz-config.json", JSON.stringify(cfg, null, 2));
$("#imp").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { cfg = JSON.parse(t); renderBB(); renderQ(); say("تم الاستيراد. لا تنسَ الحفظ."); } catch (x) { say("الملف ليس JSON صالحًا."); } }); };
$("#rst").onclick = () => { if (!confirm("استعادة الإعدادات والأسئلة الافتراضية؟")) return; try { localStorage.removeItem(KEY); } catch (e) {} cfg = JSON.parse(JSON.stringify(DEF)); renderBB(); renderQ(); say("تمت الاستعادة."); };
renderBB(); renderQ(); say("الدرس: " + L + (loadedDraft ? " — تم تحميل مسودة محفوظة." : ""));
})();
