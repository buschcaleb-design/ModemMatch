// ------------------------------------------------------------- pairing
// Screens + dock pairing for one picked computer (Build .13): an
// opt-in flow per pick, entered from the card button, with free jumps
// between the Screens and Dock stages. Verdicts come from
// /api/pairing — maker-stated data only, never a guessed count.
let pairData = null, pairType = 'laptop', pairStage = 'screens';
let pairReturn = { section: 'results', y: 0 };
let pairScreens = { count: null, resolution: 'unsure', have: null };
let pairAsked = { count: false, res: false };
let pairTier = null, pairChassis = null;
let pairSizeFilter = 'all', pairQualityFilter = 'all', pairTechFilter = 'all';
let pairQty = {};
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
  s.dock_id = (s.dock_id === dockId) ? null : dockId;
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
  pairType = type;
  const cur = SECTION_IDS.find(s => s !== 'pairing' &&
    document.getElementById(s).style.display !== 'none');
  pairReturn = { section: cur || 'results', y: window.scrollY || 0 };
  pairStage = 'screens'; pairChassis = null;
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
  window.scrollTo(0, pairReturn.y);
}
function pairGo(s) { pairStage = s; renderPairing(); }
function renderPairing() {
  const el = document.getElementById('pairing');
  const d = pairData;
  el.innerHTML = `<button class="back" onclick="closePairing()">← Back to your picks</button>
    <h1>Screens &amp; docks for your <span class="accent">${d.type === 'laptop' ? 'laptop' : 'desktop'}</span></h1>
    <p class="sub">${esc(d.name)} — pair it with screens it can actually drive, and a dock that actually fits its ports.</p>
    <div class="sortrow">
      <button class="sort${pairStage === 'screens' ? ' on' : ''}" onclick="pairGo('screens')">🖥️ Screens</button>
      <button class="sort${pairStage === 'dock' ? ' on' : ''}" onclick="pairGo('dock')">🔌 Dock</button>
    </div>
    <div id="pairstage"></div>`;
  refreshPairStage();
  window.scrollTo(0, 0);
}
function refreshPairStage() {
  const s = document.getElementById('pairstage');
  if (s) s.innerHTML = pairStage === 'screens' ? pairScreensHTML() : pairDockHTML();
}
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
  refreshPairStage();
}
function pairSetHave(b) { pairScreens.have = b; refreshPairStage(); }
function pairSetTier(t) {
  pairTier = t; pairSizeFilter = 'all'; pairQualityFilter = 'all'; pairTechFilter = 'all';
  refreshPairStage();
}
function pairSetChassis(c) { pairChassis = c; refreshPairStage(); }
function pairFilterSize(v) { pairSizeFilter = v; refreshPairStage(); }
function pairFilterQuality(v) { pairQualityFilter = v; refreshPairStage(); }
function pairFilterTech(v) { pairTechFilter = v; refreshPairStage(); }
function pairChangeAnswers() { pairAsked = { count: false, res: false }; refreshPairStage(); }

function pairScreensHTML() {
  const d = pairData;
  // Ask first, with the quiz's own wording, until both are answered.
  if (!pairAsked.count || !pairAsked.res) {
    let h = '';
    if (!pairAsked.count) {
      h += `<p class="q">${d.type === 'laptop' ? 'Will you plug in extra screens?' : 'How many screens will you plug in?'}</p>`;
      h += pairCountOpts().map(o =>
        `<button class="opt" onclick="pairSetCount(${o.v})">${o.t}<small>${o.s}</small></button>`).join('');
    }
    if (!pairAsked.res && pairScreens.count !== 0) {
      h += `<p class="q">What resolution are the ${d.type === 'laptop' ? 'extra ' : ''}screens?</p>`;
      h += PAIR_RES_OPTS.map(o =>
        `<button class="opt" onclick="pairSetRes('${o.v}')">${o.t}<small>${o.s}</small></button>`).join('');
    }
    return h;
  }
  const n = pairScreens.count;
  const resLabel = PAIR_TIER_LABEL[pairScreens.resolution] || 'resolution not specified';
  let h = `<p class="sortline">Your setup: ${d.type === 'laptop'
      ? (n === 0 ? 'just the laptop screen' : `+${n} external screen${n > 1 ? 's' : ''}`)
      : `${n} screen${n > 1 ? 's' : ''}`} · ${resLabel}</p>
    <button class="back" onclick="pairChangeAnswers()">↺ Change these answers</button>`;
  if (d.type === 'laptop') {
    if (n === 0) {
      h += `<div class="note">No extra screens — nothing to match for displays. A dock can still tidy the desk (one cable for power and peripherals); see the Dock step.</div>`;
      return h;
    }
    const disp = d.display || {};
    if (disp.max_external != null) {
      const mx = disp.max_external;
      if (n <= mx) {
        h += `<div class="have">✅ <strong>Good news:</strong> ${esc(d.name)} drives up to ${mx} external screen${mx > 1 ? 's' : ''} on its own — your setup is covered natively.</div>`;
      } else {
        h += `<div class="note">⚠️ On its own, ${esc(d.name)} is rated for ${mx} external screen${mx > 1 ? 's' : ''} — getting to ${n} takes a dock that adds screens itself (DisplayLink).</div>
          <button class="pairbtn" onclick="pairGo('dock')">🔌 See the Dock step</button>`;
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
    <div class="sortrow">
      <button class="sort${pairScreens.have === true ? ' on' : ''}" onclick="pairSetHave(true)">Yes, I have them</button>
      <button class="sort${pairScreens.have === false ? ' on' : ''}" onclick="pairSetHave(false)">No — show me screens</button>
    </div>`;
  if (pairScreens.have === true)
    h += `<div class="note">You're set for screens. If a dock would help — one cable for everything — the Dock step has this machine's vetted pairings.</div>`;
  else if (pairScreens.have === false)
    h += pairShelfHTML();
  return h;
}
function pairShelfHTML() {
  const mons = pairData.monitors || {};
  if (!Object.keys(mons).length)
    return `<div class="note">🖥️ The screen shelf is still being stocked — check back soon.</div>`;
  if (!pairTier) {
    return `<p class="q" style="margin-top:14px">Which resolution should we match?</p>` +
      Object.keys(PAIR_TIER_LABEL).map(t =>
        `<button class="opt" onclick="pairSetTier('${t}')">${PAIR_TIER_LABEL[t]}<small>${(mons[t] || []).length} on the shelf</small></button>`).join('');
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
    `<button class="sort${pairSizeFilter === v ? ' on' : ''}" onclick="pairFilterSize('${v}')">${t}</button>`).join('')}</div>`;
  h += `<div class="sortrow wrap">${quals.map(([v, t]) =>
    `<button class="sort${pairQualityFilter === v ? ' on' : ''}" onclick="pairFilterQuality('${v}')">${t}</button>`).join('')}</div>`;
  const techs = [...new Set(shelf.map(m => m.tech).filter(Boolean))].sort();
  if (techs.length > 1) {
    const techOpts = [['all', 'All panel types'], ...techs.map(t => [t, t])];
    h += `<div class="sortrow wrap">${techOpts.map(([v, t]) =>
      `<button class="sort${pairTechFilter === v ? ' on' : ''}" onclick="pairFilterTech('${v}')">${t}</button>`).join('')}</div>`;
  }
  const shown = shelf.filter(m =>
    (pairSizeFilter === 'all' || m.size_class === pairSizeFilter) &&
    (pairQualityFilter === 'all' || m.quality_class === pairQualityFilter) &&
    (pairTechFilter === 'all' || m.tech === pairTechFilter));
  if (!shown.length)
    h += `<div class="note">No screens on this shelf match that combination yet — try clearing a filter.</div>`;
  shown.forEach(m => { h += monitorCardHTML(m); });
  return h;
}
const MON_SIZE_RANGE = { small: 'Small · under 27″', office: 'Office · 27–32″', large: 'Large · over 32″', widescreen: 'Widescreen · ultrawide' };
function monSizeText(m) { return m.size_label || MON_SIZE_RANGE[m.size_class] || ''; }
function monSizeHTML(m) {
  const t = monSizeText(m);
  return t ? ` <span style="font-size:.95rem;font-weight:400;color:#cbd5e1;white-space:nowrap">${t}</span>` : '';
}
function monitorCardHTML(m) {
  const chips = [`📺 ${m.size_in}″`, esc(m.resolution), `${m.refresh_hz}Hz`, esc(m.panel_type)];
  if (m.usbc_video_input) chips.push('🔌 USB-C video input — one cable from a laptop');
  const inSetup = pairSetupMonitorQty(m.id);
  return `<div class="card"><h3>${esc(m.name)}${monSizeHTML(m)}</h3>
    <div class="price">$${m.price_usd.toLocaleString()}</div>
    <p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Price via ${esc(m.price_source || 'retailer')}, checked Oct 2026 · ${esc(m.role)}</p>
    <div class="chips">${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>
    <p class="why">${esc(m.why)}</p>
    <div class="sortrow" style="align-items:center;margin-top:10px">
      <button class="sort" onclick="pairMonQtyDelta('${m.id}',-1)">−</button>
      <span>×${pairQtyFor(m.id)}</span>
      <button class="sort" onclick="pairMonQtyDelta('${m.id}',1)">+</button>
      <button class="sort" onclick="pairToggleMonitor('${m.id}')">${inSetup ? `✓ In your setup ×${inSetup} — tap to remove` : '＋ Add to my setup'}</button>
    </div>
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
    <h3>${esc(o.name)}</h3>
    ${price}
    <div class="chips">${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>
    ${tech}${flag}
    <button class="pairbtn" onclick="pairToggleDock('${o.id}')">${inSetup ? '✓ Dock in your setup — tap to remove' : '＋ Add this dock to my setup'}</button>
    <div class="buylinks"><button class="buybtn" disabled>🛒 Buy links coming soon</button></div></div>`;
}
function pairDockHTML() {
  const d = pairData;
  if (d.type === 'desktop') {
    return `<div class="note">Desktops plug screens in directly — the graphics card's own ports do the job, so there's no dock to pair with a desktop. Matching the screens themselves happens in the Screens step.</div>
      <button class="pairbtn" onclick="pairGo('screens')">🖥️ Go to Screens</button>`;
  }
  if (pairScreens.count === null) {
    return `<p class="q">First — how many extra screens should the dock handle?</p>
      <p class="sortline">A pairing only means something against a target setup.</p>` +
      pairCountOpts().map(o =>
        `<button class="opt" onclick="pairSetCount(${o.v})">${o.t}<small>${o.s}</small></button>`).join('');
  }
  const split = d.chassis_split;
  if (split && !pairChassis) {
    return `<p class="q">One question about this exact model</p>
      <div class="note">Dell sells this model in two chassis, and they differ where it matters: the plastic-chassis version's USB-C port is data-only, while the aluminum-chassis version's USB-C carries DisplayPort video. Which is yours?</div>
      <button class="opt" onclick="pairSetChassis('plastic')">Plastic chassis<small>USB-C is data-only on this version</small></button>
      <button class="opt" onclick="pairSetChassis('aluminum')">Aluminum chassis<small>USB-C carries DisplayPort video on this version</small></button>`;
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
function persistSetups() {
  try { localStorage.setItem(SETUPS_KEY, JSON.stringify(setupStore)); } catch (e) {}
  updateSetupBtn();
}
function updateSetupBtn() {
  const b = document.getElementById('setupbtn');
  if (b) b.textContent = setupStore.setups.length
    ? `🧩 My Setup (${setupStore.setups.length})` : '🧩 My Setup';
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
  if (comp.price == null) return { total: null, computerMissing: false, missingPrice: [] };
  let total = comp.price;
  const missingPrice = [];
  if (s.dock_id) {
    const d = cat.docks[s.dock_id];
    if (d) {
      if (d.price_usd != null) total += d.price_usd;
      else missingPrice.push(d.name);
    }
  }
  s.monitors.forEach(m => {
    const mon = cat.monitors[m.id];
    if (mon) {
      if (mon.price_usd != null) total += mon.price_usd * m.qty;
      else missingPrice.push(mon.name);
    }
  });
  return { total, computerMissing: false, missingPrice };
}
function setupLinesHTML(s, comp, cat) {
  const lines = [];
  if (!comp)
    lines.push(`<p class="setupline">🖥️ <strong>Computer:</strong> this model is no longer in the catalog.</p>`);
  else
    lines.push(`<p class="setupline">🖥️ <strong>${esc(comp.name)}</strong> — from $${comp.price.toLocaleString()}</p>`);
  if (s.dock_id) {
    const d = cat.docks[s.dock_id];
    if (!d)
      lines.push(`<p class="setupline">🔌 <strong>Dock:</strong> no longer in the catalog. <button class="sort" onclick="setupRemoveDock('${s.id}')">✕ Remove</button></p>`);
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
    totalHTML = `<div class="have" style="text-align:left">Estimated starting total: <strong>$${t.total.toLocaleString()}</strong><br><span style="font-weight:400">From the prices above, checked Oct 2026. The computer's figure is its starting price${t.missingPrice.length ? '; anything marked "price not shown" is not counted' : ''} — configurations and final prices vary.</span></div>`;
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
    <p class="sub">Computers, docks, and screens you've saved on this device. This is not a cart — nothing is reserved or ordered, and prices are re-read from the catalog each time you look.</p>`;
  if (!setupStore.setups.length)
    h += `<div class="note">No saved setups yet — save one from any computer result with the 💾 Save this setup button, and it'll wait for you here.</div>`;
  const sorted = [...setupStore.setups].sort((a, b) => (b.updated || 0) - (a.updated || 0));
  for (const s of sorted) {
    const comp = await resolveComputer(s.computer.kind, s.computer.id);
    setupResolved[s.id] = comp;
    h += setupCardHTML(s, comp, cat, true);
  }
  el.innerHTML = h;
}
async function setupOpen(id) {
  const s = getSetup(id);
  if (!s) return;
  const comp = await resolveComputer(s.computer.kind, s.computer.id);
  if (!comp) { alert('That computer is no longer in the catalog.'); return; }
  if (s.computer.kind === 'laptop') renderModelCard(comp);
  else renderDesktopModelCard(comp);
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
  rows.push(comp ? `☐ Computer: ${esc(comp.name)} — from $${comp.price.toLocaleString()}`
                 : '☐ Computer: no longer in the catalog');
  if (s.dock_id) {
    const d = cat.docks[s.dock_id];
    rows.push(d ? `☐ Dock: ${esc(d.name)}${d.price_usd != null ? ' — $' + d.price_usd.toLocaleString() : ' — price not shown'}`
                : '☐ Dock: no longer in the catalog');
  }
  s.monitors.forEach(m => {
    const mon = cat.monitors[m.id];
    rows.push(mon ? `☐ Screen ×${m.qty}: ${esc(mon.name)}${monSizeText(mon) ? ' (' + monSizeText(mon) + ')' : ''}${mon.price_usd != null ? ' — $' + mon.price_usd.toLocaleString() + ' each' : ' — price not shown'}`
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
  if (!pcGuides) {
    try { pcGuides = await fetch('/api/laptop-guides').then(x => x.json()); }
    catch (e) { /* page still renders its static sections */ }
  }
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
    <p class="sub">The fine print, all in one place: what our data is based on, where it can differ from the screen in front of you, and what we couldn't verify. The guides themselves only keep the notes that change what you should do.</p>`;
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
  const sg = pcGuides && pcGuides.setup_guides;
  if (sg && sg.os_flows) {
    const labels = { windows_11: 'Setup guides — Windows 11', macos: 'Setup guides — macOS', chromeos: 'Setup guides — ChromeOS' };
    Object.keys(labels).forEach(k => {
      if (sg.os_flows[k]) h += discSection(labels[k], sg.os_flows[k].disclaimers);
    });
  }
  const par = pcGuides && pcGuides.parental_controls;
  if (par && par.platforms) {
    const all = [];
    Object.keys(par.platforms).forEach(k => {
      (par.platforms[k].disclaimers || []).forEach(n => all.push(n));
    });
    h += discSection('Parental controls', all);
  }
  el.innerHTML = h;
}

fetch('/api/isps').then(x => x.json()).then(d => { isps = d; });
