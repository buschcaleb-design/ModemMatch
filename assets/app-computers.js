// ---------------------------------------------------------------- laptops
const lanswers = {};
let lstep = 0;
const BRAND_OPTS = [
  { v: 'Apple', t: 'Apple' }, { v: 'Samsung', t: 'Samsung' },
  { v: 'Google', t: 'Google' }, { v: 'LG', t: 'LG' },
  { v: 'Sony', t: 'Sony' }, { v: 'Motorola', t: 'Motorola' },
  { v: 'Garmin', t: 'Garmin' }, { v: 'Other', t: 'Other brand' },
  { v: '', t: "Don't have one" } ];
const LAPTOP_QUESTIONS = [
  { key: 'use', q: "What's the laptop mainly for?",
    opts: () => [
      { v: 'school', t: '🎒 School', s: 'Classes, homework, school accounts' },
      { v: 'everyday', t: '🏠 Everyday home use', s: 'Web, email, streaming, photos' },
      { v: 'work', t: '💼 Work', s: 'Documents, calls, spreadsheets, business apps' },
      { v: 'gaming', t: '🎮 Gaming', s: 'Playing games is the point' },
      { v: 'creative', t: '🎨 Creative work', s: 'Photo/video editing, design, music' } ] },
  { key: 'os', q: "Which operating system?",
    opts: () => [
      { v: 'windows', t: 'Windows', s: 'The most common — runs the most programs' },
      { v: 'mac', t: 'Mac (macOS)', s: 'Apple laptops' },
      { v: 'chromebook', t: 'Chromebook (ChromeOS)', s: 'Simple, web-based, great for school' },
      { v: 'any', t: 'No preference', s: 'Show me the best fit, any system' } ] },
  { key: 'form', q: "Tower (desktop) or laptop?",
    opts: () => [
      { v: 'laptop', t: '💻 Laptop', s: 'Portable — take it anywhere' },
      { v: 'tower', t: '🖥️ Tower (desktop)', s: 'Desk-bound — most power per dollar' } ] },
  { key: 'screen', q: "How big a screen?",
    opts: () => [
      { v: '13-14', t: '13–14 inch', s: 'Carry-friendly' },
      { v: '15-16', t: '15–16 inch', s: 'Most people pick this' },
      { v: '17plus', t: '17 inch or bigger', s: 'Desk-bound, big canvas' },
      { v: 'any', t: 'No preference' } ] },
  { key: 'ext_screens', q: "Will you plug in extra screens?",
    opts: () => [
      { v: '0', t: 'Just the laptop screen', s: 'No extra monitors' },
      { v: '1', t: '+1 extra screen', s: 'One monitor plugged in at a desk' },
      { v: '2', t: '+2 or more extra screens', s: 'A full desk setup' } ] },
  { key: 'ext_resolution', when: () => lanswers.ext_screens && lanswers.ext_screens !== '0',
    q: "What resolution are the extra screens?",
    opts: () => [
      { v: '1080p', t: '1080p — Full HD', s: 'Sharp for work and most games' },
      { v: '1440p', t: '1440p — QHD', s: 'Crisper; the gaming sweet spot' },
      { v: '4k', t: '4K — Ultra HD', s: 'Sharpest picture; needs a stronger graphics card' },
      { v: 'unsure', t: 'Not sure', s: "We'll assume standard screens — no pressure either way" } ] },
  { key: 'budget', q: "What's the budget?",
    opts: () => [
      { v: 'under500', t: 'Under $500' },
      { v: '500-900', t: '$500 – $900' },
      { v: '900-1400', t: '$900 – $1,400' },
      { v: '1400plus', t: 'Over $1,400' },
      { v: 'any', t: 'No limit / not sure', s: "We'll rank by fit" } ] },
  { key: 'snapdragon', when: () => lanswers.os !== 'mac' && lanswers.os !== 'chromebook',
    q: "Do you need to run specific Windows programs, older printers or accessories, or competitive online games?",
    opts: () => [
      { v: 'no', t: 'No', s: 'Browser, Office, Zoom, streaming — mainstream stuff. (This unlocks Snapdragon laptops: the battery-life champions.)' },
      { v: 'yes', t: 'Yes, I have must-run stuff', s: "We'll stick to Intel/AMD machines that run everything" },
      { v: 'unsure', t: 'Not sure', s: "We'll play it safe — same as yes" } ] },
  { key: 'usage', q: "How will it mostly be used, day to day?",
    opts: () => [
      { v: 'light', t: 'Mostly browser and documents', s: 'Web apps, email, a few tabs' },
      { v: 'heavy', t: 'Big apps and lots of files', s: 'Huge photo libraries, video, many programs at once' } ] },
  { key: 'kid', q: "Is this laptop for a kid?",
    opts: () => [
      { v: 'no', t: 'No' },
      { v: 'yes', t: 'Yes', s: "We'll include the parental-control setup path with your picks" } ] },
  { key: 'eco_wants', q: "Do you want your devices to work together?",
    opts: () => [
      { v: 'yes', t: 'Yes', s: 'Phone, TV, smartwatch, and laptop playing nice together' },
      { v: 'no', t: 'No / don\'t care', s: 'Just the best laptop for the job' } ] },
  { key: 'eco_phone', when: () => lanswers.eco_wants === 'yes',
    q: "What brand is your phone?", opts: () => BRAND_OPTS },
  { key: 'eco_tv', when: () => lanswers.eco_wants === 'yes',
    q: "What brand is your TV?", opts: () => BRAND_OPTS },
  { key: 'eco_watch', when: () => lanswers.eco_wants === 'yes',
    q: "What brand is your smartwatch?", opts: () => BRAND_OPTS },
];
function lvisible() { return LAPTOP_QUESTIONS.filter(q => !q.when || q.when()); }
function startLaptopBuy() {
  ['home', 'results', 'guide', 'isp-pick', 'flow-pick', 'pc-guide'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('quiz').style.display = 'block';
  Object.keys(lanswers).forEach(k => delete lanswers[k]);
  lstep = 0;
  lrender();
  window.scrollTo(0, 0);
}
function lrender() {
  const V = lvisible();
  if (lstep > V.length - 1) lstep = V.length - 1;
  const Q = V[lstep];
  bar.style.width = ((lstep + 1) / (V.length + 1) * 100) + '%';
  let h = `<button class="back" onclick="${lstep === 0 ? 'backToFlowPick()' : 'lback()'}">← Back</button>`;
  h += `<p class="q">${Q.q}</p>`;
  Q.opts().forEach(o => {
    h += `<button class="opt" onclick="lpick('${Q.key}','${o.v}')">${o.t}${o.s ? `<small>${o.s}</small>` : ''}</button>`;
  });
  stepsEl.innerHTML = h;
}
function lpick(k, v) {
  lanswers[k] = v;
  if (k === 'form' && v === 'tower') { startDesktopQuizFromForm(); return; }
  const V = lvisible();
  if (lstep < V.length - 1) { lstep++; lrender(); }
  else finishLaptops();
}
function lback() { if (lstep > 0) { lstep--; lrender(); } }

let laptopRes = null, lshowAll = false, ltwoInOne = false, lbattery = false;
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function currentLaptopPicks() {
  let p = [...laptopRes.recommendations];
  if (lbattery) p.sort((a, b) => (b.snapdragon - a.snapdragon) || (b.score - a.score));
  if (ltwoInOne) p = p.filter(x => x.laptop_category === '2-in-1');
  return p;
}
function archBadge(p) {
  if (p.snapdragon && p.architecture === 'both') return ['Intel or Snapdragon versions', ''];
  if (p.snapdragon) return ['Snapdragon', ''];
  if (p.platform === 'macOS') return ['Apple silicon', ''];
  if (p.platform === 'ChromeOS') return ['Chromebook', 'x86'];
  return ['Intel / AMD', 'x86'];
}
function laptopWhyHTML(p) {
  const bullets = Array.isArray(p.why) ? p.why : [];
  if (!bullets.length) return '';
  return `<details class="setupbox"><summary>💡 Why we picked this laptop</summary>
    <ul class="whylist">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></details>`;
}
async function goLaptopSetup() {
  // Results screen is for deciding; the setup page is for doing. Land in
  // the PC guides browser with the top pick's OS preselected.
  const top = laptopRes && laptopRes.recommendations && laptopRes.recommendations[0];
  guideBrand = (top && top.setup && top.setup.brand_key) || null;
  await startPcGuide();
  if (top && top.setup && top.setup.os_key &&
      pcGuides.setup_guides.os_flows[top.setup.os_key])
    renderPcFormFactor(top.setup.os_key);
}
function fullSpecsHTML(p) {
  // The verbatim maker spec text, kept one tap away now that the
  // card front shows the compact summary chips (Build .14).
  const rows = [];
  [['CPU', p.cpu, p.cpu_short], ['Memory', p.ram_text, p.ram_short],
   ['Storage', p.storage_text, p.storage_short], ['Graphics', p.gpu, p.gpu_short]]
    .forEach(([label, full, short]) => {
      if (full && short && full !== short)
        rows.push(`<li>${label}: ${esc(full)}</li>`);
    });
  if (!rows.length) return '';
  return `<details class="setupbox"><summary>📋 Full specs, as the maker lists them</summary>
    <ul class="whylist">${rows.join('')}</ul></details>`;
}
function laptopCardHTML(p, i, isTop, rankLabel) {
  const [badge, badgeCls] = archBadge(p);
  const chips = [];
  if (p.display_inches) chips.push(`📺 ${p.display_inches}″ screen`);
  if (p.cpu) chips.push('CPU · ' + esc(p.cpu_short || p.cpu));
  if (p.ram_text || p.ram_short) chips.push('Memory · ' + esc(p.ram_short || p.ram_text));
  if (p.storage_text || p.storage_short) chips.push('Storage · ' + esc(p.storage_short || p.storage_text));
  if (p.gpu) chips.push('GPU · ' + esc(p.gpu_short || p.gpu));
  if (p.weight_text) chips.push('⚖️ ' + esc(p.weight_text));
  const maxBit = p.price_max
    ? ` <span class="permo">— up to $${p.price_max.toLocaleString()} fully loaded${p.max_config_note ? ' (' + esc(p.max_config_note) + ')' : ''}</span>` : '';
  return `<div class="card${isTop ? ' combo' : ''}"><span class="rank">${rankLabel || (isTop ? '⭐ OUR TOP LAPTOP PICK' : '#' + (i + 1) + ' LAPTOP')}</span>
    <h3>${esc(p.name)}</h3>
    <div class="price">from $${p.price.toLocaleString()}${maxBit}</div>
    <p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Prices via ${esc(p.price_source || 'manufacturer')}, checked Oct 2026</p>
    <div class="chips"><span class="badge ${badgeCls}">${badge}</span>${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>
    ${p.cpu_check ? `<p class="warnline">⚠️ Sold in Intel <em>and</em> Snapdragon versions — check which CPU the listing you're buying actually has.</p>` : ''}
    ${p.formerly ? `<p class="why">ℹ️ Line renamed in 2025 — this is the new ${esc(p.formerly)}.</p>` : ''}
    <p class="why">${esc(p.summary || (Array.isArray(p.why) ? (p.why[0] || '') : p.why) || '')}</p>
    ${p.ecosystem_note ? `<p class="why">🔗 ${esc(p.ecosystem_note)}</p>` : ''}
    ${laptopWhyHTML(p)}
    ${fullSpecsHTML(p)}
    <button class="pairbtn" onclick="openPairing('laptop','${p.id}')">🔌 Find my screen or dock to pair with it</button>
    <button class="savebtn" onclick="saveSetupFromCard(this,'laptop','${p.id}')">💾 Save this setup</button>
    <div class="buylinks"><button class="buybtn" disabled>🛒 Buy links coming soon</button></div></div>`;
}
function twoInOneUnavailableNote() {
  // Worded from the actual state: if the catalog holds no 2-in-1 at all
  // for this system, the feature simply isn't available there; if it
  // exists but none made these picks, say it's not among these picks.
  const facts = laptopRes.filter_facts || {};
  if (facts.two_in_one_available === false) {
    if (laptopRes.query.os === 'mac')
      return "Touchscreen 2-in-1 isn't available on Mac laptops — Apple doesn't make one. Showing your Mac picks without it.";
    return "Touchscreen 2-in-1 isn't available in this part of our catalog. Showing your picks without it.";
  }
  return "Touchscreen 2-in-1 isn't available among these picks. Showing them without it.";
}
function renderLaptopResults() {
  const r = document.getElementById('results');
  // A filter with no matches steps aside kindly instead of dead-ending:
  // drop it, show the picks, explain in one small note, and let the
  // toggle fall back to off so the screen never claims it's applied.
  let unavailableNote = '';
  if (ltwoInOne && laptopRes.recommendations.length && !currentLaptopPicks().length) {
    ltwoInOne = false;
    unavailableNote = twoInOneUnavailableNote();
  }
  const picks = currentLaptopPicks();
  const q = laptopRes.query;
  setPageTheme(themeForUse(q.use, laptopRes.kid));
  const useLabel = { school: 'School', everyday: 'Everyday use', work: 'Work', gaming: 'Gaming', creative: 'Creative work' }[q.use] || q.use;
  let h = `<h1>Your top <span class="accent">laptop picks</span></h1>
           <p class="sub">${useLabel} · ${q.os === 'any' ? 'Any system' : q.os} · prices shown as a range (starting → fully loaded)</p>`;
  h += `<div class="sortrow">
    <button class="sort${!ltwoInOne && !lbattery ? ' on' : ''}" onclick="ltwoInOne=false;lbattery=false;lshowAll=false;renderLaptopResults()">⭐ Best fit</button>
    <button class="sort${ltwoInOne ? ' on' : ''}" onclick="ltwoInOne=!ltwoInOne;lshowAll=false;renderLaptopResults()">🔄 Touchscreen 2-in-1</button>
    <button class="sort${lbattery ? ' on' : ''}" onclick="lbattery=!lbattery;lshowAll=false;renderLaptopResults()">🔋 Battery priority</button>
  </div>`;
  if (unavailableNote) h += `<div class="note">${esc(unavailableNote)}</div>`;
  if (!picks.length) {
    h += `<div class="note">No laptops matched those answers — a fresh start with a few different answers may turn some up.</div>`;
  } else {
    h += laptopCardHTML(picks[0], 0, true);
    const rest = picks.slice(1);
    if (rest.length) {
      h += `<p class="picks-head">Your other matches</p>`;
      const shown = lshowAll ? rest : rest.slice(0, 4);
      shown.forEach((p, i) => { h += laptopCardHTML(p, i + 1, false); });
      if (!lshowAll && rest.length > 4)
        h += `<button class="more" onclick="lshowAll=true;renderLaptopResults()">Show ${rest.length - 4} more ▼</button>`;
    }
  }
  laptopRes.notes.forEach(n => { h += `<div class="note">${esc(n)}</div>`; });
  h += `<button class="opt setupcta" onclick="goLaptopSetup()">🔧 Set up your new laptop<small>First boot, brand setup tools${laptopRes.kid ? ', and parental controls' : ''} — step by step, on the setup page</small></button>`;
  h += `<button class="discbtn" onclick="openDisclaimers()">Disclaimers</button>`;
  h += `<button class="restart" style="background:#1e293b;color:#cbd5e1;border:2px solid #334155" onclick="location.reload()">↺ Start over</button>`;
  r.innerHTML = h;
  window.scrollTo(0, 0);
}
async function finishLaptops() {
  document.getElementById('quiz').style.display = 'none';
  const r = document.getElementById('results');
  r.style.display = 'block';
  r.innerHTML = `<div class="loading"><span class="dots">Finding your laptops</span></div>`;
  const payload = {
    use: lanswers.use, os: lanswers.os, screen: lanswers.screen,
    budget: lanswers.budget, snapdragon: lanswers.snapdragon || 'unsure',
    usage: lanswers.usage, kid: lanswers.kid,
    ext_screens: lanswers.ext_screens || '0',
    ext_resolution: lanswers.ext_resolution || 'unsure',
    ecosystem: { wants: lanswers.eco_wants === 'yes',
      phone: lanswers.eco_phone || '', tv: lanswers.eco_tv || '',
      watch: lanswers.eco_watch || '' }
  };
  laptopRes = await fetch('/api/recommend-laptops', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(x => x.json());
  lshowAll = false; ltwoInOne = false; lbattery = false;
  renderLaptopResults();
}

// ---------------------------------------------------------------- desktops
// The desktop quiz mirrors the laptop quiz's design — same questions, one
// fork (Caleb's rule): the size question asks CASE SIZE, not screen size.
// Entry is the laptop quiz's form step: picking Tower carries the use/OS
// answers over and continues here.
const danswers = {};
let dstep = 0;
const DESKTOP_QUESTIONS = [
  { key: 'case', q: "How big a case?",
    opts: () => [
      { v: 'mini', t: '📦 Mini PC', s: 'Tiny box — sits on the desk or mounts behind a monitor' },
      { v: 'sff', t: 'Small form factor', s: 'Compact tower — still a real desktop' },
      { v: 'tower', t: 'Tower', s: 'The classic desk tower (mini & mid towers)' },
      { v: 'full', t: 'Full tower', s: 'Big case — maximum room for parts and cooling' },
      { v: 'aio', t: 'All-in-one', s: 'Screen built into the computer — no separate monitor' },
      { v: 'any', t: 'No preference' } ] },
  { key: 'screens', q: "How many screens will you plug in?",
    opts: () => [
      { v: '1', t: '1 screen', s: 'Just one monitor' },
      { v: '2', t: '2 screens', s: 'Side by side — the classic desk setup' },
      { v: '3', t: '3 or more screens', s: 'A full command center' } ] },
  { key: 'resolution', q: "What resolution are the screens?",
    opts: () => [
      { v: '1080p', t: '1080p — Full HD', s: 'Sharp for work and most games' },
      { v: '1440p', t: '1440p — QHD', s: 'Crisper; the gaming sweet spot' },
      { v: '4k', t: '4K — Ultra HD', s: 'Sharpest picture; needs a stronger graphics card' },
      { v: 'unsure', t: 'Not sure', s: "We'll assume standard screens — no pressure either way" } ] },
  { key: 'budget', q: "What's the budget?",
    opts: () => [
      { v: 'under500', t: 'Under $500' },
      { v: '500-900', t: '$500 – $900' },
      { v: '900-1400', t: '$900 – $1,400' },
      { v: '1400plus', t: 'Over $1,400' },
      { v: 'any', t: 'No limit / not sure', s: "We'll rank by fit" } ] },
  { key: 'snapdragon', when: () => danswers.os !== 'mac' && danswers.os !== 'chromebook',
    q: "Do you need to run specific Windows programs, older printers or accessories, or competitive online games?",
    opts: () => [
      { v: 'no', t: 'No', s: 'Browser, Office, Zoom, streaming — mainstream stuff' },
      { v: 'yes', t: 'Yes, I have must-run stuff', s: "Every desktop in our catalog is Intel/AMD — you're covered either way" },
      { v: 'unsure', t: 'Not sure', s: "Same answer — desktops here are all Intel/AMD" } ] },
  { key: 'usage', q: "How will it mostly be used, day to day?",
    opts: () => [
      { v: 'light', t: 'Mostly browser and documents', s: 'Web apps, email, a few tabs' },
      { v: 'heavy', t: 'Big apps and lots of files', s: 'Huge photo libraries, video, many programs at once' } ] },
  { key: 'kid', q: "Is this desktop for a kid?",
    opts: () => [
      { v: 'no', t: 'No' },
      { v: 'yes', t: 'Yes', s: "We'll include the parental-control setup path with your picks" } ] },
  { key: 'eco_wants', q: "Do you want your devices to work together?",
    opts: () => [
      { v: 'yes', t: 'Yes', s: 'Phone, TV, smartwatch, and computer playing nice together' },
      { v: 'no', t: 'No / don\'t care', s: 'Just the best desktop for the job' } ] },
  { key: 'eco_phone', when: () => danswers.eco_wants === 'yes',
    q: "What brand is your phone?", opts: () => BRAND_OPTS },
  { key: 'eco_tv', when: () => danswers.eco_wants === 'yes',
    q: "What brand is your TV?", opts: () => BRAND_OPTS },
  { key: 'eco_watch', when: () => danswers.eco_wants === 'yes',
    q: "What brand is your smartwatch?", opts: () => BRAND_OPTS },
];
function dvisible() { return DESKTOP_QUESTIONS.filter(q => !q.when || q.when()); }
function startDesktopQuizFromForm() {
  danswers.use = lanswers.use;
  danswers.os = lanswers.os;
  dstep = 0;
  drender();
  window.scrollTo(0, 0);
}
function backToFormQuestion() {
  const V = lvisible();
  const i = V.findIndex(q => q.key === 'form');
  if (i >= 0) lstep = i;
  lrender();
}
function drender() {
  const V = dvisible();
  if (dstep > V.length - 1) dstep = V.length - 1;
  const Q = V[dstep];
  bar.style.width = ((dstep + 3) / (V.length + 3) * 100) + '%';
  let h = `<button class="back" onclick="${dstep === 0 ? 'backToFormQuestion()' : 'dback()'}">← Back</button>`;
  h += `<p class="q">${Q.q}</p>`;
  Q.opts().forEach(o => {
    h += `<button class="opt" onclick="dpick('${Q.key}','${o.v}')">${o.t}${o.s ? `<small>${o.s}</small>` : ''}</button>`;
  });
  stepsEl.innerHTML = h;
}
function dpick(k, v) {
  danswers[k] = v;
  const V = dvisible();
  if (dstep < V.length - 1) { dstep++; drender(); }
  else finishDesktops();
}
function dback() { if (dstep > 0) { dstep--; drender(); } }

let desktopRes = null, dshowAll = false;
// Desktop result sort modes (Build .11) — re-sorts only, never filters:
// the same result set, re-ranked client-side from the payload's perf
// signals. 'match' is the quiz's own scored order, untouched.
let dsortMode = 'match';
const DSORT_MODES = {
  match: { label: '🎯 Best match', w: null,
    info: 'Best match: ranked by how well each desktop fits all your answers.' },
  gaming: { label: '🎮 Gaming / performance', w: { gpu: 0.5, cpu: 0.3, ram: 0.2 },
    info: 'Sorted for gaming/performance: the graphics card weighs most, then the processor, then memory.' },
  ai: { label: '🤖 AI', w: { gpu_ai: 0.7, ram: 0.2, cpu: 0.1 },
    info: 'Sorted for AI: the graphics card (and its memory) weighs most, memory next for model headroom — the processor counts for little.' },
  value: { label: '💰 Bang for your buck', w: { gpu: 0.5, cpu: 0.3, ram: 0.2 },
    info: 'Sorted for value: gaming-grade performance per dollar of starting price — a cheaper strong machine beats a pricier one.' },
};
// A machine whose spec fields can't be scored at all sorts by its
// category's neutral position — never top, never dropped.
const DCAT_NEUTRAL = { gaming: 55, workstation: 50, creator: 48, business: 30, everyday: 28 };
function dWeightedScore(p, w) {
  const perf = p.perf || {};
  let num = 0, den = 0;
  for (const k in w) {
    const v = perf[k];
    if (v !== null && v !== undefined) { num += v * w[k]; den += w[k]; }
  }
  if (!den) return DCAT_NEUTRAL[p.desktop_category] ?? 30;
  return num / den;
}
function sortedDesktopPicks() {
  const picks = (desktopRes && desktopRes.recommendations) || [];
  const arr = picks.map((p, i) => [p, i]);
  if (dsortMode !== 'match' && DSORT_MODES[dsortMode]) {
    const w = DSORT_MODES[dsortMode].w;
    arr.sort((a, b) => {
      let sa = dWeightedScore(a[0], w), sb = dWeightedScore(b[0], w);
      if (dsortMode === 'value') { sa /= (a[0].price || 1); sb /= (b[0].price || 1); }
      return (sb - sa) || (a[1] - b[1]);  // ties keep Best-match order
    });
  }
  return arr.map(x => x[0]);
}
function setDSort(m) { dsortMode = m; dshowAll = false; renderDesktopResults(); }
function desktopSortHTML() {
  if (!desktopRes || !desktopRes.recommendations || desktopRes.recommendations.length < 2) return '';
  const btns = Object.keys(DSORT_MODES).map(k =>
    `<button class="sort${dsortMode === k ? ' on' : ''}" onclick="setDSort('${k}')">${DSORT_MODES[k].label}</button>`).join('');
  return `<div class="sortrow wrap">${btns}</div><p class="sortline">${esc(DSORT_MODES[dsortMode].info)}</p>`;
}
function desktopBadge(p) {
  if (p.platform === 'macOS') return ['Apple silicon', ''];
  if (p.platform === 'DGX OS') return ['NVIDIA DGX', ''];
  if (p.platform === 'ChromeOS') return ['Chromebook', 'x86'];
  return ['Intel / AMD', 'x86'];
}
function desktopWhyHTML(p) {
  const bullets = Array.isArray(p.why) ? p.why : [];
  if (!bullets.length) return '';
  return `<details class="setupbox"><summary>💡 Why we picked this desktop</summary>
    <ul class="whylist">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></details>`;
}
async function goDesktopSetup() {
  // Land in the PC guides browser on the Tower path, with the top
  // pick's OS preselected. (A pick with no OS flow of its own — the
  // DGX specialist — lands on the general setup menu instead.)
  const top = sortedDesktopPicks()[0];
  guideBrand = (top && top.setup && top.setup.brand_key) || null;
  await startPcGuide();
  if (top && top.setup && top.setup.os_key &&
      pcGuides.setup_guides.os_flows[top.setup.os_key])
    renderPcTower(top.setup.os_key);
  else
    renderPcMenu();
}
function desktopCardHTML(p, i, isTop, rankLabel) {
  const [badge, badgeCls] = desktopBadge(p);
  const chips = [];
  chips.push(`🖥️ ${esc(p.form_factor_label)}`);
  if (p.display_inches) chips.push(`📺 ${p.display_inches}″ screen built in`);
  if (p.cpu) chips.push('CPU · ' + esc(p.cpu_short || p.cpu));
  if (p.ram_text || p.ram_short) chips.push('Memory · ' + esc(p.ram_short || p.ram_text));
  if (p.storage_text || p.storage_short) chips.push('Storage · ' + esc(p.storage_short || p.storage_text));
  if (p.gpu) chips.push('GPU · ' + esc(p.gpu_short || p.gpu));
  const maxBit = p.price_max
    ? ` <span class="permo">— up to $${p.price_max.toLocaleString()} fully loaded${p.max_config_note ? ' (' + esc(p.max_config_note) + ')' : ''}</span>` : '';
  return `<div class="card${isTop ? ' combo' : ''}"><span class="rank">${rankLabel || (isTop ? '⭐ OUR TOP DESKTOP PICK' : '#' + (i + 1) + ' DESKTOP')}</span>
    <h3>${esc(p.name)}</h3>
    <div class="price">from $${p.price.toLocaleString()}${maxBit}</div>
    <p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Prices via ${esc(p.price_source || 'manufacturer')}, checked Oct 2026</p>
    <div class="chips"><span class="badge ${badgeCls}">${badge}</span>${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>
    ${p.price_note ? `<p class="warnline">⚠️ ${esc(p.price_note)}</p>` : ''}
    ${p.formerly ? `<p class="why">ℹ️ Formerly the ${esc(p.formerly)} — same family, new name.</p>` : ''}
    <p class="why">${esc(p.summary || (Array.isArray(p.why) ? (p.why[0] || '') : p.why) || '')}</p>
    ${p.ecosystem_note ? `<p class="why">🔗 ${esc(p.ecosystem_note)}</p>` : ''}
    ${desktopWhyHTML(p)}
    ${fullSpecsHTML(p)}
    <button class="pairbtn" onclick="openPairing('desktop','${p.id}')">🔌 Find my screen or dock to pair with it</button>
    <button class="savebtn" onclick="saveSetupFromCard(this,'desktop','${p.id}')">💾 Save this setup</button>
    <div class="buylinks"><button class="buybtn" disabled>🛒 Buy links coming soon</button></div></div>`;
}
function renderDesktopResults() {
  const r = document.getElementById('results');
  const picks = sortedDesktopPicks();
  const q = desktopRes.query;
  setPageTheme(themeForUse(q.use, desktopRes.kid));
  const useLabel = { school: 'School', everyday: 'Everyday use', work: 'Work', gaming: 'Gaming', creative: 'Creative work' }[q.use] || q.use;
  const caseLabel = { mini: 'Mini PC', sff: 'Small form factor', tower: 'Tower', full: 'Full tower', aio: 'All-in-one' }[q.case] || 'Any case';
  let h = `<h1>Your top <span class="accent">desktop picks</span></h1>
           <p class="sub">${useLabel} · ${q.os === 'any' ? 'Any system' : q.os} · ${caseLabel} · prices shown as a range (starting → fully loaded)</p>`;
  h += desktopSortHTML();
  if (!picks.length) {
    h += `<div class="note">No desktops matched those answers — a fresh start with a few different answers may turn some up.</div>`;
  } else {
    h += desktopCardHTML(picks[0], 0, true);
    const rest = picks.slice(1);
    if (rest.length) {
      h += `<p class="picks-head">Your other matches</p>`;
      const shown = dshowAll ? rest : rest.slice(0, 4);
      shown.forEach((p, i) => { h += desktopCardHTML(p, i + 1, false); });
      if (!dshowAll && rest.length > 4)
        h += `<button class="more" onclick="dshowAll=true;renderDesktopResults()">Show ${rest.length - 4} more ▼</button>`;
    }
  }
  desktopRes.notes.forEach(n => { h += `<div class="note">${esc(n)}</div>`; });
  h += `<button class="opt setupcta" onclick="goDesktopSetup()">🔧 Set up your new desktop<small>First boot, brand setup tools${desktopRes.kid ? ', and parental controls' : ''} — step by step, on the setup page</small></button>`;
  h += `<button class="discbtn" onclick="openDisclaimers()">Disclaimers</button>`;
  h += `<button class="restart" style="background:#1e293b;color:#cbd5e1;border:2px solid #334155" onclick="location.reload()">↺ Start over</button>`;
  r.innerHTML = h;
  window.scrollTo(0, 0);
}
async function finishDesktops() {
  document.getElementById('quiz').style.display = 'none';
  const r = document.getElementById('results');
  r.style.display = 'block';
  r.innerHTML = `<div class="loading"><span class="dots">Finding your desktops</span></div>`;
  const payload = {
    use: danswers.use, os: danswers.os, case: danswers.case,
    budget: danswers.budget, snapdragon: danswers.snapdragon || 'unsure',
    usage: danswers.usage, kid: danswers.kid,
    screens: danswers.screens || '1', resolution: danswers.resolution || 'unsure',
    ecosystem: { wants: danswers.eco_wants === 'yes',
      phone: danswers.eco_phone || '', tv: danswers.eco_tv || '',
      watch: danswers.eco_watch || '' }
  };
  desktopRes = await fetch('/api/recommend-desktops', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(x => x.json());
  dshowAll = false; dsortMode = 'match';
  renderDesktopResults();
}
function renderDesktopModelCard(m) {
  hideAllSections();
  const r = document.getElementById('results');
  r.style.display = 'block';
  // The setup button reads the top pick out of desktopRes — point it here.
  desktopRes = { recommendations: [m], notes: [], kid: false,
                 query: { use: 'everyday', os: 'any', case: 'any',
                          budget: 'any', snapdragon: 'unsure', usage: 'light' } };
  dshowAll = false;
  r.innerHTML = `<button class="back" onclick="startModelLookup()">← Search again</button>
    <h1>Your <span class="accent">model</span></h1>
    ${desktopCardHTML(m, 0, true, '🔎 YOUR MODEL')}
    <button class="opt setupcta" onclick="goDesktopSetup()">🔧 Set up your new desktop<small>First boot, brand setup tools — step by step, on the setup page</small></button>
    <button class="discbtn" onclick="openDisclaimers()">Disclaimers</button>
    <button class="opt" onclick="startLaptopBuy()">💻 Not the one? Take the buying quiz<small>Answer a few questions and we'll match you</small></button>
    <button class="restart" style="background:#1e293b;color:#cbd5e1;border:2px solid #334155" onclick="location.reload()">↺ Start over</button>`;
  window.scrollTo(0, 0);
}
