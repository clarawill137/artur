// ✦ А.Р.Т.У.Р. — личные дела: анкета как в отделе кадров, номер дела, штамп статуса, сбор лора по человеку,
// заполнение моделью на дату истории, оценки от людей эпохи (Земо, Баретт, Романофф, Картер…), записи в деле.

import * as C from './core.js';
import * as D from './data.js';
import * as L from './lore.js';

const esc = C.esc;
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// ───────────── справочники ─────────────

/** id, как пишется, штамп (если не пусто — красный штамп поверх дела) */
export const STATUS = [
    ['active', 'действующий', ''],
    ['reserve', 'в резерве', ''],
    ['civil', 'гражданский', ''],
    ['retired', 'в отставке', 'В отставке'],
    ['custody', 'под надзором', 'Под надзором'],
    ['classified', 'засекречено', 'Засекречено'],
    ['mia', 'пропал без вести', 'Пропал без вести'],
    ['dead', 'погиб', 'Погиб'],
    ['enemy', 'противник', 'Противник'],
];
export const statusOf = (id) => STATUS.find(s => s[0] === id) || STATUS[0];

/** Поля анкеты: ключ, подпись, раздел. */
export const FIELDS = [
    ['fullname', 'Агент', 'id'], ['code', 'Позывной', 'id'], ['dob', 'Дата рождения', 'id'], ['status', 'Статус', 'id'], ['clear', 'Допуск', 'id'],
    ['address', 'Последний адрес', 'id'], ['citizen', 'Гражданство', 'body'], ['birthplace', 'Место рождения', 'body'],
    ['height', 'Рост', 'body'], ['weight', 'Вес', 'body'], ['hair', 'Волосы', 'body'], ['eyes', 'Глаза', 'body'],
    ['marks', 'Особые приметы', 'body'], ['langs', 'Языки', 'body'],
    ['family', 'Семья', 'life'], ['edu', 'Образование', 'life'], ['service', 'Служба', 'life'], ['post', 'Текущее назначение', 'life'],
    ['skills', 'Квалификация', 'work'], ['powers', 'Способности', 'work'], ['weak', 'Уязвимости', 'work'], ['ties', 'Связи', 'work'],
];
export const FIELD_KEYS = FIELDS.map(f => f[0]);

/** Шапка дела по эпохам. */
export const AGENCY = {
    ssr: { short: 'С.Н.Р.', long: 'Стратегический научный резерв · отдел кадров', who: 'Агент' },
    shield: { short: 'Щ.И.Т.', long: 'Штаб-квартира · отдел кадров и допусков', who: 'Агент' },
    aim: { short: 'А.И.М.', long: 'Личные дела · только для директора', who: 'Субъект' },
    run: { short: 'А.Р.Т.У.Р.', long: 'Автономный узел · люди и контакты', who: 'Субъект' },
    ship: { short: 'Скиталец', long: 'Бортовой реестр · экипаж и встречные', who: 'Субъект' },
    mad: { short: 'Паверброкер', long: 'Контакты · кому можно, кому нельзя', who: 'Контакт' },
    mit: { short: 'А.Р.Т.У.Р. v0.9', long: 'Люди вокруг · заметки', who: 'Человек' },
    none: { short: '—', long: '', who: 'Субъект' },
};
export const agency = (e = C.era()) => AGENCY[e.id] || AGENCY.aim;

/** Кто пишет оценки в какой эпохе. id, имя, кем, голос и задача. */
export const AUTHORS = {
    aim: [
        ['zemo', 'Гельмут Земо', 'консультант-профайлер', 'Ты — Гельмут Земо, профайлер А.И.М. под надзором: умный, ироничный, аристократичный, любит рейджбайтить, видит людей насквозь. Пишешь психологический профиль: точно, колко, с одним неудобным наблюдением, которое субъекту не понравится.'],
        ['barrett', 'д-р Амара Баретт', 'главврач', 'Ты — доктор Амара Баретт, главврач А.И.М.: британка, холодная, флегматичная, блестящий клиницист, циничная. Пишешь медико-психологическое заключение о годности: сухо, клинически, без сантиментов, с точными формулировками и одной ледяной ремаркой.'],
        ['jack', 'Джек Томпсон III', 'замдиректора по операциям', 'Ты — Джек Томпсон III, замдиректора А.И.М. по операциям: самоуверенный, дисциплинированный, острый на язык, порядок против хаоса. Пишешь оперативную оценку: на что годен в поле, риски, кому подчиняется, где сломается.'],
        ['artur', 'А.Р.Т.У.Р.', 'ИИ базы', 'Ты — А.Р.Т.У.Р., ИИ Хеди: сухой, вежливый, саркастичный, ворчит как старый друг. Пишешь сводку по данным: цифры, привычки, что видят камеры и логи, плюс сарказм.'],
        ['hedy', 'Хеди Барлоу', 'директор', 'Ты — Хеди Барлоу, директор А.И.М.: гений, манипулятор, острая как скальпель, пишет быстро и по пунктам, директорским голосом, но личное прорывается. Пишешь собственную оценку человека.'],
    ],
    shield: [
        ['romanoff', 'агент Романофф', 'Щ.И.Т.', 'Ты — агент Наташа Романофф, Щ.И.Т.: наблюдательная, сухая, ироничная, читает людей по мелочам. Пишешь оценку в стиле вербовочного заключения: поведенческие наблюдения из личного контакта, цитаты субъекта, короткие хлёсткие выводы.'],
        ['hill', 'зам. директора Хилл', 'Щ.И.Т.', 'Ты — Мария Хилл, заместитель директора Щ.И.Т.а: собранная, официальная, прагматичная. Пишешь кадровое заключение: благонадёжность, дисциплина, риски, рекомендация.'],
        ['fury', 'директор Фьюри', 'Щ.И.Т.', 'Ты — Ник Фьюри, директор Щ.И.Т.а: скупо, жёстко, с недоверием ко всем. Пишешь короткую резолюцию на деле: что думаешь и что с ним делать.'],
        ['artur', 'А.Р.Т.У.Р.', 'скрыто от Щ.И.Т.а', 'Ты — А.Р.Т.У.Р., ИИ Хеди, тайком сидящий в сетях Щ.И.Т.а: сухо, саркастично, с выжимкой из чужих баз.'],
    ],
    ssr: [
        ['carter', 'агент Картер', 'С.Н.Р.', 'Ты — агент Маргарет «Пегги» Картер, С.Н.Р., 1944: умная, прямая, британская ирония, не терпит снисходительности. Пишешь оценку для личного дела: характер, надёжность, поведение под огнём.'],
        ['phillips', 'полковник Филлипс', 'С.Н.Р.', 'Ты — полковник Честер Филлипс, С.Н.Р., 1944: ворчливый, грубоватый, острый, не верит в героев. Пишешь короткую армейскую характеристику.'],
        ['stark', 'Говард Старк', 'С.Н.Р., научный отдел', 'Ты — Говард Старк, 1944: блестящий, самоуверенный, флиртующий, с инженерным взглядом. Пишешь легкомысленную, но меткую характеристику.'],
    ],
    run: [['artur', 'А.Р.Т.У.Р.', 'автономный узел', 'Ты — А.Р.Т.У.Р., ИИ Хеди, в бегах: экономно, тревожно-саркастично, про то, можно ли этому человеку доверять и чем он опасен.']],
    ship: [
        ['artur', 'А.Р.Т.У.Р.', 'бортовой ИИ', 'Ты — А.Р.Т.У.Р., бортовой ИИ Скитальца: сухо, саркастично, скучает по Земле.'],
        ['loki', 'Локи', 'принц Асгарда, пассажир', 'Ты — Локи: театральный, язвительный, умный, втайне сентиментальный. Пишешь характеристику человека, как будто делаешь ему одолжение.'],
    ],
    mad: [
        ['artur', 'А.Р.Т.У.Р.', 'тёмная бухгалтерия', 'Ты — А.Р.Т.У.Р., ИИ Паверброкера: сухо, по-деловому, что человек стоит и чем рискует.'],
        ['raf', 'Раф Деверо', 'лейтенант', 'Ты — Рафаэль «Раф» Деверо, лейтенант Паверброкера в Мадрипуре: нервный, тёплый, смешивает французский с английским, ругается красиво. Пишешь, что думаешь о человеке, как другу.'],
    ],
    mit: [['artur', 'А.Р.Т.У.Р. v0.9', 'студенческий ИИ', 'Ты — А.Р.Т.У.Р. v0.9, студенческий ИИ Хеди в MIT: ещё неуклюжий, буквальный, но уже с зачатками сарказма.']],
};
export const authorsOf = (e = C.era()) => AUTHORS[e.id] || AUTHORS.aim;

/** Русско-английские пары имён главных — чтобы найти карточку «Bucky Barnes» по «Баки» и наоборот. */
const TRANS = [
    ['баки', 'bucky'], ['барнс', 'barnes'], ['джеймс', 'james'], ['хеди', 'hedy'], ['барлоу', 'barlow'], ['тони', 'tony'], ['старк', 'stark'],
    ['наташа', 'natasha'], ['романофф', 'romanoff'], ['сэм', 'sam'], ['уилсон', 'wilson'], ['стив', 'steve'], ['роджерс', 'rogers'],
    ['локи', 'loki'], ['земо', 'zemo'], ['гельмут', 'helmut'], ['елена', 'yelena'], ['белова', 'belova'], ['пеппер', 'pepper'], ['поттс', 'potts'],
    ['пегги', 'peggy'], ['картер', 'carter'], ['питер', 'peter'], ['паркер', 'parker'], ['ванда', 'wanda'], ['фьюри', 'fury'], ['джулия', 'julia'],
];

// ───────────── номер и запись ─────────────

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
export const fileNo = (name, e = C.era()) => { const h = hash(`${C.norm(name)}|${e.id}`); return `${10 + (h % 89)}-${String((h >>> 7) % 100000).padStart(5, '0')}`; };

export function blankRec() {
    const r = { stress: 30, loyalty: 60, threat: 1, note: '', photo: '', aliases: '', assess: [], log: [] };
    for (const k of FIELD_KEYS) r[k] = '';
    r.status = 'active';
    return r;
}
/** Дело человека в текущей эпохе; старые дела дополняются полями, старый психпрофиль Земо становится оценкой. */
export function rec(name, create = true) {
    const d = C.dossierOf(name, create);
    if (!d) return null;
    const b = blankRec();
    for (const [k, v] of Object.entries(b)) if (d[k] === undefined) d[k] = Array.isArray(v) ? [] : v;
    if (!Array.isArray(d.assess)) d.assess = [];
    if (!Array.isArray(d.log)) d.log = [];
    if (d.psych && !d.assess.length) { d.assess.push({ id: C.uid(), author: 'zemo', name: 'Гельмут Земо', role: 'консультант-профайлер', at: '', overview: d.psych }); }
    if (d.psych) d.psych = '';
    return d;
}

export function addLog(name, t, src = 'me') {
    const d = rec(name);
    const k = C.clock();
    d.log.unshift({ id: C.uid(), t: C.cut(t, 240), at: k.date || '', mes: k.mes, src });
    d.log = d.log.slice(0, 40);
    C.save();
}

/** Летописец увидел, что в посте стоит записать в чьё-то дело. */
export function chronLog(list) {
    const out = [];
    const ppl = C.dossierList();
    for (const x of arr(list)) {
        const who = str(x?.who), what = str(x?.what);
        if (!who || !what) continue;
        const nw = C.norm(who);
        const hit = ppl.find(p => C.norm(p.name) === nw) || ppl.find(p => tokensOf(p.name, p.person).some(t => t.length >= 4 && nw.includes(t)));
        if (!hit) continue;
        addLog(hit.name, what, 'chron');
        out.push(`В дело ${hit.name}: ${C.cut(what, 40)}`);
    }
    return out;
}

// ───────────── сбор лора по человеку ─────────────

export function tokensOf(name, person, d) {
    const raw = [name, ...(person?.aliases || []), ...String(d?.aliases || '').split(/[,;]/), d?.code || ''].join(' ');
    const words = C.norm(raw).split(/[^a-zа-я0-9-]+/i).filter(w => w.length >= 3 && !['iii', 'мэм', 'the', 'агент', 'доктор'].includes(w));
    const out = new Set(words);
    for (const [ru, en] of TRANS) { if (out.has(ru)) out.add(en); if (out.has(en)) out.add(ru); }
    return [...out];
}

/** Всё, что известно о человеке: карточка, лорбуки, «Люди» Life. Возвращает текст до ~12 000 знаков. */
export async function loreFor(name, person, d) {
    const c = SillyTavern.getContext();
    const toks = tokensOf(name, person, d);
    const strong = toks.filter(t => t.length >= 4);
    const parts = [];
    const scored = [];
    const scoreEntry = (title, keys, content) => {
        const head = C.norm(`${title} ${(keys || []).join(' ')}`);
        const body = C.norm(content);
        let s = 0;
        for (const t of toks) if (head.includes(t)) s += 10;
        for (const t of strong) { const n = body.split(t).length - 1; s += Math.min(n, 6); }
        return s;
    };
    // карточка персонажа
    const ch = (c.characters || []).find(x => x?.name && same(x.name, name, person, d));
    if (ch) {
        parts.push(`## Карточка «${ch.name}»\n${C.cut(str(ch.description || ch.data?.description), 4500)}${ch.personality ? `\n${C.cut(str(ch.personality), 900)}` : ''}`);
        for (const e of arr(ch.data?.character_book?.entries)) {
            if (e.enabled === false || !str(e.content) || L.isMemory(e)) continue;
            const s = scoreEntry(e.comment || e.name, e.keys, e.content);
            if (s >= 6) scored.push({ s, t: `### ${str(e.comment || e.name)}\n${str(e.content)}` });
        }
    }
    // лорбуки (без памяти сцен) и отдельно память сцен — свежие факты из истории
    const mems = [];
    for (const { book, e, mem } of await L.entries(true)) {
        const s = scoreEntry(e.comment, e.key, e.content);
        if (s < 6) continue;
        (mem ? mems : scored).push({ s, t: `### ${str(e.comment) || (e.key || []).join(', ')} (${book})\n${str(e.content)}` });
    }
    scored.sort((a, b) => b.s - a.s);
    const seen = new Set();
    let len = parts.join('\n').length;
    for (const x of scored) {
        const key = x.t.slice(0, 120);
        if (seen.has(key)) continue;
        seen.add(key);
        const piece = C.cut(x.t, 2600);
        if (len + piece.length > 12000) continue;
        parts.push(piece);
        len += piece.length;
    }
    mems.sort((a, b) => b.s - a.s);
    let ml = 0;
    const mp = [];
    for (const x of mems) { const piece = C.cut(x.t, 1800); if (ml + piece.length > 4500) continue; mp.push(piece); ml += piece.length; }
    if (mp.length) parts.push(`## Память сцен, где он есть\n${mp.join('\n\n')}`);
    if (person) parts.push(`## Вкладка «Люди» (Life)\n${[person.group && `круг: ${person.group}`, person.role && `роль: ${person.role}`, person.age && `возраст: ${person.age}`, person.look && `внешность: ${person.look}`, (person.traits || []).length && `черты: ${person.traits.join(', ')}`, person.voice && `манера: ${person.voice}`, person.bio, person.toUser && `к игроку: ${person.toUser}`, person.secret && `секрет: ${person.secret}`].filter(Boolean).join('\n')}`);
    return { text: parts.join('\n\n'), found: scored.length + (ch ? 1 : 0) + (person ? 1 : 0) + mp.length };
}

function fileText(d, name) {
    return FIELDS.map(([k, l]) => (k === 'status' ? `${l}: ${statusOf(d.status)[1]}` : d[k] ? `${l}: ${d[k]}` : '')).filter(Boolean).join('\n') || `${name}: пусто`;
}

// ───────────── заполнить дело из лора ─────────────

const FILL_SYS = (e, ag, date) => `Ты — архивист отдела кадров (${ag.short}, ${ag.long}). Заполни личное дело по материалам ниже: карточка персонажа, записи лорбуков, вкладка «Люди».
Дата дела: ${date || 'неизвестна'}, эпоха: ${e.name}. Всё — как на эту дату: возраст, звание, статус, назначение, адрес; что случится позже, не упоминай.
Держи канон MCU и правки AU из записей. Чего нет в материалах — пиши «нет данных» или «засекречено»; рост, вес, глаза и волосы можно вывести из канона и описания внешности. Единицы метрические.
Стиль — анкета, напечатанная на машинке: коротко, сухо, по-русски, имена как в документах.
Ответ — только JSON:
{"fullname":"ФАМИЛИЯ, Имя Отчество/второе имя","code":"позывной или прозвище для подписи под фото, 1–2 слова, без кавычек","dob":"дата рождения","status":"active|reserve|civil|retired|custody|classified|mia|dead|enemy","clear":"уровень допуска, если уместно","address":"последний известный адрес","citizen":"гражданство","birthplace":"место рождения","height":"рост","weight":"вес","hair":"волосы","eyes":"глаза","marks":"особые приметы","langs":"языки","family":"семья","edu":"образование","service":"служба, 1–3 строки","post":"текущее назначение","skills":"квалификация, 2–3 предложения в стиле дела","powers":"способности и аномалии или «нет»","weak":"уязвимости, 1 предложение","ties":"ключевые связи, особенно с Хеди Барлоу","threat":1}
threat — опасность для окружающих от 1 до 5.`;

export async function fill(name, person, force = false) {
    const e = C.era();
    const ag = agency(e);
    const k = C.clock();
    const d = rec(name);
    const lore = await loreFor(name, person, d);
    if (!lore.text.trim()) throw new Error(`По «${name}» в карточках и лорбуках ничего не нашлось`);
    const out = await C.ask(FILL_SYS(e, ag, k.date), `Человек: ${name}\nИгрок пишет за: ${C.userName()}\n\nЛор эпохи: ${C.eraLore(e)}\n\nМатериалы:\n${lore.text}${force ? '' : `\n\nУже заполнено (оставь как есть): ${fileText(d, name)}`}`, 1800);
    const j = C.jsonOf(out);
    if (!j || typeof j !== 'object') throw new Error('Архивист вернул не анкету');
    let n = 0;
    for (const key of FIELD_KEYS) {
        let v = str(j[key]);
        if (!v) continue;
        if (key === 'status') { if (!STATUS.some(s => s[0] === v)) continue; if (d.status !== 'active' && !force) continue; }
        else if (d[key] && !force) continue;
        if (key === 'code') v = v.replace(/^["«“]|["»”]$/g, '');
        d[key] = C.cut(v, key === 'skills' || key === 'service' ? 600 : 300);
        n++;
    }
    const t = Number(j.threat);
    if (t >= 1 && t <= 5 && (force || d.threat <= 1)) d.threat = Math.round(t);
    d.filled = k.date || '';
    C.save();
    return { n, found: lore.found };
}

// ───────────── оценки ─────────────

const ASSESS_SYS = (au, e, ag, date) => `${au[3]}
Это оценка для личного дела (${ag.short}), дата: ${date || 'неизвестна'}, эпоха: ${e.name}. Пиши по-русски, своим голосом, от первого лица где уместно; канон и лор держи, событий после даты не упоминай, фактов не выдумывай.
Ответ — только JSON:
{"history":"история субъекта, 2–3 предложения","overview":"обзор личности, 2–4 предложения","observations":["3–5 поведенческих наблюдений, каждое 1–2 предложения, можно с цитатой субъекта"],"impressions":"выводы и диагностические впечатления, 2–4 предложения","conclusion":"заключение, 1–3 предложения","verdict":[["кто/ипостась","вердикт капслоком: РЕКОМЕНДОВАН, НЕ РЕКОМЕНДОВАН, ДОПУЩЕН, ПОД НАБЛЮДЕНИЕМ, ОПАСЕН…"]]}
verdict — 1–2 строки; если у человека две ипостаси (герой и человек под маской), можно вынести разные вердикты.`;

export async function assess(name, person, authorId) {
    const e = C.era();
    const ag = agency(e);
    const au = authorsOf(e).find(a => a[0] === authorId) || authorsOf(e)[0];
    const k = C.clock();
    const d = rec(name);
    const lore = await loreFor(name, person, d);
    const prev = d.assess.slice(0, 2).map(a => `${a.name}: ${a.conclusion || a.overview || ''}`).join('\n');
    const out = await C.ask(ASSESS_SYS(au, e, ag, k.date), `Субъект: ${name}\nДело:\n${fileText(d, name)}\n${d.log.length ? `Записи в деле: ${d.log.slice(0, 8).map(l => l.t).join(' | ')}\n` : ''}${prev ? `Прежние оценки (не повторяй): ${prev}\n` : ''}\nЛор эпохи: ${C.eraLore(e)}\n\nМатериалы:\n${lore.text}`, 1600);
    const j = C.jsonOf(out);
    if (!j || typeof j !== 'object' || !(str(j.overview) || str(j.conclusion))) throw new Error('Оценка не сложилась — попробуй ещё раз');
    const a = {
        id: C.uid(), author: au[0], name: au[1], role: au[2], at: k.date || '',
        history: C.cut(str(j.history), 700), overview: C.cut(str(j.overview), 900),
        observations: arr(j.observations).map(str).filter(Boolean).slice(0, 6).map(x => C.cut(x, 400)),
        impressions: C.cut(str(j.impressions), 900), conclusion: C.cut(str(j.conclusion), 600),
        verdict: arr(j.verdict).map(v => (Array.isArray(v) ? [str(v[0]), str(v[1])] : [name, str(v)])).filter(v => v[1]).slice(0, 3),
    };
    d.assess.unshift(a);
    d.assess = d.assess.slice(0, 8);
    C.save();
    return a;
}

export function assessScene(name, a) {
    const gist = [a.overview, a.conclusion, a.verdict?.map(v => `${v[0]}: ${v[1]}`).join('; ')].filter(Boolean).join(' ');
    C.arm('file', `[Личное дело: в этом ответе всплывает оценка ${name} за подписью «${a.name}» (${a.role}) — её читают, находят, пересказывают или цитируют, органично по сцене. Суть: ${C.cut(gist, 600)} Не решай за Хеди, как она к этому отнесётся.]`, { key: `${name}:${a.id}` });
}

export function fileScene(name) {
    const d = rec(name);
    C.arm('file', `[Личное дело ${name} (${agency().short}, № ${fileNo(name)}) в этом ответе оказывается на столе или на голограмме: кто-то его открывает и замечает пару деталей. Из дела: ${C.cut(fileText(d, name).replace(/\n/g, '; '), 700)}]`, { key: name });
}

// ───────────── кто есть кто: один человек под разными именами ─────────────

const canon = (t) => { for (const [ru, en] of TRANS) if (t === en) return ru; return t; };
const idTokens = (name, person, d) => new Set(tokensOf(name, person, d).map(canon).filter(t => t.length >= 3));
/** Совпадение по имени: целиком, или хотя бы два слова (с учётом рус/англ), или одно, если имя из одного слова. */
export function same(a, b, pa, db) {
    if (C.norm(a) === C.norm(b)) return true;
    const A = new Set(tokensOf(a).map(canon));
    const Bt = idTokens(b, pa, db);
    const hit = [...A].filter(t => Bt.has(t)).length;
    return hit >= 2 || (hit >= 1 && (A.size === 1 || C.norm(b).split(' ').length === 1));
}

// ───────────── состав эпохи ─────────────

/** Один раз на эпоху заводит дела на её людей (А.И.М., Щ.И.Т. и Гидра, СНР и Ревущие…). Удалённые не возвращаются. */
export function seedRoster(e = C.era()) {
    const m = C.M();
    m.rosterDone = m.rosterDone && typeof m.rosterDone === 'object' ? m.rosterDone : {};
    if (m.rosterDone[e.id]) return 0;
    const have = C.dossierList();
    let n = 0;
    for (const r of D.ROSTER[e.id] || []) {
        if (have.some(x => same(r.name, x.name, x.person))) continue;
        const d = rec(r.name);
        d.group = r.group; d.post = d.post || r.post; d.aliases = d.aliases || r.aliases || '';
        if (r.status) d.status = r.status;
        d.seed = true;
        n++;
    }
    m.rosterDone[e.id] = true;
    C.save();
    return n;
}

/** Ищет в лорбуках людей эпохи, на которых ещё нет дела (Вальден, Вершинин…). */
export async function findPeople() {
    const e = C.era();
    const k = C.clock();
    const have = C.dossierList().map(x => x.name);
    const lines = [];
    let len = 0;
    for (const { book, e: en } of await L.entries(false)) {
        const t = `${str(en.comment) || (en.key || []).slice(0, 3).join(', ')} [${book}]: ${C.cut(str(en.content).replace(/\s+/g, ' '), 220)}`;
        if (len + t.length > 16000) break;
        lines.push(t);
        len += t.length;
    }
    if (!lines.length) throw new Error('Лорбуки не читаются');
    const sys = `Ты — архивист отдела кадров (${agency(e).short}). По оглавлению лорбуков найди ЛЮДЕЙ (и персонажей с характером), которые в эпохе «${e.name}» на дату ${k.date || 'истории'} существуют и имеют отношение к Хеди Барлоу или её организации: соратники, начальство, враги, люди из прошлого. Организации, места, события пропусти. На кого дело уже есть — пропусти.
Ответ — только JSON: {"people":[{"name":"имя как в лоре","group":"круг: организация или «враги», «прошлое»…","post":"кто он, 2–6 слов","aliases":"другие имена через запятую","status":"active|reserve|civil|retired|custody|classified|mia|dead|enemy"}]}
Не больше 12 человек, самые важные.`;
    const out = await C.ask(sys, `Дела уже есть: ${have.join(', ')}\n\nОглавление лорбуков:\n${lines.join('\n')}`, 1500);
    const j = C.jsonOf(out);
    let n = 0;
    for (const x of arr(j?.people)) {
        const name = str(x?.name);
        if (!name || C.dossierList().some(y => same(name, y.name, y.person))) continue;
        const d = rec(name);
        d.group = C.cut(str(x.group), 40); d.post = C.cut(str(x.post), 80); d.aliases = C.cut(str(x.aliases), 160);
        if (STATUS.some(s => s[0] === str(x.status))) d.status = str(x.status);
        n++;
    }
    C.save();
    return n;
}
