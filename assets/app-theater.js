// ------------------------------------------------------------ home theater
// The Home Theater picker (Build 2026-11-06.10): the fourth flow, built on
// the same tile component and quiz shell as the gear and computer pickers.
// FLOW (design of record: ht-picker-design/FLOW-DESIGN-OF-RECORD.md,
// dictated by Caleb Nov 6, 2026): (1) pick your budget; (2) DESIGN YOUR
// ROOM — its own step (distance, seating, couch placement, open walls,
// lighting, how the TV sits) because the room setup happens no matter
// what the shopper buys; (3) RENDER CHECK — the room's above view, Edit
// or Next; (4) the TV questions; (5) the sound questions, after all TV
// questions. Results show the room again with BOTH views (above + front)
// beside the picks, in two columns — TV left, sound right.
// The room renders are the Nov 3 Jim set (33 serving files under
// /assets/renders/, post-rename names per render-requirements-v3-final).
// Prices live in theater.json (served at /api/theater-data), verified at
// Best Buy, Walmart, and the makers' own stores.
// PRESERVED from build .8: the recommendation engine — tiers, totals
// math, swap mechanics (ruling R1), the #1-pick/bend behavior, and the
// stand-in TV vetoes. Build .10 changes: the flow above; the override
// page runs REAL SUBSET quizzes (audit A8); the "Start 3.1" chip is a
// real priced swap (SVS component prices, verified at svsound.com
// Nov 6, 2026); "Already have it" on the override page is real — the
// part leaves the totals and its card says so.
let TH_DATA = null;
const tanswers = {};
let tstep = -1;               // -1 cover, -2 "I know what I want", >= 0 quiz
let thTab = 'better';
// Build .8 (Caleb's ruling R1): swap chips actually swap. State is
// keyed "tier:slot" (slot: tv | sound | sound2) and holds the chosen
// product object; it lives outside the render so it persists across
// tab switches, and every total reads through the effective-product
// helpers below — card, copy, price, and tier total all follow.
let thSwapState = {};
// Build .10: which questions run. 'full' = the whole flow; 'tv' /
// 'sound' / 'rest' = the override page's subset quizzes; 'fit' = the
// room-only fit check (everything already owned).
let thMode = 'full';
// Build .10: parts the shopper already owns (override page). Owned
// parts are excluded from every total and stamped on their cards.
let thOwned = { tv: false, sound: false, rest: false };

const thIc = n => `<img class="v2ic" src="/assets/icons-v2/${n}.png" alt="">`;
const thGlyph = t => `<span class="th-glyph">${t}</span>`;

// Question groups: budget | room | check | tv | sound | rest. The
// room step (design step 2) is common to every path — the room setup
// happens no matter what is bought (design's key principle).
// own/home carry groups sound+rest: they decide sound-family fit AND
// the extras rules (no second streamer, delivery fit), so both subset
// quizzes that depend on them ask them (shared-context rule).
const THEATER_QUESTIONS = [
  { key: 'budget', group: 'budget', q: "What's your total budget for everything?",
    why: "TV + sound + mount and cables, before tax. We split it for you — soundbar setups put most of it in the TV; speaker setups split it closer to even.",
    opts: () => [
      { v: 'under750', t: 'Under $750', s: 'A sharp smaller setup, done right', icon: thGlyph('$') },
      { v: '750-1250', t: '$750 – $1,250', s: 'The classic first real system', icon: thGlyph('$') },
      { v: '1250-2500', t: '$1,250 – $2,500', s: 'Where OLED enters the picture', icon: thGlyph('$') },
      { v: '2500-5000', t: '$2,500 – $5,000', s: 'Big screens and serious sound', icon: thGlyph('$') },
      { v: '5000plus', t: '$5,000+', s: 'Dedicated-room territory', icon: thGlyph('$') },
      { v: 'unsure', t: 'Not sure yet', s: 'See Good / Better / Best sizes', icon: thIc('help-question') } ] },
  { key: 'dist', group: 'room', q: "How far is the couch from the TV wall?",
    why: "This one number sizes your screen. Too small is the #1 regret — between two sizes, movies and games usually want the bigger one.",
    opts: () => [
      { v: 'under6', t: 'Under 6 ft', s: 'Cozy rooms and bedrooms', icon: thGlyph('6') },
      { v: '6-7', t: '6 – 7 ft', s: '', icon: thGlyph('7') },
      { v: '8-9', t: '8 – 9 ft', s: 'The most common living room', icon: thGlyph('8') },
      { v: '10-11', t: '10 – 11 ft', s: '', icon: thGlyph('10') },
      { v: '12plus', t: '12 ft or more', s: 'Projectors enter the chat', icon: thGlyph('12') },
      { v: 'dontknow', t: 'Not sure', s: 'Small, medium or large room', icon: thIc('help-question') } ] },
  { key: 'roomsize', group: 'room', when: () => tanswers.dist === 'dontknow',
    q: "How big is the room, roughly?",
    why: "No tape measure needed — the room's size is a good stand-in for the couch distance.",
    opts: () => [
      { v: 'small', t: 'Small room', s: 'Den, bedroom, small lounge', icon: thIc('armchair') },
      { v: 'medium', t: 'Medium room', s: 'A typical living room', icon: thIc('sofa-straight') },
      { v: 'large', t: 'Large room', s: 'Open plan or a big room', icon: thIc('room-open-plan') } ] },
  { key: 'couch', group: 'room', q: "What seating do you have — or want?",
    why: "Your couch plus what's around it gives us the room's shape. Pick the seating first; where it sits comes next.",
    opts: () => [
      { v: 'straight', t: 'Straight sofa, facing the TV', s: 'The classic setup', icon: thIc('sofa-straight') },
      { v: 'sectional', t: 'L-shaped sectional', s: 'Two viewing directions', icon: thIc('sectional-l') },
      { v: 'recliners', t: 'Recliners / theater rows', s: 'Sound aims at the rows', icon: thIc('recliner') },
      { v: 'chairs', t: 'Loveseat + chairs', s: 'Flexible, movable, smaller footprint', icon: thIc('armchair') } ] },
  { key: 'couchpos', group: 'room', when: () => tanswers.couch === 'sectional',
    q: "Where does the sectional sit?",
    why: "An L can float in the middle of the room or tuck into a corner — the corner changes where surround sound can go.",
    opts: () => [
      { v: 'middle', t: 'In the middle of the room', s: 'Space around it', icon: thIc('sectional-l') },
      { v: 'corner', t: 'Tucked into a corner', s: 'Against two walls', icon: thIc('sectional-l') } ] },
  { key: 'corner', group: 'room', when: () => tanswers.couch === 'sectional' && tanswers.couchpos === 'corner',
    q: "Which corner?",
    why: "Standing at the TV wall, looking back at the couch — which corner is the sectional tucked into?",
    opts: () => [
      { v: 'corner-left', t: 'The left corner', s: 'The long side runs down the left wall', icon: thIc('sectional-l') },
      { v: 'corner-right', t: 'The right corner', s: 'The long side runs down the right wall', icon: thIc('sectional-l') } ] },
  { key: 'around', group: 'room', q: "What is around the couch?",
    why: "An open side changes the sound plan, because there's no wall there to hold a surround speaker.",
    opts: () => [
      { v: 'enclosed', t: 'Walls all around', s: 'Surround sound behaves itself here', icon: thIc('room-enclosed') },
      { v: 'openside', t: 'Open on one side', s: 'We compensate that side', icon: thIc('room-open-side') },
      { v: 'openbehind', t: 'Open behind the couch', s: 'No wall for rear speakers — they move to your sides', icon: thIc('room-open-behind') },
      { v: 'openplan', t: 'Big open-plan space', s: 'The whole area counts', icon: thIc('room-open-plan') } ] },
  { key: 'light', group: 'room', q: "How bright is the room when you watch?",
    why: "Panels are picked for your light, not the showroom's. Windows opposite the screen are the one setup that changes everything.",
    opts: () => [
      { v: 'dark', t: 'Mostly dark', s: "Movie-night room — OLED's home turf", icon: thIc('moon-dark') },
      { v: 'mixed', t: 'Mixed light', s: 'Some day, some night', icon: thIc('half-light') },
      { v: 'glare', t: 'Bright — windows opposite', s: 'Anti-glare Mini-LED moves to the front', icon: thIc('sun-glare') },
      { v: 'bright', t: 'Bright, never opposite', s: "Less glare than you'd think", icon: thIc('sun-bright') } ] },
  { key: 'placement', group: 'room', q: "What will the TV sit on — or hang on?",
    why: "The screen can't be wider than the furniture under it, and renters shouldn't be sold a wall mount. This answer quietly caps your size.",
    opts: () => [
      { v: 'mount', t: 'Wall mount is fine', s: 'We include the right mount', icon: thIc('wall-mount') },
      { v: 'stand', t: 'Stand on furniture', s: 'Tell us the furniture width if you know it', icon: thIc('tv-stand') },
      { v: 'renter', t: 'Renter — no drilling', s: 'Stand + soundbar friendly picks', icon: thIc('no-drilling') },
      { v: 'fireplace', t: 'Above the fireplace', s: 'We flag the height and tilt', icon: thIc('fireplace') } ] },
  { key: 'roomcheck', group: 'check', roomcheck: true, q: "Does this look like your room?",
    why: "This is your room from above, drawn from your answers. If it looks wrong, tap Edit and fix the answer that's off — everything you've picked stays put." },
  { key: 'watch', group: 'tv', multi: true, q: "What do you watch most? Pick your top 2",
    why: "We build for your top two and say plainly what got traded off — never one mushy average score.",
    opts: () => [
      { v: 'movies', t: 'Movies & prestige TV', s: 'Size and contrast lead', icon: thIc('film-clapper') },
      { v: 'sports', t: 'Sports', s: 'Brightness, motion, wide seating angles', icon: thIc('sports-ball') },
      { v: 'gaming', t: 'Gaming', s: 'Unlocks the gaming check next', icon: thIc('game-controller') },
      { v: 'everyday', t: 'Everyday shows & news', s: 'All-day comfort picks', icon: thIc('newspaper') },
      { v: 'music', t: 'Music listening', s: 'Stereo quality and whole-home sound', icon: thIc('music-note') } ] },
  { key: 'gaming', group: 'tv', when: () => (tanswers.watch || []).includes('gaming'),
    cond: 'Only if you game',
    q: "What do you game on — and how many?",
    why: "Consoles need fast ports, and the soundbar quietly takes one. We count your devices first, then check the TV can actually hold them.",
    opts: () => [
      { v: 'ps5', t: 'PlayStation 5', s: '', icon: thIc('game-controller'), bg: '#0070d1', ink: '#ffffff' },
      { v: 'xbox', t: 'Xbox Series X | S', s: '', icon: thIc('game-controller'), bg: '#107c10', ink: '#ffffff' },
      { v: 'switch', t: 'Nintendo Switch', s: 'Relaxed requirements — saves you money', icon: thIc('game-controller'), bg: '#e60012', ink: '#ffffff' },
      { v: 'pc', t: 'Gaming PC', s: 'Higher refresh rates pay off here', icon: thIc('desktop-pc'), bg: '#f5c518', ink: '#14213d' },
      { v: 'several', t: 'Several of these', s: 'Port count becomes the deciding spec', icon: thIc('game-controller'), bg: '#7c3aed', ink: '#ffffff' } ] },
  { key: 'static', group: 'tv', q: "Do you leave one channel or app on for hours?",
    why: "The one habit that changes the panel pick. Thousands of hours of the same news ticker or desktop is hard on OLED — mixed use is not, and we'll say so.",
    opts: () => [
      { v: 'news', t: 'One news channel, most of the day', s: 'We steer you to Mini-LED, and explain why', icon: thIc('newspaper') },
      { v: 'pc', t: 'A PC desktop on the TV', s: 'Same protection applies', icon: thIc('desktop-pc') },
      { v: 'hud', t: 'Same game, fixed HUD, long sessions', s: '', icon: thIc('game-controller') },
      { v: 'no', t: 'No — mixed content', s: 'OLED is safe for you. No scare tactics', icon: thIc('check') } ] },
  { key: 'subs', group: 'sound', q: "Do you use subtitles because voices are hard to follow?",
    why: "The most common complaint in home theater — and the most fixable. Riding the volume all night (up for voices, down for explosions) is the same signal. A real center channel carries most of a movie's dialogue.",
    opts: () => [
      { v: 'often', t: 'Yes, often', s: 'A center channel becomes non-negotiable', icon: thIc('check') },
      { v: 'sometimes', t: 'Sometimes', s: 'Dialogue features get a boost', icon: thIc('half-light') },
      { v: 'no', t: 'No', s: 'More freedom in the sound budget', icon: thIc('cross') } ] },
  { key: 'feel', group: 'sound', parts: true, q: "How should it feel? — and the wires question",
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
  { key: 'own', groups: ['sound', 'rest'], q: "What do you already own?",
    why: "So we never sell you a second streamer, the wrong speaker family, or a receiver you don't need.",
    opts: () => [
      { v: 'sonos', t: 'Sonos speakers', s: 'Your sound stays in the family', icon: thIc('speaker') },
      { v: 'avr', t: 'Denon or Yamaha receiver', s: 'We match its music system', icon: thIc('receiver-avr') },
      { v: 'other', t: 'Other speakers or a receiver', s: 'Could be the start of the build', icon: thIc('speaker') },
      { v: 'streamer', t: 'Apple TV or another streamer', s: "Noted — we won't sell you another", icon: thIc('streamer-box') },
      { v: 'nothing', t: 'Nothing yet', s: 'Clean slate, full choice', icon: thIc('empty-box') } ] },
  { key: 'home', groups: ['sound', 'rest'], q: "Last one — your home and your neighbours",
    why: "Apartments cap the subwoofer (your neighbours thank you). Media rooms unlock the big builds. Big screens also trigger a delivery and door-fit check.",
    opts: () => [
      { v: 'apartment', t: 'Apartment — neighbours below/beside', s: 'Smaller sealed sub, night mode surfaced', icon: thIc('apartment') },
      { v: 'house', t: 'House — we can play it loud', s: 'Full range of picks', icon: thIc('house') },
      { v: 'media', t: 'Dedicated media room', s: 'Atmos and components unlocked', icon: thIc('theater-room') } ] },
];

const TH_MODE_GROUPS = {
  full: ['budget', 'room', 'check', 'tv', 'sound', 'rest'],
  tv: ['budget', 'room', 'check', 'tv'],
  sound: ['budget', 'room', 'check', 'sound'],
  rest: ['budget', 'room', 'check', 'rest'],
  fit: ['budget', 'room', 'check']
};
const TH_GROUP_LABEL = { budget: 'Step 1 · Your budget', room: 'Step 2 · Design your room', check: 'Step 3 · Check your room', tv: 'Step 4 · TV questions', sound: 'Step 5 · Sound questions', rest: 'Step 5 · Sound questions' };

function thQGroups(q) { return q.groups || [q.group]; }
function tvisible() {
  const want = TH_MODE_GROUPS[thMode] || TH_MODE_GROUPS.full;
  return THEATER_QUESTIONS.filter(q => {
    if (!thQGroups(q).some(g => want.includes(g))) return false;
    // A part the shopper already owns asks no questions.
    if (q.group === 'tv' && thOwned.tv) return false;
    if ((q.key === 'subs' || q.key === 'feel') && thOwned.sound) return false;
    if ((q.key === 'own' || q.key === 'home') && thOwned.sound && thOwned.rest) return false;
    return !q.when || q.when();
  });
}

// ---- room renders (the Nov 3 set, post-rename serving names) ------------
function thAboveFile() {
  const couch = tanswers.couch || 'straight';
  let shell = tanswers.around || 'enclosed';
  let place = 'centered';
  if (couch === 'sectional') {
    place = tanswers.couchpos === 'corner' ? (tanswers.corner || 'corner-left') : 'middle';
  }
  if (shell === 'openside') {
    // The set's openside servers: most live in the openside-left shell;
    // the exceptions are the recliners (openside-right file) and the
    // sectional tucked into the LEFT corner (its server is the
    // openside-right shell file — the open side faces the corner).
    shell = 'openside-left';
    if (couch === 'recliners') shell = 'openside-right';
    if (couch === 'sectional' && place === 'corner-left') shell = 'openside-right';
  }
  return `corner__${shell}__${couch}__${place}.png`;
}
function thFrontFile(viz) {
  const mount = { mount: 'wall-hung', stand: 'stand', renter: 'stand', fireplace: 'fireplace' }[tanswers.placement] || 'stand';
  const snd = viz === 'comp51' ? 'component' : 'bar+rears';
  return `tvwall__${mount}__${snd}.png`;
}
const thRenderURL = f => `/assets/renders/${f}`;

function startTheaterBuy() {
  setPageTheme('everyday');
  hideAllSections();
  document.getElementById('quiz').style.display = 'block';
  Object.keys(tanswers).forEach(k => delete tanswers[k]);
  thSwapState = {};
  thMode = 'full';
  thOwned = { tv: false, sound: false, rest: false };
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
  tstep = -1;
  bar.style.width = '4%';
  setScene('');
  const feat = [
    { icon: 'tv', t: 'Right size, first try', s: 'Seating distance runs the size formula' },
    { icon: 'surround-sound', t: 'Sound that fits your room', s: 'Soundbar or real speakers — your wiring tolerance decides' },
    { icon: 'money-bag', t: 'One honest total', s: 'Mount, cables and extras inside the price' },
    { icon: 'swap-arrows', t: 'Out of stock? Swap it', s: 'Every item has same-level alternatives — tap to swap one in' } ];
  stepsEl.innerHTML = `<button class="back" onclick="backToFlowPick()">← Back</button>
    <div class="quiz-stage" data-tint="0">
    <p class="th-kicker">Home Theater Picker</p>
    <p class="th-h">Build your home theater — room first, then TV and sound</p>
    <p class="th-sub">First your budget, then you <b>design your room</b> and check a picture of it — the room setup happens no matter what you buy. Then the TV questions, then the sound questions. We build a <b>complete</b> system — TV, sound, cables and all — at three budgets: <b>Good, Better, Best</b>. Every item comes with same-level swaps in case your store is out of stock.</p>
    <div class="th-coverbtns">
      <button class="cta-big" onclick="thStartQuiz()">Start Matching →</button>
      <button class="cta-big th-alt" onclick="thShowOverride()">I know what I want</button>
    </div>
    <p class="th-sub">Already know your TV, your sound, or any single piece? Tap <b>I know what I want</b> and pick it yourself — we'll offer guided help for the rest, and still check that everything fits together.</p>
    <div class="th-infos">${feat.map((f, i) => { const c = tileColor(i); return `<div class="th-info"><span class="tile-main" style="--tile:${c.bg};--tile-ink:${c.ink}"><span class="tile-ic lg">${thIc(f.icon)}</span><span class="tile-title">${f.t}</span></span><span class="tile-desc">${f.s}</span></div>`; }).join('')}</div>
    </div>`;
  window.scrollTo(0, 0);
}

function thShowOverride() {
  tstep = -2;
  bar.style.width = '4%';
  // Build .10 (audit A8): every state on every column is a real
  // button with its own job — "Help me choose" runs ONLY that part's
  // questions (plus the shared budget + room steps every path needs),
  // "Already have it" really removes the part from the totals, and
  // "I know mine" goes to the model search where fit checks run.
  const stateBtn = (label, sub, onclick, on) =>
    `<button class="th-statebtn${on ? ' on' : ''}" onclick="${onclick}"><b>${label}</b> — ${sub}</button>`;
  const cat = (part, role, name, knowSub, helpSub) => `<div class="th-cat"><div class="th-role">${role}</div><div class="th-catname">${name}</div>
    ${stateBtn('I know mine', knowSub, part === 'rest' ? `thSetOwned('rest')` : 'startModelLookup()', false)}
    ${stateBtn('Already have it', part === 'tv' ? 'it still counts for fit and ports — and leaves the total' : part === 'sound' ? "we'll build the rest around it — and it leaves the total" : 'bare minimum added, nothing upsold', `thSetOwned('${part}')`, thOwned[part])}
    ${stateBtn('Help me choose', helpSub, `thStartSubset('${part}')`, false)}</div>`;
  const allOwned = thOwned.tv && thOwned.sound && thOwned.rest;
  stepsEl.innerHTML = `<button class="back" onclick="thRenderCover()">← Back</button>
    <div class="quiz-stage" data-tint="1">
    <p class="th-kicker">I Know What I Want</p>
    <p class="th-h">Pick your pieces. We'll mind the fit.</p>
    <p class="th-sub">Knowing one piece doesn't mean knowing them all. Set each one your way — and where you'd like help, we step in for just that piece and ask only its questions, after the budget and room steps every setup needs.</p>
    <div class="th-catrow">
      ${cat('tv', 'The TV', 'Television', 'search it from the full list — fit checks run on its page', "we'll ask the TV questions only")}
      ${cat('sound', 'The Sound', 'Audio', 'search it from the full list — fit checks run on its page', "we'll ask the sound questions only")}
      ${cat('rest', 'The Rest', 'Cables, mount, extras', 'add exactly what you want — nothing extra from us', "we'll spec the right cables and mount")}
    </div>
    <div class="th-warn"><b>Your picks still get the checks.</b> Stand width, feet span, HDMI port counts, eARC, outlet placement — we verify your choices play nicely together and flag anything that won't, before you buy. Knowing what you want never gets argued with; it just gets verified.</div>
    <p class="th-sub">The fastest way to use a model you already know: search it, open its page, and the fit checks run there. Or take the questions and let the room decide.</p>
    <div class="th-coverbtns">
      ${allOwned
        ? `<button class="cta-big" onclick="thStartSubset('fit')">Check the fit →</button>`
        : `<button class="cta-big" onclick="startModelLookup()">Search a model →</button>
      <button class="cta-big th-alt" onclick="thStartQuiz()">Start the questions</button>`}
    </div>
    </div>`;
  window.scrollTo(0, 0);
}

function thSetOwned(part) {
  thOwned[part] = !thOwned[part];
  thShowOverride();
}
function thStartSubset(part) {
  thMode = part === 'fit' ? 'fit' : part;
  tstep = 0;
  trender();
}
function thStartQuiz() { thMode = 'full'; tstep = 0; trender(); }

function trender() {
  const V = tvisible();
  if (tstep > V.length - 1) tstep = V.length - 1;
  const Q = V[tstep];
  bar.style.width = ((tstep + 1) / (V.length + 1) * 100) + '%';
  setScene('');
  const realQs = V.filter(q => !q.roomcheck);
  const pos = Q.roomcheck ? realQs.length : V.slice(0, tstep + 1).filter(q => !q.roomcheck).length;
  let h = `<button class="back" onclick="${tstep === 0 ? 'thRenderCover()' : 'tback()'}">← Back</button>`;
  h += `<div class="quiz-stage" data-tint="${tstep % 5}">`;
  h += `<p class="th-qcount">${TH_GROUP_LABEL[thQGroups(Q)[0]] || ''} · ${pos} of ${realQs.length}${Q.cond ? ` <span class="th-cond">${Q.cond}</span>` : ''}</p>`;
  h += `<p class="q">${Q.q}</p>`;
  if (Q.why) h += `<p class="th-why">${Q.why}</p>`;
  if (Q.roomcheck) {
    h += `<div class="th-viz th-checkviz"><img class="th-render" src="${thRenderURL(thAboveFile())}" alt="Your room from above, drawn from your answers"></div>`;
    h += `<div class="th-coverbtns"><button class="cta-big th-alt" onclick="thEditRoom()">✎ Edit my answers</button><button class="cta-big" onclick="tcontinue()">Looks right — Next →</button></div>`;
  } else if (Q.parts) {
    Q.partsList.forEach(part => {
      h += `<p class="th-partlab">${part.label}</p><div class="tile-grid th-grid">`;
      const opts = part.opts();
      opts.forEach((o, i) => {
        const wide = i === opts.length - 1 && opts.length % 2 === 1;
        h += tileHTML({ i, wide, icon: o.icon, title: o.t, desc: o.s, bg: o.bg, ink: o.ink, on: tanswers[part.key] === o.v, onclick: `tpickPart('${part.key}','${o.v}')` });
      });
      h += '</div>';
    });
    if (Q.partsList.every(p => tanswers[p.key])) h += thContinueHTML();
  } else if (Q.multi) {
    const sel = tanswers[Q.key] || [];
    h += '<div class="tile-grid th-grid">';
    const opts = Q.opts();
    opts.forEach((o, i) => {
      const wide = i === opts.length - 1 && opts.length % 2 === 1;
      h += tileHTML({ i, wide, icon: o.icon, title: o.t, desc: o.s, bg: o.bg, ink: o.ink, on: sel.includes(o.v), onclick: `ttoggle('${Q.key}','${o.v}')` });
    });
    h += '</div>';
    h += `<p class="th-why">${sel.length} of 2 picked${sel.length === 2 ? ' — tap Next when ready.' : ' — pick ' + (2 - sel.length) + ' more to go on.'}</p>`;
    if (sel.length === 2) h += thContinueHTML();
  } else {
    h += '<div class="tile-grid th-grid">';
    const opts = Q.opts();
    opts.forEach((o, i) => {
      const wide = i === opts.length - 1 && opts.length % 2 === 1;
      h += tileHTML({ i, wide, icon: o.icon, title: o.t, desc: o.s, bg: o.bg, ink: o.ink, onclick: `tpick('${Q.key}','${o.v}')` });
    });
    h += '</div>';
  }
  h += '</div>';
  stepsEl.innerHTML = h;
  window.scrollTo(0, 0);
}

function thEditRoom() {
  // Back to the first room question with every answer intact.
  const V = tvisible();
  const i = V.findIndex(q => q.group === 'room');
  tstep = i >= 0 ? i : 0;
  trender();
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
  // Changing the seating or its placement can strand a corner answer;
  // drop the downstream room answers so the branches re-ask cleanly.
  if (k === 'couch' && v !== 'sectional') { delete tanswers.couchpos; delete tanswers.corner; }
  if (k === 'couchpos' && v !== 'corner') delete tanswers.corner;
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

function thSwapKey(tierKey, slot) { return tierKey + ':' + slot; }
function thEffTV(tierKey) {
  const base = thTierTV(tierKey);
  const sw = thSwapState[thSwapKey(tierKey, 'tv')];
  if (sw) return { tv: sw, note: '', swapped: true, baseTv: base.tv };
  return { tv: base.tv, note: base.note, swapped: false, baseTv: base.tv };
}
function thEffSound(tierKey, slot) {
  const T = TH_DATA.tiers[tierKey];
  const base = slot === 'sound2' ? T.sound2 : T.sound;
  const sw = thSwapState[thSwapKey(tierKey, slot)];
  return { p: sw || base, swapped: !!sw, base };
}
function thTierTotal(tierKey) {
  const T = TH_DATA.tiers[tierKey];
  const { tv } = thEffTV(tierKey);
  const s1 = thEffSound(tierKey, 'sound').p;
  const s2 = T.sound2 ? thEffSound(tierKey, 'sound2').p : null;
  let t = (thOwned.tv ? 0 : tv.price)
    + (thOwned.sound ? 0 : s1.price + (s2 ? s2.price : 0));
  if (tierKey !== 'best' && !thOwned.rest) t += TH_DATA.cable.price;
  return t;
}
function thSwapName(p) {
  // A swapped-in product wears its plain product name — the data's
  // "Swap receiver: …" prefixes are chip dressing, not names.
  return String(p.name || '').replace(/^Swap (receiver|speakers): /, '');
}
function thSwapMeta(s) {
  // The Bar 9's gamer line appears only when Gaming was picked.
  let m = (s.gmeta && (tanswers.watch || []).includes('gaming')) ? s.gmeta : (s.meta || '');
  // Hand-written price deltas come out: the renderer computes the
  // delta against the product actually shown, so the copy can never
  // disagree with the tier on screen (stand-in TVs included).
  return m.replace(/\s*\([+\u2212-]\$[\d,]+\)/g, '');
}
function thSwapCandidates(tierKey, slot) {
  // The candidate list for a slot. TV swaps always come from the
  // tier's BASE tv, so the step-up chips (LG G5 included) are offered
  // in the stand-in variant too, with deltas against the TV shown.
  const T = TH_DATA.tiers[tierKey];
  if (slot === 'tv') return (T.tv.swaps || []).slice();
  const base = slot === 'sound2' ? T.sound2 : T.sound;
  return base ? (base.swaps || []).slice() : [];
}
function thDoSwap(tierKey, slot, idx) {
  const key = thSwapKey(tierKey, slot);
  if (idx < 0) delete thSwapState[key];
  else {
    const cand = thSwapCandidates(tierKey, slot)[idx];
    if (cand && cand.price != null) thSwapState[key] = cand;
  }
  renderThResults();
}
function thSwapsHTML(tierKey, slot, current, isSwapped, baseName) {
  const cands = thSwapCandidates(tierKey, slot);
  if (!cands.length && !isSwapped) return '';
  let h = '<div class="th-swaplab">Out of stock? Swap — same level, same ballpark. Tap one to swap it in:</div><div class="th-swaps">';
  if (isSwapped)
    h += `<button class="th-swap th-swapback" onclick="thDoSwap('${tierKey}','${slot}',-1)"><div class="th-sname">↩ Swap back to ${esc(baseName)}</div><div class="th-smeta">Undo this swap</div></button>`;
  cands.forEach((s, i) => {
    if (s.price == null) {
      h += `<div class="th-swap th-swapnote"><div class="th-sname">${esc(s.name)}</div><div class="th-smeta">${esc(thSwapMeta(s))}</div></div>`;
      return;
    }
    if (current && s.name === current.name) return;
    const d = s.price - current.price;
    const dTxt = d === 0 ? 'same price' : (d > 0 ? `+$${fmt$(d)}` : `\u2212$${fmt$(-d)}`);
    h += `<button class="th-swap" onclick="thDoSwap('${tierKey}','${slot}',${i})"><div class="th-sname">${esc(s.name)} — $${fmt$(s.price)}</div><div class="th-smeta">${esc(thSwapMeta(s))} (${dTxt} vs the pick above)</div></button>`;
  });
  return h + '</div>';
}

function thSizeNote() {
  const d = tanswers.dist;
  if (d === 'dontknow') {
    return { small: 'Small room ≈ 5–7 ft of viewing distance — 55–65″ territory. The 65″ systems below sit at the top of that range; the 77″ in BEST runs a size over it — the deliberate stretch pick.',
             medium: 'Medium room ≈ 8–9 ft — 65″ is the sweet spot, and it is exactly what GOOD and BETTER carry. BEST carries 77″ — one size up, the cinematic stretch.',
             large: 'Large room ≈ 10–12 ft — you want 77″ or more. BEST carries it; the 65″ systems will feel a size small from the couch.' }[tanswers.roomsize] || '';
  }
  return { under6: 'Your couch distance sizes a 55″ screen. The systems below start at 65″ — one size up. In a small room that reads as cinematic, not cramped, as long as the stand fits it.',
           '6-7': 'At 6–7 ft, 65″ is the immersive size — and it is exactly what GOOD and BETTER carry. BEST stretches to 77″ — a size up, for the full cinema feel.',
           '8-9': 'At 8–9 ft, 65″ is the sweet spot and 77″ is the cinematic stretch — GOOD and BETTER sit at the sweet spot, BEST takes the stretch.',
           '10-11': 'At 10–11 ft you want 77″. BEST carries it; GOOD and BETTER at 65″ will feel a size small from your couch — that is their honest trade for the price.',
           '12plus': 'At 12 ft or more you want 85″ or a projector — bigger than any system below. These picks still fit your room and your answers; just know the screen runs a size under ideal at that distance.' }[d] || '';
}

function thChips() {
  const c = [];
  if (tanswers.placement === 'stand') c.push('✓ Feet span fits a standard stand');
  if (tanswers.placement === 'mount') c.push('✓ Wall mount planned in');
  if (tanswers.placement === 'renter') c.push('✓ No-drilling picks only');
  if (!thOwned.rest) c.push('✓ Certified HDMI cable included');
  if ((tanswers.watch || []).includes('gaming')) c.push(`✓ Fast HDMI ports counted for your ${TH_GAME_LABEL[tanswers.gaming] || 'gaming gear'} + the sound`);
  if (tanswers.subs === 'often') c.push('✓ Real center channel in every system — dialogue stays clear');
  if (tanswers.own === 'streamer') c.push("✓ No streamer sold to you twice");
  if (thOwned.tv) c.push('✓ Your TV — counted at $0, shown for fit');
  if (thOwned.sound) c.push('✓ Your sound — counted at $0, shown for fit');
  return c;
}

function thFinish() {
  thTab = { under750: 'good', '750-1250': 'good', '1250-2500': 'better', '2500-5000': 'best', '5000plus': 'best', unsure: 'better' }[tanswers.budget] || 'better';
  renderThResults();
}

function thShowTab(t) { thTab = t; renderThResults(); }
function thBackToQuestions() {
  hideAllSections();
  document.getElementById('quiz').style.display = 'block';
  tstep = tvisible().length - 1;
  trender();
  window.scrollTo(0, 0);
}

function thProductBlock(kind, p, role, tierKey, slot, isSwapped, baseName, owned) {
  if (owned)
    return `${cardGallery(kind, p.photo ? [p.photo] : null, p.name)}<div class="th-role">${role}</div><div class="th-name">${esc(p.name)}</div><div class="th-ownedtag">✓ Yours already — $0 in the total. Shown so the fit checks still run.</div><div class="th-meta">${esc(p.meta)}</div>`;
  return `${cardGallery(kind, p.photo ? [p.photo] : null, p.name)}<div class="th-role">${role}</div><div class="th-name">${esc(p.name)}</div><div class="th-price">$${fmt$(p.price)}</div><div class="th-meta">${esc(p.meta)}</div>${thSwapsHTML(tierKey, slot, p, isSwapped, baseName)}`;
}

function thPanelHTML(tierKey) {
  const T = TH_DATA.tiers[tierKey];
  const { tv, note: tvNote, swapped: tvSwapped, baseTv } = thEffTV(tierKey);
  const total = thTierTotal(tierKey);
  // Copy follows the gear actually shown: a stand-in Mini-LED never
  // wears the OLED tagline.
  const standIn = !tvSwapped && tv !== T.tv;
  const tagline = standIn ? T.tagline.replace('OLED picture', 'Mini-LED picture') : T.tagline;
  let flags = '';
  if (tierKey === 'best' && tanswers.wires === 'none')
    flags += `<p class="th-flag">⚠ This tier breaks your “no wires at all” answer — a receiver system runs speaker wire. BETTER is your no-wire ceiling.</p>`;
  if (tanswers.own === 'avr' && tierKey === 'best')
    flags += `<p class="th-flag">You already own a receiver: if its HDMI ports are 2.1, keep it and put the sound budget into the speakers — the SVS set is the upgrade, not the box.</p>`;
  if (tanswers.own === 'sonos' && tierKey === 'better')
    flags += `<p class="th-flag">You own Sonos: the Arc Ultra swap keeps your whole home in one family.</p>`;
  const snd1 = thEffSound(tierKey, 'sound');
  const snd2 = T.sound2 ? thEffSound(tierKey, 'sound2') : null;
  // Two columns all the way down (patch note 2): TV left, sound right;
  // a two-product sound setup stacks its cards in the right column.
  const tvCol = `<div class="th-square">${thProductBlock('tv', tv, tierKey === 'best' ? 'The TV' : 'The TV we like', tierKey, 'tv', tvSwapped, thSwapName(baseTv), thOwned.tv)}${tvNote ? `<p class="th-flag">${esc(tvNote)}</p>` : ''}</div>`;
  let soundCol;
  if (snd2) {
    soundCol = `<div class="th-square">${thProductBlock('speaker', snd1.p, 'The sound we like — the receiver', tierKey, 'sound', snd1.swapped, thSwapName(snd1.base), thOwned.sound)}</div>
    <div class="th-square">${thProductBlock('speaker', snd2.p, 'The speakers', tierKey, 'sound2', snd2.swapped, thSwapName(snd2.base), thOwned.sound)}</div>
    ${thOwned.sound ? '' : `<p class="th-coltotal">Sound total: $${fmt$(snd1.p.price + snd2.p.price)}</p>`}`;
  } else {
    soundCol = `<div class="th-square">${thProductBlock('speaker', snd1.p, 'The sound we like', tierKey, 'sound', snd1.swapped, thSwapName(snd1.base), thOwned.sound)}</div>`;
  }
  const cableLine = thOwned.rest
    ? 'Cables and extras: yours — nothing added to this total.'
    : tierKey === 'best'
      ? 'Cables: speaker wire and certified HDMI run about $40 — inside this tier’s reserve.'
      : `${esc(TH_DATA.cable.name)} — $${fmt$(TH_DATA.cable.price)}, already in the total.`;
  const swappedNames = [];
  if (tvSwapped && !thOwned.tv) swappedNames.push(thSwapName(tv));
  if (snd1.swapped && !thOwned.sound) swappedNames.push(thSwapName(snd1.p));
  if (snd2 && snd2.swapped && !thOwned.sound) swappedNames.push(thSwapName(snd2.p));
  const totalLabel = `${esc(T.label)} total${swappedNames.length ? ' with ' + esc(swappedNames.join(' + ')) : ''}${tierKey === 'best' || thOwned.rest ? '' : ' (cables in)'}: $${fmt$(total)}`;
  return `<p class="th-tagline">${esc(tagline)}</p>
  ${flags}
  <div class="th-roomviz">
    <div class="th-viz"><p class="th-vizcap">Your room from above — where everything goes</p><img class="th-render" src="${thRenderURL(thAboveFile())}" alt="Your room from above"></div>
    <div class="th-viz"><p class="th-vizcap">From your seat — the TV wall</p><img class="th-render" src="${thRenderURL(thFrontFile(T.viz))}" alt="The TV wall from your seat"></div>
  </div>
  <p class="factline">${esc(thRoomLine())} ${esc(TH_LIGHT_CLAUSE[tanswers.light] || '')}</p>
  <div class="th-cols">
    <div class="th-col">${tvCol}</div>
    <div class="th-col">${soundCol}</div>
  </div>
  <div class="th-foot"><div><div class="th-total">${totalLabel}</div><div class="th-cable">${cableLine}</div></div>
  <div class="th-note">${esc(T.note)}</div></div>`;
}

function thRoomLine() {
  const couch = { straight: 'straight sofa', sectional: 'L-shaped sectional', recliners: 'recliner rows', chairs: 'loveseat + chairs' }[tanswers.couch] || 'your couch';
  const around = { enclosed: 'walls all around', openside: 'open on one side', openbehind: 'open behind the couch', openplan: 'a big open-plan space' }[tanswers.around] || '';
  const spot = tanswers.couch === 'sectional'
    ? (tanswers.couchpos === 'corner' ? `, tucked into the ${tanswers.corner === 'corner-right' ? 'right' : 'left'} corner` : ', in the middle of the room')
    : '';
  return `Your room: ${around}, ${couch}${spot} facing the TV wall (from your layout answers).`;
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
  let h = `<button class="back" onclick="thBackToQuestions()">← Back</button>
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
      ${thTab === 'best'
        ? '<li><b>Receiver first, TV second</b> if you\'re wall-mounting — the center speaker\'s placement decides where the TV\'s bottom edge lands.</li>'
        : '<li><b>Soundbar first, TV second</b> if you\'re wall-mounting — the bar\'s mount height decides where the TV\'s bottom edge lands.</li>'}
      <li><b>Run eARC, then check the TV says “eARC”</b> — not just ARC. That's the setting that carries the good formats.</li>
      <li><b>Sub crawl, short version:</b> put the sub in your seat, play something bassy, walk the front wall — where it's smoothest is where it lives.</li>
    </ol>
    <p class="factline">Still price-shopping? Anyone selling you a $100 HDMI cable is selling you a story — the certified $9 cable in these totals is the right cable.</p></div>
  <div class="th-cont"><button class="cta-big th-alt" onclick="startTheaterBuy()">Start over</button></div>`;
  rEl.innerHTML = h;
  window.scrollTo(0, 0);
}
