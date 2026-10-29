const stepsEl = document.getElementById('steps');
const bar = document.getElementById('bar');
const answers = {};
let isps = [];

// ------------------------------------------------------------- front door
// First screen: Buy New Gear. Second: Internet / PC / Home Theater.
// Then route into the matching existing flow.
const SECTION_IDS = ['home', 'flow-pick', 'quiz', 'results', 'gear-page', 'theater', 'model-lookup', 'pairing', 'setup', 'disclaimers'];
function hideAllSections() {
  SECTION_IDS.forEach(id => document.getElementById(id).style.display = 'none');
}
function chooseFlow() { renderFlowPick(); }
function renderFlowPick() {
  if (typeof setScene === 'function') setScene('');
  hideAllSections();
  const el = document.getElementById('flow-pick');
  el.style.display = 'block';
  el.innerHTML = `<button class="back" onclick="backHome()">← Back</button>
    <div class="quiz-stage" data-tint="0">
    <p class="q">What are you buying?</p>
    <div class="tile-grid">
    ${tileHTML({ i: 0, lg: true, icon: rico('globe'), title: 'Internet', desc: 'Modems, routers & mesh — ditch the ISP rental fee', onclick: "routeFlow('internet')" })}
    ${tileHTML({ i: 1, lg: true, icon: rico('laptop'), title: 'PC', desc: "Laptops & desktops matched to how you'll actually use them", onclick: "routeFlow('pc')" })}
    ${tileHTML({ i: 2, lg: true, icon: rico('tv'), title: 'Home Theater', desc: 'TVs & sound — matched to your room and your couch', onclick: "routeFlow('theater')" })}
    </div>
    <p class="orline">— or —</p>
    <div class="tile-grid">
    ${tileHTML({ i: 3, lg: true, icon: rico('search'), title: 'Know your model?', desc: 'Type the name — or the model number off the box — and jump straight to it', onclick: 'startModelLookup()' })}
    </div>
    </div>`;
  window.scrollTo(0, 0);
}
function backToFlowPick() { renderFlowPick(); }

// ------------------------------------------------------- redesign tiles
// Colored answer tiles (redesign, 2026-10-29): a strong palette color per
// option, the glyph in a white chip, the title in the Poppins display
// font, and the description centered under the tile in plain text.
// Presentation only — the onclick wiring passed in is the site's own.
const TILE_COLORS = [
  { bg: '#1a73e8', ink: '#ffffff' }, { bg: '#f472b6', ink: '#ffffff' },
  { bg: '#ffd166', ink: '#14213d' }, { bg: '#16a34a', ink: '#ffffff' },
  { bg: '#7c3aed', ink: '#ffffff' }, { bg: '#0284c7', ink: '#ffffff' } ];
function tileColor(i) { return TILE_COLORS[i % TILE_COLORS.length]; }
// Simple geometric marks for options that carry no icon of their own.
function tileMark(i) {
  const shapes = [
    '<circle cx="24" cy="24" r="13"/>',
    '<rect x="12" y="12" width="24" height="24" rx="5"/>',
    '<path d="M24 10 L38 36 H10 Z"/>',
    '<path d="M24 9 L39 24 L24 39 L9 24 Z"/>',
    '<path d="M24 8 l4.7 10.3 L40 20 l-8.4 7.6 L34 39 L24 33.2 L14 39 l2.4-11.4 L8 20 l11.3-1.7 Z"/>',
    '<path d="M24 9 l11 6 v12 l-11 12 l-11-12 V15 Z"/>' ];
  return `<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${shapes[i % shapes.length]}</svg>`;
}
function tileHTML(o) {
  // o: { i, onclick, title, desc, icon (svg html), logo (img src), wide, on, lg }
  const c = tileColor(o.i || 0);
  const main = o.logo
    ? `<span class="tile-main logo"><img class="tile-logo" src="${o.logo}" alt="" onerror="this.style.display='none'"><span class="tile-title">${o.title}</span></span>`
    : `<span class="tile-main" style="--tile:${c.bg};--tile-ink:${c.ink}"><span class="tile-ic${o.lg ? ' lg' : ''}">${o.icon || tileMark(o.i || 0)}</span><span class="tile-title">${o.title}</span></span>`;
  return `<button class="tile${o.wide ? ' wide' : ''}${o.on ? ' on' : ''}" onclick="${o.onclick}">${main}${o.desc ? `<span class="tile-desc">${o.desc}</span>` : ''}</button>`;
}
function routeFlow(kind) {
  if (kind === 'theater') { showTheater(); return; }
  if (kind === 'internet') startBuy(); else startLaptopBuy();
}
function showTheater() {
  hideAllSections();
  const el = document.getElementById('theater');
  el.style.display = 'block';
  el.innerHTML = `<button class="back" onclick="backToFlowPick()">← Back</button>
    <p class="q"><span class="big-ico">${rico('tv')}</span>Home Theater</p>
    <div class="note">🚧 <b>We're stocking this aisle now.</b> TVs and sound are next — picked the same way as everything else here: real prices we verified at the store, specs from the maker, and matched to your room instead of a spec sheet.</div>
    <p class="factline">On the way: TVs by room size and light · soundbars & speakers · the "will it fit my stand?" check</p>
    <p class="factline">Nothing is listed until its price is verified — that's the rule everywhere in this store.</p>`;
  window.scrollTo(0, 0);
}

const LOGO_EXT = { centurylink: 'svg', frontier: 'svg' };
const logoExt = id => LOGO_EXT[id] || 'png';

const QUESTIONS = [
  { key: 'isp', q: "Who's your internet provider?",
    opts: () => isps.map(i => ({ v: i.id, t: i.name, logo: i.id,
      s: i.connection === 'fiber' ? 'Fiber' : i.connection === 'dsl' ? 'DSL' : 'Cable' })) },
  { key: 'speed_tier', q: "How fast is your internet?",
    opts: () => [
      { v: 'under100', t: 'Under 100 Mbps — Basic', s: 'Browsing, email, one person streaming' },
      { v: '100-300', t: '100–300 Mbps — Standard (most common)', s: 'HD streaming on a couple of TVs' },
      { v: '300-600', t: '300–600 Mbps — Fast', s: '4K streaming, gaming, working from home' },
      { v: '600-1000', t: '600 Mbps–1 Gbps — Gigabit', s: 'Big household, tons of devices at once' },
      { v: 'unsure', t: 'Not sure / still shopping', s: "We'll go with the most common plan" } ] },
  { key: 'rooms', q: "How many rooms?",
    opts: () => [
      { v: '1-2', t: '1 – 2 rooms' },
      { v: '3-4', t: '3 – 4 rooms' },
      { v: '5-6', t: '5 – 6 rooms' },
      { v: '7plus', t: '7+ rooms' } ] },
  { key: 'floors', q: "How many floors?",
    opts: () => [
      { v: '1', t: '1 floor' },
      { v: '2', t: '2 floors' },
      { v: '3plus', t: '3+ floors' } ] },
  { key: 'yard', q: "Want WiFi out in the yard?",
    opts: () => [
      { v: 'small', t: 'Small yard or patio', s: 'Grilling, porch sitting' },
      { v: 'large', t: 'Large yard', s: 'Kids playing, workshop, pool area' },
      { v: 'no', t: 'No, inside is fine' } ] },
  { key: 'garage', q: "Need WiFi in the garage?",
    opts: () => [
      { v: 'no', t: 'No' },
      { v: 'yes', t: 'Yes', s: 'Smart garage door, workshop, EV charger' } ] },
  { key: 'family_size', q: "How many people live there?",
    opts: () => [
      { v: '1', t: 'Just me' },
      { v: '2', t: '2 people' },
      { v: '3', t: '3 people' },
      { v: '4', t: '4 people' },
      { v: '5plus', t: '5+ people' } ] },
  { key: 'tvs', q: "How many TVs connect to WiFi?",
    opts: () => [
      { v: '1', t: '1 TV' },
      { v: '2', t: '2 TVs' },
      { v: '3', t: '3 TVs' },
      { v: '4plus', t: '4+ TVs' },
      { v: '0', t: 'None' } ] },
  { key: 'smart_home', q: "Smart home gadgets?",
    opts: () => [
      { v: 'some', t: 'A few', s: 'Robot vacuum, smart speaker, doorbell' },
      { v: 'lots', t: 'Loaded', s: 'Lights, locks, cameras, the works' },
      { v: 'none', t: 'None', s: 'Just phones, laptops, TVs' } ] },
  { key: 'setup', q: "How do you want your setup?",
    opts: () => [
      { v: 'combo', t: 'All-in-one box', wide: true, s: 'Easiest to set up and manage — one box, one app. Tradeoff: when it\'s time to upgrade, you replace the whole thing.' },
      { v: 'separate', t: 'Separate modem + router', s: 'Most reliable, best performance. A bit more to manage, but you can upgrade each piece on its own.' },
      { v: 'one_piece', t: 'Just one piece', s: 'I only need to replace part of my setup' } ] },
  { key: 'which_piece', when: () => answers.setup === 'one_piece',
    q: "Which piece do you need?",
    opts: () => [
      { v: 'modem_only', t: 'Just a modem', s: 'I already have a router I like' },
      { v: 'router_only', t: 'Just a router', s: 'I already have a modem or gateway' } ] },
];
let step = 0;
function visible() { return QUESTIONS.filter(q => !q.when || q.when()); }
function render() {
  const V = visible();
  if (step > V.length - 1) step = V.length - 1;
  const Q = V[step];
  bar.style.width = ((step + 1) / (V.length + 1) * 100) + '%';
  let h = `<button class="back" onclick="${step === 0 ? 'backToFlowPick()' : 'back()'}">← Back</button>`;
  h += `<div class="quiz-stage" data-tint="${step % 5}">`;
  h += `<p class="q">${Q.q}</p>`;
  h += '<div class="tile-grid">';
  const opts = Q.opts();
  const anyWide = opts.some(o => o.wide);
  opts.forEach((o, i) => {
    const wide = o.wide || (!anyWide && i === opts.length - 1 && opts.length % 2 === 1);
    h += tileHTML({ i, wide, title: o.t, desc: o.s,
      logo: o.logo ? `/assets/logos/${o.logo}.${logoExt(o.logo)}` : null,
      onclick: `pick('${Q.key}','${o.v}')` });
  });
  h += '</div></div>';
  stepsEl.innerHTML = h;
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
}
function pick(k, v) {
  answers[k] = v;
  const V = visible();
  if (step < V.length - 1) { step++; render(); }
  else finish();
}
function back() { if (step > 0) { step--; render(); } }

let allPicks = [], sortMode = 'value', showAll = false, meta = {};

function sortedPicks() {
  const p = [...allPicks];
  if (sortMode === 'cheapest') p.sort((a, b) => a.price - b.price);
  else if (sortMode === 'stability') p.sort((a, b) => (b.stability - a.stability) || (a.price - b.price));
  else p.sort((a, b) => (b.performance / b.price) - (a.performance / a.price));
  return p;
}
function setSort(m) { sortMode = m; showAll = false; renderResults(); }
function setTab(t) { activeTab = t; showAll = false; renderResults(); }
let activeTab = 'modems';

// Fun hand-drawn icons for the results header (Build .39) — same style
// as the home-page piggy bank and gear: chunky navy outlines, soft fills.
function rico(name) {
  const G = 'fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const arts = {
    pig: `<circle cx="24" cy="28" r="12.5" fill="#f8a5c2"/><path d="M14.5 18.5 L12 12 l7 2.5 z" fill="#f8a5c2"/><ellipse cx="24" cy="30" rx="5.4" ry="4.1" fill="#f472b6"/><circle cx="22.2" cy="29.6" r="1" fill="#10304f" stroke="none"/><circle cx="25.8" cy="29.6" r="1" fill="#10304f" stroke="none"/><circle cx="16" cy="23" r="1.7" fill="#10304f" stroke="none"/><circle cx="25" cy="7.5" r="4.2" fill="#fbbf24"/><text x="25" y="10.4" text-anchor="middle" font-size="7.5" font-weight="800" fill="#10304f" stroke="none">$</text>`,
    shield: `<path d="M24 5 l13 4 v10 c0 9.5 -5.5 15.5 -13 19.5 C16.5 34.5 11 28.5 11 19 V9 Z" fill="#00c853" fill-opacity=".28"/><path d="M17.5 23.5 l4.5 4.5 l8.5 -9.5" stroke="#0a8a3a"/>`,
    tag: `<path d="M6 6 h14.5 L35 20.5 a4 4 0 0 1 0 5.7 l-8.8 8.8 a4 4 0 0 1 -5.7 0 L6 20.5 Z" fill="#fbbf24" fill-opacity=".55"/><circle cx="14" cy="14" r="2.6" fill="#ffffff"/>`,
    bookmark: `<path d="M15 4.5 h18 V43 l-9 -6.8 L15 43 Z" fill="#7dd3fc"/>`,
    plug: `<path d="M17.5 5 v9 M30.5 5 v9"/><rect x="11.5" y="14" width="25" height="13.5" rx="4.5" fill="#cbd5e1"/><path d="M24 27.5 v5 a6.5 6.5 0 0 0 6.5 6.5 H35"/>`,
    signal: `<rect x="7" y="31" width="34" height="11" rx="4" fill="#a7f3d0"/><path d="M14.5 31 V21 M33.5 31 V21" /><path d="M17.5 25 a9.5 9.5 0 0 1 13 0 M14.8 20.2 a14.5 14.5 0 0 1 18.4 0" stroke="#e84393"/><circle cx="13.5" cy="36.5" r="1.6" fill="#16a34a" stroke="none"/>`,
    globe: `<circle cx="24" cy="24" r="17" fill="#bae6fd"/><ellipse cx="24" cy="24" rx="8" ry="17"/><path d="M7.8 18.5 h32.4 M7.8 29.5 h32.4"/>`,
    laptop: `<rect x="11" y="12.5" width="26" height="18.5" rx="3" fill="#e0e7ff"/><path d="M5.5 38 h37 l-3.8 -5.5 H9.3 Z" fill="#c7d2fe"/><circle cx="24" cy="21.8" r="2" fill="#0284c7" stroke="none"/>`,
    tv: `<path d="M16.5 14.5 L24 5.5 L31.5 14.5"/><rect x="7.5" y="14.5" width="33" height="22" rx="3.5" fill="#99f6e4"/><path d="M17 42.5 h14 M24 36.5 v6"/><circle cx="35" cy="20" r="1.5" fill="#e84393" stroke="none"/><circle cx="35" cy="26" r="1.5" fill="#f59e0b" stroke="none"/>`,
    search: `<circle cx="20.5" cy="20.5" r="12" fill="#e0f2fe"/><path d="M29 29 L41.5 41.5" stroke-width="5"/>`,
    target: `<circle cx="24" cy="24" r="17" fill="#ffffff"/><circle cx="24" cy="24" r="11" fill="#fda4af"/><circle cx="24" cy="24" r="4.6" fill="#e84393"/>`,
    gamepad: `<rect x="6.5" y="15.5" width="35" height="19.5" rx="9.5" fill="#ddd6fe"/><path d="M16.5 21.5 v7 M13 25 h7"/><circle cx="31.5" cy="22.8" r="1.8" fill="#e84393" stroke="none"/><circle cx="35.2" cy="27.8" r="1.8" fill="#0284c7" stroke="none"/>`,
    chip: `<rect x="15" y="15" width="18" height="18" rx="3.5" fill="#bae6fd"/><path d="M20.5 15 V8.5 M27.5 15 V8.5 M20.5 39.5 V33 M27.5 39.5 V33 M15 20.5 H8.5 M15 27.5 H8.5 M39.5 20.5 H33 M39.5 27.5 H33"/><circle cx="24" cy="24" r="3" fill="#0284c7" stroke="none"/>`,
  };
  return `<svg class="ric" viewBox="0 0 48 48" aria-hidden="true"><g ${G}>${arts[name] || ''}</g></svg>`;
}

function sortButtonsHTML(extra) {
  return `<div class="sortrow bigs">
    <button class="sort bigbtn${sortMode === 'value' ? ' on' : ''}" onclick="setSort('value')">${rico('pig')}Best value</button>
    <button class="sort bigbtn${sortMode === 'stability' ? ' on' : ''}" onclick="setSort('stability')">${rico('shield')}Most reliable</button>
    <button class="sort bigbtn${sortMode === 'cheapest' ? ' on' : ''}" onclick="setSort('cheapest')">${rico('tag')}Cheapest</button>
    <button class="sort bigbtn" data-savedbtn="1" onclick="openMySetup()">${savedBtnHTML()}</button>${extra || ''}
  </div>`;
}
function savedBtnHTML() {
  return `${rico('bookmark')}Saved gear${savedGear.length ? ` (${savedGear.length})` : ''}`;
}

function bestCombo() {
  const ordered = sortedPicks();
  return {
    m: ordered.find(p => p.type === 'modem'),
    rt: ordered.find(p => p.type === 'router' || p.type === 'mesh')
  };
}

function comboCardHTML() {
  const { m, rt } = bestCombo();
  if (!m || !rt) return '';
  const total = m.price + rt.price;
  const saveBit = meta.fee > 0 ? ` <span class="permo">— saves you $${meta.fee * 36 - total} over 3 years</span>` : '';
  const kind = sortMode === 'cheapest' ? 'cheapest' : sortMode === 'stability' ? 'most reliable' : 'highest-value';
  return `<div class="card combo breakout"><span class="rank">⭐ OUR COMBO PICK</span>
    <h3>${m.name} + ${rt.name}</h3>
    <div class="price">$${total}${saveBit}</div>
    <p class="why">Our ${kind} modem paired with our ${kind} router for your home. Buy both, ditch the rental, done.</p></div>`;
}

function tabButtonsHTML(modems, routers) {
  return `
    <button class="sort bigbtn${activeTab === 'modems' ? ' on' : ''}" onclick="setTab('modems')">${rico('plug')}Modems (${modems.length})</button>
    <button class="sort bigbtn${activeTab === 'routers' ? ' on' : ''}" onclick="setTab('routers')">${rico('signal')}Routers (${routers.length})</button>`;
}

function listHTML(picks) {
  const shown = showAll ? picks : picks.slice(0, 6);
  let h = '<div class="picks-grid breakout">';
  shown.forEach((p, i) => { h += cardHTML(p, i, i === 0); });
  h += '</div>';
  if (!showAll && picks.length > 6)
    h += `<button class="more" onclick="showAll=true;renderResults()">Show ${picks.length - 6} more ▼</button>`;
  return h;
}

// -------------------------------------- comparison table (redesign)
// Results as side-by-side product columns (redesign, 2026-10-29):
// column 1 is OUR PICK — the engine's top recommendation in the
// current sort order — then ALSO GREAT, then the cheapest of the
// remaining picks as BUDGET PICK. Picks that don't fit the table
// keep the card grid below it, so nothing the site showed before
// disappears. A list of one keeps the single-card rendering.
function cmpColumns(list) {
  if (!list.length) return [];
  const cols = [{ p: list[0], label: '⭐ OUR PICK', cls: 'ourpick' }];
  if (list[1]) cols.push({ p: list[1], label: 'ALSO GREAT', cls: 'alsogreat' });
  if (list.length > 2) {
    let budget = null;
    list.slice(2).forEach(p => { if (!budget || p.price < budget.price) budget = p; });
    if (budget) cols.push({ p: budget, label: 'BUDGET PICK', cls: 'budget' });
  }
  return cols;
}
function cmpTableHTML(cols, rows, head) {
  // rows: [{label, vals:[html per column]}] — a row renders only when
  // at least one column carries a value for it.
  const headCells = cols.map(c =>
    `<th class="${c.cls}"><span class="cmp-badge ${c.cls}">${c.label}</span><h3>${head.name(c.p)}</h3>${head.sub ? `<div class="cmp-sub">${head.sub(c.p)}</div>` : ''}</th>`).join('');
  let body = '';
  rows.forEach(r => {
    if (!r.vals.some(v => v)) return;
    body += `<tr><th>${r.label}</th>${r.vals.map(v => `<td>${v || '—'}</td>`).join('')}</tr>`;
  });
  return `<div class="cmp-wrap breakout"><table class="cmp"><thead><tr><th class="cmp-lab"></th>${headCells}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function gearCmpRows(cols) {
  const kindOf = p => p.type.includes('mesh') ? 'mesh' : p.type.includes('router') ? 'router' : 'modem';
  const saveLine = p => p.saves_over_life > 0
    ? `saves you $${p.saves_over_life} over ${p.life_years} years`
    : 'WiFi upgrade — no rental fee on your plan';
  return [
    { label: 'Photo', vals: cols.map(c => cardGallery(kindOf(c.p), c.p.images, c.p.name)) },
    { label: 'Price', vals: cols.map(c => `<span class="price">$${c.p.price}</span> <span class="permo">— ${saveLine(c.p)}</span>${c.p.price_source ? `<div class="permo">Price via ${esc(c.p.price_source)}, checked Oct 2026</div>` : ''}`) },
    { label: 'Brand', vals: cols.map(c => c.p.brand ? esc(c.p.brand) : '') },
    { label: 'Rating', vals: cols.map(c => `Performance ${c.p.performance} / 10`) },
    { label: 'Reliability', vals: cols.map(c => `Stability ${c.p.stability} / 10`) },
    { label: 'Wi-Fi', vals: cols.map(c => c.p.wifi ? esc(c.p.wifi) : '') },
    { label: 'DOCSIS', vals: cols.map(c => c.p.docsis || '') },
    { label: 'Top speed', vals: cols.map(c => c.p.max_speed_mbps ? Number(c.p.max_speed_mbps).toLocaleString() + ' Mbps' : '') },
    { label: 'Why it fits', vals: cols.map(c => c.p.why ? `<span class="why">${c.p.why}</span>` : '') },
    { label: '', vals: cols.map(c => `<button class="pairbtn" onclick="openGearPage('${c.p.id}','results')">📄 View its page</button><button class="pairbtn savebtn" data-savegear="${c.p.id}" onclick="toggleSaveGear(this,'${c.p.id}')">${saveBtnHTML(c.p.id)}</button>`) },
  ];
}
function gearResultsHTML(list) {
  if (list.length < 2) return listHTML(list);
  const cols = cmpColumns(list);
  const colIds = new Set(cols.map(c => c.p.id));
  const rest = list.filter(p => !colIds.has(p.id));
  let h = cmpTableHTML(cols, gearCmpRows(cols), {
    name: p => p.name,
    sub: p => '#' + (list.indexOf(p) + 1) + ' ' + p.type.replace('_', ' ').toUpperCase() });
  if (rest.length) {
    h += `<p class="picks-head">More matches</p>`;
    const shown = showAll ? rest : rest.slice(0, 3);
    h += '<div class="picks-grid breakout">';
    shown.forEach(p => { h += cardHTML(p, list.indexOf(p), false); });
    h += '</div>';
    if (!showAll && rest.length > 3)
      h += `<button class="more" onclick="showAll=true;renderResults()">Show ${rest.length - 3} more ▼</button>`;
  }
  return h;
}


// Results redesign helpers (Caleb, 2026-10-16): drawn stand-ins live in the
// photo slot until real maker photos are collected; chips became big rows.
function cardArt(kind) {
  const W = 'viewBox="0 0 100 75" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"';
  const G = 'fill="none" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"';
  const arts = {
    laptop: `<svg ${W}><g ${G}><rect x="24" y="14" width="52" height="36" rx="3.6" stroke="#0284c7"/><path d="M14 58 h72 l-7 -6 H21 Z" stroke="#e84393"/><circle cx="50" cy="32" r="2" fill="#0284c7" stroke="none"/></g></svg>`,
    desktop: `<svg ${W}><g ${G}><rect x="35" y="7" width="30" height="60" rx="4" stroke="#4f46e5"/><circle cx="50" cy="18" r="3.4" stroke="#0891b2"/><path d="M42 30 h16 M42 38 h16 M42 46 h10" stroke="#e84393"/></g></svg>`,
    monitor: `<svg ${W}><g ${G}><rect x="15" y="13" width="70" height="46" rx="4" stroke="#0284c7"/><path d="M50 59 v6 M36 67 h28" stroke="#10304f"/><path d="M24 24 l14 10 M42 24 l-6 6" stroke="#f59e0b" stroke-width="2.6"/></g></svg>`,
    dock: `<svg ${W}><g ${G}><rect x="17" y="42" width="66" height="17" rx="5" stroke="#7c3aed"/><path d="M31 42 v-8 M69 42 v-8 M24 22 q6 -6 12 0 M64 22 q6 -6 12 0" stroke="#7c3aed"/><circle cx="74" cy="50.5" r="2" fill="#e84393" stroke="none"/></g></svg>`,
    modem: `<svg ${W}><g ${G}><rect x="19" y="33" width="62" height="25" rx="5" stroke="#10304f"/><circle cx="30" cy="45.5" r="2.2" fill="#16a34a" stroke="none"/><circle cx="41" cy="45.5" r="2.2" fill="#f59e0b" stroke="none"/><path d="M58 45.5 h14 M64 26 a10 10 0 0 1 8 5" stroke="#0284c7"/></g></svg>`,
    router: `<svg ${W}><g ${G}><rect x="17" y="41" width="66" height="19" rx="5" stroke="#10304f"/><path d="M28 41 V22 M50 41 V16 M72 41 V22" stroke="#10304f"/><path d="M40 26 a14 14 0 0 1 20 0 M35 19 a22 22 0 0 1 30 0" stroke="#e84393"/><circle cx="28" cy="50.5" r="2" fill="#16a34a" stroke="none"/></g></svg>`,
    mesh: `<svg ${W}><g ${G}><rect x="14" y="26" width="24" height="24" rx="6" stroke="#0d9488"/><rect x="62" y="26" width="24" height="24" rx="6" stroke="#7c3aed"/><path d="M42 38 h16" stroke="#64748b" stroke-dasharray="1.5 5"/><circle cx="26" cy="38" r="2" fill="#0d9488" stroke="none"/><circle cx="74" cy="38" r="2" fill="#7c3aed" stroke="none"/></g></svg>`
  };
  return `<div class="pimg">${arts[kind] || arts.router}</div>`;
}
// Photo gallery (Caleb, 2026-10-16): when an item has collected photos,
// the slot rotates through them like a store gallery; until then the drawn
// stand-in holds the slot.
function cardGallery(kind, images, name) {
  if (!images || !images.length)
    return cardArt(kind) + `<p class="nophoto">📷 Sorry — we don't have a photo of this device yet. We only show photos we've verified are really this model, so until one checks out, our drawing stands in.</p>`;
  const enc = encodeURIComponent(JSON.stringify(images));
  const nav = images.length > 1 ? `<button class="galnav prev" onclick="galCycle(this,-1)" aria-label="Previous photo">‹</button><button class="galnav next" onclick="galCycle(this,1)" aria-label="Next photo">›</button><span class="galcount">1 / ${images.length}</span>` : '';
  return `<div class="pimg gal" data-imgs="${enc}" data-idx="0"><img src="${images[0]}" alt="${esc(name || 'Product photo')}" loading="lazy" onerror="galFallback(this,'${kind}')">${nav}</div>`;
}
function galFallback(img, kind) {
  const box = img.closest('.pimg');
  if (box) box.outerHTML = cardArt(kind);
}
function galCycle(btn, d) {
  const box = btn.closest('.pimg');
  const imgs = JSON.parse(decodeURIComponent(box.dataset.imgs));
  let i = (parseInt(box.dataset.idx || '0', 10) + d + imgs.length) % imgs.length;
  box.dataset.idx = i;
  box.querySelector('img').src = imgs[i];
  const c = box.querySelector('.galcount');
  if (c) c.textContent = (i + 1) + ' / ' + imgs.length;
}
function factRowsHTML(chips) {
  if (!chips || !chips.length) return '';
  const rows = chips.map(c => {
    const parts = String(c).split(' · ');
    if (parts.length > 1)
      return `<div class="factrow"><span class="fl">${parts[0]}</span><span class="fv">${parts.slice(1).join(' · ')}</span></div>`;
    return `<div class="factrow"><span class="fv left">${c}</span></div>`;
  }).join('');
  return `<div class="factrows">${rows}</div>`;
}

// ------------------------------------------------------------ saved gear
// A lightweight save list for individual gear picks (Build .37), kept in
// localStorage like the pairing setups: stable ids only, names/prices
// re-read from the catalog at display time in My Setup.
const SAVED_GEAR_KEY = 'bytematch.saved.v1';
function loadSavedGear() {
  try {
    const j = JSON.parse(localStorage.getItem(SAVED_GEAR_KEY) || '[]');
    return Array.isArray(j) ? j.filter(x => typeof x === 'string') : [];
  } catch (e) { return []; }
}
let savedGear = loadSavedGear();
function persistSavedGear() {
  try { localStorage.setItem(SAVED_GEAR_KEY, JSON.stringify(savedGear)); } catch (e) {}
}
function saveBtnLabel(id) {
  return savedGear.includes(id) ? '✓ Saved — tap to remove' : 'Save this one';
}
function saveBtnHTML(id) {
  return savedGear.includes(id) ? saveBtnLabel(id) : `${rico('bookmark')}Save this one`;
}
function toggleSaveGear(btn, id) {
  const i = savedGear.indexOf(id);
  if (i >= 0) savedGear.splice(i, 1); else savedGear.push(id);
  persistSavedGear();
  document.querySelectorAll(`[data-savegear="${id}"]`).forEach(b => {
    b.innerHTML = saveBtnHTML(id);
  });
  document.querySelectorAll('[data-savedbtn]').forEach(b => {
    b.innerHTML = savedBtnHTML();
  });
  if (typeof updateSetupBtn === 'function') updateSetupBtn();
}

function cardHTML(p, i, isHero) {
  const saveLine = p.saves_over_life > 0
    ? `saves you $${p.saves_over_life} over ${p.life_years} years`
    : `WiFi upgrade — no rental fee on your plan`;
  const kind = p.type.includes('mesh') ? 'mesh' : p.type.includes('router') ? 'router' : 'modem';
  const chips = [];
  if (p.docsis) chips.push('DOCSIS · ' + p.docsis);
  if (p.wifi) chips.push('Wi-Fi · ' + esc(p.wifi));
  if (p.max_speed_mbps) chips.push('Top speed · ' + Number(p.max_speed_mbps).toLocaleString() + ' Mbps');
  return `<div class="card${isHero ? ' hero' : ''}"><span class="rank">#${i + 1} ${p.type.replace('_', ' ').toUpperCase()}</span>
    ${cardGallery(kind, p.images, p.name)}
    <h3>${p.name}</h3>
    <div class="price">$${p.price} <span class="permo">— ${saveLine}</span></div>
    ${p.price_source ? `<p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Price via ${esc(p.price_source)}, checked Oct 2026</p>` : ''}
    <p class="why">${p.why}</p>
    ${p.blurb ? `<p class="blurb">${p.blurb}</p>` : ''}
    ${factRowsHTML(chips)}
    <button class="pairbtn" onclick="openGearPage('${p.id}','results')">📄 View its page</button>
    <button class="pairbtn savebtn" data-savegear="${p.id}" onclick="toggleSaveGear(this,'${p.id}')">${saveBtnHTML(p.id)}</button></div>`;
}

// ------------------------------------------------------------ gear pages
// Every networking catalog model has a page (Build .36), same treatment
// as the PCs: gallery, the maker's specs as fact rows, an honest price
// block, and what the ISPs charge to rent theirs instead.
let gearBackTo = 'results';
async function openGearPage(id, backTo) {
  gearBackTo = backTo || 'results';
  hideAllSections();
  const el = document.getElementById('gear-page');
  el.style.display = 'block';
  el.innerHTML = `<button class="back" onclick="closeGearPage()">← Back</button><p class="sub">Loading…</p>`;
  window.scrollTo(0, 0);
  let g = null;
  try {
    const r = await fetch('/api/gear/' + encodeURIComponent(id));
    if (r.ok) g = await r.json();
  } catch (e) {}
  if (!g) {
    el.innerHTML = `<button class="back" onclick="closeGearPage()">← Back</button>
      <div class="note">That model isn't in the catalog anymore.</div>`;
    return;
  }
  el.innerHTML = gearPageHTML(g);
  window.scrollTo(0, 0);
}
function closeGearPage() {
  hideAllSections();
  const target = gearBackTo === 'lookup' ? 'model-lookup'
    : gearBackTo === 'setup' ? 'setup' : gearBackTo === 'home' ? 'home' : 'results';
  document.getElementById(target).style.display = 'block';
  window.scrollTo(0, 0);
}
function gearPageHTML(g) {
  const kind = g.type.includes('mesh') ? 'mesh' : g.type.includes('router') ? 'router' : 'modem';
  const facts = [];
  facts.push('Type · ' + g.type_label);
  if (g.docsis) facts.push('DOCSIS · ' + g.docsis);
  if (g.wifi) facts.push('Wi-Fi · ' + esc(g.wifi));
  if (g.max_speed_mbps) facts.push('Top speed · ' + Number(g.max_speed_mbps).toLocaleString() + ' Mbps');
  facts.push('Performance · ' + g.performance + ' / 10');
  facts.push('Stability · ' + g.stability + ' / 10');
  let priceBlock;
  if (g.price != null) {
    priceBlock = `<div class="price">$${Number(g.price).toLocaleString()}</div>
      ${g.price_source ? `<p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Price via ${esc(g.price_source)}, checked ${esc(g.price_checked || 'Oct 2026')}</p>` : ''}`;
  } else {
    priceBlock = `<div class="note">No direct-store price yet — we only show prices we've verified at the store, so this one's page carries its specs until a price checks out.</div>`;
  }
  const ispRows = (g.compatible_isps || []).map(i => {
    if (g.price != null && i.rental_fee_monthly > 0 && (g.type === 'modem' || g.type === 'combo' || g.type === 'dsl_modem')) {
      const mo = Math.max(1, Math.ceil(g.price / i.rental_fee_monthly));
      return `${esc(i.name)} · rents theirs for $${i.rental_fee_monthly}/mo — this pays for itself in ~${mo} months`;
    }
    return `${esc(i.name)} · works on this provider`;
  });
  const buyBtn = (g.price != null && g.price_url)
    ? `<div class="buylinks"><a class="buybtn" href="${esc(g.price_url)}" target="_blank" rel="noopener">🛒 See it at ${esc(g.price_source || 'the store')}</a></div>` : '';
  const makerBtn = g.source_url
    ? `<p style="margin:10px 0 0"><a href="${esc(g.source_url)}" target="_blank" rel="noopener">Manufacturer's page ↗</a></p>` : '';
  return `<button class="back" onclick="closeGearPage()">← Back</button>
    <div class="card hero"><span class="rank">${esc(g.type_label).toUpperCase()}</span>
    ${cardGallery(kind, g.images, g.name)}
    <h3>${esc(g.name)}</h3>
    ${priceBlock}
    ${g.blurb ? `<p class="blurb">${esc(g.blurb)}</p>` : ''}
    ${factRowsHTML(facts)}
    ${ispRows.length ? `<p class="why" style="margin-top:12px">Works with:</p>${factRowsHTML(ispRows)}` : ''}
    ${buyBtn}${makerBtn}
    <button class="pairbtn savebtn" data-savegear="${g.id}" onclick="toggleSaveGear(this,'${g.id}')">${saveBtnHTML(g.id)}</button></div>`;
}

function renderResults() {
  const r = document.getElementById('results');
  let h = `<h1>Your top <span class="accent">picks</span></h1>
           <p class="sub">${meta.isp} · ${meta.conn} · ~${meta.devices} devices</p>`;
  if (meta.setup === 'separate') {
    const modems = sortedPicks().filter(p => p.type === 'modem');
    const routers = sortedPicks().filter(p => p.type === 'router' || p.type === 'mesh');
    h += sortButtonsHTML(tabButtonsHTML(modems, routers));
    h += comboCardHTML();
    h += gearResultsHTML(activeTab === 'modems' ? modems : routers);
  } else {
    h += sortButtonsHTML();
    h += gearResultsHTML(sortedPicks());
  }
  meta.notes.forEach(n => { h += `<div class="note">${n}</div>`; });
  h += `<button class="restart" style="background:#1e293b;color:#cbd5e1;border:2px solid #334155" onclick="location.reload()">↺ Start over</button>`;
  r.innerHTML = h;
  window.scrollTo(0, 0);
}

function backHome() {
  setPageTheme('everyday');
  hideAllSections();
  document.getElementById('home').style.display = 'block';
  window.scrollTo(0, 0);
}
function startBuy() {
  if (typeof setScene === 'function') setScene('');
  setPageTheme('store');
  document.getElementById('home').style.display = 'none';
  document.getElementById('flow-pick').style.display = 'none';
  document.getElementById('quiz').style.display = 'block';
  step = 0;
  render();
}
async function finish() {
  document.getElementById('quiz').style.display = 'none';
  const r = document.getElementById('results');
  r.style.display = 'block';
  r.innerHTML = `<div class="loading"><span class="dots">Finding your gear</span></div>`;
  const payload = { ...answers };
  if (payload.setup === 'one_piece') payload.setup = payload.which_piece || 'router_only';
  delete payload.which_piece;
  const res = await fetch('/api/recommend', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(x => x.json());

  allPicks = res.recommendations;
  meta = { isp: res.isp, conn: res.connection.toUpperCase(), devices: res.estimated_devices,
           headline: res.savings.headline, notes: res.notes.filter(n => n),
           fee: Math.round(res.savings.yearly_rental / 12), setup: payload.setup,
           isp_id: payload.isp };
  sortMode = 'value'; showAll = false; activeTab = 'modems';
  renderResults();
}

// Page themes (Caleb, 2026-10-16): results screens dress for the shopping
// mission — gaming picks get the gaming room, work picks the office, and so
// on. Dressing only (CSS variables on <body>); Start over reloads to default.
function themeForUse(use, kid) {
  if (kid) return 'family';
  return { gaming: 'gaming', work: 'office', creative: 'creator', school: 'family' }[use] || 'everyday';
}
function setPageTheme(name) {
  if (name && name !== 'everyday') document.body.dataset.theme = name;
  else delete document.body.dataset.theme;
}

// ------------------------------------------ Know your model? lookup
// Type a name — or the model number off the box or sticker — and jump
// straight to that model's card.
let modelMatches = [], modelTimer = null;
function startModelLookup() {
  hideAllSections();
  const el = document.getElementById('model-lookup');
  el.style.display = 'block';
  el.innerHTML = `<button class="back" onclick="backToFlowPick()">← Back</button>
    <p class="q">Know your model?</p>
    <p class="sub">Type the name — or the model number off the box or sticker — and we'll pull it right up.</p>
    <input class="minput" id="mq" type="text" placeholder="e.g. Katana, CX34, Inspiron…" autocomplete="off" oninput="modelType(this.value)">
    <div id="mresults"></div>`;
  window.scrollTo(0, 0);
  const inp = document.getElementById('mq');
  if (inp && inp.focus) inp.focus();
}
function modelType(v) {
  clearTimeout(modelTimer);
  modelTimer = setTimeout(() => modelSearch(v), 180);
}
async function modelSearch(v) {
  const box = document.getElementById('mresults');
  const q = (v || '').trim();
  if (q.length < 2) { box.innerHTML = ''; return; }
  const d = await fetch('/api/laptop-search?q=' + encodeURIComponent(q)).then(x => x.json());
  modelMatches = d.matches || [];
  if (!modelMatches.length) {
    box.innerHTML = `<div class="note">We don't have that model in our catalog yet — we're adding gear and computers as we research them, and the quiz can still get you where you're going.</div>
      <button class="opt" onclick="startLaptopBuy()">💻 Take the buying quiz instead</button>`;
    return;
  }
  box.innerHTML = modelMatches.map((m, i) =>
    `<button class="opt" onclick="pickModel(${i})">${esc(m.name)}<small>${m.kind === 'gear'
      ? `${esc(m.brand || '')} · ${esc(m.type_label)} · ${m.price != null ? '$' + Number(m.price).toLocaleString() : 'specs page — no verified price yet'}`
      : m.type === 'desktop'
      ? `${esc(m.brand)} · Desktop · ${esc(m.form_factor_label)} · ${esc(m.platform)} · from $${m.price.toLocaleString()}`
      : `${esc(m.brand)} · ${esc(m.platform)} · from $${m.price.toLocaleString()}`}</small></button>`).join('');
}
async function pickModel(i) {
  const m = modelMatches[i];
  if (!m) return;
  if (m.kind === 'gear') { openGearPage(m.id, 'lookup'); return; }
  if (m.type === 'desktop') { renderDesktopModelCard(m); return; }
  renderModelCard(m);
}
function renderModelCard(m) {
  setPageTheme('laptop');
  hideAllSections();
  const r = document.getElementById('results');
  r.style.display = 'block';
  laptopRes = { recommendations: [m], notes: [], kid: false,
                query: { use: 'everyday', os: 'any', screen: 'any',
                         budget: 'any', snapdragon: 'unsure', usage: 'light' } };
  ltwoInOne = false; lbattery = false; lshowAll = false;
  r.innerHTML = `<button class="back" onclick="startModelLookup()">← Search again</button>
    <h1>Your <span class="accent">model</span></h1>
    ${laptopCardHTML(m, 0, true, '🔎 YOUR MODEL')}
    <button class="discbtn" onclick="openDisclaimers()">Disclaimers</button>
    <button class="opt" onclick="startLaptopBuy()">💻 Not the one? Take the laptop quiz<small>Answer a few questions and we'll match you</small></button>
    <button class="restart" style="background:#1e293b;color:#cbd5e1;border:2px solid #334155" onclick="location.reload()">↺ Start over</button>`;
  window.scrollTo(0, 0);
}

// ------------------------------------------------------ home showcase
// Featured-picks carousel (redesign, 2026-10-29): real catalog items,
// gathered through the same model search the site already exposes.
// The first item found on each shelf — gaming laptop, gaming desktop,
// everyday laptop, router, mesh, modem — becomes a slide; any shelf
// the search can't fill simply doesn't appear.
document.querySelectorAll('[data-navicon]').forEach(el => { el.innerHTML = rico(el.dataset.navicon); });
const SHOWCASE_QUERIES = ['asus', 'lenovo', 'hp', 'apple', 'netgear', 'tp-link', 'motorola', 'rog', 'legion'];
let showSlides = [], showIdx = 0, showTimer = null;
function showLabelFor(m) {
  if (m.kind === 'gear') return 'FEATURED ' + (m.type_label || 'GEAR').toUpperCase();
  if (m.type === 'laptop') return 'FEATURED LAPTOP — ' + (m.laptop_category || 'EVERYDAY').toUpperCase();
  return 'FEATURED DESKTOP — ' + (m.desktop_category || 'EVERYDAY').toUpperCase();
}
function showArtNode(kind) {
  const t = document.createElement('template');
  t.innerHTML = cardArt(kind).trim();
  return t.content.firstChild;
}
function showSlideHTML(s, i) {
  const m = s.m;
  const kind = m.kind === 'gear'
    ? (m.type.includes('mesh') ? 'mesh' : m.type.includes('router') ? 'router' : 'modem')
    : m.type;
  const img = (m.images && m.images.length)
    ? `<img src="${m.images[0]}" alt="" loading="lazy" onerror="this.replaceWith(showArtNode('${kind}'))">`
    : cardArt(kind);
  const desc = m.kind === 'gear' ? (m.blurb || '') : (m.summary || '');
  const price = m.price != null
    ? (m.kind === 'gear' ? `$${Number(m.price).toLocaleString()}` : `from $${Number(m.price).toLocaleString()}`)
    : 'See its page for the specs';
  return `<button class="show-slide" onclick="showOpen(${i})"><span class="show-img">${img}</span><span class="show-txt"><span class="show-cat">${s.label}</span><span class="show-name">${esc(m.name)}</span><span class="show-desc">${esc(desc)}</span><span class="show-price">${price}</span></span></button>`;
}
function showGo(i) {
  if (!showSlides.length) return;
  showIdx = (i + showSlides.length) % showSlides.length;
  const track = document.querySelector('.show-track');
  if (track) track.style.transform = `translateX(-${showIdx * 100}%)`;
  document.querySelectorAll('.show-dot').forEach((d, j) => d.classList.toggle('on', j === showIdx));
  showAuto();
}
function showAuto() {
  if (showTimer) clearInterval(showTimer);
  if (showSlides.length < 2) return;
  showTimer = setInterval(() => {
    const home = document.getElementById('home');
    if (!document.hidden && home && home.style.display !== 'none') showGo(showIdx + 1);
  }, 6000);
}
function showOpen(i) {
  const s = showSlides[i];
  if (!s) return;
  const m = s.m;
  if (m.kind === 'gear') { openGearPage(m.id, 'home'); return; }
  if (m.type === 'desktop') { renderDesktopModelCard(m); return; }
  renderModelCard(m);
}
async function loadShowcase() {
  const box = document.getElementById('showcase');
  if (!box) return;
  const pool = [], seen = new Set();
  try {
    const results = await Promise.all(SHOWCASE_QUERIES.map(q =>
      fetch('/api/laptop-search?q=' + encodeURIComponent(q)).then(x => x.json()).catch(() => ({ matches: [] }))));
    results.forEach(d => (d.matches || []).forEach(m => {
      const key = (m.kind === 'gear' ? 'g:' : m.type + ':') + m.id;
      if (!seen.has(key)) { seen.add(key); pool.push(m); }
    }));
  } catch (e) { return; }
  const take = (fn, label) => {
    const m = pool.find(x => !showSlides.some(s => s.m === x) && fn(x));
    if (m) showSlides.push({ m, label });
  };
  take(m => m.type === 'laptop' && m.laptop_category === 'gaming', 'BEST LAPTOP — GAMING');
  take(m => m.type === 'desktop' && m.desktop_category === 'gaming', 'BEST DESKTOP — GAMING');
  take(m => m.type === 'laptop' && (m.laptop_category === 'everyday' || m.laptop_category === 'ultraportable'), 'BEST LAPTOP — EVERYDAY');
  take(m => m.kind === 'gear' && m.type === 'router', 'BEST ROUTER');
  take(m => m.kind === 'gear' && m.type === 'mesh', 'BEST MESH WI-FI');
  take(m => m.kind === 'gear' && (m.type === 'modem' || m.type === 'combo'), 'BEST MODEM');
  pool.forEach(m => {
    if (showSlides.length < 6 && !showSlides.some(s => s.m === m))
      showSlides.push({ m, label: showLabelFor(m) });
  });
  if (!showSlides.length) return;
  box.innerHTML = `<p class="showcase-head">Featured picks from the catalog</p>
    <div class="show-viewport"><div class="show-track">${showSlides.map((s, i) => showSlideHTML(s, i)).join('')}</div></div>
    ${showSlides.length > 1 ? `<button class="show-arrow prev" onclick="showGo(showIdx-1)" aria-label="Previous featured pick">‹</button><button class="show-arrow next" onclick="showGo(showIdx+1)" aria-label="Next featured pick">›</button>
    <div class="show-dots">${showSlides.map((s, i) => `<button class="show-dot${i === 0 ? ' on' : ''}" onclick="showGo(${i})" aria-label="Featured pick ${i + 1}"></button>`).join('')}</div>` : ''}`;
  box.style.display = 'block';
  showGo(0);
}
loadShowcase();
