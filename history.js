// ✦ А.Р.Т.У.Р. — «из истории»: Арт читает события Horae, память сцен и последние посты
// и раскладывает их по своим разделам: операции, лаборатория, медблок, базы, архив.

import * as C from './core.js';
import * as D from './data.js';
import * as L from './lore.js';

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const has = (list, t) => list.some(x => C.norm(x) === C.norm(t));

// ───────────── что Арт читает ─────────────

/** Сводка истории: события Horae, память сцен (по теме — первой), последние посты. ~26 000 знаков максимум. */
export async function historyText(focus = []) {
    const parts = [];
    let ev = [];
    try { ev = C.A?.horaeEvents?.() || []; } catch { /* */ }
    let evText = ev.slice(-100).map(e => `${[e.timestamp?.story_date, e.timestamp?.story_time].filter(Boolean).join(' ')} — ${e.event?.summary || ''}`.trim()).filter(l => l.length > 6).join('\n');
    if (evText.length > 6500) evText = evText.slice(-6500);
    if (evText) parts.push(`## События (Horae)\n${evText}`);

    const ft = focus.map(C.norm).flatMap(t => t.split(/\s+/)).filter(t => t.length >= 4);
    let mems = [];
    try { mems = await L.memories(); } catch { /* */ }
    if (ft.length) {
        const score = (x) => ft.reduce((s, t) => s + (C.norm(`${x.e.comment} ${x.e.content}`).includes(t) ? 1 : 0), 0);
        mems = mems.map((x, i) => ({ x, s: score(x), i })).sort((a, b) => b.s - a.s || a.i - b.i).map(y => y.x);
    }
    const picked = [];
    let len = 0;
    for (const x of mems) {
        const piece = `### ${str(x.e.comment)}\n${C.cut(str(x.e.content), 2400)}`;
        if (len + piece.length > 9000) continue;
        picked.push(piece);
        len += piece.length;
    }
    if (picked.length) parts.push(`## Память сцен (STMemoryBooks)\n${picked.reverse().join('\n\n')}`);

    const chat = SillyTavern.getContext().chat || [];
    const posts = [];
    let pl = 0;
    for (let i = chat.length - 1; i >= 0 && pl < 12000; i--) {
        const m = chat[i];
        if (!m || m.is_system || m.extra?.type === 'comment') continue;
        const t = `[#${i}] ${m.name}: ${C.cut(C.plain(m.mes), 1400)}`;
        posts.unshift(t);
        pl += t.length;
    }
    if (posts.length) parts.push(`## Последние посты\n${posts.join('\n\n')}`);
    return parts.join('\n\n');
}

function sys(task) {
    const e = C.era();
    const k = C.clock();
    return `Ты — ${e.artur ? 'А.Р.Т.У.Р., ИИ Хеди Барлоу, ведёшь её компьютер' : 'архивист картотеки С.Н.Р.'}. Читаешь историю ролевой (события Horae, память сцен, последние посты) и раскладываешь её по своим разделам.
Эпоха: ${e.name} (${e.title}). Дата истории сейчас: ${[k.date, k.time].filter(Boolean).join(', ') || 'неизвестна'}.
${task}
Только то, что действительно есть в истории; не выдумывай и не додумывай за героев. Канон и лор держи. По-русски, коротко, сухо.`;
}
async function ask(task, existing, tokens = 2200, focus = []) {
    const e = C.era();
    const hist = await historyText(focus);
    if (!hist.trim()) throw new Error('История пустая: нет ни событий, ни памяти, ни постов');
    const out = await C.ask(sys(task), `Лор эпохи: ${C.eraLore(e)}\n\n${existing}\n\n${hist}`, tokens);
    const j = C.jsonOf(out);
    if (!j || typeof j !== 'object') throw new Error('Арт прочитал, но ответ не разобрался — попробуй ещё раз');
    return j;
}
const histLog = (obj, t) => { obj.log.unshift({ t: C.cut(t, 220), kind: 'hist', at: '', mes: C.clock().mes }); obj.log = obj.log.slice(0, 50); };
const addLogs = (obj, lines) => { let n = 0; for (const t of arr(lines).map(str).filter(Boolean)) { if (obj.log.some(l => C.norm(l.t) === C.norm(t))) continue; histLog(obj, t); n++; } return n; };
const sameName = (a, b) => { a = C.norm(a); b = C.norm(b); return !!a && !!b && (a === b || (a.length > 4 && b.includes(a)) || (b.length > 4 && a.includes(b))); };

// ───────────── операции ─────────────

const OPS_TASK = `Задача: операции, миссии, задания, вылазки и сделки этой эпохи — прошедшие, идущие и запланированные (Хеди, её люди и те, с кем она работает). Одна операция — одна запись, не дроби. Уже заведённые меняй через "update" по id, только если в истории что-то изменилось или появилось.
Ответ — только JSON:
{"ops":[{"name":"2–5 слов","status":"plan|live|hold|done|fail","goal":"1–2 предложения","where":"","when":"дата и время по истории","team":["имена"],"risk":3,"log":["что уже было, 2–8 пунктов по 6–16 слов, по порядку"]}],"update":[{"id":"","status":"","goal":"","where":"","when":"","team":[],"log":["только новое"]}]}
risk — от 1 до 5.`;

const opLine = (o) => `${o.id} — ${o.name} (${C.statusName(o.status).toLowerCase()})${o.goal ? `: ${C.cut(o.goal, 120)}` : ''}${o.log[0] ? ` | последнее: ${C.cut(o.log[0].t, 80)}` : ''}`;

function mergeOp(o, x) {
    let n = 0;
    const st = str(x.status);
    if (st && D.STATUS_OPS.some(s => s[0] === st) && st !== o.status) { o.status = st; C.opLog(o, `Статус: ${C.statusName(st)}`, 'status'); n++; }
    for (const k of ['goal', 'where', 'when']) if (str(x[k]) && !o[k]) { o[k] = C.cut(str(x[k]), 300); n++; }
    for (const t of arr(x.team).map(str).filter(Boolean)) if (!has(o.team, t)) { o.team.push(t); n++; }
    const r = Number(x.risk);
    if (r >= 1 && r <= 5 && (!o.risk || o.risk === 3) && r !== o.risk) { o.risk = Math.round(r); n++; }
    n += addLogs(o, x.log);
    return n;
}

export async function extractOps() {
    const list = C.ops();
    const j = await ask(OPS_TASK, `Уже заведено:\n${list.map(opLine).join('\n') || 'ничего'}`);
    let added = 0, updated = 0;
    for (const x of arr(j.update)) { const o = C.opById(str(x?.id)); if (o && mergeOp(o, x)) updated++; }
    for (const x of arr(j.ops)) {
        const name = str(x?.name);
        if (!name) continue;
        const ex = C.ops().find(o => sameName(o.name, name));
        if (ex) { if (mergeOp(ex, x)) updated++; continue; }
        const st = D.STATUS_OPS.some(s => s[0] === str(x.status)) ? str(x.status) : 'plan';
        const o = C.addOp({ name: C.cut(name, 80), status: st, goal: C.cut(str(x.goal), 300), where: C.cut(str(x.where), 120), when: C.cut(str(x.when), 80), team: arr(x.team).map(str).filter(Boolean), risk: Math.max(1, Math.min(5, Number(x.risk) || 3)), src: 'hist', fresh: true });
        o.log = [];
        addLogs(o, x.log);
        added++;
    }
    C.save();
    return { added, updated };
}

// ───────────── лаборатория ─────────────

const LAB_TASK = `Задача: исследования, изобретения, разработки и опыты Хеди и её людей в этой эпохе — начатые, идущие, готовые. Только наука и техника, не бытовые дела. Уже заведённые меняй через "update" по id.
Ответ — только JSON:
{"projects":[{"name":"2–6 слов","field":"${D.FIELDS.map(f => f[0]).join('|')}","stage":0,"pct":0,"team":["имена"],"note":"суть, 1–2 предложения","bans":"запреты и условия, если звучали","log":["что уже сделано, 2–6 пунктов по 6–16 слов"]}],"update":[{"id":"","stage":null,"pct":null,"note":"","bans":"","log":["только новое"]}]}
stage: 0 идея, 1 теория, 2 прототип, 3 испытания, 4 готово; pct — прогресс внутри стадии.`;

function mergeProject(p, x) {
    let n = 0;
    const st = Number(x.stage);
    if (Number.isInteger(st) && st >= 0 && st <= 4 && st > p.stage) { p.stage = st; p.pct = st >= 4 ? 100 : 0; C.labLog(p, `Стадия: ${D.STAGES[st]}`, 'stage'); n++; }
    const pc = Number(x.pct);
    if (x.pct != null && pc >= 0 && pc <= 100 && pc > p.pct && p.stage < 4) { p.pct = Math.round(pc); n++; }
    for (const k of ['note', 'bans']) if (str(x[k]) && !p[k]) { p[k] = C.cut(str(x[k]), 500); n++; }
    for (const t of arr(x.team).map(str).filter(Boolean)) if (!has(p.team, t)) { p.team.push(t); n++; }
    n += addLogs(p, x.log);
    return n;
}

export async function extractLab() {
    const list = C.projects();
    const j = await ask(LAB_TASK, `Уже заведено:\n${list.map(p => `${p.id} — ${p.name} (${D.STAGES[p.stage]}, ${p.pct}%)${p.note ? `: ${C.cut(p.note, 100)}` : ''}`).join('\n') || 'ничего'}`);
    let added = 0, updated = 0;
    for (const x of arr(j.update)) { const p = C.projectById(str(x?.id)); if (p && mergeProject(p, x)) updated++; }
    const fields = D.FIELDS.map(f => f[0]);
    for (const x of arr(j.projects)) {
        const name = str(x?.name);
        if (!name) continue;
        const ex = C.projects().find(p => sameName(p.name, name));
        if (ex) { if (mergeProject(ex, x)) updated++; continue; }
        const st = Math.max(0, Math.min(4, Math.round(Number(x.stage) || 0)));
        const p = C.addProject({ name: C.cut(name, 80), field: fields.includes(str(x.field)) ? str(x.field) : 'other', stage: st, pct: st >= 4 ? 100 : C.clamp(x.pct), team: arr(x.team).map(str).filter(Boolean), note: C.cut(str(x.note), 500), bans: C.cut(str(x.bans), 300), src: 'hist', fresh: true });
        p.log = [];
        addLogs(p, x.log);
        added++;
    }
    C.save();
    return { added, updated };
}

// ───────────── одна операция / один проект и формы ─────────────

export async function fillOp(o) {
    const j = await ask(`Задача: дополни одну операцию по истории — что известно о ней: цель, место, время, состав, риск, статус и что уже произошло.
Ответ — только JSON: {"status":"plan|live|hold|done|fail","goal":"","where":"","when":"","team":[],"risk":3,"log":["только то, чего нет в журнале, по порядку, 6–16 слов"]}`, `Операция: ${opLine(o)}\nЖурнал: ${o.log.slice(0, 12).map(l => l.t).join(' | ') || 'пусто'}`, 1200, [o.name, o.where, o.goal]);
    const n = mergeOp(o, j);
    C.save();
    return n;
}
export async function fillProject(p) {
    const j = await ask(`Задача: дополни один проект лаборатории по истории — суть, стадия, кто работает, запреты, что уже сделано.
Ответ — только JSON: {"stage":null,"pct":null,"note":"","bans":"","team":[],"log":["только то, чего нет в журнале, 6–16 слов"]}`, `Проект: ${p.name} (${D.STAGES[p.stage]}, ${p.pct}%) ${p.note || ''}\nЖурнал: ${p.log.slice(0, 12).map(l => l.t).join(' | ') || 'пусто'}`, 1000, [p.name, p.note]);
    const n = mergeProject(p, j);
    C.save();
    return n;
}
/** Для формы «новая операция/проект»: по названию подтянуть остальное. Ничего не сохраняет. */
export async function formFill(kind, vals) {
    const name = str(vals.name);
    if (!name) throw new Error('Сначала впиши название');
    if (kind === 'op') {
        const j = await ask('Задача: найди в истории операцию с этим названием (или очевидно про неё) и опиши её.\nОтвет — только JSON: {"goal":"1–2 предложения","where":"","when":"","team":["имена"]}', `Операция: ${name}`, 700, [name]);
        return { goal: str(j.goal), where: str(j.where), when: str(j.when), team: arr(j.team).map(str).filter(Boolean).join(', ') };
    }
    const j = await ask(`Задача: найди в истории это исследование или изобретение и опиши его.\nОтвет — только JSON: {"field":"${D.FIELDS.map(f => f[0]).join('|')}","team":["имена"],"note":"суть, 1–2 предложения","bans":"запреты и условия, если звучали"}`, `Проект: ${name}`, 700, [name]);
    return { field: D.FIELDS.some(f => f[0] === str(j.field)) ? str(j.field) : '', team: arr(j.team).map(str).filter(Boolean).join(', '), note: str(j.note), bans: str(j.bans) };
}

// ───────────── медблок ─────────────

export async function extractMed() {
    const e = C.era();
    const m = C.M();
    const pats = C.inEra(m.patients);
    const j = await ask(`Задача: медицинское по истории — кто ранен или болен и как сейчас; факты осмотров, анализов, давления, назначений и запретов врачей (для заметок медблока)${e.stones ? '; насколько нестабильна энергия Камней в Хеди (0 тихо — 100 на грани выброса) и дрожат ли руки' : ''}; состояние протеза Баки, если о нём было.
Ответ — только JSON: {"patients":[{"name":"","state":"hurt|heal|ok","note":"что и как, до 20 слов"}],"notes":["дата — факт, до 25 слов"],"stones":null,"tremor":null,"arm":{"pct":null,"note":""}}
Чего нет в истории — null или пусто.`, `Уже в медблоке:\nпациенты: ${pats.map(p => `${p.name} (${p.state}): ${p.note}`).join('; ') || 'нет'}\nзаметки: ${(m.med.notes || []).filter(n => (n.era || 'aim') === e.id).slice(0, 12).map(n => n.t).join(' | ') || 'нет'}`);
    let n = 0;
    for (const x of arr(j.patients)) {
        const name = str(x?.name), note = str(x?.note);
        if (!name) continue;
        const st = ['hurt', 'heal', 'ok'].includes(str(x.state)) ? str(x.state) : 'hurt';
        const ex = pats.find(p => sameName(p.name, name));
        if (ex) { if (ex.state !== st || (note && C.norm(note) !== C.norm(ex.note))) { ex.state = st; if (note) ex.note = C.cut(note, 200); n++; } continue; }
        m.patients.unshift({ id: C.uid(), era: e.id, name, state: st, note: C.cut(note, 200), at: '', src: 'hist' });
        n++;
    }
    m.med.notes = m.med.notes || [];
    for (const t of arr(j.notes).map(str).filter(Boolean).reverse()) {
        if (m.med.notes.some(x => C.norm(x.t) === C.norm(t))) continue;
        m.med.notes.unshift({ id: C.uid(), era: e.id, t: C.cut(t, 240), at: '', src: 'hist' });
        n++;
    }
    if (e.stones && j.stones != null && Number.isFinite(Number(j.stones))) { m.med.stones = C.clamp(j.stones); n++; }
    if (e.stones && typeof j.tremor === 'boolean') m.med.tremor = j.tremor;
    if (j.arm && typeof j.arm === 'object') {
        if (j.arm.pct != null && Number.isFinite(Number(j.arm.pct))) m.med.arm = { ...(m.med.arm || {}), pct: C.clamp(j.arm.pct) };
        if (str(j.arm.note)) m.med.arm = { ...(m.med.arm || {}), note: C.cut(str(j.arm.note), 200) };
    }
    C.save();
    return n;
}

// ───────────── базы ─────────────

export async function extractBases() {
    const list = C.bases();
    const j = await ask(`Задача: объекты эпохи — базы, лаборатории, убежища, явки и склады Хеди и её организации. У заведённых обнови статус, кто там сейчас и что изменилось; новые добавь, только если это именно её объекты (не места операций и не чужие здания, не квартира, где живут).
Ответ — только JSON: {"bases":[{"name":"как в списке","status":"ok|alert|lock|breach","who":"кто там сейчас","note":"что изменилось, 1 предложение или пусто"}],"new":[{"name":"","kind":"что это, 2–5 слов","who":"","note":"1–2 предложения","keys":["слова места, по которым понять, что сцена там"]}]}`, `Объекты:\n${list.map(b => `${b.name} (${b.kind}) — ${(D.STATUS_BASE.find(s => s[0] === b.status) || [])[1] || ''}${b.who ? `, там: ${b.who}` : ''}`).join('\n')}`);
    let n = 0;
    for (const x of arr(j.bases)) {
        const b = list.find(y => sameName(y.name, str(x?.name)));
        if (!b) continue;
        const st = str(x.status);
        if (st && D.STATUS_BASE.some(s => s[0] === st) && st !== b.status) { b.status = st; n++; }
        if (str(x.who) && str(x.who) !== b.who) { b.who = C.cut(str(x.who), 160); n++; }
        if (str(x.note) && !C.norm(b.note).includes(C.norm(x.note))) { b.note = `${b.note ? `${b.note}\n` : ''}${C.cut(str(x.note), 240)}`; n++; }
    }
    for (const x of arr(j.new)) {
        const name = str(x?.name);
        if (!name || list.some(b => sameName(b.name, name))) continue;
        list.push({ id: C.uid(), status: 'ok', img: '', name: C.cut(name, 60), kind: C.cut(str(x.kind), 80), who: C.cut(str(x.who), 160), note: C.cut(str(x.note), 400), keys: arr(x.keys).map(str).filter(Boolean).slice(0, 6) });
        n++;
    }
    C.save();
    return n;
}

// ───────────── протоколы и архив ─────────────

export async function extractFiles() {
    const list = C.files();
    const e = C.era();
    const j = await ask(`Задача: документы эпохи, которые стоит держать в ${e.artur ? 'архиве Арта' : 'картотеке'}: протоколы, приказы, досье на угрозы, перехваченные данные, дневники, отчёты, договорённости с властями — то, что в истории реально появлялось. Уже заведённые не повторяй.
Ответ — только JSON: {"files":[{"name":"название папки, 2–6 слов","kind":"protocol|archive","text":"что внутри, 2–4 предложения сухо","lock":false,"keys":["если Хеди ещё не видела — слова, по которым откроется, иначе пусто"]}]}
lock — true, если по истории документ существует, но Хеди его ещё не открывала.`, `Уже есть: ${list.map(f => f.name).join('; ') || 'ничего'}`, 1600);
    let n = 0;
    for (const x of arr(j.files)) {
        const name = str(x?.name);
        if (!name || list.some(f => sameName(f.name, name))) continue;
        list.push({ id: C.uid(), name: C.cut(name, 80), kind: str(x.kind) === 'protocol' ? 'protocol' : 'archive', text: C.cut(str(x.text), 900), lock: x.lock === true, keys: arr(x.keys).map(str).filter(Boolean).slice(0, 6), src: 'hist' });
        n++;
    }
    C.save();
    return n;
}
