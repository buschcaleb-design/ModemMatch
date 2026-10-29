// ------------------------------------------------------------- pairing
// Screens + dock pairing for one picked computer (Build .13): an
// opt-in flow per pick, entered from the card button, with free jumps
// between the Screens and Dock stages. Verdicts come from
// /api/pairing — maker-stated data only, never a guessed count.
let pairData = null, pairType = 'laptop', pairStage = 'screens';
let pairMode = null; // 'screens' | 'dock' | 'both' — asked once, up front (Caleb, 2026-10-16)
let pairManual = false; // true only when pairing was entered from the manual model-lookup card (own-it prompts live there, never in the guided walkthrough)
let pairReturn = { section: 'results', y: 0 };
let pairScreens = { count: null, resolution: 'unsure', have: null };
let pairAsked = { count: false, res: false };
let pairTier = null, pairChassis = null;
let pairSizeFilter = 'all', pairQualityFilter = 'all', pairTechFilter = 'all';
let pairQty = {};
let pairShelfAll = false;
function pairSetup() {
  return pairData ? findSetupForComputer(pairType, pairData.id) : null;
}
function pairSetupDockId() {
  const s = pairSetup();
  return s ? s.dock_id : null;
}
function pairSetupMonitorQty(monId) {
  const s = pairSetup();
  if (!s) return 0;
  const m = s.monitors.find(x => x.id === monId);
  return m ? m.qty : 0;
}
function pairQtyFor(monId) {
  if (pairQty[monId]) return pairQty[monId];
  const inSetup = pairSetupMonitorQty(monId);
  if (inSetup) return inSetup;
  const want = pairScreens.count || 1;
  return Math.max(1, Math.min(4, want));
}
function pairMonQtyDelta(monId, d) {
  pairQty[monId] = Math.max(1, Math.min(9, pairQtyFor(monId) + d));
  refreshPairStage();
}
function pairToggleDock(dockId) {
  const s = ensureSetupForComputer(pairType, pairData.id);
  const nd = (s.dock_id === dockId) ? null : dockId;
  // A different dock is a new item — its own-it answer starts unasked.
  if (nd !== s.dock_id) { s.dock_id = nd; delete s.dock_owned; }
  touchSetup(s);
  refreshPairStage();
}
function pairToggleMonitor(monId) {
  const s = ensureSetupForComputer(pairType, pairData.id);
  const i = s.monitors.findIndex(x => x.id === monId);
  if (i >= 0) s.monitors.splice(i, 1);
  else s.monitors.push({ id: monId, qty: pairQtyFor(monId) });
  touchSetup(s);
  refreshPairStage();
}
const PAIR_TIER_LABEL = { '1080p': '1080p Full HD', '1440p': '1440p QHD', '4k': '4K Ultra HD' };
const PAIR_RES_OPTS = [
  { v: '1080p', t: '1080p — Full HD', s: 'Sharp for work and most games' },
  { v: '1440p', t: '1440p — QHD', s: 'Crisper; the gaming sweet spot' },
  { v: '4k', t: '4K — Ultra HD', s: 'Sharpest picture; needs a stronger graphics card' },
  { v: 'unsure', t: 'Not sure', s: "We'll assume standard screens — no pressure either way" } ];

async function openPairing(type, id) {
  setPageTheme('screens');
  pairType = type;
  // Own-it scope (Caleb, 2026-10-29): MANUAL path only — pairing counts
  // as manual only when it was launched from the "Your model" card that
  // the model lookup produced for THIS computer. modelOrigin is set by
  // the model-card renderers with their entry point and cleared by the
  // guided results renderers, so quiz → results → pairing never matches.
  pairManual = !!(typeof modelOrigin !== 'undefined' && modelOrigin &&
    modelOrigin.origin === 'lookup' && modelOrigin.kind === type &&
    String(modelOrigin.id) === String(id));
  const cur = SECTION_IDS.find(s => s !== 'pairing' &&
    document.getElementById(s).style.display !== 'none');
  pairReturn = { section: cur || 'results', y: window.scrollY || 0 };
  pairStage = 'screens'; pairMode = null; pairChassis = null;
  pairSizeFilter = 'all'; pairQualityFilter = 'all'; pairTechFilter = 'all';
  pairQty = {};
  pairScreens = { count: null, resolution: 'unsure', have: null };
  pairAsked = { count: false, res: false };
  // Reuse the quiz's screens answers when this pick came from a quiz;
  // a looked-up model has none, so the flow asks.
  if (type === 'laptop' && laptopRes && laptopRes.query) {
    const q = laptopRes.query;
    if ('ext_screens' in q && q.ext_screens !== '' && q.ext_screens != null) {
      pairScreens.count = parseInt(q.ext_screens, 10);
      pairAsked.count = true;
    }
    if ('ext_resolution' in q && q.ext_resolution) {
      pairScreens.resolution = q.ext_resolution;
      pairAsked.res = true;
    }
  }
  if (type === 'desktop' && desktopRes && desktopRes.query) {
    const q = desktopRes.query;
    if ('screens' in q && q.screens !== '' && q.screens != null) {
      pairScreens.count = parseInt(q.screens, 10);
      pairAsked.count = true;
    }
    if ('resolution' in q && q.resolution) {
      pairScreens.resolution = q.resolution;
      pairAsked.res = true;
    }
  }
  pairTier = PAIR_TIER_LABEL[pairScreens.resolution] ? pairScreens.resolution : null;
  hideAllSections();
  const el = document.getElementById('pairing');
  el.style.display = 'block';
  el.innerHTML = `<div class="loading"><span class="dots">Loading pairing options</span></div>`;
  window.scrollTo(0, 0);
  try {
    pairData = await fetch(`/api/pairing/${type}/${encodeURIComponent(id)}`).then(x => x.json());
  } catch (e) { pairData = null; }
  if (!pairData || pairData.error) {
    el.innerHTML = `<button class="back" onclick="closePairing()">← Back</button>
      <div class="note">We couldn't load pairing options for that model just now.</div>`;
    return;
  }
  renderPairing();
}
function closePairing() {
  hideAllSections();
  const el = document.getElementById(pairReturn.section);
  if (el) el.style.display = 'block';
  renderModelOwnSlot(); // pairing may have created the setup behind the model card
  window.scrollTo(0, pairReturn.y);
}
function pairGo(s) { pairStage = s; renderPairing(); }
function renderPairing() {
  const el = document.getElementById('pairing');
  const d = pairData;
  el.innerHTML = `<button class="back" onclick="closePairing()">← Back to your picks</button>
    <h1>Screens &amp; docks for your <span class="accent">${d.type === 'laptop' ? 'laptop' : 'desktop'}</span></h1>
    <p class="sub">${esc(d.name)} — pair it with screens it can actually drive, and a dock that actually fits its ports.</p>
    <div id="pairstage"></div>
    <div id="pairbar" style="display:none"><div class="pairbar-in">
      <span class="pairbar-label" id="pairbar-label"></span>
      <button class="pairbar-btn" onclick="openMySetup()">Continue to my setup →</button>
    </div></div>`;
  refreshPairStage();
  window.scrollTo(0, 0);
}
function pairChooseMode(m) {
  pairMode = m;
  pairStage = m === 'dock' ? 'dock' : 'screens';
  renderPairing();
}
function pairChoiceHTML() {
  const both = pairSvg(piMon(3, 8, 17, 13, '#0284c7') + `<path d="M24 30 h17 v6 H24 Z M28 30 v-4 M37 30 v-4" stroke="#7c3aed"/>`);
  return `<div class="quiz-stage" data-tint="1"><p class="q">What are we pairing today?</p>
    <div class="tile-grid">
    ${pairOptHTML(PAIR_TAB_ICONS.screens, 'Screens', 'Find screens this machine can actually drive', `pairChooseMode('screens')`)}
    ${pairOptHTML(PAIR_TAB_ICONS.dock, 'Dock', 'One cable for power, ports and peripherals', `pairChooseMode('dock')`)}
    ${pairOptHTML(both, 'Both', 'Screens first — they decide which dock you need', `pairChooseMode('both')`, 'wide')}
    </div></div>`;
}
function refreshPairStage() {
  const s = document.getElementById('pairstage');
  if (!s) return;
  if (!pairMode) { s.innerHTML = pairChoiceHTML(); refreshPairBar(); return; }
  s.innerHTML = pairStage === 'screens' ? pairScreensHTML() : pairDockHTML();
  refreshPairBar();
}

// Continue bar (Caleb, 2026-10-29): the pairing flow dead-ended once a
// screen or dock was added — the only way onward was the small Saved
// pill up top, which most shoppers never connect to their setup. A
// sticky bottom bar now appears whenever this computer's setup holds
// at least one paired item, keyed off the exact state the add/remove
// toggles write (setup.dock_id + setup.monitors), and its button goes
// straight to My Setup via the existing openMySetup().
function pairSetupItemCount() {
  const s = pairSetup();
  if (!s) return 0;
  let n = s.dock_id ? 1 : 0;
  (s.monitors || []).forEach(m => { n += m.qty || 1; });
  return n;
}
function refreshPairBar() {
  const bar = document.getElementById('pairbar');
  if (!bar) return;
  const n = pairSetupItemCount();
  bar.style.display = n > 0 ? 'block' : 'none';
  const sec = document.getElementById('pairing');
  if (sec) sec.classList.toggle('pairbar-pad', n > 0);
  if (n > 0) {
    const lbl = document.getElementById('pairbar-label');
    if (lbl) lbl.textContent = n === 1 ? '1 item in your setup' : `${n} items in your setup`;
  }
}

// ------------------------------------------------------------- own-it
// "Do you already own this?" (Caleb, 2026-10-29) — MANUAL PATH ONLY:
// the model lookup ("Your model" card) and the pairing flow entered
// from it. The guided walkthrough never sees these prompts (pairManual
// / modelOrigin gate every render below). Ownership is a tri-state per
// component on the setup record: unanswered (flag absent) → prompt;
// computer_owned / dock_owned === true|false; monitors carry `owned`
// on each {id, qty} entry. Owned items stay listed in My Setup with an
// "Already owned" marker, show no buy link, and contribute $0 to the
// setup total — the total is what the shopper still needs to buy.
// A missing flag reads as not-owned, so older saved setups (which have
// no flags at all) render and total exactly as before.
function ownPromptHTML(ownFn, buyFn, question) {
  return `<div class="ownit"><p class="ownit-q">${question || 'Do you already own this?'}</p>
    <div class="sortrow">
      <button class="sort" onclick="${ownFn}">I already own it</button>
      <button class="sort" onclick="${buyFn}">I'm buying it</button>
    </div></div>`;
}
function ownStateHTML(owned, changeFn) {
  return owned
    ? `<p class="owntagline">✓ <strong>Already owned</strong> — not counted in your setup total <button class="sort" onclick="${changeFn}">Change</button></p>`
    : `<p class="owntagline">Buying this — counted in your setup total <button class="sort" onclick="${changeFn}">Change</button></p>`;
}
// The looked-up computer: the prompt lives in #ownslot under the
// "Your model" card, and appears once that computer has a saved setup.
function renderModelOwnSlot() {
  const slot = document.getElementById('ownslot');
  if (!slot) return;
  if (typeof modelOrigin === 'undefined' || !modelOrigin ||
      modelOrigin.origin !== 'lookup') { slot.innerHTML = ''; return; }
  const s = findSetupForComputer(modelOrigin.kind, modelOrigin.id);
  if (!s) { slot.innerHTML = ''; return; }
  const what = modelOrigin.kind === 'laptop' ? 'laptop' : 'desktop';
  slot.innerHTML = s.computer_owned === undefined
    ? ownPromptHTML('setComputerOwned(true)', 'setComputerOwned(false)',
        `Do you already own this ${what}?`)
    : ownStateHTML(s.computer_owned === true, 'setComputerOwned(null)');
}
function setComputerOwned(v) {
  if (typeof modelOrigin === 'undefined' || !modelOrigin) return;
  const s = findSetupForComputer(modelOrigin.kind, modelOrigin.id);
  if (!s) return;
  if (v === null) delete s.computer_owned; else s.computer_owned = v;
  touchSetup(s);
  renderModelOwnSlot();
}
// Pairing (manual entry only): dock + per-monitor prompts in the cards.
function pairSetDockOwned(v) {
  const s = pairSetup();
  if (!s || !s.dock_id) return;
  if (v === null) delete s.dock_owned; else s.dock_owned = v;
  touchSetup(s);
  refreshPairStage();
}
function pairSetMonitorOwned(monId, v) {
  const s = pairSetup();
  if (!s) return;
  const e = s.monitors.find(x => x.id === monId);
  if (!e) return;
  if (v === null) delete e.owned; else e.owned = v;
  touchSetup(s);
  refreshPairStage();
}
function dockOwnHTML(o) {
  const s = pairSetup();
  if (!s || s.dock_id !== o.id) return '';
  return s.dock_owned === undefined
    ? ownPromptHTML('pairSetDockOwned(true)', 'pairSetDockOwned(false)')
    : ownStateHTML(s.dock_owned === true, 'pairSetDockOwned(null)');
}
function monitorOwnHTML(m) {
  const s = pairSetup();
  if (!s) return '';
  const e = s.monitors.find(x => x.id === m.id);
  if (!e) return '';
  return e.owned === undefined
    ? ownPromptHTML(`pairSetMonitorOwned('${m.id}',true)`, `pairSetMonitorOwned('${m.id}',false)`)
    : ownStateHTML(e.owned === true, `pairSetMonitorOwned('${m.id}',null)`);
}

// Fun hand-drawn icons for the pairing pages (Caleb, 2026-10-16: same
// big buttons, same fun style icons as the rest of the pass).
function pairSvg(inner) {
  return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
}
function piMon(x, y, w, h, c) {
  return `<path d="M${x} ${y} h${w} v${h} h-${w} Z" stroke="${c}"/><path d="M${x + w / 2} ${y + h} v3.4 M${x + w / 2 - 5} ${y + h + 4.4} h10" stroke="${c}"/>`;
}
function piLap(x, y, w, c) {
  const h = Math.round(w * 0.66);
  return `<path d="M${x} ${y} h${w} v${h} h-${w} Z" stroke="${c}"/><path d="M${x - 2.6} ${y + h + 3} h${w + 5.2}" stroke="${c}"/>`;
}
function piDots(cols, rows, c) {
  let s = '';
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
    s += `<circle cx="${13 + i * (18 / Math.max(1, cols - 1))}" cy="${13 + j * (13 / Math.max(1, rows - 1))}" r="1.5" fill="${c}" stroke="none"/>`;
  return `<path d="M8 7 h28 v24 H8 Z" stroke="${c}"/>` + s;
}
function piSpark(cx, cy, c, r) {
  return `<path d="M${cx} ${cy - r} v${2 * r} M${cx - r} ${cy} h${2 * r}" stroke="${c}"/>`;
}
const PAIR_ICONS = {
  'count:laptop:0': () => pairSvg(piLap(10, 11, 24, '#10304f') + piSpark(36, 10, '#e84393', 4)),
  'count:laptop:1': () => pairSvg(piLap(3, 20, 16, '#10304f') + piMon(23, 9, 18, 13, '#0284c7')),
  'count:laptop:2': () => pairSvg(piMon(4, 7, 16, 12, '#0284c7') + piMon(24, 7, 16, 12, '#7c3aed') + piLap(14, 27, 16, '#10304f')),
  'count:laptop:3': () => pairSvg(piMon(2, 7, 12, 9, '#0284c7') + piMon(16, 7, 12, 9, '#7c3aed') + piMon(30, 7, 12, 9, '#db2777') + piLap(14, 26, 16, '#10304f')),
  'count:desktop:1': () => pairSvg(piMon(11, 10, 22, 16, '#0284c7') + piSpark(37, 9, '#e84393', 4)),
  'count:desktop:2': () => pairSvg(piMon(3, 11, 17, 13, '#0284c7') + piMon(24, 11, 17, 13, '#7c3aed')),
  'count:desktop:3': () => pairSvg(piMon(2, 8, 12, 9, '#0284c7') + piMon(16, 8, 12, 9, '#7c3aed') + piMon(30, 8, 12, 9, '#db2777') + piMon(16, 25, 12, 9, '#0d9488')),
  'res:1080p': () => pairSvg(piDots(3, 2, '#0284c7')),
  'res:1440p': () => pairSvg(piDots(4, 3, '#7c3aed')),
  'res:4k': () => pairSvg(piDots(5, 4, '#db2777')),
  'res:unsure': () => pairSvg(`<path d="M8 8 h28 v22 H8 Z" stroke="#0d9488"/><path d="M17 15 q5 -6 10 0 q-2.4 3.4 -5 4.6 v3" stroke="#0d9488"/><circle cx="22" cy="26.4" r="1.5" fill="#0d9488" stroke="none"/>`),
  'have:yes': () => pairSvg(piMon(6, 9, 24, 17, '#10304f') + `<circle cx="33" cy="29" r="7.4" fill="#dcfce7" stroke="#16a34a"/><path d="M29.8 29 l2.4 2.5 4 -4.6" stroke="#16a34a"/>`),
  'have:no': () => pairSvg(piMon(9, 10, 22, 16, '#0284c7') + piSpark(36, 11, '#e84393', 4.4) + piSpark(8, 33, '#f59e0b', 3.4)),
  'chassis:plastic': () => pairSvg(piLap(10, 12, 24, '#78716c') + `<circle cx="16" cy="18" r="1.4" fill="#78716c" stroke="none"/><circle cx="27" cy="21" r="1.4" fill="#78716c" stroke="none"/>`),
  'chassis:aluminum': () => pairSvg(piLap(10, 12, 24, '#64748b') + `<path d="M13 24 l18 -9" stroke="#94a3b8" stroke-width="2"/>`),
  'size:all': () => pairSvg(piMon(2, 13, 12, 9, '#0284c7') + piMon(16, 13, 12, 9, '#7c3aed') + piMon(30, 13, 12, 9, '#db2777')),
  'size:small': () => pairSvg(piMon(14, 14, 16, 12, '#0284c7')),
  'size:office': () => pairSvg(piMon(10, 10, 24, 17, '#0d9488')),
  'size:large': () => pairSvg(piMon(5, 8, 34, 24, '#7c3aed')),
  'size:widescreen': () => pairSvg(piMon(3, 14, 38, 14, '#db2777')),
  'quality:all': () => pairSvg(`<path d="M22 6 l2.6 9.4 L34 18 l-9.4 2.6 L22 30 l-2.6 -9.4 L10 18 l9.4 -2.6 Z" stroke="#b0568a"/>`),
  'quality:everyday': () => pairSvg(`<circle cx="22" cy="22" r="7.4" stroke="#d97706"/><path d="M22 8 v4 M22 32 v4 M8 22 h4 M32 22 h4 M12 12 l2.8 2.8 M32 12 l-2.8 2.8 M12 32 l2.8 -2.8 M32 32 l-2.8 -2.8" stroke="#d97706"/>`),
  'quality:sharp': () => pairSvg(`<path d="M5 22 q17 -14 34 0 q-17 14 -34 0 Z" stroke="#0284c7"/><circle cx="22" cy="22" r="5.6" stroke="#0284c7"/><circle cx="22" cy="22" r="1.8" fill="#0284c7" stroke="none"/>`),
  'quality:color': () => pairSvg(`<path d="M22 6 q9 12.4 9 20 a9 9 0 1 1 -18 0 q0 -7.6 9 -20 Z" stroke="#db2777"/><path d="M17.4 27 a4.8 4.8 0 0 0 3.4 5.4" stroke="#db2777"/>`),
  'quality:premium': () => pairSvg(`<path d="M13 12 h18 l6 9 -15 16 L7 21 Z M7 21 h30 M22 37 L16.4 21 l4 -9 M22 37 l5.6 -16 -4 -9 M16.4 21 l5.6 -9 5.6 9" stroke="#7c3aed" stroke-width="2.3"/>`),
  'quality:unspecified': () => pairSvg(`<path d="M15 13 q7 -7 13 0 q-3 4.4 -6.4 5.8 v3.6" stroke="#64748b"/><circle cx="21.6" cy="29" r="1.7" fill="#64748b" stroke="none"/>`),
  'tech:all': () => pairSvg(`<path d="M9 9 h24 v15 H9 Z M13 28 h24 v-4 M33 24 v4" stroke="#64748b"/><path d="M13 33 h24 v-5" stroke="#94a3b8"/>`),
  'tech:IPS': () => pairSvg(piMon(8, 10, 26, 18, '#0284c7') + `<circle cx="33" cy="10" r="3.6" stroke="#d97706"/>`),
  'tech:OLED': () => pairSvg(`<path d="M8 9 h28 v22 H8 Z" fill="#10304f" stroke="#10304f"/><path d="M18 15 l1.8 4.6 4.9.4 -3.7 3.2 1.2 4.8 -4.2 -2.6 -4.2 2.6 1.2 -4.8 -3.7 -3.2 4.9 -.4 Z" fill="#ffd166" stroke="none"/>`),
  'tech:VA': () => pairSvg(`<path d="M8 9 h28 v22 H8 Z" stroke="#10304f"/><path d="M8 9 h14 v22 H8 Z" fill="#10304f" stroke="none" fill-opacity=".55"/>`),
  'tech:Mini-LED': () => pairSvg(`<path d="M8 8 h28 v24 H8 Z" stroke="#0d9488"/>` + [0, 1, 2].map(i => [0, 1, 2].map(j => `<circle cx="${14.6 + i * 7.4}" cy="${13.6 + j * 6.4}" r="1.5" fill="#0d9488" stroke="none"/>`).join('')).join(''))
};
function pairIconFor(kind, v) {
  const f = PAIR_ICONS[kind + ':' + v];
  return f ? f() : '';
}
function pairTileIndex(t) {
  // Stable per-title color slot so a pairing option keeps its tile
  // color across re-renders (the pairing renderer has no index).
  let n = 0;
  for (let i = 0; i < t.length; i++) n += t.charCodeAt(i);
  return n;
}
function pairOptHTML(icon, t, s, onclick, cls) {
  // Redesign (2026-10-29): pairing answers wear the same colored
  // tiles as the quizzes — same helper, same palette.
  return tileHTML({ i: pairTileIndex(t), icon, title: t, desc: s, onclick,
    wide: !!(cls && cls.includes('wide')), on: !!(cls && cls.includes('on')) });
}
const PAIR_TAB_ICONS = {
  screens: pairSvg(piMon(10, 9, 24, 18, '#0284c7') + piSpark(37, 9, '#e84393', 4)),
  dock: pairSvg(`<path d="M7 27 h30 v9 a2 2 0 0 1 -2 2 H9 a2 2 0 0 1 -2 -2 Z" stroke="#7c3aed"/><path d="M15 27 v-6 M29 27 v-6 M15 21 h0 M12 15 q3 -3 6 0 M26 15 q3 -3 6 0" stroke="#7c3aed"/><circle cx="33" cy="32" r="1.7" fill="#e84393" stroke="none"/>`)
};

function pairCountOpts() {
  if (pairData && pairData.type === 'laptop') return [
    { v: 0, t: 'Just the laptop screen', s: 'No extra monitors' },
    { v: 1, t: '+1 extra screen', s: 'One monitor plugged in at a desk' },
    { v: 2, t: '+2 extra screens', s: 'A full desk setup' },
    { v: 3, t: '+3 or more extra screens', s: 'A full command center' } ];
  return [
    { v: 1, t: '1 screen', s: 'Just one monitor' },
    { v: 2, t: '2 screens', s: 'Side by side — the classic desk setup' },
    { v: 3, t: '3 or more screens', s: 'A full command center' } ];
}
function pairSetCount(v) {
  pairScreens.count = v; pairAsked.count = true;
  if (v === 0) pairAsked.res = true;
  refreshPairStage();
}
function pairSetRes(v) {
  pairScreens.resolution = v; pairAsked.res = true;
  pairTier = PAIR_TIER_LABEL[v] ? v : null;
  pairSizeFilter = 'all'; pairQualityFilter = 'all'; pairTechFilter = 'all';
  pairShelfAll = false;
  refreshPairStage();
}
function pairSetHave(b) { pairScreens.have = b; pairShelfAll = false; refreshPairStage(); }
function pairSetTier(t) {
  pairTier = t; pairSizeFilter = 'all'; pairQualityFilter = 'all'; pairTechFilter = 'all';
  pairShelfAll = false;
  refreshPairStage();
}
function pairSetChassis(c) { pairChassis = c; refreshPairStage(); }
function pairFilterSize(v) { pairSizeFilter = v; pairShelfAll = false; refreshPairStage(); }
function pairFilterQuality(v) { pairQualityFilter = v; pairShelfAll = false; refreshPairStage(); }
function pairFilterTech(v) { pairTechFilter = v; pairShelfAll = false; refreshPairStage(); }
function pairChangeAnswers() { pairAsked = { count: false, res: false }; pairShelfAll = false; refreshPairStage(); }

function pairScreensHTML() {
  const d = pairData;
  // Ask first, with the quiz's own wording, until both are answered.
  if (!pairAsked.count || !pairAsked.res) {
    let h = '';
    if (!pairAsked.count) {
      h += `<p class="q">${d.type === 'laptop' ? 'Will you plug in extra screens?' : 'How many screens will you plug in?'}</p>`;
      h += '<div class="tile-grid">' + pairCountOpts().map(o =>
        pairOptHTML(pairIconFor('count', pairData.type + ':' + o.v), o.t, o.s, `pairSetCount(${o.v})`)).join('') + '</div>';
    }
    if (!pairAsked.res && pairScreens.count !== 0) {
      h += `<p class="q">What resolution are the ${d.type === 'laptop' ? 'extra ' : ''}screens?</p>`;
      h += '<div class="tile-grid">' + PAIR_RES_OPTS.map(o =>
        pairOptHTML(pairIconFor('res', o.v), o.t, o.s, `pairSetRes('${o.v}')`)).join('') + '</div>';
    }
    return `<div class="quiz-stage" data-tint="2">${h}</div>`;
  }
  const n = pairScreens.count;
  const resLabel = PAIR_TIER_LABEL[pairScreens.resolution] || 'resolution not specified';
  let h = `<p class="sortline">Your setup: ${d.type === 'laptop'
      ? (n === 0 ? 'just the laptop screen' : `+${n} external screen${n > 1 ? 's' : ''}`)
      : `${n} screen${n > 1 ? 's' : ''}`} · ${resLabel}</p>
    <button class="back" onclick="pairChangeAnswers()">↺ Change these answers</button>`;
  if (d.type === 'laptop') {
    if (n === 0) {
      h += `<div class="note">No extra screens — nothing to match for displays. ${pairMode === 'both' ? 'A dock can still tidy the desk (one cable for power and peripherals).' : 'A dock can still tidy the desk (one cable for power and peripherals).'}</div>`;
      if (pairMode === 'both')
        h += `<button class="pairbtn" onclick="pairGo('dock')">${PAIR_TAB_ICONS.dock} Continue to the Dock step</button>`;
      return h;
    }
    const disp = d.display || {};
    if (disp.max_external != null) {
      const mx = disp.max_external;
      if (n <= mx) {
        h += `<div class="have">✅ <strong>Good news:</strong> ${esc(d.name)} drives up to ${mx} external screen${mx > 1 ? 's' : ''} on its own — your setup is covered natively.</div>`;
      } else {
        h += `<div class="note">⚠️ On its own, ${esc(d.name)} is rated for ${mx} external screen${mx > 1 ? 's' : ''} — getting to ${n} takes a dock that adds screens itself (DisplayLink).</div>
          ${pairMode === 'both' ? `<button class="pairbtn" onclick="pairGo('dock')">${PAIR_TAB_ICONS.dock} Continue to the Dock step</button>` : ''}`;
      }
      if (disp.max_resolution)
        h += `<p class="sortline">Maker-rated external output: up to ${esc(disp.max_resolution)}.</p>`;
    } else {
      h += `<div class="note">The maker doesn't publish an exact external-screen count for this model, so we won't invent one. Its display ports: ${esc(disp.ports || 'not published')}.</div>`;
      if (disp.detail) h += `<p class="sortline">${esc(disp.detail)}</p>`;
    }
  } else {
    h += `<div class="note">Desktops plug screens straight into the graphics card — no dock needed for displays. This one's graphics: ${esc(d.gpu || 'see the model page')}.</div>`;
    if (d.display_inches)
      h += `<p class="sortline">It's an all-in-one: the built-in ${d.display_inches}″ screen counts as one of your screens.</p>`;
    if (n === 0) return h;
  }
  // Do they already have the screens?
  h += `<p class="q" style="margin-top:18px">Do you already have these screens?</p>
    <div class="tile-grid">
      ${tileHTML({ i: 3, icon: pairIconFor('have', 'yes'), title: 'Yes, I have them', on: pairScreens.have === true, onclick: 'pairSetHave(true)' })}
      ${tileHTML({ i: 0, icon: pairIconFor('have', 'no'), title: 'No — show me screens', on: pairScreens.have === false, onclick: 'pairSetHave(false)' })}
    </div>`;
  if (pairScreens.have === true)
    h += `<div class="note">You're set for screens. ${pairMode === 'both' ? 'Now for the dock — one cable for everything.' : 'Nothing more to match here.'}</div>`;
  else if (pairScreens.have === false)
    h += pairShelfHTML();
  if (pairMode === 'both')
    h += `<button class="pairbtn" onclick="pairGo('dock')">${PAIR_TAB_ICONS.dock} Screens done — continue to the Dock step</button>`;
  return h;
}
function pairShelfHTML() {
  const mons = pairData.monitors || {};
  if (!Object.keys(mons).length)
    return `<div class="note">🖥️ The screen shelf is still being stocked — check back soon.</div>`;
  if (!pairTier) {
    return `<div class="quiz-stage" data-tint="3"><p class="q">Which resolution should we match?</p>` +
      '<div class="tile-grid">' + Object.keys(PAIR_TIER_LABEL).map(t =>
        pairOptHTML(pairIconFor('res', t), PAIR_TIER_LABEL[t], `${(mons[t] || []).length} on the shelf`, `pairSetTier('${t}')`)).join('') + '</div></div>';
  }
  const shelf = mons[pairTier] || [];
  let h = `<p class="picks-head">Screens at ${PAIR_TIER_LABEL[pairTier]}</p>`;
  h += `<p class="sortline">How this shelf is stocked: every monitor's specs come from its maker's own spec sheet, and every price was seen at Best Buy or the maker's own store — no marketplace sellers, no scraped price listings. Prices checked October 2026.</p>`;
  h += `<button class="back" onclick="pairTier=null;refreshPairStage()">← Pick a different resolution</button>`;
  if (!shelf.length)
    return h + `<div class="note">🖥️ The ${PAIR_TIER_LABEL[pairTier]} shelf is still being stocked — try another resolution.</div>`;
  const sizes = [['all', 'All sizes'], ['small', 'Small'], ['office', 'Office'], ['large', 'Large'], ['widescreen', 'Widescreen']];
  const quals = [['all', 'Any quality'], ['everyday', 'Everyday'], ['sharp', 'Sharp'], ['color', 'Color'], ['premium', 'Premium'], ['unspecified', 'Unspecified']];
  h += `<div class="sortrow wrap">${sizes.map(([v, t]) =>
    `<button class="sort${pairSizeFilter === v ? ' on' : ''}" onclick="pairFilterSize('${v}')">${pairIconFor('size', v)}${t}</button>`).join('')}</div>`;
  h += `<div class="sortrow wrap">${quals.map(([v, t]) =>
    `<button class="sort${pairQualityFilter === v ? ' on' : ''}" onclick="pairFilterQuality('${v}')">${pairIconFor('quality', v)}${t}</button>`).join('')}</div>`;
  const techs = [...new Set(shelf.map(m => m.tech).filter(Boolean))].sort();
  if (techs.length > 1) {
    const techOpts = [['all', 'All panel types'], ...techs.map(t => [t, t])];
    h += `<div class="sortrow wrap">${techOpts.map(([v, t]) =>
      `<button class="sort${pairTechFilter === v ? ' on' : ''}" onclick="pairFilterTech('${v}')">${pairIconFor('tech', v)}${t}</button>`).join('')}</div>`;
  }
  const shown = shelf.filter(m =>
    (pairSizeFilter === 'all' || m.size_class === pairSizeFilter) &&
    (pairQualityFilter === 'all' || m.quality_class === pairQualityFilter) &&
    (pairTechFilter === 'all' || m.tech === pairTechFilter));
  if (!shown.length)
    h += `<div class="note">No screens on this shelf match that combination yet — try clearing a filter.</div>`;
  const page = pairShelfAll ? shown : shown.slice(0, 6);
  h += '<div class="picks-grid breakout">';
  page.forEach(m => { h += monitorCardHTML(m); });
  h += '</div>';
  if (!pairShelfAll && shown.length > 6)
    h += `<button class="more" onclick="pairShelfAll=true;refreshPairStage()">Show ${shown.length - 6} more ▼</button>`;
  return h;
}
const MON_SIZE_RANGE = { small: 'Small · under 27″', office: 'Office · 27–32″', large: 'Large · over 32″', widescreen: 'Widescreen · ultrawide' };
function monSizeText(m) { return m.size_label || MON_SIZE_RANGE[m.size_class] || ''; }
function monSizeHTML(m) {
  const t = monSizeText(m);
  return t ? ` <span style="font-size:.95rem;font-weight:400;color:var(--muted);white-space:nowrap">${t}</span>` : '';
}
function monitorCardHTML(m) {
  const chips = [`📺 ${m.size_in}″`, esc(m.resolution), `${m.refresh_hz}Hz`, esc(m.panel_type)];
  if (m.usbc_video_input) chips.push('🔌 USB-C video input — one cable from a laptop');
  const inSetup = pairSetupMonitorQty(m.id);
  return `<div class="card">${cardGallery('monitor', m.images, m.name)}
    <h3>${PAIR_TAB_ICONS.screens}${esc(m.name)}${monSizeHTML(m)}</h3>
    <div class="price">$${m.price_usd.toLocaleString()}</div>
    <p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Price via ${esc(m.price_source || 'retailer')}, checked Oct 2026 · ${esc(m.role)}</p>
    <p class="why">${esc(m.why)}</p>
    ${factRowsHTML(chips)}
    <div class="sortrow" style="align-items:center;margin-top:10px">
      <button class="sort" onclick="pairMonQtyDelta('${m.id}',-1)">−</button>
      <span>×${pairQtyFor(m.id)}</span>
      <button class="sort" onclick="pairMonQtyDelta('${m.id}',1)">+</button>
      <button class="sort" onclick="pairToggleMonitor('${m.id}')">${inSetup ? `✓ In your setup ×${inSetup} — tap to remove` : '＋ Add to my setup'}</button>
    </div>
    ${pairManual ? monitorOwnHTML(m) : ''}
    <div class="buylinks"><button class="buybtn" disabled>🛒 Buy links coming soon</button></div></div>`;
}
function dockCardHTML(o, beyond) {
  const roleLabel = { manufacturer: "🏭 Maker's own dock", third_party_primary: 'Third-party pick',
    third_party_secondary: 'Third-party pick', usba_displaylink: 'USB-A DisplayLink route',
    displaylink_fallback: 'DisplayLink pick' }[o.role] || 'Dock';
  const chips = [];
  if (o.connection) chips.push('🔌 ' + esc(o.connection));
  if (o.max_displays) chips.push(`🖥️ Up to ${o.max_displays} screens`);
  if (o.host_charging_w) chips.push(`⚡ Charges the laptop at ${o.host_charging_w}W`);
  const tech = o.displaylink_capable
    ? `<p class="why">🖥️ Adds screens itself over USB (DisplayLink) — works past the laptop's own screen limit. Needs the free DisplayLink driver.</p>`
    : `<p class="why">Uses the laptop's own graphics (native) — screens through it stay within the laptop's own display limits.</p>`;
  let flag = '';
  if (beyond) {
    flag = o.displaylink_capable
      ? `<p class="why" style="color:#4ade80">✅ This is the kind that can add your extra screens.</p>`
      : `<p class="warnline">⚠️ On its own this won't add screens past the laptop's limit — shown so you can compare.</p>`;
  }
  const price = o.price_usd != null
    ? `<div class="price">$${o.price_usd.toLocaleString()}</div>
       <p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Price via ${esc(o.price_source || 'maker store')}, checked Oct 2026</p>`
    : `<p class="permo" style="color:#94a3b8;font-size:.8rem;margin:2px 0 0">No verified price yet — we list a price only when we've confirmed one</p>`;
  const inSetup = pairSetupDockId() === o.id;
  return `<div class="card"><span class="dockrole">${roleLabel}</span>
    ${cardGallery('dock', o.images, o.name)}
    <h3>${esc(o.name)}</h3>
    ${price}
    ${factRowsHTML(chips)}
    ${tech}${flag}
    <button class="pairbtn" onclick="pairToggleDock('${o.id}')">${inSetup ? '✓ Dock in your setup — tap to remove' : '＋ Add this dock to my setup'}</button>
    ${pairManual ? dockOwnHTML(o) : ''}
    <div class="buylinks"><button class="buybtn" disabled>🛒 Buy links coming soon</button></div></div>`;
}
function pairDockHTML() {
  const d = pairData;
  if (d.type === 'desktop') {
    return `<div class="note">Desktops plug screens in directly — the graphics card's own ports do the job, so there's no dock to pair with a desktop.${pairMode === 'both' ? '' : ' Matching the screens themselves happens in the Screens step.'}</div>
      ${pairMode === 'both' ? '' : `<button class="pairbtn" onclick="pairGo('screens')">${PAIR_TAB_ICONS.screens} Go to Screens</button>`}`;
  }
  if (pairScreens.count === null) {
    return `<div class="quiz-stage" data-tint="4"><p class="q">First — how many extra screens should the dock handle?</p>
      <p class="sortline">A pairing only means something against a target setup.</p>` +
      '<div class="tile-grid">' + pairCountOpts().map(o =>
        pairOptHTML(pairIconFor('count', pairData.type + ':' + o.v), o.t, o.s, `pairSetCount(${o.v})`)).join('') + '</div></div>';
  }
  const split = d.chassis_split;
  if (split && !pairChassis) {
    return `<p class="q">One question about this exact model</p>
      <div class="note">Dell sells this model in two chassis, and they differ where it matters: the plastic-chassis version's USB-C port is data-only, while the aluminum-chassis version's USB-C carries DisplayPort video. Which is yours?</div>
      <div class="tile-grid">
      ${pairOptHTML(pairIconFor('chassis', 'plastic'), 'Plastic chassis', 'USB-C is data-only on this version', `pairSetChassis('plastic')`)}
      ${pairOptHTML(pairIconFor('chassis', 'aluminum'), 'Aluminum chassis', 'USB-C carries DisplayPort video on this version', `pairSetChassis('aluminum')`)}
      </div>`;
  }
  let effClass = d.dock_class;
  if (split && pairChassis) effClass = split[pairChassis];
  if (d.dock_class === 'unknown' && !split) {
    let h = `<div class="note">We couldn't verify this model's dock ports from the maker's published specs, so we won't pair a dock we can't stand behind.</div>`;
    if (d.unknown_reason) h += `<p class="sortline">${esc(d.unknown_reason)}</p>`;
    h += `<p class="sortline">The safe route: check the model's spec page for "DisplayPort" or "Thunderbolt" next to its USB-C ports — a dock needs one of those to carry a picture.</p>`;
    return h;
  }
  if (effClass === 'usbc_data_only_with_usba') {
    let h = `<div class="note">⚠️ A standard USB-C dock can't add screens to this laptop — its USB-C port is data-only (no video). The docks that can help connect over USB-A and add screens themselves, using DisplayLink. Two honest caveats: they need the free DisplayLink driver, and they can't charge this laptop — it keeps its own power adapter.</div>
      <p class="picks-head">The USB-A DisplayLink route</p>`;
    (d.usba_displaylink_options || []).forEach(o => { h += dockCardHTML(o, false); });
    return h;
  }
  const opts = d.pairing_options || [];
  const mx = (d.display || {}).max_external;
  const n = pairScreens.count;
  let h = '';
  let beyond = false;
  if (mx != null && n > mx) {
    beyond = true;
    h += `<div class="note">⚠️ This laptop drives up to ${mx} external screen${mx > 1 ? 's' : ''} on its own. A regular dock just re-exports that same graphics — it can't pass the limit. The docks marked DisplayLink add screens over USB and can take you further.</div>
      <p class="picks-head">Vetted pairings for ${esc(d.brand)}</p>`;
  } else if (mx != null && n >= 1) {
    h += `<div class="have">✅ <strong>Good news:</strong> this laptop drives your ${n} external screen${n > 1 ? 's' : ''} on its own — a dock is optional.</div>
      <p class="picks-head">For a tidier desk</p>
      <p class="sortline">One cable for screens, power, and peripherals when you sit down:</p>`;
  } else if (n === 0) {
    h += `<p class="picks-head">Docks for a tidier desk</p>
      <p class="sortline">No extra screens planned — a dock here is about one-cable convenience, not more displays:</p>`;
  } else {
    h += `<div class="note">The maker doesn't publish an exact external-screen count for this model, so we can't promise it covers ${n} screen${n > 1 ? 's' : ''} natively. These are the vetted ${esc(d.pairing_key || d.brand)} pairings; if the laptop turns out to be limited, a DisplayLink dock is the kind that adds screens itself.</div>
      <p class="picks-head">Vetted pairings</p>`;
  }
  opts.forEach(o => { h += dockCardHTML(o, beyond); });
  if (beyond && !opts.some(o => o.displaylink_capable) &&
      (d.displaylink_options || []).length) {
    h += `<p class="picks-head">DisplayLink docks that can add the screens</p>`;
    d.displaylink_options.forEach(o => { h += dockCardHTML(o, true); });
  }
  if (effClass === 'usbc_dp' &&
      opts.some(o => (o.connection || '').indexOf('Thunderbolt') === 0)) {
    h += `<p class="sortline">Port note: this laptop's USB-C carries DisplayPort video but isn't Thunderbolt — makers state Thunderbolt docks may run with reduced function on ports like this; a USB-C (DisplayPort) dock is the certain match.</p>`;
  }
  return h;
}

// ------------------------------------------------------------- my setup
// Build 2026-10-15.15: saved setups — deliberately NOT a cart (nothing
// reserved or ordered). localStorage only (bytematch.setups.v1),
// storing stable item ids + quantities; names/prices are re-read from
// the current catalog at display time. Share links carry ids +
// quantities + name in the URL hash only.
const SETUPS_KEY = 'bytematch.setups.v1';
function loadSetups() {
  try {
    const raw = localStorage.getItem(SETUPS_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      if (j && j.version === 1 && Array.isArray(j.setups)) return j;
    }
  } catch (e) {}
  return { version: 1, active_id: null, setups: [] };
}
let setupStore = loadSetups();
updateSetupBtn();
function persistSetups() {
  try { localStorage.setItem(SETUPS_KEY, JSON.stringify(setupStore)); } catch (e) {}
  updateSetupBtn();
}
function updateSetupBtn() {
  const b = document.getElementById('setupbtn');
  if (!b) return;
  const n = setupStore.setups.length + (typeof savedGear !== 'undefined' ? savedGear.length : 0);
  b.innerHTML = `${rico('bookmark')}Saved stuff${n ? ` (${n})` : ''}`;
}
function newSetupId() {
  return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
}
function findSetupForComputer(kind, id) {
  return setupStore.setups.find(s => s.computer.kind === kind && s.computer.id === id) || null;
}
function ensureSetupForComputer(kind, id) {
  let s = findSetupForComputer(kind, id);
  if (!s) {
    s = { id: newSetupId(), name: null, computer: { kind, id },
          dock_id: null, monitors: [], created: Date.now(), updated: Date.now() };
    setupStore.setups.push(s);
  }
  setupStore.active_id = s.id;
  persistSetups();
  return s;
}
function getSetup(id) { return setupStore.setups.find(s => s.id === id) || null; }
function touchSetup(s) { s.updated = Date.now(); persistSetups(); }
function saveSetupFromCard(btn, kind, id) {
  const s = ensureSetupForComputer(kind, id);
  touchSetup(s);
  if (btn) btn.textContent = '✓ Saved — find it in My Setup';
  renderModelOwnSlot(); // no-op unless the manual "Your model" card is on screen
}
// Catalog resolution: ids -> current records (null = no longer listed)
let setupCatalog = null;
async function loadSetupCatalog() {
  if (setupCatalog) return setupCatalog;
  setupCatalog = { computers: {}, docks: {}, monitors: {} };
  try {
    const pd = await fetch('/api/pairing-data').then(x => x.json());
    const addDock = o => { if (o && o.id) setupCatalog.docks[o.id] = o; };
    Object.values(pd.brand_options || {}).forEach(list => list.forEach(addDock));
    Object.values(pd.laptops || {}).forEach(e => (e.usba_displaylink_options || []).forEach(addDock));
    ((pd.meta || {}).displaylink_options || []).forEach(addDock);
    Object.values(pd.monitors || {}).forEach(list =>
      list.forEach(m => { setupCatalog.monitors[m.id] = m; }));
  } catch (e) {}
  return setupCatalog;
}
async function resolveComputer(kind, id) {
  await loadSetupCatalog();
  const key = kind + '/' + id;
  if (!(key in setupCatalog.computers)) {
    try {
      const r = await fetch(`/api/computer/${kind}/${encodeURIComponent(id)}`);
      setupCatalog.computers[key] = r.ok ? await r.json() : null;
    } catch (e) { setupCatalog.computers[key] = null; }
  }
  return setupCatalog.computers[key];
}
function setupTotals(s, comp, cat) {
  if (!comp) return { total: null, computerMissing: true, missingPrice: [] };
  // Owned components (own-it, manual path) contribute $0 — the total
  // is only what the shopper still needs to buy. Missing flags read as
  // not-owned, so legacy setups total exactly as they always have.
  const compOwned = s.computer_owned === true;
  if (comp.price == null && !compOwned) return { total: null, computerMissing: false, missingPrice: [] };
  let total = compOwned ? 0 : comp.price;
  const missingPrice = [];
  if (s.dock_id) {
    const d = cat.docks[s.dock_id];
    if (d && s.dock_owned !== true) {
      if (d.price_usd != null) total += d.price_usd;
      else missingPrice.push(d.name);
    }
  }
  s.monitors.forEach(m => {
    const mon = cat.monitors[m.id];
    if (mon && m.owned !== true) {
      if (mon.price_usd != null) total += mon.price_usd * m.qty;
      else missingPrice.push(mon.name);
    }
  });
  return { total, computerMissing: false, missingPrice };
}
function setupHasOwned(s) {
  return s.computer_owned === true || s.dock_owned === true ||
    (s.monitors || []).some(m => m.owned === true);
}
function setupLinesHTML(s, comp, cat) {
  const lines = [];
  if (!comp)
    lines.push(`<p class="setupline">🖥️ <strong>Computer:</strong> this model is no longer in the catalog.</p>`);
  else if (s.computer_owned === true)
    lines.push(`<p class="setupline">🖥️ <strong>${esc(comp.name)}</strong> — <span class="ownedtag">✓ Already owned</span> · not counted in your total</p>`);
  else
    lines.push(`<p class="setupline">🖥️ <strong>${esc(comp.name)}</strong> — from $${comp.price.toLocaleString()}${comp.source_url ? ` · <a href="${esc(comp.source_url)}" target="_blank" rel="noopener">See it at ${esc(comp.brand || 'the maker')} ↗</a>` : ''}</p>`);
  if (s.dock_id) {
    const d = cat.docks[s.dock_id];
    if (!d)
      lines.push(`<p class="setupline">🔌 <strong>Dock:</strong> no longer in the catalog. <button class="sort" onclick="setupRemoveDock('${s.id}')">✕ Remove</button></p>`);
    else if (s.dock_owned === true)
      lines.push(`<p class="setupline">🔌 ${esc(d.name)} — <span class="ownedtag">✓ Already owned</span> · not counted in your total <button class="sort" onclick="setupRemoveDock('${s.id}')">✕ Remove</button></p>`);
    else
      lines.push(`<p class="setupline">🔌 ${esc(d.name)} — ${d.price_usd != null ? '$' + d.price_usd.toLocaleString() : 'price not shown (not counted in the total)'} <button class="sort" onclick="setupRemoveDock('${s.id}')">✕ Remove</button></p>`);
  } else {
    lines.push(`<p class="setupline">🔌 No dock added yet — this computer's pairing flow can add one.</p>`);
  }
  if (!s.monitors.length)
    lines.push(`<p class="setupline">🖥️ No screens added yet.</p>`);
  s.monitors.forEach(m => {
    const mon = cat.monitors[m.id];
    if (!mon)
      lines.push(`<p class="setupline">🖥️ A saved screen is no longer in the catalog. <button class="sort" onclick="setupRemoveMonitor('${s.id}','${m.id}')">✕ Remove</button></p>`);
    else if (m.owned === true)
      lines.push(`<p class="setupline">🖥️ ${esc(mon.name)}${monSizeHTML(mon)} ×${m.qty} — <span class="ownedtag">✓ Already owned</span> · not counted in your total <button class="sort" onclick="setupRemoveMonitor('${s.id}','${m.id}')">✕ Remove</button></p>`);
    else
      lines.push(`<p class="setupline">🖥️ ${esc(mon.name)}${monSizeHTML(mon)} ×${m.qty} — ${mon.price_usd != null ? '$' + mon.price_usd.toLocaleString() + ' each' : 'price not shown (not counted in the total)'} <button class="sort" onclick="setupRemoveMonitor('${s.id}','${m.id}')">✕ Remove</button></p>`);
  });
  return lines.join('');
}
function setupCardHTML(s, comp, cat, withActions) {
  const name = s.name || (comp ? comp.name : 'Saved setup');
  const t = setupTotals(s, comp, cat);
  let totalHTML;
  if (t.computerMissing)
    totalHTML = `<div class="note">No total: the saved computer is no longer in the catalog, so there's nothing current to price against.</div>`;
  else if (t.total == null)
    totalHTML = `<div class="note">No total: the computer's price isn't shown, and we never guess one.</div>`;
  else
    totalHTML = `<div class="have" style="text-align:left">Estimated starting total: <strong>$${t.total.toLocaleString()}</strong><br><span style="font-weight:400">From the prices above, checked Oct 2026. ${s.computer_owned === true ? 'Your computer is marked Already owned, so it adds nothing to this total' : "The computer's figure is its starting price"}${t.missingPrice.length ? '; anything marked "price not shown" is not counted' : ''}${setupHasOwned(s) && s.computer_owned !== true ? '; anything marked Already owned is not counted' : ''} — configurations and final prices vary.</span></div>`;
  return `<div class="card"><h3>🧩 ${esc(name)}</h3>
    ${setupLinesHTML(s, comp, cat)}
    ${totalHTML}
    ${withActions ? `<div class="setupactions">
      <button class="sort" onclick="setupOpen('${s.id}')">Open</button>
      <button class="sort" onclick="setupRename('${s.id}')">Rename</button>
      <button class="sort" onclick="setupDuplicate('${s.id}')">Duplicate</button>
      <button class="sort" onclick="setupShare(this,'${s.id}')">Share link</button>
      <button class="sort" onclick="setupPrint('${s.id}')">Print checklist</button>
      <button class="sort" onclick="setupDelete('${s.id}')">Delete</button>
    </div>` : ''}</div>`;
}
let setupReturn = { section: 'home', y: 0 };
let setupResolved = {};
async function openMySetup() {
  if (!document.body.dataset.theme) setPageTheme('store');
  const cur = SECTION_IDS.find(x => x !== 'setup' &&
    document.getElementById(x).style.display !== 'none');
  setupReturn = { section: cur || 'home', y: window.scrollY || 0 };
  hideAllSections();
  const el = document.getElementById('setup');
  el.style.display = 'block';
  el.innerHTML = `<div class="loading"><span class="dots">Loading your setups</span></div>`;
  window.scrollTo(0, 0);
  await renderSetupList();
}
function closeMySetup() {
  hideAllSections();
  const el = document.getElementById(setupReturn.section);
  if (el) el.style.display = 'block';
  window.scrollTo(0, setupReturn.y);
}
async function renderSetupList() {
  const el = document.getElementById('setup');
  const cat = await loadSetupCatalog();
  let h = `<button class="back" onclick="closeMySetup()">← Back</button>
    <h1>My <span class="accent">Setup</span></h1>
    <p class="sub">Gear, computers, docks, and screens you've saved on this device. This is not a cart — nothing is reserved or ordered, and prices are re-read from the catalog each time you look.</p>`;
  if (savedGear.length) {
    h += `<h2 class="setuph">🔖 Saved gear</h2>`;
    for (const gid of savedGear) {
      let g = null;
      try { g = await (await fetch('/api/gear/' + gid)).json(); } catch (e) {}
      if (!g || g.error) continue;
      const price = g.price != null ? `$${Number(g.price).toLocaleString()}` : 'no verified price yet';
      h += `<div class="card"><h3>${esc(g.name)}</h3>
        <p class="why">${esc(g.brand)} · ${esc(g.type_label)} · ${price}</p>
        ${g.price_url ? `<div class="buylinks"><a class="buybtn" href="${esc(g.price_url)}" target="_blank" rel="noopener">🛒 See it at ${esc(g.price_source || 'the store')}</a></div>` : ''}
        <button class="pairbtn" onclick="openGearPage('${g.id}','setup')">📄 View its page</button>
        <button class="pairbtn savebtn" onclick="removeSavedGear('${g.id}')">✕ Remove</button></div>`;
    }
  }
  if (!setupStore.setups.length && !savedGear.length)
    h += `<div class="note">Nothing saved yet — save gear from any result with its 🔖 Save button, or a computer setup with the 💾 Save this setup button, and it'll wait for you here.</div>`;
  const sorted = [...setupStore.setups].sort((a, b) => (b.updated || 0) - (a.updated || 0));
  for (const s of sorted) {
    const comp = await resolveComputer(s.computer.kind, s.computer.id);
    setupResolved[s.id] = comp;
    h += setupCardHTML(s, comp, cat, true);
  }
  el.innerHTML = h;
}
function removeSavedGear(id) {
  const i = savedGear.indexOf(id);
  if (i >= 0) { savedGear.splice(i, 1); persistSavedGear(); }
  renderSetupList();
}
async function setupOpen(id) {
  const s = getSetup(id);
  if (!s) return;
  const comp = await resolveComputer(s.computer.kind, s.computer.id);
  if (!comp) { alert('That computer is no longer in the catalog.'); return; }
  if (s.computer.kind === 'laptop') renderModelCard(comp, 'setup');
  else renderDesktopModelCard(comp, 'setup');
}
function setupRename(id) {
  const s = getSetup(id);
  if (!s) return;
  const cur = s.name || (setupResolved[id] ? setupResolved[id].name : '');
  const n = prompt('Name this setup:', cur);
  if (n && n.trim()) { s.name = n.trim(); touchSetup(s); renderSetupList(); }
}
function setupDuplicate(id) {
  const s = getSetup(id);
  if (!s) return;
  const copy = JSON.parse(JSON.stringify(s));
  copy.id = newSetupId();
  copy.name = (s.name || (setupResolved[id] ? setupResolved[id].name : 'Setup')) + ' (copy)';
  copy.created = Date.now(); copy.updated = Date.now();
  setupStore.setups.push(copy);
  persistSetups();
  renderSetupList();
}
function setupDelete(id) {
  if (!confirm('Delete this saved setup?')) return;
  setupStore.setups = setupStore.setups.filter(s => s.id !== id);
  if (setupStore.active_id === id) setupStore.active_id = null;
  persistSetups();
  renderSetupList();
}
function setupRemoveDock(id) {
  const s = getSetup(id);
  if (!s) return;
  s.dock_id = null; touchSetup(s); renderSetupList();
}
function setupRemoveMonitor(id, monId) {
  const s = getSetup(id);
  if (!s) return;
  s.monitors = s.monitors.filter(m => m.id !== monId);
  touchSetup(s); renderSetupList();
}
function setupShare(btn, id) {
  const s = getSetup(id);
  if (!s) return;
  const comp = setupResolved[id];
  const url = encodeSetupLink(s, s.name || (comp ? comp.name : 'My setup'));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      btn.textContent = '✓ Link copied';
      setTimeout(() => { btn.textContent = 'Share link'; }, 2000);
    }, () => prompt('Copy this share link:', url));
  } else prompt('Copy this share link:', url);
}
async function setupPrint(id) {
  const s = getSetup(id);
  if (!s) return;
  const cat = await loadSetupCatalog();
  const comp = await resolveComputer(s.computer.kind, s.computer.id);
  const name = s.name || (comp ? comp.name : 'Saved setup');
  const t = setupTotals(s, comp, cat);
  const rows = [];
  rows.push(comp ? (s.computer_owned === true
                    ? `☑ Computer: ${esc(comp.name)} — already owned (not in the total)`
                    : `☐ Computer: ${esc(comp.name)} — from $${comp.price.toLocaleString()}`)
                 : '☐ Computer: no longer in the catalog');
  if (s.dock_id) {
    const d = cat.docks[s.dock_id];
    rows.push(d ? (s.dock_owned === true
                    ? `☑ Dock: ${esc(d.name)} — already owned (not in the total)`
                    : `☐ Dock: ${esc(d.name)}${d.price_usd != null ? ' — $' + d.price_usd.toLocaleString() : ' — price not shown'}`)
                : '☐ Dock: no longer in the catalog');
  }
  s.monitors.forEach(m => {
    const mon = cat.monitors[m.id];
    rows.push(mon ? (m.owned === true
                    ? `☑ Screen ×${m.qty}: ${esc(mon.name)} — already owned (not in the total)`
                    : `☐ Screen ×${m.qty}: ${esc(mon.name)}${monSizeText(mon) ? ' (' + monSizeText(mon) + ')' : ''}${mon.price_usd != null ? ' — $' + mon.price_usd.toLocaleString() + ' each' : ' — price not shown'}`)
                  : '☐ Screen: no longer in the catalog');
  });
  if (!s.dock_id && !s.monitors.length)
    rows.push("☐ Add a dock or screens from the pairing flow on this computer's card.");
  document.getElementById('setup').innerHTML = `
    <button class="back no-print" onclick="renderSetupList()">← Back to My Setup</button>
    <div class="printsheet">
      <h2>🧩 ${esc(name)} — setup checklist</h2>
      ${rows.map(r => `<p>${r}</p>`).join('')}
      ${t.total != null
        ? `<p><strong>Estimated starting total: $${t.total.toLocaleString()}</strong> — from prices checked Oct 2026; the computer's figure is a starting price and configurations vary.</p>`
        : '<p>No total shown — a component has no current price.</p>'}
      <p>Saved with ByteMatch. A checklist, not an order: nothing is reserved or purchased.</p>
    </div>
    <button class="pairbtn no-print" onclick="window.print()">🖨️ Print this checklist</button>`;
  window.scrollTo(0, 0);
}
// Share links: ids + quantities + name, in the URL hash only.
function encodeSetupLink(s, displayName) {
  const payload = { n: displayName || '', c: [s.computer.kind, s.computer.id],
                    d: s.dock_id || null,
                    m: s.monitors.map(m => [m.id, m.qty]) };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return location.origin + location.pathname + '#setup=' + b64;
}
function decodeSetupLink(hash) {
  try {
    const b64 = hash.replace(/^#setup=/, '').replace(/-/g, '+').replace(/_/g, '/');
    const j = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (!j || !Array.isArray(j.c) || !j.c[1]) return null;
    return { name: j.n || null,
             computer: { kind: j.c[0] === 'desktop' ? 'desktop' : 'laptop', id: j.c[1] },
             dock_id: j.d || null,
             monitors: (Array.isArray(j.m) ? j.m : []).map(([mid, qty]) =>
               ({ id: mid, qty: Math.max(1, Math.min(9, qty | 0 || 1)) })) };
  } catch (e) { return null; }
}
let sharedSetup = null;
async function openSharedSetup(hash) {
  const parsed = decodeSetupLink(hash);
  if (!parsed) return false;
  sharedSetup = parsed;
  setupReturn = { section: 'home', y: 0 };
  hideAllSections();
  const el = document.getElementById('setup');
  el.style.display = 'block';
  el.innerHTML = `<div class="loading"><span class="dots">Loading the shared setup</span></div>`;
  const cat = await loadSetupCatalog();
  const comp = await resolveComputer(parsed.computer.kind, parsed.computer.id);
  const pseudo = { id: '__shared__', name: parsed.name,
                   computer: parsed.computer, dock_id: parsed.dock_id,
                   monitors: parsed.monitors };
  el.innerHTML = `<button class="back" onclick="closeMySetup()">← Back</button>
    <h1>A shared <span class="accent">setup</span></h1>
    <p class="sub">Someone shared this setup with you. Prices and availability are today's catalog data — save a copy and it stays in your own My Setup on this device.</p>
    ${setupCardHTML(pseudo, comp, cat, false)}
    <button class="pairbtn" onclick="sharedSaveCopy()">💾 Save a copy to My Setup</button>`;
  window.scrollTo(0, 0);
  return true;
}
function sharedSaveCopy() {
  if (!sharedSetup) return;
  const s = { id: newSetupId(), name: sharedSetup.name || null,
              computer: sharedSetup.computer, dock_id: sharedSetup.dock_id,
              monitors: sharedSetup.monitors.map(m => ({ id: m.id, qty: m.qty })),
              created: Date.now(), updated: Date.now() };
  setupStore.setups.push(s);
  setupStore.active_id = s.id;
  persistSetups();
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  openMySetup();
}
updateSetupBtn();
if (location.hash && location.hash.indexOf('#setup=') === 0)
  openSharedSetup(location.hash);

// ------------------------------------------------------------- disclaimers
// All the coverage notes and version caveats from across the guides live
// on ONE page, so flows don't end in a stack of blue boxes. Back returns
// to exactly the view (and wizard step) the user came from: we only toggle
// section visibility, so the previous section's DOM and state are intact.
let discReturn = { section: 'home', y: 0 };
async function openDisclaimers() {
  const cur = SECTION_IDS.find(id => id !== 'disclaimers' &&
    document.getElementById(id).style.display !== 'none');
  discReturn = { section: cur || 'home', y: window.scrollY || 0 };
  renderDisclaimers();
  hideAllSections();
  document.getElementById('disclaimers').style.display = 'block';
  window.scrollTo(0, 0);
}
function closeDisclaimers() {
  hideAllSections();
  const el = document.getElementById(discReturn.section);
  if (el) el.style.display = 'block';
  window.scrollTo(0, discReturn.y);
}
function discSection(title, items) {
  if (!items || !items.length) return '';
  return `<p class="picks-head">${esc(title)}</p>` +
    items.map(n => `<div class="note">${esc(typeof n === 'string' ? n : (n.detail || n.title || ''))}</div>`).join('');
}
function renderDisclaimers() {
  const el = document.getElementById('disclaimers');
  let h = `<button class="back" onclick="closeDisclaimers()">← Back</button>
    <h1>Disclaimers</h1>
    <p class="sub">The fine print, all in one place: what our data is based on, where it can differ from the screen in front of you, and what we couldn't verify.</p>`;
  h += discSection('What we don\'t cover yet', [
    "ByteMatch covers whole computers and networking gear — not individual PC parts. We don't work with standalone components like CPUs, graphics cards, motherboards, or cases today. Parts may be added at a later date; when they are, they'll get the same research-first treatment as everything else here.",
  ]);
  h += discSection('Prices & recommendations', [
    "Computer prices (laptops and desktops) are manufacturers' published list prices, checked in October 2026, and are shown as a range — the starting configuration through the highest configuration we could verify. When only a starting price could be verified, that's all we show — no implied maximum. Store prices, sales, and coupons will differ.",
    "We never quote a marketplace seller's price as a model's price, and a computer with no verified manufacturer price is not listed at all. We would rather show fewer computers than invent a number.",
    "Recommendations are ranked from your quiz answers and the manufacturers' published specs for each model. Prices and specs were checked when our catalog was built and can change without notice.",
  ]);
  h += discSection('Networking', [
    "Rental fees and savings figures come from each provider's published equipment fees in our data, checked in October 2026. Promotions, bundles, and regional pricing can change what you actually pay — your own bill is the source of truth.",
    "Modem and router compatibility is checked against each provider's published approved-device information. A provider can change its list at any time, so confirm on the provider's site before you buy.",
  ]);
  el.innerHTML = h;
}

fetch('/api/isps').then(x => x.json()).then(d => { isps = d; });
