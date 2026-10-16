const stepsEl = document.getElementById('steps');
const bar = document.getElementById('bar');
const answers = {};
let isps = [];

// ------------------------------------------------------------- front door
// First screen: Buy New Gear / Set Up New Gear. Second: Internet / PC.
// Then route into the matching existing flow.
let flowType = 'buy';   // 'buy' | 'setup'
const SECTION_IDS = ['home', 'flow-pick', 'isp-pick', 'quiz', 'results', 'guide', 'pc-guide', 'model-lookup', 'pairing', 'setup', 'disclaimers'];
function hideAllSections() {
  SECTION_IDS.forEach(id => document.getElementById(id).style.display = 'none');
}
function chooseFlow(f) { flowType = f; renderFlowPick(); }
function renderFlowPick() {
  hideAllSections();
  const el = document.getElementById('flow-pick');
  el.style.display = 'block';
  const buying = flowType === 'buy';
  el.innerHTML = `<button class="back" onclick="backHome()">← Back</button>
    <p class="q">${buying ? 'What are you buying?' : 'What are you setting up?'}</p>
    <button class="opt" onclick="routeFlow('internet')">🌐 Internet<small>${buying ? 'Modems, routers & mesh — ditch the ISP rental fee' : 'Activate and set up your modem or router, step by step'}</small></button>
    <button class="opt" onclick="routeFlow('pc')">💻 PC<small>${buying ? "Laptops & desktops matched to how you'll actually use them" : 'First-boot walkthroughs, brand setup tools & kid setup'}</small></button>
    <p class="orline">— or —</p>
    <button class="opt" onclick="startModelLookup()">🔎 Know your model?<small>Type the name — or the model number off the box — and jump straight to it</small></button>`;
  window.scrollTo(0, 0);
}
function backToFlowPick() { renderFlowPick(); }
function routeFlow(kind) {
  if (flowType === 'buy') {
    if (kind === 'internet') startBuy(); else startLaptopBuy();
  } else {
    if (kind === 'internet') startSetup();
    else { guideBrand = null; startPcGuide(); }   // generic entry: no model context
  }
}

const QUESTIONS = [
  { key: 'isp', q: "Who's your internet provider?",
    opts: () => isps.map(i => ({ v: i.id, t: i.name,
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
      { v: 'no', t: 'No, inside is fine' },
      { v: 'small', t: 'Small yard or patio', s: 'Grilling, porch sitting' },
      { v: 'large', t: 'Large yard', s: 'Kids playing, workshop, pool area' } ] },
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
      { v: '0', t: 'None' },
      { v: '1', t: '1 TV' },
      { v: '2', t: '2 TVs' },
      { v: '3', t: '3 TVs' },
      { v: '4plus', t: '4+ TVs' } ] },
  { key: 'smart_home', q: "Smart home gadgets?",
    opts: () => [
      { v: 'none', t: 'None', s: 'Just phones, laptops, TVs' },
      { v: 'some', t: 'A few', s: 'Robot vacuum, smart speaker, doorbell' },
      { v: 'lots', t: 'Loaded', s: 'Lights, locks, cameras, the works' } ] },
  { key: 'setup', q: "How do you want your setup?",
    opts: () => [
      { v: 'combo', t: 'All-in-one box', s: 'Easiest to set up and manage — one box, one app. Tradeoff: when it\'s time to upgrade, you replace the whole thing.' },
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
  h += `<p class="q">${Q.q}</p>`;
  Q.opts().forEach(o => {
    h += `<button class="opt" onclick="pick('${Q.key}','${o.v}')">${o.t}${o.s ? `<small>${o.s}</small>` : ''}</button>`;
  });
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

function sortButtonsHTML() {
  return `<div class="sortrow">
    <button class="sort${sortMode === 'value' ? ' on' : ''}" onclick="setSort('value')">💪 Best value</button>
    <button class="sort${sortMode === 'stability' ? ' on' : ''}" onclick="setSort('stability')">🛡️ Most reliable</button>
    <button class="sort${sortMode === 'cheapest' ? ' on' : ''}" onclick="setSort('cheapest')">💲 Cheapest</button>
  </div>`;
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
  return `<div class="card combo"><span class="rank">⭐ OUR COMBO PICK</span>
    <h3>${m.name} + ${rt.name}</h3>
    <div class="price">$${total}${saveBit}</div>
    <p class="why">Our ${kind} modem paired with our ${kind} router for your home. Buy both, ditch the rental, done.</p></div>`;
}

function tabButtonsHTML(modems, routers) {
  return `<div class="sortrow">
    <button class="sort${activeTab === 'modems' ? ' on' : ''}" onclick="setTab('modems')">🔌 Modems (${modems.length})</button>
    <button class="sort${activeTab === 'routers' ? ' on' : ''}" onclick="setTab('routers')">📶 Routers (${routers.length})</button>
  </div>`;
}

function listHTML(picks) {
  const shown = showAll ? picks : picks.slice(0, 5);
  let h = '';
  shown.forEach((p, i) => { h += cardHTML(p, i); });
  if (!showAll && picks.length > 5)
    h += `<button class="more" onclick="showAll=true;renderResults()">Show ${picks.length - 5} more ▼</button>`;
  return h;
}

function cardHTML(p, i) {
  const saveLine = p.saves_over_life > 0
    ? `saves you $${p.saves_over_life} over ${p.life_years} years`
    : `WiFi upgrade — no rental fee on your plan`;
  return `<div class="card"><span class="rank">#${i + 1} ${p.type.replace('_', ' ').toUpperCase()}</span>
    <h3>${p.name}</h3>
    <div class="price">$${p.price} <span class="permo">— ${saveLine}</span></div>
    <p class="why">${p.why}</p>
    ${p.blurb ? `<p class="blurb">${p.blurb}</p>` : ''}</div>`;
}

function renderResults() {
  const r = document.getElementById('results');
  let h = `<h1>Your top <span class="accent">picks</span></h1>
           <p class="sub">${meta.isp} · ${meta.conn} · ~${meta.devices} devices</p>`;
  h += sortButtonsHTML();
  if (meta.setup === 'separate') {
    const modems = sortedPicks().filter(p => p.type === 'modem');
    const routers = sortedPicks().filter(p => p.type === 'router' || p.type === 'mesh');
    h += comboCardHTML();
    h += tabButtonsHTML(modems, routers);
    h += listHTML(activeTab === 'modems' ? modems : routers);
  } else {
    h += listHTML(sortedPicks());
  }
  meta.notes.forEach(n => { h += `<div class="note">${n}</div>`; });
  h += `<button class="restart" onclick="showGuide()">🔧 Guide me through setup</button>`;
  h += `<button class="restart" style="background:#1e293b;color:#cbd5e1;border:2px solid #334155" onclick="location.reload()">↺ Start over</button>`;
  r.innerHTML = h;
  window.scrollTo(0, 0);
}

let guide = null, guideLevel = 'basic', guideMethod = 'online';

let guideFrom = 'results';
let setupGear = 'separate';
let guideStep = 'activate';

function backHome() {
  setPageTheme('everyday');
  hideAllSections();
  document.getElementById('home').style.display = 'block';
  window.scrollTo(0, 0);
}
function startBuy() {
  setPageTheme('store');
  document.getElementById('home').style.display = 'none';
  document.getElementById('flow-pick').style.display = 'none';
  document.getElementById('quiz').style.display = 'block';
  step = 0;
  render();
}
// Setup flow: ISP -> gear type -> activation -> (Next) -> instructions
function startSetup() {
  document.getElementById('home').style.display = 'none';
  document.getElementById('flow-pick').style.display = 'none';
  const el = document.getElementById('isp-pick');
  el.style.display = 'block';
  let h = `<button class="back" onclick="backToFlowPick()">← Back</button>
           <p class="q">Who's your internet provider?</p>`;
  isps.forEach(i => {
    const conn = i.connection === 'fiber' ? 'Fiber' : i.connection === 'dsl' ? 'DSL' : 'Cable';
    h += `<button class="opt" onclick="pickGear('${i.id}')">${i.name}<small>${conn}</small></button>`;
  });
  el.innerHTML = h;
  window.scrollTo(0, 0);
}
function pickGear(ispId) {
  const el = document.getElementById('isp-pick');
  el.innerHTML = `<button class="back" onclick="startSetup()">← Back</button>
    <p class="q">What kind of setup do you have?</p>
    <button class="opt" onclick="guideFrom='isp-pick';setupGear='separate';openGuide('${ispId}')">🔌 Separate modem + router<small>Two boxes. Best performance and reliability — a bit more to manage.</small></button>
    <button class="opt" onclick="guideFrom='isp-pick';setupGear='combo';openGuide('${ispId}')">📦 All-in-one box<small>One box does both. Easiest to set up — but you replace the whole thing at upgrade time.</small></button>`;
  window.scrollTo(0, 0);
}
async function showGuide() {
  guideFrom = 'results';
  document.getElementById('results').style.display = 'none';
  openGuide(meta.isp_id);
}
async function openGuide(ispId) {
  document.getElementById('isp-pick').style.display = 'none';
  const g = document.getElementById('guide');
  g.style.display = 'block';
  g.innerHTML = `<div class="loading"><span class="dots">Loading your guide</span></div>`;
  guide = await fetch('/api/setup-guide/' + ispId + '?gear=' + setupGear).then(x => x.json());
  meta.isp = guide.isp; meta.isp_id = ispId;
  guideStep = 'activate';
  guideLevel = 'basic';
  guideMethod = (guide.activation.online && guide.activation.online.allowed) ? 'online' : 'phone';
  renderGuide();
}
function renderGuide() {
  if (guideStep === 'activate') renderActivation();
  else renderInstructions();
}
function guideSub() {
  return `${guide.isp} · ${guide.gear === 'combo' ? 'All-in-one box' : 'Separate modem + router'}`;
}
function backTarget() {
  // where the top back button goes from the activation screen
  return guideFrom === 'results' ? 'backFromGuide()' : "pickGear('" + meta.isp_id + "')";
}
function backLabel() {
  return guideFrom === 'results' ? '← Back to picks' : '← Back';
}
function renderActivation() {
  const g = document.getElementById('guide');
  const act = guide.activation;
  let h = `<button class="back" onclick="${backTarget()}">${backLabel()}</button>
    <h1>Activate your <span class="accent">modem</span></h1>
    <p class="sub">${guideSub()}</p>`;
  h += `<div class="sortrow">`;
  if (act.online && act.online.allowed)
    h += `<button class="sort${guideMethod === 'online' ? ' on' : ''}" onclick="guideMethod='online';renderGuide()">🌐 Do it online</button>`;
  h += `<button class="sort${guideMethod === 'phone' ? ' on' : ''}" onclick="guideMethod='phone';renderGuide()">📞 Call them</button></div>`;
  if (guideMethod === 'online' && act.online && act.online.allowed) {
    h += `<div class="have">Go to <strong>${act.online.url}</strong> and follow these steps:</div>`;
    act.online.steps.forEach((s, i) => {
      h += `<div class="gstep"><span class="stepnum">${i + 1}</span><p>${s}</p></div>`;
    });
  } else {
    h += `<div class="have">Call <strong class="bignum">${act.phone.number}</strong><br>Have ready:<br>• ${act.phone.have_ready.join('<br>• ')}</div>`;
  }
  h += `<button class="restart" onclick="guideStep='instructions';stepIdx=0;renderGuide()">Next: setup instructions →</button>`;
  g.innerHTML = h;
  window.scrollTo(0, 0);
}
let stepIdx = 0;
function renderInstructions() {
  const steps = guideLevel === 'basic' ? guide.basic : guide.advanced;
  if (stepIdx >= steps.length) stepIdx = steps.length - 1;
  if (stepIdx < 0) stepIdx = 0;
  const s = steps[stepIdx];
  const g = document.getElementById('guide');
  let h = `<button class="back" onclick="guideStep='activate';renderGuide()">← Back to activation</button>
    <h1>${guideLevel === 'basic' ? 'Basic' : 'Advanced'} <span class="accent">setup</span></h1>
    <p class="sub">${guideSub()} · Step ${stepIdx + 1} of ${steps.length}</p>
    <div class="sortrow">
      <button class="sort${guideLevel === 'basic' ? ' on' : ''}" onclick="guideLevel='basic';stepIdx=0;renderInstructions()">🙂 Basic</button>
      <button class="sort${guideLevel === 'advanced' ? ' on' : ''}" onclick="guideLevel='advanced';stepIdx=0;renderInstructions()">🧰 Advanced</button>
    </div>
    <div class="progress"><i style="width:${Math.round((stepIdx + 1) / steps.length * 100)}%"></i></div>
    <div class="gstep"><span class="stepnum">${stepIdx + 1}</span><div><h3>${s.title}</h3><p>${s.body}</p></div></div>`;
  if (s.video_id && s.video_id !== 'REPLACE_ME')
    h += `<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${s.video_id}?start=${s.video_start || 0}&rel=0" title="${s.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  else
    h += `<div class="vid soon">🎥 Walkthrough video coming soon</div>`;
  h += `<div class="sortrow">`;
  if (stepIdx > 0) h += `<button class="sort" onclick="stepIdx--;renderInstructions()">← Back</button>`;
  if (stepIdx < steps.length - 1) h += `<button class="sort on" onclick="stepIdx++;renderInstructions()">Next →</button>`;
  else h += `<button class="sort on" onclick="backHome()">Done ✓</button>`;
  h += `</div>`;
  g.innerHTML = h;
  window.scrollTo(0, 0);
}
function backFromGuide() {
  document.getElementById('guide').style.display = 'none';
  if (guideFrom === 'results') {
    document.getElementById('results').style.display = 'block';
  } else {
    backHome();
  }
  window.scrollTo(0, 0);
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
