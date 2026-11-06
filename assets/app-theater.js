// ------------------------------------------------------------ home theater
// The Home Theater picker (Build 2026-11-05.5): the fourth flow, built on
// the same tile component and quiz shell as the gear and computer pickers.
// Design of record: ht-picker-design/gen.py (Caleb approved Nov 3, 2026) —
// a cover, an "I know what I want" page, 12 questions, and tabbed
// GOOD / BETTER / BEST results with same-level swaps and a room visual.
// Prices live in theater.json (served at /api/theater-data) and were
// verified Nov 5, 2026 at Best Buy, Walmart, and the makers' own stores.
// The three step-up swaps (Sonos Beam Gen 2 in GOOD, Sony Bravia Theatre
// Bar 9 in BETTER, LG G5 77″ in BEST) were held at launch for Caleb's
// ruling; he approved all three on Nov 5, 2026 and they shipped in Build
// 2026-11-05.6 with prices verified that day at Best Buy.
let TH_DATA = null;
const tanswers = {};
let tstep = -1;               // -1 cover, -2 "I know what I want", >= 0 quiz
let thTab = 'better';

const thIc = n => `<img class="v2ic" src="/assets/icons-v2/${n}.png" alt="">`;
const thGlyph = t => `<span class="th-glyph">${t}</span>`;

const THEATER_QUESTIONS = [
  { key: 'budget', num: 1, q: "What's your total budget for everything?",
    why: "TV + sound + mount and cables, before tax. We split it for you — soundbar setups put most of it in the TV; speaker setups split it closer to even.",
    opts: () => [
      { v: 'under750', t: 'Under $750', s: 'A sharp smaller setup, done right', icon: thGlyph('$') },
      { v: '750-1250', t: '$750 – $1,250', s: 'The classic first real system', icon: thGlyph('$') },
      { v: '1250-2500', t: '$1,250 – $2,500', s: 'Where OLED enters the picture', icon: thGlyph('$') },
      { v: '2500-5000', t: '$2,500 – $5,000', s: 'Big screens and serious sound', icon: thGlyph('$') },
      { v: '5000plus', t: '$5,000+', s: 'Dedicated-room territory', icon: thGlyph('$') },
      { v: 'unsure', t: 'Not sure yet', s: 'See Good / Better / Best sizes', icon: thIc('help-question') } ] },
  { key: 'dist', num: 2, q: "How far is the couch from the TV wall?",
    why: "This one number sizes your screen. Too small is the #1 regret — between two sizes, movies and games usually want the bigger one.",
    opts: () => [
      { v: 'under6', t: 'Under 6 ft', s: 'Cozy rooms and bedrooms', icon: thGlyph('6') },
      { v: '6-7', t: '6 – 7 ft', s: '', icon: thGlyph('7') },
      { v: '8-9', t: '8 – 9 ft', s: 'The most common living room', icon: thGlyph('8') },
      { v: '10-11', t: '10 – 11 ft', s: '', icon: thGlyph('10') },
      { v: '12plus', t: '12 ft or more', s: 'Projectors enter the chat', icon: thGlyph('12') },
      { v: 'dontknow', t: "Don't know", s: 'Small, medium or large room', icon: thIc('help-question') } ] },
  { key: 'roomsize', num: 2, when: () => tanswers.dist === 'dontknow',
    q: "How big is the room, roughly?",
    why: "No tape measure needed — the room's size is a good stand-in for the couch distance.",
    opts: () => [
      { v: 'small', t: 'Small room', s: 'Den, bedroom, small lounge', icon: thIc('armchair') },
      { v: 'medium', t: 'Medium room', s: 'A typical living room', icon: thIc('sofa-straight') },
      { v: 'large', t: 'Large room', s: 'Open plan or a big room', icon: thIc('room-open-plan') } ] },
  { key: 'placement', num: 3, q: "What will the TV sit on — or hang on?",
    why: "The screen can't be wider than the furniture under it, and renters shouldn't be sold a wall mount. This answer quietly caps your size.",
    opts: () => [
      { v: 'mount', t: 'Wall mount is fine', s: 'We include the right mount', icon: thIc('wall-mount') },
      { v: 'stand', t: 'Stand on furniture', s: 'Tell us the furniture width if you know it', icon: thIc('tv-stand') },
      { v: 'renter', t: 'Renter — no drilling', s: 'Stand + soundbar friendly picks', icon: thIc('no-drilling') },
      { v: 'fireplace', t: 'Above the fireplace', s: 'We flag the height and tilt', icon: thIc('fireplace') } ] },
  { key: 'light', num: 4, q: "How bright is the room when you watch?",
    why: "Panels are picked for your light, not the showroom's. Windows opposite the screen are the one setup that changes everything.",
    opts: () => [
      { v: 'dark', t: 'Mostly dark', s: "Movie-night room — OLED's home turf", icon: thIc('moon-dark') },
      { v: 'mixed', t: 'Mixed light', s: 'Some day, some night', icon: thIc('half-light') },
      { v: 'glare', t: 'Bright — windows opposite', s: 'Anti-glare Mini-LED moves to the front', icon: thIc('sun-glare') },
      { v: 'bright', t: 'Bright, never opposite', s: "Less glare than you'd think", icon: thIc('sun-bright') } ] },
  { key: 'watch', num: 5, multi: true, q: "What do you watch most? Pick your top 2",
    why: "We build for your top two and say plainly what got traded off — never one mushy average score.",
    opts: () => [
      { v: 'movies', t: 'Movies & prestige TV', s: 'Size and contrast lead', icon: thIc('film-clapper') },
      { v: 'sports', t: 'Sports', s: 'Brightness, motion, wide seating angles', icon: thIc('sports-ball') },
      { v: 'gaming', t: 'Gaming', s: 'Unlocks the gaming check next', icon: thIc('game-controller') },
      { v: 'everyday', t: 'Everyday shows & news', s: 'All-day comfort picks', icon: thIc('newspaper') },
      { v: 'music', t: 'Music listening', s: 'Stereo quality and whole-home sound', icon: thIc('music-note') } ] },
  { key: 'gaming', num: 6, when: () => (tanswers.watch || []).includes('gaming'),
    cond: 'Only if you game',
    q: "What do you game on — and how many?",
    why: "Consoles need fast ports, and the soundbar quietly takes one. We count your devices first, then check the TV can actually hold them.",
    opts: () => [
      { v: 'ps5', t: 'PlayStation 5', s: '', icon: thIc('game-controller') },
      { v: 'xbox', t: 'Xbox Series X | S', s: '', icon: thIc('game-controller') },
      { v: 'pc', t: 'Gaming PC', s: 'Higher refresh rates pay off here', icon: thIc('desktop-pc') },
      { v: 'switch', t: 'Switch only', s: 'Relaxed requirements — saves you money', icon: thIc('game-controller') },
      { v: 'several', t: 'Several of these', s: 'Port count becomes the deciding spec', icon: thIc('game-controller') } ] },
  { key: 'static', num: 7, q: "Do you leave one channel or app on for hours?",
    why: "The one habit that changes the panel pick. Thousands of hours of the same news ticker or desktop is hard on OLED — mixed use is not, and we'll say so.",
    opts: () => [
      { v: 'news', t: 'One news channel, most of the day', s: 'We steer you to Mini-LED, and explain why', icon: thIc('newspaper') },
      { v: 'pc', t: 'A PC desktop on the TV', s: 'Same protection applies', icon: thIc('desktop-pc') },
      { v: 'hud', t: 'Same game, fixed HUD, long sessions', s: '', icon: thIc('game-controller') },
      { v: 'no', t: 'No — mixed content', s: 'OLED is safe for you. No scare tactics', icon: thIc('check') } ] },
  { key: 'room', num: 8, parts: true, q: "Show us your room — in two taps",
    why: "No floor plans to draw and nothing to measure. Your couch plus what's around it gives us the room's shape — and an open side changes the sound plan, because there's no wall there to hold a surround speaker.",
    partsList: [
      { key: 'couch', label: 'Part A — Your couch', opts: () => [
        { v: 'straight', t: 'Straight sofa, facing the TV', s: 'The classic setup', icon: thIc('sofa-straight') },
        { v: 'sectional', t: 'L-shaped sectional', s: 'Two viewing directions', icon: thIc('sectional-l') },
        { v: 'recliners', t: 'Recliners / theater rows', s: 'Sound aims at the rows', icon: thIc('recliner') },
        { v: 'chairs', t: 'Loveseat + chairs', s: 'Flexible, movable, smaller footprint', icon: thIc('armchair') } ] },
      { key: 'around', label: 'Part B — What is around it?', opts: () => [
        { v: 'enclosed', t: 'Walls all around', s: 'Surround sound behaves itself here', icon: thIc('room-enclosed') },
        { v: 'openside', t: 'Open on one side', s: 'We compensate that side', icon: thIc('room-open-side') },
        { v: 'openbehind', t: 'Open behind the couch', s: 'No wall for rear speakers — they move to your sides', icon: thIc('room-open-behind') },
        { v: 'openplan', t: 'Big open-plan space', s: 'The whole area counts', icon: thIc('room-open-plan') } ] } ] },
  { key: 'subs', num: 9, q: "Do you use subtitles because voices are hard to follow?",
    why: "The most common complaint in home theater — and the most fixable. Riding the volume all night (up for voices, down for explosions) is the same signal. A real center channel carries most of a movie's dialogue.",
    opts: () => [
      { v: 'often', t: 'Yes, often', s: 'A center channel becomes non-negotiable', icon: thIc('check') },
      { v: 'sometimes', t: 'Sometimes', s: 'Dialogue features get a boost', icon: thIc('half-light') },
      { v: 'no', t: 'No', s: 'More freedom in the sound budget', icon: thIc('cross') } ] },
  { key: 'feel', num: 10, parts: true, q: "How should it feel? — and the wires question",
    why: "You don't need to know speaker counts or format names — that's our job. Part A is the feeling you're after; we spec the system that makes it. Part B is the one physical fact we do need from you.",
    partsList: [
      { key: 'feelA', label: 'Part A — How should it feel?', opts: () => [
        { v: 'chest', t: 'Feel it in my chest', s: 'Big scenes should hit, not just play', icon: thIc('subwoofer-bass') },
        { v: 'words', t: 'Hear every word', s: 'Voices clear without riding the volume', icon: thIc('speech-bubble') },
        { v: 'around', t: 'Sound all around me', s: 'Effects wrap the couch — planes pass overhead', icon: thIc('surround-sound') },
        { v: 'music', t: 'Music fills the house', s: 'Whole-home listening matters most', icon: thIc('music-house') } ] },
      { key: 'wires', label: 'Part B — How do you feel about wires?', opts: () => [
        { v: 'none', t: 'No wires at all', s: 'Wireless still needs outlets', icon: thIc('cross') },
        { v: 'power', t: 'Power cables OK, no speaker wire', s: 'Wireless kits live here', icon: thIc('plug-power') },
        { v: 'hidden', t: 'Speaker wire OK if hidden-ish', s: 'Component sound opens up', icon: thIc('cable-run') },
        { v: 'full', t: 'Full install is fine', s: 'Everything is on the table', icon: thIc('wrench-install') } ] } ] },
  { key: 'own', num: 11, q: "What do you already own?",
    why: "So we never sell you a second streamer, the wrong speaker family, or a receiver you don't need.",
    opts: () => [
      { v: 'sonos', t: 'Sonos speakers', s: 'Your sound stays in the family', icon: thIc('speaker') },
      { v: 'avr', t: 'Denon or Yamaha receiver', s: 'We match its music system', icon: thIc('receiver-avr') },
      { v: 'other', t: 'Other speakers or a receiver', s: 'Could be the start of the build', icon: thIc('speaker') },
      { v: 'streamer', t: 'Apple TV or another streamer', s: "Noted — we won't sell you another", icon: thIc('streamer-box') },
      { v: 'nothing', t: 'Nothing yet', s: 'Clean slate, full choice', icon: thIc('empty-box') } ] },
  { key: 'home', num: 12, q: "Last one — your home and your neighbours",
    why: "Apartments cap the subwoofer (your neighbours thank you). Media rooms unlock the big builds. Big screens also trigger a delivery and door-fit check.",
    opts: () => [
      { v: 'apartment', t: 'Apartment — neighbours below/beside', s: 'Smaller sealed sub, night mode surfaced', icon: thIc('apartment') },
      { v: 'house', t: 'House — we can play it loud', s: 'Full range of picks', icon: thIc('house') },
      { v: 'media', t: 'Dedicated media room', s: 'Atmos and components unlocked', icon: thIc('theater-room') } ] },
];

function tvisible() { return THEATER_QUESTIONS.filter(q => !q.when || q.when()); }

function startTheaterBuy() {
  setPageTheme('everyday');
  hideAllSections();
  document.getElementById('quiz').style.display = 'block';
  Object.keys(tanswers).forEach(k => delete tanswers[k]);
  tstep = -1;
  setScene('');
  if (TH_DATA) { thRenderCover(); return; }
  stepsEl.innerHTML = '<p class="q">Stocking the theater aisle…</p>';
  bar.style.width = '4%';
  fetch('/api/theater-data').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => { TH_DATA = d; thRenderCover(); })
    .catch(() => thStockingFallback());
}

function thStockingFallback() {
  hideAllSections();
  const el = document.getElementById('theater');
  el.style.display = 'block';
  el.innerHTML = `<button class="back" onclick="backToFlowPick()">← Back</button>
    <p class="q"><span class="big-ico">${bico('tv')}</span>Home Theater</p>
    <div class="note">🚧 <b>We're stocking this aisle now.</b> TVs and sound are next — picked the same way as everything else here: real prices we verified at the store, specs from the maker, and matched to your room instead of a spec sheet.</div>
    <p class="factline">Nothing is listed until its price is verified — that's the rule everywhere in this store.</p>`;
  window.scrollTo(0, 0);
}

function thRenderCover() {
  bar.style.width = '4%';
  setScene('');
  const feat = [
    { icon: 'tv', t: 'Right size, first try', s: 'Seating distance runs the size formula — no more too-small regrets' },
    { icon: 'surround-sound', t: 'Sound that fits your room', s: 'Soundbar or real speakers — decided by your wiring tolerance, not hype' },
    { icon: 'money-bag', t: 'One honest total', s: 'Mount, cables and extras inside the price — never a bare product price' },
    { icon: 'swap-arrows', t: 'Out of stock? Swap it', s: 'Every item has same-level alternatives, so one empty shelf never sinks the trip' } ];
  stepsEl.innerHTML = `<button class="back" onclick="backToFlowPick()">← Back</button>
    <div class="quiz-stage" data-tint="0">
    <p class="th-kicker">Home Theater Picker</p>
    <p class="th-h">Build your home theater in 12 quick questions</p>
    <p class="th-sub">Tell us about your room and how you watch. We size the TV, pick the panel for your light, and build a <b>complete</b> system — TV, sound, cables and all — at three budgets: <b>Good, Better, Best</b>. Every item comes with same-level swaps in case your store is out of stock.</p>
    <div class="th-coverbtns">
      <button class="cta-big" onclick="thStartQuiz()">Start Matching →</button>
      <button class="cta-big th-alt" onclick="thShowOverride()">I know what I want</button>
    </div>
    <p class="th-sub">Already know your TV, your sound, or any single piece? Tap <b>I know what I want</b> and pick it yourself — we'll offer guided help for the rest, and still check that everything fits together.</p>
    <div class="tile-grid th-static">${feat.map((f, i) => tileHTML({ i, lg: true, icon: thIc(f.icon), title: f.t, desc: f.s, onclick: 'void(0)' })).join('')}</div>
    </div>`;
  window.scrollTo(0, 0);
}

function thShowOverride() {
  tstep = -2;
  bar.style.width = '4%';
  const cat = (role, name, states) => `<div class="th-cat"><div class="th-role">${role}</div><div class="th-catname">${name}</div>${states.map(s => `<span class="th-state"><b>${s[0]}</b> — ${s[1]}</span>`).join('')}</div>`;
  stepsEl.innerHTML = `<button class="back" onclick="thRenderCover()">← Back</button>
    <div class="quiz-stage" data-tint="1">
    <p class="th-kicker">I Know What I Want</p>
    <p class="th-h">Pick your pieces. We'll mind the fit.</p>
    <p class="th-sub">Knowing one piece doesn't mean knowing them all. Set each one your way — and where you'd like help, we step in for just that piece, like the monitor offers around a laptop setup.</p>
    <div class="th-catrow">
      ${cat('The TV', 'Television', [['I know mine', 'pick it from the full list'], ['Already have it', 'tell us the model — it still counts for fit and ports'], ['Help me choose', "we'll ask the TV questions only"]])}
      ${cat('The Sound', 'Audio', [['I know mine', 'bar, kit, or receiver + speakers'], ['Already have it', "we'll build the rest around it"], ['Help me choose', "we'll ask the sound questions only"]])}
      ${cat('The Rest', 'Cables, mount, extras', [['I know mine', 'add exactly what you want'], ['Skip it', 'bare minimum, nothing upsold'], ['Help me choose', "we'll spec the right cables and mount"]])}
    </div>
    <div class="th-warn"><b>Your picks still get the checks.</b> Stand width, feet span, HDMI port counts, eARC, outlet placement — we verify your choices play nicely together and flag anything that won't, before you buy. Knowing what you want never gets argued with; it just gets verified.</div>
    <p class="th-sub">The fastest way to use a model you already know: search it, open its page, and the fit checks run there. Or take the questions and let the room decide.</p>
    <div class="th-coverbtns">
      <button class="cta-big" onclick="startModelLookup()">Search a model →</button>
      <button class="cta-big th-alt" onclick="thStartQuiz()">Start the questions</button>
    </div>
    </div>`;
  window.scrollTo(0, 0);
}

function thStartQuiz() { tstep = 0; trender(); }

function trender() {
  const V = tvisible();
  if (tstep > V.length - 1) tstep = V.length - 1;
  const Q = V[tstep];
  bar.style.width = ((tstep + 1) / (V.length + 1) * 100) + '%';
  setScene('');
  let h = `<button class="back" onclick="${tstep === 0 ? 'thRenderCover()' : 'tback()'}">← Back</button>`;
  h += `<div class="quiz-stage" data-tint="${tstep % 5}">`;
  h += `<p class="th-qcount">Question ${Q.num} of 12${Q.cond ? ` <span class="th-cond">${Q.cond}</span>` : ''}</p>`;
  h += `<p class="q">${Q.q}</p>`;
  if (Q.why) h += `<p class="th-why">${Q.why}</p>`;
  if (Q.parts) {
    Q.partsList.forEach(part => {
      h += `<p class="th-partlab">${part.label}</p><div class="tile-grid">`;
      const opts = part.opts();
      opts.forEach((o, i) => {
        const wide = i === opts.length - 1 && opts.length % 2 === 1;
        h += tileHTML({ i, wide, icon: o.icon, title: o.t, desc: o.s, on: tanswers[part.key] === o.v, onclick: `tpickPart('${part.key}','${o.v}')` });
      });
      h += '</div>';
    });
    if (Q.partsList.every(p => tanswers[p.key])) h += thContinueHTML();
  } else if (Q.multi) {
    const sel = tanswers[Q.key] || [];
    h += '<div class="tile-grid">';
    const opts = Q.opts();
    opts.forEach((o, i) => {
      const wide = i === opts.length - 1 && opts.length % 2 === 1;
      h += tileHTML({ i, wide, icon: o.icon, title: o.t, desc: o.s, on: sel.includes(o.v), onclick: `ttoggle('${Q.key}','${o.v}')` });
    });
    h += '</div>';
    h += `<p class="th-why">${sel.length} of 2 picked — tap to change.${sel.length ? '' : ' Pick at least one to go on.'}</p>`;
    if (sel.length) h += thContinueHTML();
  } else {
    h += '<div class="tile-grid">';
    const opts = Q.opts();
    opts.forEach((o, i) => {
      const wide = i === opts.length - 1 && opts.length % 2 === 1;
      h += tileHTML({ i, wide, icon: o.icon, title: o.t, desc: o.s, onclick: `tpick('${Q.key}','${o.v}')` });
    });
    h += '</div>';
  }
  h += '</div>';
  stepsEl.innerHTML = h;
  window.scrollTo(0, 0);
}

function thContinueHTML() {
  return `<div class="th-cont"><button class="cta-big" onclick="tcontinue()">Next →</button></div>`;
}
function tcontinue() {
  const V = tvisible();
  if (tstep < V.length - 1) { tstep++; trender(); } else thFinish();
}
function tpick(k, v) {
  tanswers[k] = v;
  const V = tvisible();
  if (tstep < V.length - 1) { tstep++; trender(); } else thFinish();
}
function tpickPart(k, v) { tanswers[k] = v; trender(); }
function ttoggle(k, v) {
  const cur = tanswers[k] || [];
  const i = cur.indexOf(v);
  if (i >= 0) cur.splice(i, 1);
  else { cur.push(v); if (cur.length > 2) cur.shift(); }
  tanswers[k] = cur;
  trender();
}
function tback() { if (tstep > 0) { tstep--; trender(); } }

// ---- results -------------------------------------------------------------
const TH_DIST_LABEL = { under6: 'Under 6 ft', '6-7': '6–7 ft', '8-9': '8–9 ft', '10-11': '10–11 ft', '12plus': '12 ft +' };
const TH_WATCH_LABEL = { movies: 'Movies', sports: 'Sports', gaming: 'Gaming', everyday: 'Everyday', music: 'Music' };
const TH_LIGHT_LABEL = { dark: 'dark room', mixed: 'mixed light', glare: 'bright room, windows opposite', bright: 'bright room' };
const TH_HOME_LABEL = { apartment: 'apartment', house: 'house', media: 'media room' };
const TH_GAME_LABEL = { ps5: 'PS5', xbox: 'Xbox', pc: 'gaming PC', switch: 'Switch', several: 'several consoles' };
const TH_BAND_MAX = { under750: 750, '750-1250': 1250, '1250-2500': 2500, '2500-5000': 5000 };
const TH_LIGHT_CLAUSE = { dark: 'Lights mostly off: deep blacks are what you paid for.', mixed: 'Mixed light: the anti-glare test matters here.', glare: 'Windows opposite: anti-glare is doing real work here.', bright: 'Bright room, no direct glare on the screen.' };

function thStaticVeto() { return ['news', 'pc', 'hud'].includes(tanswers.static); }

function thTierTV(tierKey) {
  const base = TH_DATA.tiers[tierKey].tv;
  if (tierKey === 'better' && thStaticVeto())
    return { tv: TH_DATA.veto.better_tv, note: 'Swapped in for your answers: your leave-it-on habit is the one real burn-in risk for OLED, so this tier runs a Mini-LED panel instead. It cannot burn in — the rest of the system is unchanged.' };
  if (tierKey === 'better' && tanswers.light === 'glare')
    return { tv: TH_DATA.veto.better_tv, note: 'Swapped in for your answers: with windows opposite the screen, this anti-glare Mini-LED stays watchable at noon — an OLED would mirror the room back at you.' };
  if (tierKey === 'best' && thStaticVeto())
    return { tv: TH_DATA.veto.best_tv, note: 'Swapped in for your answers: your leave-it-on habit is the one real burn-in risk for OLED, so the flagship here is a Mini-LED. It cannot burn in — and it is currently on clearance, so stock is limited.' };
  return { tv: base, note: '' };
}

function thTierTotal(tierKey) {
  const T = TH_DATA.tiers[tierKey];
  const { tv } = thTierTV(tierKey);
  let t = tv.price + T.sound.price + (T.sound2 ? T.sound2.price : 0);
  if (tierKey !== 'best') t += TH_DATA.cable.price;
  return t;
}

function thSizeNote() {
  const d = tanswers.dist;
  if (d === 'dontknow') {
    return { small: 'Small room ≈ 5–7 ft of viewing distance — 55–65″ territory. The 65″ systems below sit at the top of that range.',
             medium: 'Medium room ≈ 8–9 ft — 65″ is the sweet spot, and it is exactly what GOOD and BETTER carry.',
             large: 'Large room ≈ 10–12 ft — you want 77″ or more. BEST carries it; the 65″ systems will feel a size small from the couch.' }[tanswers.roomsize] || '';
  }
  return { under6: 'Your couch distance sizes a 55″ screen. The systems below start at 65″ — one size up. In a small room that reads as cinematic, not cramped, as long as the stand fits it.',
           '6-7': 'At 6–7 ft, 65″ is the immersive size — and it is exactly what GOOD and BETTER carry.',
           '8-9': 'At 8–9 ft, 65″ is the sweet spot and 77″ is the cinematic stretch — GOOD and BETTER sit at the sweet spot, BEST takes the stretch.',
           '10-11': 'At 10–11 ft you want 77″. BEST carries it; GOOD and BETTER at 65″ will feel a size small from your couch — that is their honest trade for the price.',
           '12plus': 'At 12 ft or more you want 85″ or a projector — bigger than any system below. These picks still fit your room and your answers; just know the screen runs a size under ideal at that distance.' }[d] || '';
}

function thChips() {
  const c = [];
  if (tanswers.placement === 'stand') c.push('✓ Feet span fits a standard stand');
  if (tanswers.placement === 'mount') c.push('✓ Wall mount planned in');
  if (tanswers.placement === 'renter') c.push('✓ No-drilling picks only');
  c.push('✓ Certified HDMI cable included');
  if ((tanswers.watch || []).includes('gaming')) c.push(`✓ Fast HDMI ports counted for your ${TH_GAME_LABEL[tanswers.gaming] || 'gaming gear'} + the soundbar`);
  if (tanswers.subs === 'often') c.push('✓ Real center channel in every system — dialogue stays clear');
  if (tanswers.own === 'streamer') c.push("✓ No streamer sold to you twice");
  return c;
}

function thFinish() {
  thTab = { under750: 'good', '750-1250': 'good', '1250-2500': 'better', '2500-5000': 'best', '5000plus': 'best', unsure: 'better' }[tanswers.budget] || 'better';
  renderThResults();
}

function thShowTab(t) { thTab = t; renderThResults(); }

function thSwapsHTML(swaps) {
  if (!swaps || !swaps.length) return '';
  return `<div class="th-swaplab">Out of stock? Swap — same level, same ballpark</div><div class="th-swaps">${swaps.map(s => `<div class="th-swap"><div class="th-sname">${esc(s.name)}${s.price != null ? ` — $${fmt$(s.price)}` : ''}</div><div class="th-smeta">${esc(s.meta)}</div></div>`).join('')}</div>`;
}

function thProductBlock(kind, p, role) {
  return `${cardGallery(kind, p.photo ? [p.photo] : null, p.name)}<div class="th-role">${role}</div><div class="th-name">${esc(p.name)}</div><div class="th-price">$${fmt$(p.price)}</div><div class="th-meta">${esc(p.meta)}</div>${thSwapsHTML(p.swaps)}`;
}

function thPanelHTML(tierKey) {
  const T = TH_DATA.tiers[tierKey];
  const { tv, note: tvNote } = thTierTV(tierKey);
  const total = thTierTotal(tierKey);
  let flags = '';
  if (tierKey === 'best' && tanswers.wires === 'none')
    flags += `<p class="th-flag">⚠ This tier breaks your “no wires at all” answer — a receiver system runs speaker wire. BETTER is your no-wire ceiling.</p>`;
  if (tanswers.own === 'avr' && tierKey === 'best')
    flags += `<p class="th-flag">You already own a receiver: if its HDMI ports are 2.1, keep it and put the sound budget into the speakers — the SVS set is the upgrade, not the box.</p>`;
  if (tanswers.own === 'sonos' && tierKey === 'better')
    flags += `<p class="th-flag">You own Sonos: the Arc Ultra swap keeps your whole home in one family.</p>`;
  const soundHTML = T.sound2
    ? `${cardGallery('speaker', [T.sound.photo, T.sound2.photo], T.sound.name + ' + ' + T.sound2.name)}<div class="th-role">The sound we like</div><div class="th-name">${esc(T.sound.name)} + ${esc(T.sound2.name)}</div><div class="th-price">$${fmt$(T.sound.price + T.sound2.price)}</div><div class="th-prod"><div class="th-name2">${esc(T.sound.name)} — $${fmt$(T.sound.price)}</div><div class="th-meta">${esc(T.sound.meta)}</div>${thSwapsHTML(T.sound.swaps)}</div><div class="th-prod"><div class="th-name2">${esc(T.sound2.name)} — $${fmt$(T.sound2.price)}</div><div class="th-meta">${esc(T.sound2.meta)}</div>${thSwapsHTML(T.sound2.swaps)}</div>`
    : thProductBlock('speaker', T.sound, 'The sound we like');
  const cableLine = tierKey === 'best'
    ? 'Cables: speaker wire and certified HDMI run about $40 — inside this tier’s reserve.'
    : `${esc(TH_DATA.cable.name)} — $${fmt$(TH_DATA.cable.price)}, already in the total.`;
  return `<p class="th-tagline">${esc(T.tagline)}</p>
  ${flags}
  <div class="th-squares">
    <div class="th-square">${thProductBlock('tv', tv, tierKey === 'best' ? 'The TV' : 'The TV we like')}${tvNote ? `<p class="th-flag">${esc(tvNote)}</p>` : ''}</div>
    <div class="th-square">${soundHTML}</div>
  </div>
  <div class="th-roomviz">
    <div class="th-viz"><p class="th-vizcap">Your room from above — where everything goes</p>${thOverhead(T.viz)}</div>
    <div class="th-viz"><p class="th-vizcap">From the couch — heights &amp; eye line</p>${thCouchview(T.viz)}</div>
  </div>
  <p class="factline">${esc(thRoomLine())} ${esc(TH_LIGHT_CLAUSE[tanswers.light] || '')}</p>
  <div class="th-foot"><div><div class="th-total">${esc(T.label)} total ${tierKey === 'best' ? '' : '(cables in)'}: $${fmt$(total)}</div><div class="th-cable">${cableLine}</div></div>
  <div class="th-note">${esc(T.note)}</div></div>`;
}

function thRoomLine() {
  const couch = { straight: 'straight sofa', sectional: 'L-shaped sectional', recliners: 'recliner rows', chairs: 'loveseat + chairs' }[tanswers.couch] || 'your couch';
  const around = { enclosed: 'walls all around', openside: 'open on one side', openbehind: 'open behind the couch', openplan: 'a big open-plan space' }[tanswers.around] || '';
  return `Your room: ${around}, ${couch} facing the TV wall (from your layout answers).`;
}

function renderThResults() {
  hideAllSections();
  const rEl = document.getElementById('results');
  rEl.style.display = 'block';
  const tiers = ['good', 'better', 'best'];
  const badges = { good: 'LOWEST COMPLETE', better: 'OUR PICK ★', best: 'NO REGRETS' };
  const watchTxt = (tanswers.watch || []).map(w => TH_WATCH_LABEL[w]).join(' + ').toLowerCase();
  const recap = `${TH_DIST_LABEL[tanswers.dist] === undefined ? '' : 'Couch ' + TH_DIST_LABEL[tanswers.dist].toLowerCase() + ' · '}${watchTxt} · ${TH_LIGHT_LABEL[tanswers.light] || ''} · ${TH_HOME_LABEL[tanswers.home] || ''}`;
  const bandMax = TH_BAND_MAX[tanswers.budget];
  const defTotal = thTierTotal(thTab);
  let h = `<button class="back" onclick="backToFlowPick()">← All aisles</button>
  <p class="q">Three complete systems for your room</p>
  <p class="th-sub">${esc(recap)} — every total includes the cables. ${esc(TH_DATA.checked_label || '')}.</p>
  <div class="note">📐 <b>Sizing, honestly:</b> ${esc(thSizeNote())}</div>`;
  if (tanswers.placement === 'fireplace')
    h += `<div class="th-warn"><b>Fireplace mounting:</b> the screen sits high — plan a tilting mount and expect some neck angle. It is the one placement compromise in this build.</div>`;
  if (tanswers.home === 'apartment')
    h += `<div class="note">🏢 <b>Apartment note:</b> every sub below is sealed or compact, and night mode is one button — your neighbours stay happy.</div>`;
  const chips = thChips();
  if (chips.length) h += `<div class="chips">${chips.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>`;
  h += `<div class="th-tabs">${tiers.map(t => `<button class="th-tab${t === thTab ? ' on' : ''}" onclick="thShowTab('${t}')"><span class="th-tabname">${TH_DATA.tiers[t].label}</span><span class="th-tabprice">$${fmt$(thTierTotal(t))}</span><span class="th-badge">${badges[t]}</span></button>`).join('')}</div>`;
  if (bandMax && defTotal > bandMax)
    h += `<p class="th-flag">Honest note: your budget answer tops out at $${fmt$(bandMax)} — the closest complete system at today's verified prices lands at $${fmt$(defTotal)}. Nothing here is padded; this is what “correct” costs right now.</p>`;
  h += thPanelHTML(thTab);
  h += `<div class="th-next"><p class="th-nextlab">After you buy — the next steps</p>
    <ol>
      <li><b>One trip list:</b> the TV, the sound, the certified cable — and a spare HDMI, because the second one is always the one you needed.</li>
      <li><b>Open it within 48 hours.</b> Check the panel corners in a dark room. A bad corner found this week is an exchange; found next month, it's a warranty claim.</li>
      <li><b>Soundbar first, TV second</b> if you're wall-mounting — the bar's mount height decides where the TV's bottom edge lands.</li>
      <li><b>Run eARC, then check the TV says “eARC”</b> — not just ARC. That's the setting that carries the good formats.</li>
      <li><b>Sub crawl, short version:</b> put the sub in your seat, play something bassy, walk the front wall — where it's smoothest is where it lives.</li>
    </ol>
    <p class="factline">Still price-shopping? Anyone selling you a $100 HDMI cable is selling you a story — the certified $9 cable in these totals is the right cable.</p></div>
  <div class="th-cont"><button class="cta-big th-alt" onclick="startTheaterBuy()">Start over</button></div>`;
  rEl.innerHTML = h;
  window.scrollTo(0, 0);
}

// ---- room visuals (ported from the approved design's generators) --------
function thLay(cfg) {
  const L = { tvH: 86, couchTop: 330, floorBottom: 330, couchW: 150, couchX: 175, sub: null, rears: null };
  if (cfg === 'bar51') { L.sub = [82, 300]; L.rears = 'wiredsb'; }
  if (cfg === 'atmos') { L.tvH = 78; L.sub = [82, 300]; L.rears = 'wireless'; }
  if (cfg === 'comp51') { L.tvH = 78; L.couchTop = 345; L.floorBottom = 345; L.sub = [82, 315]; L.rears = 'side'; L.comp = true; }
  return L;
}

function thOverhead(cfg) {
  if (tanswers.around === 'openbehind' || tanswers.around === 'openplan') return thOverheadOpen(cfg);
  const L = thLay(cfg), cx = L.couchX, ct = L.couchTop, cw = L.couchW;
  const tvW = cfg === 'comp51' ? 226 : 196, barW = tvW - 30;
  const dist = TH_DIST_LABEL[tanswers.dist] || { small: '≈5–7 ft (small room)', medium: '≈8–9 ft (medium room)', large: '≈10–12 ft (large room)' }[tanswers.roomsize] || '8–9 ft';
  const P = [];
  P.push(`<defs><clipPath id="thclip"><rect x="35" y="18" width="430" height="404" rx="10"/></clipPath></defs>`);
  P.push(`<rect x="35" y="18" width="430" height="404" rx="10" fill="#f7f3ea" stroke="#b8ad97" stroke-width="1.5"/>`);
  P.push(`<g clip-path="url(#thclip)">`);
  [46, 70].forEach(r => P.push(`<circle cx="265" cy="262" r="${r}" fill="none" stroke="#c4b59a" stroke-width="1.2" stroke-dasharray="3 5"/>`));
  P.push(`<polygon points="${250 - tvW / 2 + 12},56 ${250 + tvW / 2 - 12},56 ${250 + tvW / 2 + 40},${ct - 8} ${250 - tvW / 2 - 40},${ct - 8}" fill="#fde68a" opacity="0.28"/>`);
  if (L.rears === 'wiredsb') { P.push(`<path d="M115,${ct + 63} C 70,${ct + 40} 70,150 210,75" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="5 4"/><path d="M389,${ct + 63} C 434,${ct + 40} 434,150 294,75" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="5 4"/>`); }
  if (L.rears === 'side') { P.push(`<path d="M146,${ct - 24} C 120,150 180,110 226,86" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="5 4"/><path d="M341,${ct - 24} C 366,150 306,110 260,86" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="5 4"/>`); }
  P.push('</g>');
  P.push(`<line x1="35" y1="104" x2="465" y2="104" stroke="#ddd3bd" stroke-width="1.2"/><path d="M35,104 V422 M465,104 V422" stroke="#ddd3bd" stroke-width="1.2"/>`);
  P.push(`<rect x="${250 - tvW / 2}" y="46" width="${tvW}" height="10" rx="4" fill="#0f172a"/>`);
  if (!L.comp) P.push(`<rect x="${250 - barW / 2}" y="66" width="${barW}" height="9" rx="4" fill="#334155"/>`);
  if (cfg === 'atmos') [205, 295].forEach(x => P.push(`<path d="M${x},64 v-14" stroke="#0284c7" stroke-width="2"/><polygon points="${x - 4},52 ${x + 4},52 ${x},44" fill="#0284c7"/><text x="${x + 8}" y="56" font-size="9.5" fill="#0284c7">up</text>`));
  if (L.comp) {
    P.push(`<rect x="${250 - tvW / 2 - 26}" y="60" width="22" height="22" rx="3" fill="#7c3aed"/><rect x="${250 + tvW / 2 + 4}" y="60" width="22" height="22" rx="3" fill="#7c3aed"/>`);
    P.push(`<rect x="239" y="80" width="22" height="16" rx="3" fill="#7c3aed"/>`);
    P.push(`<rect x="292" y="60" width="64" height="22" rx="3" fill="#e8e2d4" stroke="#b8ad97"/><text x="324" y="74.5" font-size="8" fill="#6b6152" text-anchor="middle">RECEIVER</text>`);
  }
  if (L.sub) P.push(`<rect x="${L.sub[0]}" y="${L.sub[1]}" width="34" height="34" rx="5" fill="#7c3aed"/><text x="${L.sub[0] + 17}" y="${L.sub[1] + 21}" font-size="9.5" fill="#fff" text-anchor="middle" font-weight="700">SUB</text>`);
  if (L.rears === 'wiredsb' || L.rears === 'wireless') {
    if (L.rears === 'wireless') P.push(`<text x="110" y="${ct + 44}" font-size="16" fill="#94a3b8">∿</text><text x="379" y="${ct + 44}" font-size="16" fill="#94a3b8">∿</text>`);
    P.push(`<rect x="98" y="${ct + 52}" width="22" height="22" rx="3" fill="#7c3aed"/><rect x="367" y="${ct + 52}" width="22" height="22" rx="3" fill="#7c3aed"/>`);
  }
  if (L.rears === 'side') P.push(`<rect x="135" y="${ct - 35}" width="22" height="22" rx="3" fill="#7c3aed"/><rect x="330" y="${ct - 35}" width="22" height="22" rx="3" fill="#7c3aed"/>`);
  P.push(`<g><rect x="${cx}" y="${ct}" width="${cw}" height="44" rx="9" fill="#dbeafe" stroke="#7ea6d8" stroke-width="1.5"/><rect x="${cx}" y="${ct - 12}" width="${cw}" height="16" rx="7" fill="#c7dbfa"/><rect x="${cx - 14}" y="${ct - 6}" width="16" height="56" rx="7" fill="#c7dbfa"/><rect x="${cx + cw - 2}" y="${ct - 6}" width="16" height="56" rx="7" fill="#c7dbfa"/></g>`);
  P.push(`<line x1="452" y1="56" x2="452" y2="${ct}" stroke="#b8ad97" stroke-width="1.2" stroke-dasharray="2 4"/><text x="462" y="${(56 + ct) / 2}" font-size="10.5" fill="#6b6152" text-anchor="middle" transform="rotate(-90 462 ${(56 + ct) / 2})">${dist} to the screen</text>`);
  const legend = TH_DATA.tiers[{ bar51: 'good', atmos: 'better', comp51: 'best' }[cfg]].legend;
  legend.forEach((s, i) => P.push(`<text x="52" y="${380 + i * 14}" font-size="11" fill="#475569">${esc(s)}</text>`));
  return `<svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" font-family="Verdana, sans-serif">${P.join('')}</svg>`;
}

function thOverheadOpen(cfg) {
  const dist = TH_DIST_LABEL[tanswers.dist] || '8–9 ft';
  const rearY = cfg === 'atmos' ? 332 : 342, rearNote = cfg === 'atmos' ? 'beside the couch · aimed in' : 'beside the couch · angled in';
  return `<svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" font-family="Verdana, sans-serif">
  <rect x="35" y="18" width="430" height="404" rx="10" fill="#f7f3ea" stroke="#b8ad97" stroke-width="1.5"/>
  <polygon points="165,56 335,56 372,322 128,322" fill="#fde68a" opacity="0.28"/>
  <line x1="35" y1="104" x2="465" y2="104" stroke="#ddd3bd" stroke-width="1.2"/>
  <rect x="152" y="46" width="196" height="10" rx="4" fill="#0f172a"/>
  <rect x="167" y="66" width="166" height="9" rx="4" fill="#334155"/>
  <rect x="82" y="300" width="34" height="34" rx="5" fill="#7c3aed"/><text x="99" y="321" font-size="9.5" fill="#fff" text-anchor="middle" font-weight="700">SUB</text>
  <rect x="96" y="${rearY}" width="22" height="22" rx="3" fill="#7c3aed"/><rect x="382" y="${rearY}" width="22" height="22" rx="3" fill="#7c3aed"/>
  <path d="M118,${rearY + 11} L168,336" stroke="#94a3b8" stroke-width="1.4" stroke-dasharray="4 4"/><path d="M382,${rearY + 11} L332,336" stroke="#94a3b8" stroke-width="1.4" stroke-dasharray="4 4"/>
  <g><rect x="175" y="330" width="150" height="44" rx="9" fill="#dbeafe" stroke="#7ea6d8" stroke-width="1.5"/><rect x="175" y="318" width="150" height="16" rx="7" fill="#c7dbfa"/><rect x="161" y="324" width="16" height="56" rx="7" fill="#c7dbfa"/><rect x="323" y="324" width="16" height="56" rx="7" fill="#c7dbfa"/></g>
  <line x1="452" y1="56" x2="452" y2="330" stroke="#b8ad97" stroke-width="1.2" stroke-dasharray="2 4"/><text x="462" y="193" font-size="10.5" fill="#6b6152" text-anchor="middle" transform="rotate(-90 462 193)">${dist} to the screen</text>
  <text x="52" y="392" font-size="11.5" fill="#475569">Surrounds stand ${rearNote} — no wall needed.</text>
  <text x="52" y="410" font-size="11.5" fill="#475569">An open plan's rears swing to the sides; that's the honest layout here.</text>
</svg>`;
}

function thCouchview(cfg) {
  const L = thLay(cfg);
  const tvW = cfg === 'comp51' ? 226 : 196, barW = tvW - 30, barH = { bar51: 13, atmos: 15, comp51: 0 }[cfg];
  const wallNote = tanswers.placement === 'fireplace' ? 'Panel rides high over the fireplace — tilt mount planned'
    : (tanswers.placement === 'stand' || tanswers.placement === 'renter') ? 'Panel on its stand — eye level sitting down'
    : 'Panel flat to the wall — eye level sitting down';
  const P = [];
  P.push(`<text x="250" y="46" font-size="12" fill="#475569" text-anchor="middle">${wallNote}</text>`);
  P.push(`<rect x="90" y="60" width="330" height="300" fill="#f7f3ea" stroke="#b8ad97" stroke-width="1.5"/>`);
  P.push(`<polygon points="90,360 420,360 470,428 40,428" fill="#efe9dc"/>`);
  P.push(`<rect x="${250 - tvW / 2}" y="84" width="${tvW}" height="${L.tvH}" rx="5" fill="#0f172a"/>`);
  P.push(`<rect x="${250 - tvW / 2 + 8}" y="92" width="${tvW - 16}" height="${L.tvH - 16}" fill="#0e3a5c"/>`);
  if (!L.comp) P.push(`<rect x="${250 - barW / 2}" y="${84 + L.tvH + 12}" width="${barW}" height="${barH}" rx="5" fill="#334155"/>`);
  if (L.comp) {
    P.push(`<rect x="${250 - tvW / 2 - 34}" y="158" width="22" height="44" rx="3" fill="#7c3aed"/><rect x="${250 + tvW / 2 + 12}" y="158" width="22" height="44" rx="3" fill="#7c3aed"/>`);
    P.push(`<rect x="239" y="${84 + L.tvH + 10}" width="22" height="15" rx="3" fill="#7c3aed"/>`);
    P.push(`<rect x="316" y="${84 + L.tvH + 8}" width="60" height="20" rx="3" fill="#e8e2d4" stroke="#b8ad97"/>`);
    P.push(`<circle cx="150" cy="352" r="15" fill="#7c3aed"/><text x="150" y="356" font-size="8.5" fill="#fff" text-anchor="middle" font-weight="700">SUB</text>`);
  }
  [196, 304].forEach(x => P.push(`<path d="M${x - 10},${84 + L.tvH + barH + 16} q10,8 20,0" fill="none" stroke="#94a3b8" stroke-width="1.6"/>`));
  P.push(`<line x1="250" y1="366" x2="250" y2="${84 + L.tvH / 2}" stroke="#b8ad97" stroke-width="1.2" stroke-dasharray="2 4"/><text x="258" y="240" font-size="10" fill="#6b6152">eye height</text>`);
  P.push(`<g><rect x="150" y="372" width="200" height="34" rx="12" fill="#dbeafe" stroke="#7ea6d8" stroke-width="1.5"/><circle cx="205" cy="366" r="11" fill="#93c5fd" stroke="#7ea6d8"/><circle cx="295" cy="366" r="11" fill="#93c5fd" stroke="#7ea6d8"/></g>`);
  return `<svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" font-family="Verdana, sans-serif">${P.join('')}</svg>`;
}
