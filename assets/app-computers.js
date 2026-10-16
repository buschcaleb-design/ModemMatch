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
const PC_ICONS = {
  'use:school': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="10" width="24" height="30" rx="8" fill="#f8a5c2"/><path d="M18 10a6 6 0 0 1 12 0"/><rect x="18" y="24" width="12" height="10" rx="3" fill="#ffffff"/></svg>',
  'use:everyday': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22 L24 8 L40 22"/><path d="M12 20v18h24V20" fill="#a7e8c9"/><rect x="20" y="28" width="8" height="10" fill="#ffffff"/></svg>',
  'use:work': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="16" width="34" height="22" rx="4" fill="#f2a65a"/><path d="M17 16v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3"/><path d="M7 26h34"/></svg>',
  'use:gaming': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="15" width="40" height="20" rx="10" fill="#c4b5fd"/><path d="M14 21v8M10 25h8"/><circle cx="33" cy="22" r="2.4" fill="#e84393" stroke="none"/><circle cx="38" cy="28" r="2.4" fill="#12b5a5" stroke="none"/></svg>',
  'use:creative': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 5a19 19 0 1 0 0 38c3 0 4-2 4-4 0-3-3-4-3-7 0-2 2-4 5-4h3a10 10 0 0 0 10-10C43 11 35 5 24 5z" fill="#fbcb8a"/><circle cx="15" cy="17" r="2.6" fill="#e84393" stroke="none"/><circle cx="26" cy="12" r="2.6" fill="#12b5a5" stroke="none"/><circle cx="14" cy="28" r="2.6" fill="#38bdf8" stroke="none"/></svg>',
  'os:windows': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11l14-2v13H8zM24 9l16-2v15H24zM8 24h14v13l-14-2zM24 24h16v15l-16-2z" fill="#38bdf8" stroke-width="2.4"/></svg>',
  'os:mac': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M31 13c-1-4 1-8 4-10 1 4-1 8-4 10zM24 15c-5-3-12 1-14 8-2 8 3 18 8 20 2 1 4-1 6-1s4 2 6 1c3-1 6-6 7-9-6-3-6-11 0-14-2-4-7-7-13-5z" fill="#1f2937" stroke-width="2.6"/></svg>',
  'os:chromebook': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 11a17 17 0 0 1 23-2" stroke="#ef4444" stroke-width="6"/><path d="M39 13a17 17 0 0 1-5 25" stroke="#f59e0b" stroke-width="6"/><path d="M34 38a17 17 0 0 1-24-7" stroke="#22c55e" stroke-width="6"/><circle cx="24" cy="24" r="7.5" fill="#38bdf8" stroke-width="3"/></svg>',
  'any': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 5l3.5 11.5L37 20l-11.5 3.5L22 35l-3.5-11.5L7 20l11.5-3.5z" fill="#ffd166"/><path d="M37 29l1.8 4.7L43.5 35.5l-4.7 1.8L37 42l-1.8-4.7L30.5 35.5l4.7-1.8z" fill="#e84393" stroke-width="2.2"/></svg>',
  'form:laptop': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="11" width="30" height="21" rx="3" fill="#d9f3fb"/><path d="M5 36h38l3.5 6h-45z" fill="#fdf3d8"/></svg>',
  'form:tower': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="15" y="5" width="18" height="38" rx="3" fill="#c4b5fd"/><circle cx="24" cy="34" r="3.4"/><path d="M19 11h10M19 17h10"/></svg>',
  'screen:size': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="36" height="24" rx="3" fill="#bfe8f5"/><path d="M24 38v4M15 44h18"/><path d="M31 27l6-6M31 21h6v6" stroke-width="3"/></svg>',
  'ext:0': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="11" width="30" height="21" rx="3" fill="#d9f3fb"/><path d="M5 36h38l3.5 6h-45z" fill="#fdf3d8"/></svg>',
  'ext:1': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="14" width="24" height="17" rx="2" fill="#bfe8f5"/><rect x="28" y="9" width="17" height="22" rx="2" fill="#fbcfe8"/><path d="M8 36h14"/></svg>',
  'ext:2': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="15" height="14" rx="2" fill="#fbcfe8"/><rect x="31" y="7" width="15" height="14" rx="2" fill="#a7e8c9"/><rect x="13" y="25" width="22" height="15" rx="2" fill="#bfe8f5"/></svg>',
  'res': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="9" width="34" height="26" rx="3" fill="#d9f3fb"/><path d="M13 15h7v7h-7zM22 15h7v7h-7zM31 15h4v7h-4zM13 24h7v5h-7zM22 24h7v5h-7z" stroke-width="2.2"/><path d="M24 39v3M16 44h16"/></svg>',
  'unsure': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="19" fill="#fde68a"/><path d="M18 18a6 6 0 1 1 8 6c-2 1-2 2-2 4"/><circle cx="24" cy="34" r="1.8" fill="#10304f" stroke="none"/></svg>',
  'tag': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h15l19 19-15 15L7 22z" fill="#a7e8c9"/><circle cx="15" cy="15" r="3.4" fill="#ffffff"/></svg>',
  'snap:no': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M38 8C20 10 10 20 10 36c14 2 26-8 28-28z" fill="#7ed491"/><path d="M12 36C18 26 26 18 34 12"/></svg>',
  'snap:yes': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="3" fill="#f8a5c2"/><rect x="26" y="8" width="14" height="14" rx="3" fill="#bfe8f5"/><rect x="8" y="26" width="14" height="14" rx="3" fill="#a7e8c9"/><rect x="26" y="26" width="14" height="14" rx="3" fill="#fbcb8a"/></svg>',
  'usage:light': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="9" width="34" height="28" rx="4" fill="#d9f3fb"/><path d="M7 17h34"/><circle cx="12" cy="13" r="1.7" fill="#e84393" stroke="none"/><circle cx="18" cy="13" r="1.7" fill="#f2a65a" stroke="none"/><path d="M13 24h14M13 30h20"/></svg>',
  'usage:heavy': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 32l16-8 16 8-16 8z" fill="#f2a65a"/><path d="M8 22l16-8 16 8-16 8z" fill="#f8a5c2"/></svg>',
  'kid:yes': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="18" fill="#ffd166"/><circle cx="17" cy="21" r="2.1" fill="#10304f" stroke="none"/><circle cx="31" cy="21" r="2.1" fill="#10304f" stroke="none"/><path d="M16 29a9 7 0 0 0 16 0"/></svg>',
  'kid:no': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="14" r="6.5" fill="#bfe8f5"/><path d="M10 41a14 10 0 0 1 28 0" fill="#c4b5fd"/></svg>',
  'eco:yes': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="23" height="17" rx="3" fill="#bfe8f5"/><rect x="30" y="19" width="13" height="21" rx="3" fill="#fbcfe8"/><path d="M24 32l9 4"/></svg>',
  'dev:eco_phone': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="5" width="20" height="38" rx="4" fill="#d9f3fb"/><path d="M21 37h6"/></svg>',
  'dev:eco_tv': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="38" height="24" rx="3" fill="#c4b5fd"/><path d="M24 38v4M16 44h16"/></svg>',
  'dev:eco_watch': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="13" width="16" height="22" rx="5" fill="#fbcfe8"/><path d="M20 13V6h8v7M20 35v7h8v-7"/></svg>',
  'case:mini': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.4"><path d="M9.5,20.5 L14,14.8 L41.5,15.2 L39.5,20.8 Z" fill="#d9f3fb"/><path d="M9.5,20.5 L39.5,20.8 L37.2,37.8 L11.8,38.2 Z" fill="#bfe8f5"/><path d="M12.5,26.5 L36.8,26.2" stroke-width="2.2"/><circle cx="17.5" cy="32.5" r="2.1" fill="#e84393" stroke="none"/><circle cx="24.5" cy="32.3" r="2.1" fill="#12b5a5" stroke="none"/></svg>',
  'case:sff': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-2 8.2 44.5)"><path d="M2.9,25.5 L13.4,24.5 L13.2,44.4 L3.1,44.6 Z" fill="#a7e8c9" stroke="#10304f"/><path d="M13.4,24.5 L15.9,22.0 L15.8,41.8 L13.2,44.4 Z" fill="#a7e8c9" stroke="#10304f"/><path d="M4.9,28.0 h6.5 M4.9,31.5 h6.5" stroke="#10304f" stroke-width="1.8"/><path d="M8.2,31.7 v3 M6.1,33.5 a2.6,2.6 0 1,0 4.2,0" stroke="#10304f" stroke-width="1.7"/><path d="M5.3,39.0 v3.4 M7.5,39.0 v3.4 M9.8,39.0 v3.4" stroke="#10304f" stroke-width="1.6"/></g><g transform="rotate(0 23.2 44.5)"><path d="M17.9,16.5 L28.4,15.5 L28.2,44.4 L18.1,44.6 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M28.4,15.5 L30.9,13.0 L30.8,41.8 L28.2,44.4 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M19.9,19.0 h6.5 M19.9,22.5 h6.5" stroke="#aeb9c8" stroke-width="1.8"/><path d="M23.2,27.4 v3 M21.1,29.2 a2.6,2.6 0 1,0 4.2,0" stroke="#aeb9c8" stroke-width="1.7"/><path d="M20.3,39.0 v3.4 M22.5,39.0 v3.4 M24.8,39.0 v3.4" stroke="#aeb9c8" stroke-width="1.6"/></g><g transform="rotate(2 38.2 44.5)"><path d="M33.0,7.5 L43.5,6.5 L43.2,44.4 L33.2,44.6 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M43.5,6.5 L46.0,4.0 L45.8,41.8 L43.2,44.4 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M35.0,10.0 h6.5 M35.0,13.5 h6.5" stroke="#aeb9c8" stroke-width="1.8"/><path d="M38.2,23.1 v3 M36.1,24.9 a2.6,2.6 0 1,0 4.2,0" stroke="#aeb9c8" stroke-width="1.7"/><path d="M35.4,39.0 v3.4 M37.6,39.0 v3.4 M39.8,39.0 v3.4" stroke="#aeb9c8" stroke-width="1.6"/></g><path d="M2 45.8h44" stroke="#aeb9c8" stroke-width="2.4"/></svg>',
  'case:tower': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-2 8.2 44.5)"><path d="M2.9,25.5 L13.4,24.5 L13.2,44.4 L3.1,44.6 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M13.4,24.5 L15.9,22.0 L15.8,41.8 L13.2,44.4 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M4.9,28.0 h6.5 M4.9,31.5 h6.5" stroke="#aeb9c8" stroke-width="1.8"/><path d="M8.2,31.7 v3 M6.1,33.5 a2.6,2.6 0 1,0 4.2,0" stroke="#aeb9c8" stroke-width="1.7"/><path d="M5.3,39.0 v3.4 M7.5,39.0 v3.4 M9.8,39.0 v3.4" stroke="#aeb9c8" stroke-width="1.6"/></g><g transform="rotate(0 23.2 44.5)"><path d="M17.9,16.5 L28.4,15.5 L28.2,44.4 L18.1,44.6 Z" fill="#c4b5fd" stroke="#10304f"/><path d="M28.4,15.5 L30.9,13.0 L30.8,41.8 L28.2,44.4 Z" fill="#c4b5fd" stroke="#10304f"/><path d="M19.9,19.0 h6.5 M19.9,22.5 h6.5" stroke="#10304f" stroke-width="1.8"/><path d="M23.2,27.4 v3 M21.1,29.2 a2.6,2.6 0 1,0 4.2,0" stroke="#10304f" stroke-width="1.7"/><path d="M20.3,39.0 v3.4 M22.5,39.0 v3.4 M24.8,39.0 v3.4" stroke="#10304f" stroke-width="1.6"/></g><g transform="rotate(2 38.2 44.5)"><path d="M33.0,7.5 L43.5,6.5 L43.2,44.4 L33.2,44.6 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M43.5,6.5 L46.0,4.0 L45.8,41.8 L43.2,44.4 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M35.0,10.0 h6.5 M35.0,13.5 h6.5" stroke="#aeb9c8" stroke-width="1.8"/><path d="M38.2,23.1 v3 M36.1,24.9 a2.6,2.6 0 1,0 4.2,0" stroke="#aeb9c8" stroke-width="1.7"/><path d="M35.4,39.0 v3.4 M37.6,39.0 v3.4 M39.8,39.0 v3.4" stroke="#aeb9c8" stroke-width="1.6"/></g><path d="M2 45.8h44" stroke="#aeb9c8" stroke-width="2.4"/></svg>',
  'case:full': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-2 8.2 44.5)"><path d="M2.9,25.5 L13.4,24.5 L13.2,44.4 L3.1,44.6 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M13.4,24.5 L15.9,22.0 L15.8,41.8 L13.2,44.4 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M4.9,28.0 h6.5 M4.9,31.5 h6.5" stroke="#aeb9c8" stroke-width="1.8"/><path d="M8.2,31.7 v3 M6.1,33.5 a2.6,2.6 0 1,0 4.2,0" stroke="#aeb9c8" stroke-width="1.7"/><path d="M5.3,39.0 v3.4 M7.5,39.0 v3.4 M9.8,39.0 v3.4" stroke="#aeb9c8" stroke-width="1.6"/></g><g transform="rotate(0 23.2 44.5)"><path d="M17.9,16.5 L28.4,15.5 L28.2,44.4 L18.1,44.6 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M28.4,15.5 L30.9,13.0 L30.8,41.8 L28.2,44.4 Z" fill="#e9edf3" stroke="#aeb9c8"/><path d="M19.9,19.0 h6.5 M19.9,22.5 h6.5" stroke="#aeb9c8" stroke-width="1.8"/><path d="M23.2,27.4 v3 M21.1,29.2 a2.6,2.6 0 1,0 4.2,0" stroke="#aeb9c8" stroke-width="1.7"/><path d="M20.3,39.0 v3.4 M22.5,39.0 v3.4 M24.8,39.0 v3.4" stroke="#aeb9c8" stroke-width="1.6"/></g><g transform="rotate(2 38.2 44.5)"><path d="M33.0,7.5 L43.5,6.5 L43.2,44.4 L33.2,44.6 Z" fill="#f8a5c2" stroke="#10304f"/><path d="M43.5,6.5 L46.0,4.0 L45.8,41.8 L43.2,44.4 Z" fill="#f8a5c2" stroke="#10304f"/><path d="M35.0,10.0 h6.5 M35.0,13.5 h6.5" stroke="#10304f" stroke-width="1.8"/><path d="M38.2,23.1 v3 M36.1,24.9 a2.6,2.6 0 1,0 4.2,0" stroke="#10304f" stroke-width="1.7"/><path d="M35.4,39.0 v3.4 M37.6,39.0 v3.4 M39.8,39.0 v3.4" stroke="#10304f" stroke-width="1.6"/></g><path d="M2 45.8h44" stroke="#aeb9c8" stroke-width="2.4"/></svg>',
  'case:aio': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6.8" y="6.5" width="27" height="19" rx="3" fill="#d9f3fb"/><rect x="10.3" y="9.8" width="20" height="12.5" rx="1.6" fill="#10304f" stroke="none"/><path d="M20.3,25.5 v3.4 M14.5,31.8 h11.5" stroke-width="2.6"/><path d="M33.5,29.5 C37,27 39.5,29 39.8,33" stroke-width="2.2"/><rect x="5.5" y="35.5" width="24" height="8" rx="2.2" fill="#38bdf8"/><path d="M9,38.3 h17 M9,41 h17" stroke="#ffffff" stroke-width="1.7"/><rect x="36.5" y="34" width="7.5" height="10.5" rx="3.6" fill="#10304f"/><path d="M40.2,34.2 v3.6" stroke="#ffffff" stroke-width="1.6"/><path d="M41.5,2.8 l1.1,2.7 2.7,1.1 -2.7,1.1 -1.1,2.7 -1.1,-2.7 -2.7,-1.1 2.7,-1.1 Z" fill="#e84393" stroke="none"/><path d="M3.2,27.5 l.8,2 2,.8 -2,.8 -.8,2 -.8,-2 -2,-.8 2,-.8 Z" fill="#12b5a5" stroke="none"/></svg>',
  'scr:1': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="11" width="32" height="22" rx="3" fill="#bfe8f5"/><path d="M24 37v4M16 44h16"/></svg>',
  'scr:2': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="20" height="15" rx="2" fill="#bfe8f5"/><rect x="25" y="12" width="20" height="15" rx="2" fill="#fbcfe8"/><path d="M13 31v4M35 31v4M8 39h10M30 39h10"/></svg>',
  'scr:3': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="14" height="12" rx="2" fill="#fbcfe8"/><rect x="17" y="9" width="14" height="12" rx="2" fill="#bfe8f5"/><rect x="32" y="9" width="14" height="12" rx="2" fill="#a7e8c9"/><rect x="13" y="26" width="22" height="14" rx="2" fill="#fbcb8a"/><path d="M24 43v3"/></svg>',
  'case:any': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5.2,7.2 C4.8,3.8 10.6,3.2 10.9,6.4 C11.1,8.6 7.9,9.2 7.8,11.6" stroke="#e84393" stroke-width="2.7"/><circle cx="7.7" cy="15" r="1.4" fill="#e84393" stroke="none"/><path d="M37.1,6.4 C37.4,3.2 43.2,3.8 42.8,7.2 C42.6,9.3 40.2,9.3 40.1,11.6" stroke="#12b5a5" stroke-width="2.7"/><circle cx="40.2" cy="15" r="1.4" fill="#12b5a5" stroke="none"/><ellipse cx="24" cy="14.5" rx="7" ry="8.6" fill="#ffd9b3"/><path d="M13.2,44.5 C13,34 17.5,29.8 24,29.8 C30.5,29.8 35,34 34.8,44.5 Z" fill="#f8a5c2"/><path d="M14.5,34.5 C10.8,30.8 8.8,26.8 9.2,21.8" stroke-width="4.2"/><path d="M5.8,21.2 L12.8,20.6" stroke-width="3.4"/><path d="M33.5,34.5 C37.2,30.8 39.2,26.8 38.8,21.8" stroke-width="4.2"/><path d="M35.2,20.6 L42.2,21.2" stroke-width="3.4"/></svg>',
  'none': '<svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="18" fill="#fee2e2"/><path d="M17 17l14 14M31 17L17 31"/></svg>',
};
const DESK_SCENE = `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A cozy desk with a laptop" fill="none" stroke="#10304f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="552" height="332" rx="22" fill="#e7e1fc"/><path d="M4,196 L556,178 L556,314 Q556,336 534,336 L26,336 Q4,336 4,314 Z" fill="#aebdf5"/><path d="M4,196 L556,178" stroke="#8fa3e8" stroke-width="3" fill="none"/><path d="M18,26 L77,23 L138,22" stroke="#ffffff" stroke-width="9"/><path d="M18,43 L78,40 L138,39" stroke="#ffffff" stroke-width="9"/><path d="M18,60 L78,58 L138,56" stroke="#ffffff" stroke-width="9"/><path d="M18,77 L77,75 L138,73" stroke="#ffffff" stroke-width="9"/><path d="M426,30 L452,28 L454,139 L426,137 Z" fill="#f8a5c2"/><path d="M459,32 L484,30 L486,136 L459,137 Z" fill="#a7e8c9"/><path d="M487,28 L513,31 L513,138 L489,137 Z" fill="#fbcb8a"/><path d="M518,28 L542,29 L545,138 L517,138 Z" fill="#c4b5fd"/><path d="M352,95 L393,97 L391,130 L352,132 Z" fill="#f2a65a"/><path d="M372,70 L368,77 L365,85 L356,83 L349,83 L342,78 L343,70 L343,63 L350,59 L356,54 L364,56 L369,62 Z" fill="#7ed491"/><path d="M391,58 L386,66 L381,74 L372,75 L363,73 L357,66 L353,58 L355,48 L364,43 L372,40 L379,45 L388,49 Z" fill="#7ed491"/><path d="M404,72 L403,80 L397,86 L389,85 L382,84 L376,79 L377,72 L377,65 L383,61 L389,60 L395,62 L402,64 Z" fill="#7ed491"/><path d="M376,80 L375,85 L372,90 L366,94 L361,89 L356,86 L354,80 L354,73 L359,68 L366,66 L371,71 L376,74 Z" fill="#7ed491"/><path d="M392,84 L393,90 L389,96 L382,93 L377,92 L374,89 L372,84 L373,79 L376,74 L382,74 L386,77 L391,79 Z" fill="#7ed491"/><path d="M96,208 L95,158 L96,108" stroke="#10304f" stroke-width="6"/><path d="M74,203 L122,202 L123,212 L74,215 Z" fill="#e84393"/><path d="M71,67 L124,64 L112,107 L78,106 Z" fill="#f78fb3"/><circle cx="97" cy="112" r="7" fill="#ffd166"/><path d="M139,167 L169,166 L168,209 L138,209 Z" fill="#bfe8f5"/><path d="M155,158 L154,155 L155,150" stroke="#10304f" stroke-width="3"/><circle cx="155" cy="146" r="4" fill="#ffd166"/><path d="M197,106 L345,107 L345,206 L198,210 Z" fill="#d9f3fb"/><path d="M212,132 q30,-16 58,0 t58,4" stroke="#7cc7de" stroke-width="4" fill="none"/><path d="M238,168 L298,166 L299,193 L239,193 Z" fill="#a8dff0"/><path d="M180,212 L360,207 L376,230 L168,236 Z" fill="#fdf3d8"/><path d="M247,217 L297,216 L297,225 L246,225 Z" fill="#d9c9a3"/><path d="M119,251 L240,254 L240,306 L122,305 Z" fill="#cdeffd"/><path d="M142,254 L145,232 L149,210" stroke="#e84393" stroke-width="7"/><path d="M164,254 L167,227 L171,202" stroke="#f2a65a" stroke-width="7"/><path d="M186,254 L188,230 L193,208" stroke="#12b5a5" stroke-width="7"/><circle cx="212" cy="238" r="9" fill="none" stroke="#10304f" stroke-width="4"/><circle cx="226" cy="240" r="9" fill="none" stroke="#10304f" stroke-width="4"/><path d="M216,246 L209,258 L204,268" stroke="#10304f" stroke-width="4"/><path d="M222,248 L230,257 L236,266" stroke="#10304f" stroke-width="4"/><path d="M152,274 L208,271 L205,293 L149,293 Z" fill="#f8a5c2"/><path d="M269,260 L378,258 L377,321 L266,321 Z" fill="#ffd9b3"/><circle cx="282" cy="262" r="4" fill="#ffffff"/><circle cx="302" cy="262" r="4" fill="#ffffff"/><circle cx="322" cy="262" r="4" fill="#ffffff"/><circle cx="342" cy="262" r="4" fill="#ffffff"/><circle cx="362" cy="262" r="4" fill="#ffffff"/><path d="M282,282 L320,282 L356,280" stroke="#e8a87c" stroke-width="4"/><path d="M282,298 L312,297 L340,296" stroke="#e8a87c" stroke-width="4"/><path d="M391,169 L425,169 L428,202 L392,204 Z" fill="#fde68a"/><path d="M435,175 L463,175 L466,207 L433,207 Z" fill="#fbcfe8"/><path d="M452,206 q64,-16 88,22 l0,108 l-96,0 q-10,-66 8,-130 Z" fill="#8fe3d0"/><path d="M468,259 L527,258 L527,276 L468,279 Z" fill="#f2a65a"/></svg>`;
function pcIconFor(qkey, v) {
  const M = { use: 'use:' + v, os: v === 'any' ? 'any' : 'os:' + v,
    form: 'form:' + v, screen: v === 'any' ? 'any' : 'screen:size',
    ext_screens: 'ext:' + v, ext_resolution: v === 'unsure' ? 'unsure' : 'res',
    budget: v === 'any' ? 'any' : 'tag',
    snapdragon: v === 'no' ? 'snap:no' : v === 'yes' ? 'snap:yes' : 'unsure',
    usage: 'usage:' + v, kid: 'kid:' + v,
    eco_wants: v === 'yes' ? 'eco:yes' : 'any',
    eco_phone: v === '' ? 'none' : 'dev:eco_phone',
    case: 'case:' + v, screens: 'scr:' + v,
    resolution: v === 'unsure' ? 'unsure' : 'res',
    eco_tv: v === '' ? 'none' : 'dev:eco_tv',
    eco_watch: v === '' ? 'none' : 'dev:eco_watch' };
  return PC_ICONS[M[qkey]] || (v === 'any' ? PC_ICONS['any'] : null);
}
const GAMING_SCENE = `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A gaming corner at night — glowing monitor, controller and headset" fill="none" stroke="#cfc6f5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="552" height="332" rx="22" fill="#262040"/><path d="M4,238 L556,224 L556,314 Q556,336 534,336 L26,336 Q4,336 4,314 Z" fill="#2f2750" stroke="#574a8a" stroke-width="2"/><g transform="translate(58,44) rotate(-6)"><rect x="0" y="16" width="104" height="54" rx="26" fill="none" stroke="#f472b6" stroke-width="5"/><path d="M34 32v20M24 42h20" stroke="#f472b6" stroke-width="5"/><circle cx="76" cy="36" r="4.5" fill="#22d3ee" stroke="none"/><circle cx="88" cy="48" r="4.5" fill="#ffd166" stroke="none"/></g><circle cx="210" cy="52" r="4.5" fill="#22d3ee" stroke="none"/><circle cx="240" cy="52" r="4.5" fill="#f472b6" stroke="none"/><circle cx="270" cy="52" r="4.5" fill="#a78bfa" stroke="none"/><circle cx="300" cy="52" r="4.5" fill="#ffd166" stroke="none"/><circle cx="330" cy="52" r="4.5" fill="#22d3ee" stroke="none"/><circle cx="360" cy="52" r="4.5" fill="#f472b6" stroke="none"/><path d="M470,37 L472.6,43.4 L479,46 L472.6,48.6 L470,55 L467.4,48.6 L461,46 L467.4,43.4 Z" fill="#ffffff" stroke="none"/><path d="M508,75 L510.6,81.4 L517,84 L510.6,86.6 L508,93 L505.4,86.6 L499,84 L505.4,81.4 Z" fill="#f472b6" stroke="none"/><path d="M436,87 L438.6,93.4 L445,96 L438.6,98.6 L436,105 L433.4,98.6 L427,96 L433.4,93.4 Z" fill="#22d3ee" stroke="none"/><path d="M195,92 L386,91 L386,210 L194,210 Z" fill="#17122b"/><path d="M206,101 L373,105 L374,191 L210,193 Z" fill="#3b2d63"/><circle cx="338" cy="126" r="11" fill="#ffd166" stroke="none"/><path d="M208,191 L258,146 L292,176 L322,152 L386,191 Z" fill="#7c5cd6" stroke="none"/><path d="M208,191 L240,164 L268,191 Z" fill="#a78bfa" stroke="none"/><circle cx="232" cy="118" r="2.6" fill="#ffffff" stroke="none"/><circle cx="262" cy="132" r="2.6" fill="#ffffff" stroke="none"/><circle cx="300" cy="112" r="2.6" fill="#ffffff" stroke="none"/><path d="M291,210 L291,218 L291,228" stroke-width="6"/><path d="M258,232 L291,232 L324,232" stroke-width="6"/><path d="M122,236 L499,239 L500,254 L121,253 Z" fill="#17122b"/><path d="M140,254 L141,216 L140,176" stroke-width="5"/><path d="M118,182 a24,20 0 0 1 46,0" stroke="#22d3ee" stroke-width="6" fill="none"/><path d="M109,176 L125,176 L125,199 L110,201 Z" fill="#22d3ee"/><path d="M158,177 L171,177 L173,200 L158,199 Z" fill="#22d3ee"/><path d="M125,200 q-4,14 8,18" stroke="#22d3ee" stroke-width="4" fill="none"/><g transform="translate(356,247) rotate(7)"><rect x="0" y="6" width="76" height="38" rx="19" fill="#7c5cd6"/><path d="M24 17v14M17 24h14" stroke="#ffffff" stroke-width="4.4"/><circle cx="56" cy="19" r="3.8" fill="#f472b6" stroke="none"/><circle cx="65" cy="28" r="3.8" fill="#22d3ee" stroke="none"/></g><path d="M217,253 L346,253 L346,266 L215,268 Z" fill="#241c42"/><rect x="224" y="258" width="12" height="5" rx="2" fill="#f472b6" stroke="none"/><rect x="244" y="258" width="12" height="5" rx="2" fill="#22d3ee" stroke="none"/><rect x="264" y="258" width="12" height="5" rx="2" fill="#a78bfa" stroke="none"/><rect x="284" y="258" width="12" height="5" rx="2" fill="#ffd166" stroke="none"/><rect x="304" y="258" width="12" height="5" rx="2" fill="#f472b6" stroke="none"/><rect x="324" y="258" width="12" height="5" rx="2" fill="#22d3ee" stroke="none"/><path d="M470,190 q52,-14 66,18 l0,128 l-84,0 q-6,-84 18,-146 Z" fill="#4c3a8f"/><path d="M486,214 L520,212 L520,232 L486,234 Z" fill="#f472b6"/></svg>`;
const OFFICE_SCENE = `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A home office — wooden shelves, desk and leather chair" fill="none" stroke="#10304f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="552" height="332" rx="22" fill="#f7ecd9"/><path d="M4,252 L556,240 L556,314 Q556,336 534,336 L26,336 Q4,336 4,314 Z" fill="#dcb98c"/><path d="M90,262 L105,295 L120,330" stroke="#c49a67" stroke-width="3.4"/><path d="M230,262 L247,296 L260,330" stroke="#c49a67" stroke-width="3.4"/><path d="M380,262 L393,297 L410,330" stroke="#c49a67" stroke-width="3.4"/><path d="M28,29 L146,31 L149,198 L29,199 Z" fill="#d9f3fb"/><path d="M89,32 L90,113 L89,196" stroke="#8fc1e5" stroke-width="4"/><path d="M32,114 L88,114 L146,112" stroke="#8fc1e5" stroke-width="4"/><path d="M112,26 L152,26 L148,204 Q138,210 130,204 L124,120 Q120,60 112,26 Z" fill="#efe3c8"/><path d="M130,40 L130,117 L126,190" stroke="#d9c69c" stroke-width="3.4"/><path d="M178,45 L237,44 L238,95 L176,93 Z" fill="#ffffff"/><path d="M184,86 L202,64 L214,76 L224,66 L232,86 Z" fill="#a7c4e2" stroke="none"/><circle cx="222" cy="56" r="4.6" fill="#ffd166" stroke="none"/><path d="M269,57 L539,57 L541,68 L268,70 Z" fill="#c98d54"/><path d="M292,69 L292,76 L292,82" stroke-width="4"/><path d="M508,69 L508,75 L508,82" stroke-width="4"/><path d="M268,118 L540,117 L542,130 L269,129 Z" fill="#c98d54"/><path d="M292,129 L291,135 L292,142" stroke-width="4"/><path d="M508,129 L509,136 L508,142" stroke-width="4"/><path d="M268,179 L541,177 L540,189 L267,189 Z" fill="#c98d54"/><path d="M292,189 L292,195 L292,202" stroke-width="4"/><path d="M508,189 L509,195 L508,202" stroke-width="4"/><path d="M283,17 L294,18 L294,58 L281,58 Z" fill="#7ea6d8"/><path d="M297,25 L311,23 L311,58 L297,59 Z" fill="#e8a87c"/><path d="M312,15 L325,16 L324,59 L312,59 Z" fill="#a7e8c9"/><path d="M462,20 L474,20 L475,57 L463,58 Z" fill="#c4b5fd"/><path d="M477,27 L491,27 L491,57 L478,58 Z" fill="#f8a5c2"/><path d="M384,38 L381,45 L377,49 L371,52 L365,53 L358,50 L354,45 L353,38 L356,32 L360,28 L365,23 L371,24 L378,25 L381,32 Z" fill="#b9c6a8"/><path d="M339,91 L369,91 L367,118 L337,118 Z" fill="#f2a65a"/><path d="M353,92 q-2,-16 -12,-20 M353,92 q1,-18 12,-22 M353,92 q-8,-12 -18,-12" stroke="#5da85f" stroke-width="4.4" fill="none"/><path d="M430,140 L470,140 L472,178 L429,179 Z" fill="#ffffff"/><path d="M438,168 L450,152 L458,160 L464,154 L466,168 Z" fill="#a7c4e2" stroke="none"/><path d="M283,141 L298,142 L296,178 L284,177 Z" fill="#fbcb8a"/><path d="M298,148 L311,149 L310,177 L298,178 Z" fill="#7ea6d8"/><path d="M471,137 L482,137 L482,177 L471,178 Z" fill="#e8a87c"/><path d="M487,143 L498,144 L498,178 L487,178 Z" fill="#a7e8c9"/><path d="M369,158 L369,164 L365,169 L359,173 L353,170 L347,170 L343,164 L343,158 L344,152 L348,148 L353,143 L359,145 L365,147 L369,152 Z" fill="#e5ddcb"/><path d="M405,148 L438,148 L438,177 L405,177 Z" fill="#8a6f4d"/><path d="M35,238 L336,236 L337,254 L36,252 Z" fill="#b57e46"/><path d="M47,250 L69,253 L71,313 L47,313 Z" fill="#9a6a38"/><path d="M292,251 L314,253 L313,315 L291,313 Z" fill="#9a6a38"/><path d="M96,183 L192,182 L193,240 L97,242 Z" fill="#d9f3fb"/><path d="M110,204 q22,-12 44,0" stroke="#7cc7de" stroke-width="4" fill="none"/><path d="M84,240 L146,240 L206,240" stroke-width="6"/><path d="M215,214 L277,214 L277,241 L215,239 Z" fill="#ffffff"/><path d="M224,224 L247,223 L268,223" stroke="#b9c6d8" stroke-width="3"/><path d="M224,232 L240,231 L258,231" stroke="#b9c6d8" stroke-width="3"/><path d="M286,236 L293,226 L300,218" stroke="#e84393" stroke-width="5"/><path d="M53,215 L77,216 L77,236 L52,237 Z" fill="#7ea6d8"/><path d="M78,222 a8,7 0 1 1 0,10" stroke-width="3.6"/><path d=\"M428,147 L515,149 L513,255 L429,254 Z\" fill=\"#d99a5b\"/><path d=\"M434,170 L473,168 L510,168\" stroke=\"#b57e46\" stroke-width=\"3.4\"/><path d=\"M434,196 L473,195 L510,194\" stroke=\"#b57e46\" stroke-width=\"3.4\"/><path d=\"M434,222 L471,222 L510,220\" stroke=\"#b57e46\" stroke-width=\"3.4\"/><path d=\"M428,208 L415,217 L402,224\" stroke-width=\"6\"/><path d=\"M472,252 L471,267 L472,280\" stroke-width=\"6\"/><path d=\"M440,296 q32,-14 64,0\" stroke-width=\"6\" fill=\"none\"/><path d=\"M448,302 L447,305 L446,307 L443,308 L440,309 L438,307 L436,305 L434,302 L435,299 L438,297 L441,296 L444,295 L446,296 L448,299 Z\" fill=\"#5b4632\"/><path d=\"M509,302 L508,305 L506,307 L503,308 L501,308 L498,307 L496,305 L496,302 L496,299 L497,296 L500,294 L503,296 L507,296 L508,299 Z\" fill=\"#5b4632\"/></svg>`;
const CREATOR_SCENE = `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="An artist studio desk — blank canvas, brushes, palette and paint tubes" fill="none" stroke="#10304f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="552" height="332" rx="22" fill="#f6e3c2"/><path d="M4,236 L556,224 L556,314 Q556,336 534,336 L26,336 Q4,336 4,314 Z" fill="#caa06a"/><path d="M110,252 L144,251 L180,250" stroke="#b28a52" stroke-width="3.2"/><path d="M260,252 L293,253 L330,250" stroke="#b28a52" stroke-width="3.2"/><path d="M420,252 L456,253 L490,250" stroke="#b28a52" stroke-width="3.2"/><g transform="rotate(-1.5 280 130)"><path d="M188,36 L372,32 L376,206 L192,210 Z" fill="#fffdf4"/><path d="M188,36 L372,32 L376,206 L192,210 Z" fill="none"/><path d="M204,54 L356,50" stroke="#e8dcc2" stroke-width="5"/></g><circle cx="150" cy="66" r="7" fill="#f472b6" stroke="none"/><circle cx="428" cy="52" r="6" fill="#22a8d8" stroke="none"/><circle cx="452" cy="96" r="5" fill="#ffd166" stroke="none"/><circle cx="128" cy="120" r="5" fill="#7ed491" stroke="none"/><path d="M72,176 L68,129 L66,84" stroke="#5da85f" stroke-width="6"/><path d="M62,84 q5,-16 10,-22 q6,8 4,22 Z" fill="#e8a87c"/><path d="M88,176 L84,129 L82,84" stroke="#38bdf8" stroke-width="6"/><path d="M78,84 q5,-16 10,-22 q6,8 4,22 Z" fill="#f8a5c2"/><path d="M104,176 L99,131 L98,84" stroke="#e84393" stroke-width="6"/><path d="M94,84 q5,-16 10,-22 q6,8 4,22 Z" fill="#ffd166"/><path d="M118,176 L115,131 L112,84" stroke="#7c5cd6" stroke-width="6"/><path d="M108,84 q5,-16 10,-22 q6,8 4,22 Z" fill="#e8a87c"/><path d="M53,171 L132,171 L132,247 L51,244 Z" fill="#e3b778"/><path d="M54,188 L94,187 L132,186" stroke="#c49a67" stroke-width="4"/><path d="M154,198 L183,195 L181,229 L153,230 Z" fill="#f2d38a"/><path d="M152,204 L167,203 L182,204" stroke-width="3.4"/><path d="M196,268 q-4,-36 38,-44 q46,-8 68,16 q18,22 -4,38 q-20,14 -50,6 q-44,4 -52,-16 Z" fill="#e8c188"/><circle cx="226" cy="248" r="8.5" fill="#e84393" stroke="none"/><circle cx="256" cy="240" r="8.5" fill="#ffd166" stroke="none"/><circle cx="284" cy="248" r="8.5" fill="#22a8d8" stroke="none"/><circle cx="240" cy="268" r="8.5" fill="#7ed491" stroke="none"/><circle cx="272" cy="268" r="8.5" fill="#e8912d" stroke="none"/><circle cx="216" cy="262" r="6" fill="#caa06a" stroke="none"/><path d="M298,262 L323,251 L348,240" stroke="#e84393" stroke-width="6"/><path d="M348,240 q12,-8 18,-4 q-4,8 -14,10 Z" fill="#f8a5c2"/><path d="M404,196 L528,192 L516,246 Q466,262 416,246 Z" fill="#c98d54"/><g transform="rotate(-14 424 190)"><path d="M423,127 L440,128 L441,190 L425,189 Z" fill="#fffdf4"/><path d="M423,167 L440,168 L441,189 L423,191 Z" fill="#e84393"/><path d="M426,119 L439,120 L438,128 L426,129 Z" fill="#e84393"/></g><g transform="rotate(-5 448 190)"><path d="M448,122 L464,121 L466,186 L448,184 Z" fill="#fffdf4"/><path d="M447,162 L464,162 L464,184 L449,183 Z" fill="#ffd166"/><path d="M450,113 L463,114 L463,124 L450,123 Z" fill="#ffd166"/></g><g transform="rotate(4 472 190)"><path d="M472,120 L490,119 L487,182 L471,181 Z" fill="#fffdf4"/><path d="M472,161 L490,160 L489,182 L472,181 Z" fill="#7ed491"/><path d="M473,111 L487,111 L488,121 L474,122 Z" fill="#7ed491"/></g><g transform="rotate(12 494 190)"><path d="M492,123 L510,125 L510,188 L493,186 Z" fill="#fffdf4"/><path d="M494,165 L510,163 L512,187 L494,187 Z" fill="#38bdf8"/><path d="M496,115 L509,114 L510,124 L495,126 Z" fill="#38bdf8"/></g><g transform="rotate(20 514 190)"><path d="M514,131 L532,131 L531,192 L513,194 Z" fill="#fffdf4"/><path d="M515,171 L532,172 L531,195 L514,193 Z" fill="#e8912d"/><path d="M515,124 L528,122 L529,134 L517,133 Z" fill="#e8912d"/></g><g transform="rotate(24 420 292)"><path d="M382,282 L446,282 L446,300 L382,300 Z" fill="#fffdf4"/><path d="M424,282 L446,282 L446,300 L424,300 Z" fill="#7c5cd6"/><path d="M446,286 L458,291 L446,296 Z" fill="#7c5cd6"/></g><path d="M120,292 L148,289 L176,284" stroke="#e8912d" stroke-width="6"/><path d="M176,284 l12,-1 l-9,6 Z" fill="#ffd9b3"/></svg>`;
const FAMILY_SCENE = `<svg viewBox=\"0 0 560 340\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"A family piled on a couch with a laptop\" fill=\"none\" stroke=\"#10304f\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"4\" width=\"552\" height=\"332\" rx=\"22\" fill=\"#eaf7ec\"/><path d=\"M4,258 L556,246 L556,314 Q556,336 534,336 L26,336 Q4,336 4,314 Z\" fill=\"#ecd9ae\"/><path d=\"M121,280 L447,275 L453,321 L118,322 Z\" fill=\"#cdeffd\"/><path d=\"M140,300 l22,-10 l22,10 l22,-10 l22,10 l22,-10 l22,10 l22,-10 l22,10 l22,-10 l22,10\" stroke=\"#8fc1e5\" stroke-width=\"3.4\" fill=\"none\"/><path d=\"M448,31 L532,30 L533,137 L448,140 Z\" fill=\"#fff7d6\"/><path d=\"M490,32 L491,84 L490,136\" stroke=\"#e8c87c\" stroke-width=\"4\"/><path d=\"M483,54 L484,60 L479,62 L475,67 L470,65 L465,63 L461,59 L460,54 L463,49 L465,45 L469,43 L475,43 L479,46 L482,49 Z\" fill=\"#ffd166\"/><path d=\"M37,40 L102,38 L103,96 L37,94 Z\" fill=\"#ffffff\"/><path d=\"M69,84 C52,70 50,56 60,52 C66,50 69,54 69,58 C69,54 72,50 78,52 C88,56 86,70 69,84 Z\" fill=\"#f472b6\" stroke=\"none\"/><path d=\"M128,108 L156,106 L148,146 L134,146 Z\" fill=\"#fbcb8a\"/><path d=\"M142,146 L143,192 L142,238\" stroke-width=\"5.4\"/><path d=\"M124,242 L141,242 L160,242\" stroke-width=\"5.4\"/><path d=\"M478,215 L517,215 L517,249 L480,252 Z\" fill=\"#f2a65a\"/><path d=\"M498,216 q-2,-20 -16,-26 M498,216 q1,-24 14,-30 M498,216 q-12,-14 -24,-14\" stroke=\"#5da85f\" stroke-width=\"4.6\" fill=\"none\"/><path d=\"M168,146 L439,150 L433,216 L165,216 Z\" fill=\"#8fe3d0\"/><path d=\"M159,199 L447,194 L446,250 L157,249 Z\" fill=\"#a9ecd9\"/><path d=\"M149,183 L179,181 L177,246 L151,246 Z\" fill=\"#8fe3d0\"/><path d=\"M425,181 L452,184 L456,246 L423,244 Z\" fill=\"#8fe3d0\"/><path d=\"M302,200 L303,221 L302,244\" stroke=\"#6fc7b2\" stroke-width=\"3.6\"/><path d=\"M168,250 L167,255 L168,262\" stroke-width=\"5\"/><path d=\"M436,250 L436,256 L436,262\" stroke-width=\"5\"/><path d=\"M146,176 L184,174 L186,226 L172,218 L160,228 L150,218 L144,228 Z\" fill=\"#f2a65a\"/><path d=\"M394,170 L428,167 L430,208 L394,206 Z\" fill=\"#ffd166\"/><path d=\"M215.0,214 L215.0,159.15 Q215.0,143.15 238,143.15 Q261.0,143.15 261.0,159.15 L261.0,214 Z\" fill=\"#7ea6d8\"/><circle cx=\"238\" cy=\"136\" r=\"13\" fill=\"#ffd9b3\"/><path d=\"M347.0,214 L347.0,159.15 Q347.0,143.15 370,143.15 Q393.0,143.15 393.0,159.15 L393.0,214 Z\" fill=\"#7ed491\"/><circle cx=\"370\" cy=\"136\" r=\"13\" fill=\"#ffd9b3\"/><path d=\"M266.0,214 L266.0,179.5 Q266.0,163.5 283,163.5 Q300.0,163.5 300.0,179.5 L300.0,214 Z\" fill=\"#f8a5c2\"/><circle cx=\"283\" cy=\"158\" r=\"10\" fill=\"#ffd9b3\"/><path d=\"M308.0,214 L308.0,179.5 Q308.0,163.5 325,163.5 Q342.0,163.5 342.0,179.5 L342.0,214 Z\" fill=\"#e8912d\"/><circle cx=\"325\" cy=\"158\" r=\"10\" fill=\"#ffd9b3\"/><path d=\"M289,191 L321,193 L321,217 L289,216 Z\" fill=\"#d9f3fb\"/><path d=\"M282,218 L306,217 L330,218\" stroke-width=\"4.4\"/><path d=\"M274,232 L272,242 L272,250\" stroke-width=\"5\"/><circle cx=\"271\" cy=\"252\" r=\"3.6\" fill=\"#e84393\" stroke=\"none\"/><path d=\"M292,232 L292,240 L290,250\" stroke-width=\"5\"/><circle cx=\"289\" cy=\"252\" r=\"3.6\" fill=\"#e84393\" stroke=\"none\"/><path d=\"M318,232 L317,241 L316,250\" stroke-width=\"5\"/><circle cx=\"315\" cy=\"252\" r=\"3.6\" fill=\"#e84393\" stroke=\"none\"/><path d=\"M336,232 L335,240 L334,250\" stroke-width=\"5\"/><circle cx=\"333\" cy=\"252\" r=\"3.6\" fill=\"#e84393\" stroke=\"none\"/><path d=\"M54,288 L77,290 L77,316 L53,316 Z\" fill=\"#f8a5c2\"/><path d=\"M79,294 L103,294 L102,316 L82,318 Z\" fill=\"#7ea6d8\"/><path d=\"M522,292 L520,298 L517,304 L511,306 L505,305 L500,303 L496,298 L495,292 L495,286 L500,281 L505,280 L511,277 L516,282 L522,285 Z\" fill=\"#ffd166\"/><path d=\"M496,284 a14,14 0 0 1 24,6\" stroke=\"#e8912d\" stroke-width=\"3.4\" fill=\"none\"/><path d=\"M196,306 a20,10 0 0 1 40,0 Z\" fill=\"#3b3b4d\"/><path d=\"M248,300 L248,304 L245,307 L242,309 L238,308 L235,307 L233,304 L233,300 L232,296 L235,293 L238,293 L242,292 L245,293 L248,296 Z\" fill=\"#3b3b4d\"/><path d=\"M246,294 l4,-6 l3,6 M234,293 l3,-6 l4,5\" stroke=\"#3b3b4d\" stroke-width=\"3\" fill=\"none\"/><path d=\"M196,304 q-12,2 -14,-6\" stroke=\"#3b3b4d\" stroke-width=\"3.4\" fill=\"none\"/></svg>`;
const TOWER_SCENE = `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Inside a desktop PC — motherboard, glowing memory, cooling tubes and fans" fill="none" stroke="#10304f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="552" height="332" rx="22" fill="#dde5fd"/><rect x="30" y="30" width="430" height="280" rx="14" fill="#bccbf7"/><path d="M52,66 L127,67 L200,66" stroke="#8fa3e8" stroke-width="4"/><circle cx="200" cy="66" r="5" fill="#8fa3e8" stroke="none"/><path d="M52,66 L53,112 L52,160" stroke="#8fa3e8" stroke-width="4"/><circle cx="52" cy="160" r="5" fill="#8fa3e8" stroke="none"/><path d="M330,44 L330,82 L330,120" stroke="#8fa3e8" stroke-width="4"/><circle cx="330" cy="120" r="5" fill="#8fa3e8" stroke="none"/><path d="M60,288 L160,287 L260,288" stroke="#8fa3e8" stroke-width="4"/><circle cx="260" cy="288" r="5" fill="#8fa3e8" stroke="none"/><path d="M420,200 L419,246 L420,292" stroke="#8fa3e8" stroke-width="4"/><circle cx="420" cy="292" r="5" fill="#8fa3e8" stroke="none"/><path d="M83,92 L178,90 L181,188 L84,189 Z" fill="#e7e1fc"/><path d="M165,140 L161,154 L154,167 L140,173 L124,174 L110,167 L100,156 L99,140 L100,125 L111,114 L124,107 L140,106 L153,114 L161,126 Z" fill="#bfe8f5"/><path d="M132,140 q18,8 14,27" stroke="#67b7dc" stroke-width="5" fill="none"/><path d="M132,140 q-2,20 -21,21" stroke="#67b7dc" stroke-width="5" fill="none"/><path d="M132,140 q-19,5 -27,-14" stroke="#67b7dc" stroke-width="5" fill="none"/><path d="M132,140 q-10,-17 5,-30" stroke="#67b7dc" stroke-width="5" fill="none"/><path d="M132,140 q13,-15 30,-5" stroke="#67b7dc" stroke-width="5" fill="none"/><circle cx="132" cy="140" r="8" fill="#fdf3d8"/><path d="M216,85 L240,84 L241,201 L215,201 Z" fill="#eef2ff"/><path d="M222,93 L234,93 L234,177 L221,179 Z" fill="#22d3ee" stroke="none"/><path d="M219,192 L228,192 L237,192" stroke-width="3"/><path d="M249,83 L275,84 L273,201 L251,203 Z" fill="#eef2ff"/><path d="M256,93 L269,95 L269,179 L254,179 Z" fill="#e84393" stroke="none"/><path d="M253,192 L261,192 L271,192" stroke-width="3"/><path d="M282,85 L309,86 L309,204 L284,204 Z" fill="#eef2ff"/><path d="M290,94 L304,94 L302,177 L289,177 Z" fill="#22d3ee" stroke="none"/><path d="M287,192 L297,193 L305,192" stroke-width="3"/><path d="M317,83 L342,83 L342,203 L317,202 Z" fill="#eef2ff"/><path d="M324,94 L337,95 L338,179 L323,178 Z" fill="#a78bfa" stroke="none"/><path d="M321,192 L330,193 L339,192" stroke-width="3"/><path d="M180,110 C250,60 320,70 356,110 C380,138 420,120 448,96" stroke="#12b5a5" stroke-width="11" fill="none"/><path d="M180,110 C250,60 320,70 356,110 C380,138 420,120 448,96" stroke="#a7f3ea" stroke-width="4" fill="none"/><path d="M448,96 q22,-6 20,-34" stroke="#12b5a5" stroke-width="11" fill="none"/><path d="M393,35 L531,36 L533,76 L392,77 Z" fill="#c7d4fa"/><path d="M406,42 L405,56 L406,70" stroke="#8fa3e8" stroke-width="4"/><path d="M432,42 L432,56 L432,70" stroke="#8fa3e8" stroke-width="4"/><path d="M458,42 L459,55 L458,70" stroke="#8fa3e8" stroke-width="4"/><path d="M484,42 L485,55 L484,70" stroke="#8fa3e8" stroke-width="4"/><path d="M510,42 L510,56 L510,70" stroke="#8fa3e8" stroke-width="4"/><path d="M65,216 L366,216 L367,276 L65,279 Z" fill="#3b4a6b"/><path d="M140,247 L140,257 L132,263 L125,268 L116,266 L107,263 L101,256 L101,247 L100,238 L107,231 L115,226 L125,226 L133,230 L139,238 Z" fill="#5b6f96"/><path d="M120,247 q11,0 13,11" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M120,247 q3,10 -6,16" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M120,247 q-9,6 -17,-1" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M120,247 q-9,-6 -4,-17" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M120,247 q3,-10 14,-9" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M230,247 L230,257 L222,262 L215,269 L205,269 L197,263 L190,257 L188,247 L191,238 L197,231 L205,227 L215,227 L223,231 L230,237 Z" fill="#5b6f96"/><path d="M210,247 q11,0 13,11" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M210,247 q3,10 -6,16" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M210,247 q-9,6 -17,-1" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M210,247 q-9,-6 -4,-17" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M210,247 q3,-10 14,-9" stroke="#9fb4dd" stroke-width="4" fill="none"/><path d="M292,232 L322,232 L352,232" stroke="#ffd166" stroke-width="5"/><path d="M292,246 L316,247 L340,246" stroke="#e84393" stroke-width="5"/><path d="M532,252 L528,269 L516,283 L501,290 L483,289 L468,282 L457,269 L451,252 L456,235 L468,222 L483,213 L501,214 L517,221 L528,235 Z" fill="#e7e1fc"/><path d="M492,252 q21,7 21,26" stroke="#a78bfa" stroke-width="5" fill="none"/><path d="M492,252 q5,21 -12,31" stroke="#a78bfa" stroke-width="5" fill="none"/><path d="M492,252 q-16,15 -33,5" stroke="#a78bfa" stroke-width="5" fill="none"/><path d="M492,252 q-21,-7 -21,-26" stroke="#a78bfa" stroke-width="5" fill="none"/><path d="M492,252 q-5,-21 12,-31" stroke="#a78bfa" stroke-width="5" fill="none"/><path d="M492,252 q16,-15 33,-5" stroke="#a78bfa" stroke-width="5" fill="none"/><circle cx="492" cy="252" r="8" fill="#fdf3d8"/><circle cx="52" cy="316" r="5" fill="#22d3ee" stroke="none"/><circle cx="300" cy="322" r="5" fill="#e84393" stroke="none"/><circle cx="530" cy="130" r="5" fill="#ffd166" stroke="none"/><circle cx="36" cy="140" r="5" fill="#a78bfa" stroke="none"/></svg>`;
function setScene(html) {
  const slot = document.getElementById('scene-slot');
  if (!slot) return;
  slot.innerHTML = html || '';
  slot.style.display = html ? 'block' : 'none';
}
function lvisible() { return LAPTOP_QUESTIONS.filter(q => !q.when || q.when()); }
function startLaptopBuy() {
  setPageTheme('laptop');
  ['home', 'results', 'guide', 'isp-pick', 'flow-pick', 'pc-guide'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('quiz').style.display = 'block';
  Object.keys(lanswers).forEach(k => delete lanswers[k]);
  lstep = 0;
  setScene(DESK_SCENE);
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
  h += '<div class="opt-grid">';
  Q.opts().forEach(o => {
    const icon = pcIconFor(Q.key, o.v);
    if (icon) {
      const t = o.t.replace(/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '');
      h += `<button class="opt has-icon" onclick="lpick('${Q.key}','${o.v}')"><span class="opt-ic">${icon}</span><span class="opt-txt">${t}${o.s ? `<small>${o.s}</small>` : ''}</span></button>`;
    } else {
      h += `<button class="opt" onclick="lpick('${Q.key}','${o.v}')">${o.t}${o.s ? `<small>${o.s}</small>` : ''}</button>`;
    }
  });
  h += '</div>';
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
  return `<div class="card${isTop ? ' combo breakout' : ''}"><span class="rank">${rankLabel || (isTop ? '⭐ OUR TOP LAPTOP PICK' : '#' + (i + 1) + ' LAPTOP')}</span>
    ${cardGallery('laptop', p.images, p.name)}
    <h3>${esc(p.name)}</h3>
    <div class="price">from $${p.price.toLocaleString()}${maxBit}</div>
    <p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Prices via ${esc(p.price_source || 'manufacturer')}, checked Oct 2026</p>
    ${p.cpu_check ? `<p class="warnline">⚠️ Sold in Intel <em>and</em> Snapdragon versions — check which CPU the listing you're buying actually has.</p>` : ''}
    ${p.formerly ? `<p class="why">ℹ️ Line renamed in 2025 — this is the new ${esc(p.formerly)}.</p>` : ''}
    <p class="why">${esc(p.summary || (Array.isArray(p.why) ? (p.why[0] || '') : p.why) || '')}</p>
    ${p.ecosystem_note ? `<p class="why">🔗 ${esc(p.ecosystem_note)}</p>` : ''}
    <p style="margin:10px 0 0"><span class="badge ${badgeCls}">${badge}</span></p>
    ${factRowsHTML(chips)}
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
  let h = `<div class="scene">${(laptopRes.kid || q.use === 'school') ? FAMILY_SCENE : q.use === 'gaming' ? GAMING_SCENE : q.use === 'work' ? OFFICE_SCENE : q.use === 'creative' ? CREATOR_SCENE : DESK_SCENE}</div>
           <h1>Your top <span class="accent">laptop picks</span></h1>
           <p class="sub">${useLabel} · ${q.os === 'any' ? 'Any system' : q.os} · prices shown as a range (starting → fully loaded)</p>`;
  h += `<div class="sortrow">
    <button class="sort wide${!ltwoInOne && !lbattery ? ' on' : ''}" onclick="ltwoInOne=false;lbattery=false;lshowAll=false;renderLaptopResults()"><svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 5l5.4 12.4L43 19l-10.2 9.2L35.6 42 24 35.4 12.4 42l2.8-13.8L5 19l13.6-1.6z" fill="#ffd166"/></svg>Best fit</button>
    <button class="sort${ltwoInOne ? ' on' : ''}" onclick="ltwoInOne=!ltwoInOne;lshowAll=false;renderLaptopResults()"><svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="12" width="24" height="17" rx="2.6" fill="#bfe8f5"/><path d="M5 33h32l3 6H2z" fill="#fbcfe8"/><path d="M36 6a10 10 0 0 1 6 8" stroke="#e84393"/><path d="M42 8v6h-6" stroke="#e84393"/></svg> Touchscreen 2-in-1</button>
    <button class="sort${lbattery ? ' on' : ''}" onclick="lbattery=!lbattery;lshowAll=false;renderLaptopResults()"><svg viewBox="0 0 48 48" fill="none" stroke="#10304f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="14" width="34" height="20" rx="5" fill="#a7e8c9"/><path d="M43 20v8" stroke-width="4.4"/><path d="M25 18l-7 9h5l-2 8 8-10h-5.4z" fill="#e8912d" stroke="none"/></svg> Battery priority</button>
  </div>`;
  if (unavailableNote) h += `<div class="note">${esc(unavailableNote)}</div>`;
  if (!picks.length) {
    h += `<div class="note">No laptops matched those answers — a fresh start with a few different answers may turn some up.</div>`;
  } else {
    h += laptopCardHTML(picks[0], 0, true);
    const rest = picks.slice(1);
    if (rest.length) {
      h += `<p class="picks-head">Your other matches</p>`;
      const shown = lshowAll ? rest : rest.slice(0, 5);
      h += '<div class="picks-grid breakout">';
      shown.forEach((p, i) => { h += laptopCardHTML(p, i + 1, false); });
      h += '</div>';
      if (!lshowAll && rest.length > 5)
        h += `<button class="more" onclick="lshowAll=true;renderLaptopResults()">Show ${rest.length - 5} more ▼</button>`;
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
  setScene(TOWER_SCENE);
  setPageTheme('desktop');
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
  h += '<div class="opt-grid">';
  Q.opts().forEach(o => {
    const icon = pcIconFor(Q.key, o.v);
    const wide = ''; /* Caleb's rule: quiz buttons all the same size — nothing spans wide */
    if (icon) {
      const t = o.t.replace(/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '');
      h += `<button class="opt has-icon${wide}" onclick="dpick('${Q.key}','${o.v}')"><span class="opt-ic">${icon}</span><span class="opt-txt">${t}${o.s ? `<small>${o.s}</small>` : ''}</span></button>`;
    } else {
      h += `<button class="opt${wide}" onclick="dpick('${Q.key}','${o.v}')">${o.t}${o.s ? `<small>${o.s}</small>` : ''}</button>`;
    }
  });
  h += '</div>';
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
  return `<div class="card${isTop ? ' combo breakout' : ''}"><span class="rank">${rankLabel || (isTop ? '⭐ OUR TOP DESKTOP PICK' : '#' + (i + 1) + ' DESKTOP')}</span>
    ${cardGallery('desktop', p.images, p.name)}
    <h3>${esc(p.name)}</h3>
    <div class="price">from $${p.price.toLocaleString()}${maxBit}</div>
    <p class="permo" style="color:#94a3b8;font-size:.78rem;margin:2px 0 0">Prices via ${esc(p.price_source || 'manufacturer')}, checked Oct 2026</p>
    ${p.price_note ? `<p class="warnline">⚠️ ${esc(p.price_note)}</p>` : ''}
    ${p.formerly ? `<p class="why">ℹ️ Formerly the ${esc(p.formerly)} — same family, new name.</p>` : ''}
    <p class="why">${esc(p.summary || (Array.isArray(p.why) ? (p.why[0] || '') : p.why) || '')}</p>
    ${p.ecosystem_note ? `<p class="why">🔗 ${esc(p.ecosystem_note)}</p>` : ''}
    <p style="margin:10px 0 0"><span class="badge ${badgeCls}">${badge}</span></p>
    ${factRowsHTML(chips)}
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
  let h = `<div class="scene">${(desktopRes.kid || q.use === 'school') ? FAMILY_SCENE : TOWER_SCENE}</div>
           <h1>Your top <span class="accent">desktop picks</span></h1>
           <p class="sub">${useLabel} · ${q.os === 'any' ? 'Any system' : q.os} · ${caseLabel} · prices shown as a range (starting → fully loaded)</p>`;
  h += desktopSortHTML();
  if (!picks.length) {
    h += `<div class="note">No desktops matched those answers — a fresh start with a few different answers may turn some up.</div>`;
  } else {
    h += desktopCardHTML(picks[0], 0, true);
    const rest = picks.slice(1);
    if (rest.length) {
      h += `<p class="picks-head">Your other matches</p>`;
      const shown = dshowAll ? rest : rest.slice(0, 5);
      h += '<div class="picks-grid breakout">';
      shown.forEach((p, i) => { h += desktopCardHTML(p, i + 1, false); });
      h += '</div>';
      if (!dshowAll && rest.length > 5)
        h += `<button class="more" onclick="dshowAll=true;renderDesktopResults()">Show ${rest.length - 5} more ▼</button>`;
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
  setPageTheme('desktop');
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
