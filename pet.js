// ✦ А.Р.Т.У.Р. — Шарик: питомец Хеди. Уход (заряд, ласка, чистка, смазка), поручения как у Дубины Тони
// с опытом и уровнями, выходки, аксессуары. Поручения связаны с домом: кофе, Альпин, фиалки, бельё.

import * as C from './core.js';
import * as HD from './homedata.js';
import * as HM from './home.js';

const d20 = () => 1 + Math.floor(Math.random() * 20);

export function S() {
    const s = C.sharikTick();
    if (s.wear == null) s.wear = 10;
    if (s.dirt == null) s.dirt = 10;
    if (!s.acc) s.acc = C.clock().d?.getMonth?.() === 11 ? 'santa' : 'none';
    if (!s.skills || typeof s.skills !== 'object') s.skills = {};
    if (!Array.isArray(s.log)) s.log = [];
    return s;
}

export function level(id) {
    const xp = S().skills[id] || 0;
    const lvl = HD.JOB_XP.filter(x => xp >= x).length;
    return { lvl, xp, next: HD.JOB_XP[lvl] ?? null };
}

function push(t, kind = 'pet') {
    const s = S();
    const k = C.clock();
    s.log.unshift({ t: C.cut(t, 240), kind, at: [k.date, k.time].filter(Boolean).join(' · '), mes: k.mes });
    s.log = s.log.slice(0, 30);
}
function scene(key, text) {
    if (!HM.sceneOn()) return;
    C.armList('sharik', text, '[Шарик (маленький робот Хеди, вроде ВАЛЛ-И, бесполезный и любимый) в этом ответе: ', '. Мельком, одной-двумя деталями.]', 3);
}
const CARE_SCENE = {
    charge: 'стоит на зарядке и счастливо мигает',
    pet: 'его гладят — довольно жужжит и тычется в ладонь',
    play: 'с ним играют в апорт гайкой',
    praise: 'его хвалят — мигает всеми диодами сразу',
    clean: 'его чистят, он блестит',
    service: 'его смазывают и подкручивают',
    scold: 'его отругали: отъехал в угол и выключил «глаза»',
};

/** Поручение. Возвращает { res: ok|comic|fail|refuse, text }. */
export function job(id) {
    const s = S();
    const j = HD.SHARIK_JOBS.find(x => x[0] === id);
    if (!j) return null;
    const name = `Шарик`;
    if (s.charge < 6) { const text = `${name} поехал, сел на полпути и смотрит с укором. Нужна зарядка.`; push(text, 'refuse'); C.save(); return { res: 'refuse', text }; }
    if (s.sad) { const text = `${name} обиделся: отвернулся к стене и демонстративно мигает. Сначала помириться.`; push(text, 'refuse'); C.save(); return { res: 'refuse', text }; }
    const lv = level(id).lvl;
    const r = d20();
    const sum = r + (lv - 1) * 2 + (s.love >= 70 ? 2 : 0) - (s.charge < 20 ? 4 : 0) - (s.dirt >= 70 ? 1 : 0) - (s.wear >= 70 ? 3 : 0);
    const res = r === 20 || sum >= 13 ? 'ok' : r === 1 || sum < 7 ? 'fail' : 'comic';
    let text = `${name} ${C.rnd(res === 'ok' ? j[3] : res === 'comic' ? j[4] : j[5])}`;
    s.charge = C.clamp(s.charge - (4 + Math.floor(Math.random() * 5)));
    s.dirt = C.clamp(s.dirt + (res === 'comic' ? 9 : 4));
    s.wear = C.clamp(s.wear + 2);
    if (res !== 'fail') s.skills[id] = (s.skills[id] || 0) + (res === 'ok' ? 2 : 1);
    const after = level(id).lvl;
    // связи с домом
    if (HM.hasHome()) {
        const h = HM.H();
        if (id === 'coffee' && h.coffee.cup) { text += ` (${h.coffee.cup.name.toLowerCase()})`; if (res !== 'fail') HM.cupTaken(); }
        if (id === 'cat' && res !== 'fail') HM.feedCat('Шарик');
        if (id === 'water' && res !== 'fail') HM.water('Шарик');
    }
    if (after > lv) { text += ` Новый уровень: «${j[1]}» ${'★'.repeat(after)}.`; C.feed(`Шарик стал лучше в «${j[1].toLowerCase()}». Не спрашивайте, как я это измеряю.`, 'sys'); }
    push(text, res);
    scene(`job:${id}`, text.replace(/^Шарик /, ''));
    C.save();
    return { res, text, roll: r };
}

const CARE = {
    charge: (s) => { s.charge = 100; return C.rnd(['Шарик на зарядке. Счастливо мигает.', 'Подключён. Бипнул так, будто ему подарили щенка.']); },
    pet: (s) => { s.love = C.clamp(s.love + 22); s.sad = false; return C.rnd(['Шарика погладили. Он теперь будет ездить следом весь день.', 'Шарик довольно жужжит и тычется в ладонь.']); },
    play: (s) => { s.love = C.clamp(s.love + 15); s.charge = C.clamp(s.charge - 6); s.dirt = C.clamp(s.dirt + 4); s.sad = false; return C.rnd(['Апорт: гайка улетела под диван, Шарик за ней. Вернулся с гайкой и носком Баки.', 'Апорт: принёс гайку трижды, на четвёртый раз — отвёртку, «для разнообразия».', 'Апорт удался. Альпин перехватила гайку на втором броске, Шарик в трауре.']); },
    praise: (s) => { s.love = C.clamp(s.love + 10); s.sad = false; return 'Шарик так горд, что мигает всеми диодами сразу.'; },
    clean: (s) => { s.dirt = 0; return C.rnd(['Шарик блестит. Альпин недовольна: теперь он пахнет не ею.', 'Почищен. Нашлись крошки Ритц в гусеницах — он их копил.']); },
    service: (s) => { s.wear = 0; return C.rnd(['Смазан, подкручен, гусеницы не скрипят. Ездит ровнее. Почти.', 'ТО пройдено: подтянута шея, заменена лампочка в «глазу». Смотрит бодрее.']); },
    scold: (s) => { s.love = C.clamp(s.love - 25); s.sad = true; return 'Шарик отъехал в угол и выключил «глаза». Вам должно быть стыдно.'; },
};
export function care(act) {
    const s = S();
    const fn = CARE[act];
    if (!fn) return '';
    const t = fn(s);
    push(t, act);
    scene(`care:${act}`, CARE_SCENE[act]);
    C.save();
    return t;
}

export function antic() {
    const t = `Шарик ${C.rnd(HD.SHARIK_ANTICS)}`;
    push(t, 'antic');
    scene('antic', t.replace(/^Шарик /, ''));
    C.save();
    return t;
}

export function setAcc(id) { S().acc = id; C.save(); }
export function setWith(on) { S().with = !!on; push(on ? 'Шарик едет с Хеди. Следите за ступеньками.' : 'Шарик остался. Смотрит вслед «глазами».', 'with'); C.save(); }
export const accName = (id) => (HD.SHARIK_ACC.find(a => a[0] === id) || [])[1] || '';
