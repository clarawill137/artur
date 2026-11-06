// ✦ А.Р.Т.У.Р. — комп Хеди: интерфейс А.И.М./Щ.И.Т.а по эпохе истории, лаборатория, операции, радар и сам Арт.
// Живёт рядом с Life: через LifeBridge получает время Horae, Летописца, скрытую заметку модели и строчку в «Сцене».

import * as C from './core.js';
import * as U from './ui.js';
import * as DS from './dossier.js';
import * as HM from './home.js';

const ID = 'ar';
let api = null;

function toastEvents(list) {
    const l = (list || []).filter(Boolean);
    if (!l.length) return;
    C.toast('info', C.esc(l.slice(0, 4).join(' · ')) + (l.length > 4 ? ` · и ещё ${l.length - 4}` : ''));
}

function register() {
    const B = globalThis.LifeBridge;
    if (!B?.register) return false;
    B.register({
        id: ID,
        init(a) { api = a; C.setApi(a); },
        prompt: (type) => [C.promptNote(type), HM.promptLine()].filter(Boolean).join('\n'),
        chron: () => C.chronHook(),
        afterPost: (i, j) => { toastEvents([...C.afterPost(i, j), ...DS.chronLog(j?.art?.dossier), ...HM.chronHome(j?.art?.home)]); U.renderSoon(); },
        sceneHtml: () => U.sceneHtml(),
    });
    return true;
}

// ───────────── палочка → она же попадает в пульт Life ─────────────

function addWand() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    if (document.getElementById('ar-wand')) return true;
    const el = document.createElement('div');
    el.id = 'ar-wand';
    el.className = 'list-group-item flex-container flexGap5 interactable';
    el.tabIndex = 0;
    el.innerHTML = '<div class="fa-solid fa-satellite-dish extensionsMenuExtensionButton"></div><span>А.Р.Т.У.Р.</span>';
    el.addEventListener('click', () => { try { $('#extensionsMenu').fadeOut(200); } catch { /* */ } U.open(); });
    menu.append(el);
    return true;
}

function settingsDrawer() {
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!host || document.getElementById('ar-drawer')) return;
    const s = C.cfg();
    host.insertAdjacentHTML('beforeend', `
    <div id="ar-drawer" class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>✦ А.Р.Т.У.Р.</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
            <label class="checkbox_label"><input type="checkbox" id="ar_on" ${s.on ? 'checked' : ''}> Включено</label>
            <small>Комп Хеди: волшебная палочка или пульт Life → «А.Р.Т.У.Р.», команда <code>/artur</code>. Нужен Life.</small>
            <div class="menu_button" id="ar_open" style="margin-top:6px">Открыть</div>
        </div>
    </div>`);
    document.getElementById('ar_on')?.addEventListener('change', function () { C.cfg().on = this.checked; C.saveCfg(); try { api?.updatePrompt?.(); } catch { /* */ } });
    document.getElementById('ar_open')?.addEventListener('click', () => U.open());
}

const APPS = ['lab', 'ops', 'dossier', 'radar', 'med', 'home', 'bases', 'files', 'sharik', 'hydra', 'artur'];
function registerSlash() {
    try {
        const { SlashCommandParser, SlashCommand } = SillyTavern.getContext();
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'artur',
            helpString: `А.Р.Т.У.Р.: открыть комп Хеди. Можно сразу приложение: /artur ${APPS.join('|')}`,
            returns: 'ничего',
            unnamedArgumentList: [],
            callback: (_a, v) => { const app = String(v || '').trim().toLowerCase(); U.open(APPS.includes(app) ? app : null); return ''; },
        }));
    } catch (e) { console.warn('[АРТУР] команда', e); }
}

jQuery(async () => {
    C.cfg();
    document.addEventListener('click', U.onClick, true);
    document.addEventListener('change', U.onChange);
    document.addEventListener('input', U.onInput);
    settingsDrawer();
    registerSlash();
    if (!addWand()) { let t = 0; const iv = setInterval(() => { if (addWand() || ++t > 40) clearInterval(iv); }, 500); }
    let tries = 0;
    const iv = setInterval(() => {
        if (register()) { clearInterval(iv); console.log('[АРТУР] подключился к Life'); C.loadZ(); return; }
        if (++tries > 120) { clearInterval(iv); window.toastr?.warning?.('А.Р.Т.У.Р. живёт рядом с Life, а Life не найден или старый (нужен мост LifeBridge — обнови Life).', '✦ А.Р.Т.У.Р.', { timeOut: 12000 }); }
    }, 500);
    try {
        const { eventSource, event_types: E } = SillyTavern.getContext();
        const onAi = (id, type) => {
            if (!api || type === 'impersonate') return;
            const i = Number(id);
            if (!Number.isFinite(i)) return;
            try { toastEvents(C.afterAiPost(i)); } catch (e) { console.warn('[АРТУР] после ответа', e); }
            try { api.updatePrompt(); } catch { /* */ }
            U.renderSoon();
        };
        if (E.CHARACTER_MESSAGE_RENDERED) eventSource.on(E.CHARACTER_MESSAGE_RENDERED, onAi);
        else if (E.MESSAGE_RECEIVED) eventSource.on(E.MESSAGE_RECEIVED, onAi);
        const endGen = () => { C.clearLive(); try { api?.updatePrompt?.(); } catch { /* */ } };
        for (const ev of [E.GENERATION_ENDED, E.GENERATION_STOPPED]) if (ev) eventSource.on(ev, endGen);
        eventSource.on(E.CHAT_CHANGED, () => { C.clearLive(); if (U.isOpen()) U.close(); });
        if (E.APP_READY) eventSource.on(E.APP_READY, () => { addWand(); settingsDrawer(); });
    } catch (e) { console.warn('[АРТУР] события', e); }
});
