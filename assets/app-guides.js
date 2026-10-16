// ------------------------------------------- PC setup guides (Set Up → PC)
let pcGuides = null;
// Brand context for guide diagrams: set when the user arrives from a
// specific laptop (a quiz top pick or a looked-up model); null when they
// browse the guides generically. Diagrams use it to show the general look
// for THEIR model's brand (e.g. Lenovo Vantage, Dell SupportAssist).
let guideBrand = null;
const PC_OS_LABELS = { windows_11: '🪟 Windows 11', macos: '🍎 macOS', chromeos: '🌐 ChromeOS' };
function brandUtilityShort(key) {
  const layer = pcGuides && pcGuides.setup_guides.brand_layers[key];
  if (!layer || !layer.utility) return null;
  let u = typeof layer.utility === 'string' ? layer.utility : layer.utility.name;
  if (!u || /^none\b/i.test(u)) return null;
  u = u.split(' (')[0].split(' +')[0].split(' — ')[0].trim();
  return u || null;
}
function brandDisplayName(key) {
  const layer = pcGuides && pcGuides.setup_guides.brand_layers[key];
  return (layer && layer.brand) || null;
}
function substTokens(s, ctx) {
  if (typeof s !== 'string') return s;
  const util = (ctx && ctx.brand && brandUtilityShort(ctx.brand)) || "the maker's update utility";
  const brand = (ctx && ctx.brand && brandDisplayName(ctx.brand)) || 'your maker';
  return s.replaceAll('{utility}', util).replaceAll('{brand}', brand);
}
function resolveDiagram(spec, ctx) {
  if (!spec) return null;
  ctx = ctx || {};
  const out = {};
  Object.keys(spec).forEach(k => {
    if (k !== 'os_variants' && k !== 'brand_variants' && k !== 'caption') out[k] = spec[k];
  });
  const ov = (spec.os_variants && ctx.os && spec.os_variants[ctx.os]) || {};
  const bv = (spec.brand_variants && ctx.brand && spec.brand_variants[ctx.brand]) || {};
  Object.assign(out, ov, bv);
  ['window_title'].forEach(k => { if (out[k]) out[k] = substTokens(out[k], ctx); });
  ['path', 'sidebar'].forEach(k => {
    if (Array.isArray(out[k])) out[k] = out[k].map(x => substTokens(x, ctx));
  });
  if (Array.isArray(out.rows))
    out.rows = out.rows.map(r => ({ ...r, label: substTokens(r.label, ctx),
                                    action: r.action ? substTokens(r.action, ctx) : r.action }));
  if (bv.utility_row)
    out.rows = (out.rows || []).concat([{ ...bv.utility_row,
      label: substTokens(bv.utility_row.label, ctx) }]);
  return out;
}
function diagramCaption(spec, ctx) {
  if (spec && spec.caption) return spec.caption;
  const b = ctx && ctx.brand && brandDisplayName(ctx.brand);
  return b ? `The general look for your ${b} — exact screens vary by version.`
           : 'Illustration — your screen may look slightly different.';
}
// Simple schematic illustrations (NOT screenshots): a stylized window with
// the relevant path/option highlighted and labeled, faithful at a general
// level to how these settings/utilities are laid out.
function wrapSvgText(s, n) {
  const words = String(s).split(' '); const lines = []; let cur = '';
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
function diagramSVG(rawSpec, ctx) {
  const spec = resolveDiagram(rawSpec, ctx);
  if (!spec) return '';
  const W = 320;
  const head = `<rect x="1" y="1" width="${W - 2}" height="26" rx="10" fill="#273449"/>
    <circle cx="16" cy="14" r="4" fill="#f87171"/><circle cx="30" cy="14" r="4" fill="#fbbf24"/><circle cx="44" cy="14" r="4" fill="#4ade80"/>
    <text x="58" y="18" font-size="10.5" font-weight="700" fill="#e2e8f0">${esc(spec.window_title || '')}</text>`;
  let body = '', H = 120;
  if (spec.kind === 'battery') {
    const pct = Math.max(5, Math.min(100, spec.fill_pct || 80));
    const bw = 170, fill = Math.round(bw * pct / 100);
    const rows = (spec.rows || []).map((r, i) =>
      `<text x="24" y="${132 + i * 17}" font-size="9.5" fill="${r.highlight ? '#7dd3fc' : '#94a3b8'}">${r.highlight ? '▸ ' : '· '}${esc(r.label)}</text>`).join('');
    body = `<rect x="24" y="52" width="${bw}" height="40" rx="6" fill="none" stroke="#64748b" stroke-width="2"/>
      <rect x="${24 + bw}" y="64" width="6" height="16" rx="2" fill="#64748b"/>
      <rect x="27" y="55" width="${fill - 6}" height="34" rx="4" fill="#4ade80" opacity="0.75"/>
      <line x1="${27 + fill - 3}" y1="44" x2="${27 + fill - 3}" y2="98" stroke="#fbbf24" stroke-width="1.6" stroke-dasharray="4 3"/>
      <text x="${27 + fill - 3}" y="40" font-size="9" fill="#fbbf24" text-anchor="middle">${esc((spec.limit_label || 'Charge limit') + ' ' + pct + '%')}</text>
      <text x="${24 + bw + 18}" y="76" font-size="11" font-weight="700" fill="#e2e8f0">${pct}%</text>
      ${rows}`;
    H = 140 + (spec.rows || []).length * 17;
  } else if (spec.kind === 'flow') {
    const boxes = spec.boxes || [];
    const bw = 94, gap = (W - 24 - boxes.length * bw) / Math.max(1, boxes.length - 1);
    body = boxes.map((b, i) => {
      const x = 12 + i * (bw + gap);
      const lines = wrapSvgText(b.label, 15);
      const labelSvg = lines.map((ln, j) =>
        `<tspan x="${x + bw / 2}" dy="${j === 0 ? 0 : 12}">${esc(ln)}</tspan>`).join('');
      const arrow = i < boxes.length - 1
        ? `<text x="${x + bw + gap / 2}" y="76" font-size="13" fill="#38bdf8" text-anchor="middle">→</text>` : '';
      return `<rect x="${x}" y="48" width="${bw}" height="56" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2"/>
        <text y="${66 - (lines.length - 1) * 6}" font-size="9.5" font-weight="700" fill="#e2e8f0" text-anchor="middle">${labelSvg}</text>
        <text x="${x + bw / 2}" y="96" font-size="7.8" fill="#94a3b8" text-anchor="middle">${esc(b.sub || '')}</text>${arrow}`;
    }).join('');
    H = 118;
  } else {  // 'screen'
    const sb = Array.isArray(spec.sidebar) && spec.sidebar.length ? spec.sidebar : null;
    const mainX = sb ? 104 : 14, mainW = W - mainX - 12;
    let y = 40;
    let inner = '';
    if (Array.isArray(spec.path) && spec.path.length) {
      inner += `<text x="14" y="${y + 4}" font-size="9" fill="#7dd3fc">${esc(spec.path.join('  ›  '))}</text>`;
      y += 20;
    }
    if (sb) {
      inner += sb.map((s, i) =>
        `<rect x="12" y="${y + i * 21}" width="82" height="18" rx="5" fill="${i === sb.length - 1 ? '#273449' : 'none'}"/>
         <text x="18" y="${y + i * 21 + 13}" font-size="8.6" fill="${i === sb.length - 1 ? '#e2e8f0' : '#94a3b8'}">${esc(s)}</text>`).join('');
    }
    inner += (spec.rows || []).map((r, i) => {
      const ry = y + i * 27;
      return `<rect x="${mainX}" y="${ry}" width="${mainW}" height="23" rx="6" fill="${r.highlight ? 'rgba(56,189,248,.14)' : '#1e293b'}" stroke="${r.highlight ? '#38bdf8' : '#334155'}"/>
        <text x="${mainX + 8}" y="${ry + 15}" font-size="9.3" fill="#e2e8f0">${esc(r.label)}</text>
        ${r.action ? `<text x="${mainX + mainW - 8}" y="${ry + 15}" font-size="8.6" font-weight="700" fill="#38bdf8" text-anchor="end">${esc(r.action)}</text>` : ''}`;
    }).join('');
    body = inner;
    H = y + (spec.rows || []).length * 27 + 8;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schematic illustration">${head}${body}</svg>`;
}
function moreInfoHTML(x, ctx) {
  if (!x || typeof x !== 'object' || (!x.more_info && !x.diagram)) return '';
  return `<details class="morebox"><summary>More info</summary>
    ${x.more_info ? `<p>${esc(x.more_info)}</p>` : ''}
    ${x.diagram ? `<figure class="diagram">${diagramSVG(x.diagram, ctx)}<figcaption>${esc(diagramCaption(x.diagram, ctx))}</figcaption></figure>` : ''}
  </details>`;
}
function guideItemHTML(x, ctx) {
  if (typeof x === 'string') return `<p>${esc(x)}</p>`;
  const t = x.title || x.item || '';
  const d = x.detail || '';
  return `${t ? `<h3>${esc(t)}</h3>` : ''}${d ? `<p>${esc(d)}</p>` : ''}${moreInfoHTML(x, ctx)}`;
}
function stepsListHTML(items) {
  return items.map((x, i) =>
    `<div class="gstep"><span class="stepnum">${i + 1}</span><div>${guideItemHTML(x)}</div></div>`).join('');
}
function checkListHTML(items, ctx) {
  return items.map(x =>
    `<div class="gstep"><span class="stepnum">✓</span><div>${guideItemHTML(x, ctx)}</div></div>`).join('');
}
async function startPcGuide() {
  hideAllSections();
  const el = document.getElementById('pc-guide');
  el.style.display = 'block';
  if (!pcGuides) {
    el.innerHTML = `<div class="loading"><span class="dots">Loading guides</span></div>`;
    pcGuides = await fetch('/api/laptop-guides').then(x => x.json());
  }
  renderPcMenu();
}
function renderPcMenu() {
  setPageTheme('everyday');
  const el = document.getElementById('pc-guide');
  const sg = pcGuides.setup_guides;
  const brandCount = Object.keys(sg.brand_layers || {}).length;
  let h = `<button class="back" onclick="backToFlowPick()">← Back</button>
    <h1>Set up your <span class="accent">PC</span></h1>
    <p class="sub">First boot, brand tools, and — if it's for a kid — the parental-control path.</p>
    <button class="opt" onclick="startModelLookup()">🔎 Know your model?<small>Jump straight to its setup — type the name or the model number</small></button>
    <p class="picks-head">First boot, by system</p>`;
  Object.keys(PC_OS_LABELS).forEach(k => {
    if (sg.os_flows[k])
      h += `<button class="opt" onclick="renderPcFormFactor('${k}')">${PC_OS_LABELS[k]}<small>Tower or laptop — one quick question first</small></button>`;
  });
  h += `<p class="picks-head">Brand setup tools</p>
    <button class="opt" onclick="renderPcBrands()">🏷️ Pick your brand<small>${brandCount} brands — update utilities, drivers & BIOS, warranty</small></button>
    <p class="picks-head">For families</p>
    <button class="opt" onclick="renderPcKidMenu()">👨‍👩‍👧 Setting up for a kid<small>Child accounts, screen time, filters & approvals — by platform</small></button>`;
  el.innerHTML = h;
  window.scrollTo(0, 0);
}
let pcOsKey = null;
function renderPcFormFactor(key) {
  setOsTheme(key, 1);
  pcOsKey = key;
  const el = document.getElementById('pc-guide');
  const flow = pcGuides.setup_guides.os_flows[key];
  el.innerHTML = `<button class="back" onclick="renderPcMenu()">← All setup topics</button>
    <p class="q">Tower (desktop) or laptop?</p>
    <button class="opt" onclick="renderPcOsChoice('${key}')">💻 Laptop<small>${esc(flow.os)} first-boot walkthrough</small></button>
    <button class="opt" onclick="renderPcTower('${key}')">🖥️ Tower (desktop)<small>Desktop setup — same ${esc(flow.os)} first boot</small></button>`;
  window.scrollTo(0, 0);
}
function renderPcTower(key) {
  setOsTheme(key, 1);
  // Desktop setup is OS-level: a tower's first boot is the operating
  // system's own walkthrough, screen for screen the same as a laptop's —
  // so the Tower path continues into the same OS flow (video or step by
  // step) instead of dead-ending. Brand layers stay as they are: the
  // utilities they describe (SupportAssist, Vantage, and friends) are
  // the brands' general PC tools, laptops and desktops alike.
  pcOsKey = key;
  const el = document.getElementById('pc-guide');
  const flow = pcGuides.setup_guides.os_flows[key];
  el.innerHTML = `<button class="back" onclick="renderPcFormFactor('${key}')">← Back</button>
    <h1>Desktop setup — <span class="accent">${esc(flow.os)}</span></h1>
    <p class="sub">Good news: a desktop's first boot is the operating system's own walkthrough — the same screens a laptop shows. Plug in a monitor, keyboard, and mouse, power it on, and follow the ${esc(flow.os)} guide. One honest difference: most towers don't include a screen (all-in-ones are the exception — theirs is built in).</p>
    <button class="opt" onclick="renderPcOsChoice('${key}')">Continue to the ${esc(flow.os)} setup<small>🎬 Watch the video, or 👣 step by step — your pick on the next screen</small></button>
    <button class="opt" onclick="renderPcBrands()">🏷️ Brand setup tools<small>The update &amp; warranty utilities are the same ones the brands ship for all their PCs</small></button>`;
  window.scrollTo(0, 0);
}
// --------------------------------- setup entry: video or step by step
// Caleb's design (2026-10-15): every guided flow opens with a choice —
// watch a video of the whole process, or walk it step by step with
// photos. Videos live in the data as a per-flow `video_url` (null until
// filmed); photos as a per-step `photo` (null until shot). Null stays
// honest: a "coming soon" panel (video) or a quiet placeholder (photo),
// never a fabricated visual.
function videoEmbedURL(u) {
  if (!u) return '';
  const s = String(u);
  const yt = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0';
  const vm = s.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vm) return 'https://player.vimeo.com/video/' + vm[1];
  return s;
}
function stepVisualHTML(item, ctx) {
  if (!item || typeof item !== 'object') return '';
  if (item.photo)
    return `<figure class="stepfig"><img src="${esc(item.photo)}" alt="Photo showing this step" loading="lazy"></figure>`;
  if (item.diagram)
    return `<figure class="diagram">${diagramSVG(item.diagram, ctx)}<figcaption>${esc(diagramCaption(item.diagram, ctx))}</figcaption></figure>`;
  return `<div class="phsoon">📷 Photo coming soon</div>`;
}
function renderPcOsChoice(key) {
  setOsTheme(key, 1);
  const flow = pcGuides.setup_guides.os_flows[key];
  const el = document.getElementById('pc-guide');
  el.innerHTML = `<button class="back" onclick="renderPcFormFactor('${key}')">← Back</button>
    <h1>First boot — <span class="accent">${esc(flow.os)}</span></h1>
    <p class="sub">Two ways through it — pick whichever suits you.</p>
    <button class="opt" onclick="renderPcFlowVideo('os','${key}')">🎬 Watch the video<small>The whole setup, start to finish</small></button>
    <button class="opt" onclick="startPcOsWizard('${key}')">👣 Step by step<small>One step at a time, with photos</small></button>`;
  window.scrollTo(0, 0);
}
function renderPcKidChoice(key) {
  setOsTheme(key, 1);
  const p = pcGuides.parental_controls.platforms[key];
  const el = document.getElementById('pc-guide');
  el.innerHTML = `<button class="back" onclick="renderPcKidMenu()">← Kid setup</button>
    <h1>${esc(p.platform)} — <span class="accent">${esc(p.control_system || 'parental controls')}</span></h1>
    <p class="sub">Two ways through it — pick whichever suits you.</p>
    <button class="opt" onclick="renderPcFlowVideo('kid','${key}')">🎬 Watch the video<small>The whole setup, start to finish</small></button>
    <button class="opt" onclick="startPcKidWizard('${key}')">👣 Step by step<small>One step at a time, with photos</small></button>`;
  window.scrollTo(0, 0);
}
function renderPcFlowVideo(kind, key) {
  if (kind === 'os') setOsTheme(key, 1);
  const isOs = kind === 'os';
  const flow = isOs ? pcGuides.setup_guides.os_flows[key]
                    : pcGuides.parental_controls.platforms[key];
  const title = isOs
    ? `First boot — <span class="accent">${esc(flow.os)}</span>`
    : `${esc(flow.platform)} — <span class="accent">${esc(flow.control_system || 'parental controls')}</span>`;
  const choiceFn = isOs ? `renderPcOsChoice('${key}')` : `renderPcKidChoice('${key}')`;
  const stepsFn = isOs ? `startPcOsWizard('${key}')` : `startPcKidWizard('${key}')`;
  const el = document.getElementById('pc-guide');
  let h = `<button class="back" onclick="${choiceFn}">← Back</button>
    <h1>${title}</h1>
    <p class="wizprog">🎬 Watch the video</p>`;
  const embed = videoEmbedURL(flow.video_url);
  if (embed) {
    h += `<div class="vid"><iframe src="${esc(embed)}" title="Setup walkthrough video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
    <button class="opt" onclick="${stepsFn}">👣 Step by step instead<small>One step at a time, with photos</small></button>`;
  } else {
    h += `<div class="vid soon" style="height:150px">🎬 Video coming soon — we're filming these now</div>
    <p class="sub">The walkthrough video for this setup isn't ready yet. The step-by-step guide covers the same ground, one step at a time.</p>
    <button class="opt" onclick="${stepsFn}">👣 Go step by step<small>One step at a time, with photos</small></button>`;
  }
  el.innerHTML = h;
  window.scrollTo(0, 0);
}
// ------------------------------------------ stepped guide wizard
// Guided flows present ONE step at a time: a single step card, a
// "Step X of N" progress line, and Next / Back buttons. The first-week
// (or first-setup) checklist is the flow's final screen.
let wiz = null;
function wizRender() {
  if (wiz && wiz.themeBase) setOsTheme(wiz.themeBase, wiz.i >= 1 ? 2 : 1);
  const el = document.getElementById('pc-guide');
  const total = wiz.screens.length;
  const s = wiz.screens[wiz.i];
  let h = `<button class="back" onclick="${wiz.backAction}">← ${wiz.backLabel}</button>
    ${wiz.title}
    <p class="wizprog">Step ${wiz.i + 1} of ${total}</p>
    <div class="progress"><i style="width:${((wiz.i + 1) / total) * 100}%"></i></div>
    ${s.html}
    <div class="wiznav">`;
  if (wiz.i > 0)
    h += `<button class="opt" onclick="wizMove(-1)">← Back</button>`;
  if (wiz.i < total - 1)
    h += `<button class="opt wiznext" onclick="wizMove(1)">Next →</button>`;
  else if (wiz.doneAction)
    h += `<button class="opt wiznext" onclick="${wiz.doneAction}">${wiz.doneLabel}</button>`;
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0, 0);
}
function wizMove(d) {
  wiz.i = Math.min(wiz.screens.length - 1, Math.max(0, wiz.i + d));
  wizRender();
}
function wizStepScreen(head, item, num, ctx) {
  return { html: `${head ? `<p class="picks-head" style="margin-top:0">${head}</p>` : ''}<div class="gstep"><span class="stepnum">${num}</span><div>${stepVisualHTML(item, ctx)}${guideItemHTML(item)}</div></div>` };
}
function startPcOsWizard(key) {
  const flow = pcGuides.setup_guides.os_flows[key];
  const ctx = { os: key, brand: guideBrand };
  const screens = flow.steps.map((x, i) => ({
    html: (i === 0 && flow.applies_to ? `<div class="note">${esc(flow.applies_to)}</div>` : '') +
      `<div class="gstep"><span class="stepnum">${i + 1}</span><div>${stepVisualHTML(x, ctx)}${guideItemHTML(x)}</div></div>`
  }));
  const tokens = { windows_11: ['windows', 'all'], macos: ['macos', 'mac', 'all'],
                   chromeos: ['chromeos', 'chrome', 'all'] }[key] || ['all'];
  const fw = (pcGuides.setup_guides.first_week_checklist || [])
    .filter(c => tokens.includes(String(c.applies_to || 'all').toLowerCase()));
  let finalHtml = '';
  if (fw.length)
    finalHtml += `<p class="picks-head" style="margin-top:0">First-week checklist</p>` + checkListHTML(fw, { os: key, brand: guideBrand });
  (flow.honest_notes || []).forEach(n => { finalHtml += `<div class="note">${esc(n)}</div>`; });
  finalHtml += `<button class="opt" onclick="openDisclaimers()">📄 Disclaimers<small>The fine print for all our guides — coverage notes and version caveats, in one place</small></button>`;
  if (finalHtml) screens.push({ html: finalHtml });
  wiz = { themeBase: key, title: `<h1>First boot — <span class="accent">${esc(flow.os)}</span></h1>`,
          backAction: `renderPcOsChoice('${key}')`, backLabel: 'Back',
          doneAction: 'renderPcMenu()', doneLabel: '✓ Done — all setup topics',
          screens, i: 0 };
  wizRender();
}
function renderPcBrands() {
  const el = document.getElementById('pc-guide');
  const layers = pcGuides.setup_guides.brand_layers;
  let h = `<button class="back" onclick="renderPcMenu()">← All setup topics</button>
    <p class="q">Which brand?</p>`;
  Object.keys(layers).forEach(k => {
    h += `<button class="opt" onclick="renderPcBrand('${k}')">${esc(layers[k].brand || k)}</button>`;
  });
  el.innerHTML = h;
  window.scrollTo(0, 0);
}
function renderPcBrand(key) {
  const el = document.getElementById('pc-guide');
  const layer = pcGuides.setup_guides.brand_layers[key];
  let h = `<button class="back" onclick="renderPcBrands()">← All brands</button>
    <h1>${esc(layer.brand)} <span class="accent">setup tools</span></h1>`;
  const util = layer.utility;
  if (util) {
    const uname = typeof util === 'string' ? util : util.name;
    const udesc = typeof util === 'string' ? '' : util.what_it_does;
    if (uname) h += `<div class="card"><span class="rank">UPDATE UTILITY</span><h3>${esc(uname)}</h3>${udesc ? `<p class="why">${esc(udesc)}</p>` : ''}</div>`;
  }
  if (layer.driver_bios_channel)
    h += `<div class="card"><span class="rank">DRIVERS &amp; BIOS</span><p class="why">${esc(layer.driver_bios_channel)}</p></div>`;
  if (layer.warranty_registration)
    h += `<div class="card"><span class="rank">WARRANTY</span><p class="why">${esc(layer.warranty_registration)}</p></div>`;
  if (layer.setup_notes && layer.setup_notes.length)
    h += `<p class="picks-head">Good to know</p><div class="card"><ul style="margin:4px 0;padding-left:18px;color:#cbd5e1;font-size:.9rem">${layer.setup_notes.map(n => `<li style="margin-bottom:6px">${esc(n)}</li>`).join('')}</ul></div>`;
  el.innerHTML = h;
  window.scrollTo(0, 0);
}
function renderPcKidMenu() {
  const el = document.getElementById('pc-guide');
  const par = pcGuides.parental_controls;
  let h = `<button class="back" onclick="renderPcMenu()">← All setup topics</button>
    <h1>Setting up <span class="accent">for a kid</span></h1>`;
  if (par.core_principle) h += `<div class="note">${esc(par.core_principle)}</div>`;
  h += `<p class="q">Which system is the laptop?</p>`;
  Object.keys(par.platforms).forEach(k => {
    h += `<button class="opt" onclick="renderPcKidChoice('${k}')">${PC_OS_LABELS[k] || esc(par.platforms[k].platform)}<small>${esc(par.platforms[k].control_system || '')}</small></button>`;
  });
  el.innerHTML = h;
  window.scrollTo(0, 0);
}
function startPcKidWizard(key) {
  const p = pcGuides.parental_controls.platforms[key];
  const ctx = { os: key, brand: guideBrand };
  const screens = [];
  (p.account_setup || []).forEach((x, i) =>
    screens.push(wizStepScreen("Set up the child's account", x, i + 1, ctx)));
  (p.enable_steps || []).forEach((x, i) =>
    screens.push(wizStepScreen('Turn the controls on', x, i + 1, ctx)));
  if (p.controls_available && p.controls_available.length)
    screens.push({ html: `<p class="picks-head" style="margin-top:0">What you can control</p>` + checkListHTML(p.controls_available) });
  let finalHtml = '';
  if (p.first_setup_checklist && p.first_setup_checklist.length)
    finalHtml += `<p class="picks-head" style="margin-top:0">First-setup checklist</p>` + checkListHTML(p.first_setup_checklist);
  if (p.honest_limits && p.honest_limits.length) {
    finalHtml += `<p class="picks-head">Honest limits</p>`;
    p.honest_limits.forEach(x => {
      finalHtml += `<div class="note">${esc(typeof x === 'string' ? x : (x.detail || x.title || ''))}</div>`;
    });
  }
  finalHtml += `<button class="opt" onclick="openDisclaimers()">📄 Disclaimers<small>The fine print for all our guides — coverage notes and version caveats, in one place</small></button>`;
  if (finalHtml) screens.push({ html: finalHtml });
  wiz = { themeBase: key, title: `<h1>${esc(p.platform)} — <span class="accent">${esc(p.control_system || 'parental controls')}</span></h1>`,
          backAction: `renderPcKidChoice('${key}')`, backLabel: 'Back',
          doneAction: 'renderPcMenu()', doneLabel: '✓ Done — all setup topics',
          screens, i: 0 };
  wizRender();
}

// ------------------------------------------ Know your model? lookup
// Type a name — or the model number off the box or sticker — and jump
// straight to that model: its card (Buy) or its setup path (Set Up).
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
    const buying = flowType === 'buy';
    box.innerHTML = `<div class="note">We don't have that model in our catalog yet — we're adding computers as we research them, and ${buying ? 'the quiz' : 'the setup topics'} can still get you where you're going.</div>
      <button class="opt" onclick="${buying ? 'startLaptopBuy()' : 'startPcGuide()'}">${buying ? '💻 Take the buying quiz instead' : '🔧 Browse the setup topics'}</button>`;
    return;
  }
  box.innerHTML = modelMatches.map((m, i) =>
    `<button class="opt" onclick="pickModel(${i})">${esc(m.name)}<small>${m.type === 'desktop'
      ? `${esc(m.brand)} · Desktop · ${esc(m.form_factor_label)} · ${esc(m.platform)} · from $${m.price.toLocaleString()}`
      : `${esc(m.brand)} · ${esc(m.platform)} · from $${m.price.toLocaleString()}`}</small></button>`).join('');
}
async function pickModel(i) {
  const m = modelMatches[i];
  if (!m) return;
  if (m.type === 'desktop') {
    if (flowType === 'buy') renderDesktopModelCard(m);
    else { guideBrand = (m.setup && m.setup.brand_key) || null;
           await startPcGuide();
           if (m.setup && m.setup.os_key) renderPcTower(m.setup.os_key);
           else renderPcMenu(); }
    return;
  }
  if (flowType === 'buy') renderModelCard(m);
  else { guideBrand = (m.setup && m.setup.brand_key) || null;
         await startPcGuide(); renderPcFormFactor(m.setup.os_key); }
}
function renderModelCard(m) {
  hideAllSections();
  const r = document.getElementById('results');
  r.style.display = 'block';
  // The setup button reads the top pick out of laptopRes — point it here.
  laptopRes = { recommendations: [m], notes: [], kid: false,
                query: { use: 'everyday', os: 'any', screen: 'any',
                         budget: 'any', snapdragon: 'unsure', usage: 'light' } };
  ltwoInOne = false; lbattery = false; lshowAll = false;
  r.innerHTML = `<button class="back" onclick="startModelLookup()">← Search again</button>
    <h1>Your <span class="accent">model</span></h1>
    ${laptopCardHTML(m, 0, true, '🔎 YOUR MODEL')}
    <button class="opt setupcta" onclick="goLaptopSetup()">🔧 Set up your new laptop<small>First boot, brand setup tools — step by step, on the setup page</small></button>
    <button class="discbtn" onclick="openDisclaimers()">Disclaimers</button>
    <button class="opt" onclick="startLaptopBuy()">💻 Not the one? Take the laptop quiz<small>Answer a few questions and we'll match you</small></button>
    <button class="restart" style="background:#1e293b;color:#cbd5e1;border:2px solid #334155" onclick="location.reload()">↺ Start over</button>`;
  window.scrollTo(0, 0);
}
