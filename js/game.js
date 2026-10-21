'use strict';
(() => {
  /* ---------- pomocnicze ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rnd = n => Math.floor(Math.random() * n);
  const rint = (a, b) => a + rnd(b - a + 1);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const zFor = y => Math.round(1000 - y * 10);

  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => { if (c != null) el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }

  /* ---------- zapis postępu ---------- */
  const SAVE_KEY = 'mojDomek.v1';
  const fresh = () => ({ character: null, pets: [], room: 'kitchen', rooms: {}, badges: [], fedAt: 0, tests: [], heard: {}, deviceVoice: false, introDone: false, tips: {} });
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* brak zapisu */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* tryb prywatny */ } }
  function roomState(id) { return S.rooms[id] || (S.rooms[id] = { explored: [], stars: [false, false, false] }); }
  const roomUnlocked = i => i === 0 || S.badges.includes(ROOMS[i - 1].id);
  const isHungry = () => S.pets.length > 0 && Date.now() - S.fedAt > 4 * 3600e3;
  function heard(en) { S.heard[en] = (S.heard[en] || 0) + 1; save(); }

  /* ---------- dźwięk: wspólny AudioContext ---------- */
  let actx = null;
  function audio() {
    if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; actx = new A(); }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  // iPhone w trybie cichym wycisza Web Audio; grający cichy <audio> przełącza telefon na tryb odtwarzania.
  const SILENT_WAV = (() => {
    const n = 800, b = new DataView(new ArrayBuffer(44 + n * 2));
    const w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true);
    b.setUint16(20, 1, true); b.setUint16(22, 1, true); b.setUint32(24, 8000, true); b.setUint32(28, 16000, true);
    b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
    let s = ''; new Uint8Array(b.buffer).forEach(x => { s += String.fromCharCode(x); });
    return 'data:audio/wav;base64,' + btoa(s);
  })();

  /* ---------- głos: nagrania z audio/voice-pack.js, zapasowo syntezator telefonu ---------- */
  const Voice = (() => {
    const synth = window.speechSynthesis;
    const pack = () => window.VOICE_PACK || {};
    const buffers = new Map();
    let plV = null, enV = null, token = 0, bubbleTimer, src = null, last = null, keepAlive = null;
    window.__voiceMissing = [];

    function choose() {
      if (!synth) return;
      const vs = synth.getVoices();
      const by = re => vs.filter(v => re.test(v.lang.replace('_', '-')));
      const pref = list => list.find(v => /google|natural|enhanced|premium|siri/i.test(v.name)) || list[0] || null;
      plV = pref(by(/^pl/i));
      enV = pref(by(/^en-(US|GB)/i)) || pref(by(/^en/i));
    }
    if (synth) { choose(); synth.addEventListener?.('voiceschanged', choose); }
    const estimate = parts => parts.reduce((t, [, s]) => t + s.length * 70 + 250, 300);

    function bubble(parts) {
      const b = $('#bubble');
      b.replaceChildren(...parts.map(([lang, text]) => (lang === 'en' ? h('b', {}, text + ' ') : text + ' ')));
      b.hidden = false;
    }
    function hideBubble(my) { clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { if (my === token) $('#bubble').hidden = true; }, 1400); }

    function decode(lang, text) {
      const k = lang + '|' + text;
      if (buffers.has(k)) return buffers.get(k);
      const b64 = pack()[k], a = audio();
      if (!b64 || !a) return Promise.resolve(null);
      const bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const p = new Promise((res, rej) => a.decodeAudioData(bytes.buffer, res, rej)).catch(() => null);
      buffers.set(k, p);
      if (buffers.size > 120) buffers.delete(buffers.keys().next().value);
      return p;
    }
    function play(buf, my) {
      return new Promise(res => {
        const a = audio();
        if (my !== token || !buf || !a) return res();
        const s = a.createBufferSource();
        s.buffer = buf;
        s.connect(a.destination);
        src = s;
        const done = () => { clearTimeout(t); if (src === s) src = null; res(); };
        const t = setTimeout(done, buf.duration * 1000 + 800);
        s.onended = done;
        s.start();
      });
    }
    function device(parts, my) {
      if (!synth) return sleep(estimate(parts));
      return new Promise(resolve => {
        let left = parts.length, finished = false;
        const finish = () => { if (finished) return; finished = true; clearTimeout(safety); resolve(); };
        const safety = setTimeout(finish, estimate(parts) + 3000);
        parts.forEach(([lang, text]) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang === 'en' ? 'en-US' : 'pl-PL';
          const v = lang === 'en' ? enV : plV;
          if (v) { u.voice = v; u.lang = v.lang; }
          u.rate = lang === 'en' ? 0.8 : 0.95;
          u.pitch = 1.1;
          u.onend = u.onerror = () => { if (--left <= 0) finish(); };
          if (my === token) synth.speak(u);
        });
      });
    }
    async function clips(parts, my) {
      const bufs = parts.map(([l, t]) => decode(l, t));
      for (let i = 0; i < parts.length; i++) {
        if (my !== token) return;
        const buf = await bufs[i];
        if (buf) { await play(buf, my); await sleep(90); continue; }
        window.__voiceMissing.push(parts[i].join('|'));
        await device([parts[i]], my);
      }
    }
    const useDevice = () => S.deviceVoice && synth && plV && enV;

    function say(parts) {
      stopSound();
      const my = ++token;
      last = parts;
      bubble(parts);
      return (useDevice() ? device(parts, my) : clips(parts, my)).then(() => hideBubble(my));
    }
    function stopSound() {
      if (src) { try { src.stop(); } catch (e) { /* już zatrzymane */ } src = null; }
      if (synth) synth.cancel();
    }
    function stop() { token++; stopSound(); $('#bubble').hidden = true; }
    function unlock() {
      const a = audio();
      if (a) { const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(); }
      try {
        if (!keepAlive) { keepAlive = new Audio(SILENT_WAV); keepAlive.loop = true; }
        keepAlive.play().catch(() => {});
      } catch (e) { /* bez HTMLAudio */ }
    }
    return {
      say, stop, unlock, repeat: () => last && say(last),
      info: () => ({ recorded: Object.keys(pack()).length, device: !!(synth && plV && enV), pl: plV && plV.name, en: enV && enV.name }),
    };
  })();
  const say = parts => Voice.say(parts);
  $('#bubble').addEventListener('click', () => Voice.repeat());

  /* ---------- dźwięki ---------- */
  const Sfx = (() => {
    function tone(f, t0, d, type = 'sine', g = 0.14) {
      const a = audio(); if (!a) return;
      const o = a.createOscillator(), v = a.createGain(), t = a.currentTime + t0;
      o.type = type; o.frequency.value = f;
      v.gain.setValueAtTime(0.0001, t);
      v.gain.linearRampToValueAtTime(g, t + 0.02);
      v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v).connect(a.destination);
      o.start(t); o.stop(t + d + 0.05);
    }
    return {
      pop: () => tone(700, 0, 0.12, 'triangle'),
      good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle')),
      oops: () => { tone(330, 0, 0.18); tone(247, 0.15, 0.28); },
      fanfare: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.32, 'square', 0.06)),
      locked: () => { tone(180, 0, 0.1, 'square', 0.06); tone(180, 0.14, 0.1, 'square', 0.06); },
    };
  })();

  const praise = () => pick(T.praise);

  /* ---------- efekty ---------- */
  function confetti(n = 70) {
    const box = $('#confetti');
    const colors = ['#FF6B5B', '#FFC93C', '#2FBF84', '#5BB8FF', '#7A5CFA', '#FF8AD8'];
    for (let i = 0; i < n; i++) {
      const p = h('i', { style: `left:${rnd(100)}%;background:${pick(colors)};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.8 + Math.random() * 1.4}s;transform:rotate(${rnd(360)}deg)` });
      box.append(p);
      setTimeout(() => p.remove(), 3800);
    }
  }
  function hearts(el, n = 4) {
    for (let i = 0; i < n; i++) {
      const hEl = h('span', { class: 'heart', style: `left:${30 + rnd(40)}%;animation-delay:${i * 0.15}s` }, '❤️');
      el.append(hEl);
      setTimeout(() => hEl.remove(), 1800);
    }
  }
  function boing(el) { el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing'); }

  /* ---------- ekrany ---------- */
  function show(id) { $$('.screen').forEach(s => { s.hidden = s.id !== id; }); }

  /* ---------- arkusz (okno na środku) ---------- */
  let sheet = null;
  function openSheet({ cls = '', onClose = null, closable = true } = {}) {
    closeSheet(true);
    const ov = $('#overlay');
    const repeatBtn = h('button', { class: 'round-btn', 'aria-label': 'Powtórz' }, '🔊');
    const closeBtn = h('button', { class: 'round-btn', 'aria-label': 'Zamknij' }, '✖');
    const dots = h('div', { class: 'dots' });
    const body = h('div', { class: 'sheet-body' });
    const el = h('div', { class: 'sheet ' + cls }, h('div', { class: 'sheet-top' }, repeatBtn, dots, closeBtn), body);
    ov.replaceChildren(el);
    ov.hidden = false;
    $('#app').classList.add('has-sheet');
    const s = {
      el, body, dots, closed: false, onClose,
      setRepeat(fn) { repeatBtn.style.visibility = fn ? 'visible' : 'hidden'; repeatBtn.onclick = () => { Sfx.pop(); fn && fn(); }; },
      setDots(total, done) { dots.replaceChildren(...Array.from({ length: total }, (_, i) => h('span', { class: i < done ? 'on' : '' }))); },
      close: () => closeSheet(),
    };
    s.setRepeat(null);
    closeBtn.style.visibility = closable ? 'visible' : 'hidden';
    closeBtn.onclick = () => { Sfx.pop(); closeSheet(); };
    sheet = s;
    return s;
  }
  function closeSheet(silent) {
    const s = sheet;
    if (!s) return;
    s.closed = true;
    sheet = null;
    $('#overlay').hidden = true;
    $('#overlay').replaceChildren();
    $('#app').classList.remove('has-sheet');
    if (!silent) { Voice.stop(); s.onClose && s.onClose(); }
  }

  /* ---------- start ---------- */
  $('#play').addEventListener('click', () => {
    Sfx.pop();
    Voice.unlock();
    if (!S.character) openChooser(true); else enterHome();
  });

  /* ---------- wybór postaci ---------- */
  function openChooser(first) {
    show('chooser');
    const grid = $('#charGrid');
    const ok = $('#charOk');
    let chosen = S.character;
    ok.hidden = !chosen;
    grid.replaceChildren(...CHARACTERS.map(c => {
      const b = h('button', { class: 'tile' + (c.e === chosen ? ' on' : ''), 'aria-label': c.pl }, h('span', { class: 'tile-emoji' }, c.e));
      b.onclick = () => {
        chosen = c.e;
        $$('.tile', grid).forEach(t => t.classList.toggle('on', t === b));
        ok.hidden = false;
        Sfx.pop(); boing(b);
        say(T.character(c));
      };
      return b;
    }));
    ok.onclick = () => { S.character = chosen; save(); Sfx.good(); enterHome(); };
    const back = $('#charBack');
    back.hidden = first || !S.character;
    back.onclick = () => { Sfx.pop(); enterHome(); };
    say(first ? T.chooseFirst : T.choose);
  }

  /* ---------- dom i chodzenie ---------- */
  const scene = $('#scene'), world = $('#world');
  const cur = { room: null, x: 20, y: 12, dir: 1, u: 8, camX: 0, walkToken: 0, walkTimer: 0 };
  let charEl, petEls = [], pointerEl, edgeEl = $('#edge'), lastAct = Date.now(), lastHintSay = 0, pointerOn = false;

  function enterHome() {
    show('home');
    const idx = ROOMS.findIndex(r => r.id === S.room);
    buildRoom(idx >= 0 && roomUnlocked(idx) ? S.room : 'kitchen');
    lastAct = Date.now();
    if (!S.introDone) {
      S.introDone = true; save();
      say(T.intro);
    } else {
      greetRoom();
    }
  }
  function greetRoom() {
    const r = cur.room;
    say([...T.room(r), ...(isHungry() ? T.hungryShort : [])]);
  }

  function box(x, y, w, hgt) {
    return `left:calc(var(--u)*${x - w / 2});bottom:calc(var(--u)*${y});width:calc(var(--u)*${w});height:calc(var(--u)*${hgt});z-index:${zFor(y)}`;
  }

  function buildRoom(id, entry) {
    const room = ROOMS.find(r => r.id === id);
    const idx = ROOMS.indexOf(room);
    const rs = roomState(id);
    cur.room = room; S.room = id; save();
    world.className = 'world theme-' + id;
    world.replaceChildren(h('div', { class: 'wall' }), h('div', { class: 'floor' }), h('div', { class: 'baseboard' }), h('div', { class: 'rug' }));

    room.objects.forEach(o => {
      const isArt = !!ART[o.art];
      const el = h('div', {
        class: 'obj ' + (isArt ? 'art-obj' : 'emoji-obj'), style: box(o.x, o.y, o.w, o.h),
        'data-act': 'obj', 'data-id': o.id, 'data-wx': o.x, 'data-wy': 32,
      });
      if (isArt) el.innerHTML = ART[o.art];
      else el.append(h('span', { class: 'emo', style: `font-size:calc(var(--u)*${o.h * 0.95})` }, o.art));
      if (!rs.explored.includes(o.id)) el.append(h('span', { class: 'sparkle' }, '✨'));
      world.append(el);
    });

    const door = (target, x, side) => {
      const tIdx = ROOMS.indexOf(target), locked = !roomUnlocked(tIdx);
      const el = h('div', {
        class: 'obj door' + (locked ? ' locked' : ''), style: box(x, 40, 11, 27),
        'data-act': 'door', 'data-id': target.id, 'data-side': side, 'data-wx': x + (side === 'left' ? 4 : -4), 'data-wy': 30,
        html: ART.door,
      });
      el.append(h('span', { class: 'door-sign' }, target.icon));
      if (locked) el.append(h('span', { class: 'door-lock' }, '🔒'));
      world.append(el);
    };
    if (idx > 0) door(ROOMS[idx - 1], 6, 'left');
    if (idx < ROOMS.length - 1) door(ROOMS[idx + 1], 114, 'right');

    MASCOTS.forEach(m => {
      const el = h('div', {
        class: 'obj mascot mascot-' + m.id, style: box(m.x, m.y, m.size, m.size),
        'data-act': m.id, 'data-wx': m.x - m.size * 0.85, 'data-wy': m.y, 'data-fx': m.x, 'aria-label': m.pl,
      }, h('span', { class: 'sign' }, m.sign), h('span', { class: 'emo', style: `font-size:calc(var(--u)*${m.size * 0.9})` }, m.e));
      world.append(el);
    });

    if (id === 'kitchen') {
      world.append(h('div', {
        class: 'obj bowl', style: box(10, 27, 8, 6), 'data-act': 'bowl', 'data-wx': 17, 'data-wy': 25, 'data-fx': 10,
      }, h('span', { class: 'emo', style: 'font-size:calc(var(--u)*6)' }, '🥣')));
    }

    if (entry === 'left') cur.x = 16; else if (entry === 'right') cur.x = 104; else cur.x = 22;
    cur.y = entry ? 26 : 10;
    charEl = h('div', { class: 'walker char' }, h('span', { class: 'shadow' }), h('span', { class: 'bob' }, h('span', { class: 'body' }, S.character)));
    world.append(charEl);
    petEls = S.pets.map((pid, i) => {
      const el = h('div', { class: 'walker pet', 'data-act': 'pet', 'data-id': i },
        h('span', { class: 'shadow' }), h('span', { class: 'need', hidden: true }, '🍽️'),
        h('span', { class: 'bob' }, h('span', { class: 'body' }, PET_BY_ID[pid].e)));
      world.append(el);
      return el;
    });
    pointerEl = h('div', { class: 'pointer', hidden: true }, '👇');
    world.append(pointerEl);

    layout();
    placeWalkers(0);
    updateHud();
    updateNeeds();
  }

  function layout() {
    if ($('#home').hidden) return;
    cur.u = Math.min(scene.clientHeight / 100, scene.clientWidth / 58);
    world.style.setProperty('--u', cur.u + 'px');
    world.style.width = 120 * cur.u + 'px';
    updateCamera(0);
  }
  window.addEventListener('resize', layout);

  function updateCamera(dur) {
    const vw = scene.clientWidth, ww = 120 * cur.u;
    const cam = ww <= vw ? (ww - vw) / 2 : clamp(cur.x * cur.u - vw / 2, 0, ww - vw);
    world.style.transition = dur ? `transform ${dur}s ease-in-out` : 'none';
    world.style.transform = `translateX(${-cam}px)`;
    cur.camX = cam;
  }

  function placeWalker(el, x, y, dir, dur, delay = 0) {
    el.style.transition = dur ? `left ${dur}s ease-in-out ${delay}s, bottom ${dur}s ease-in-out ${delay}s` : 'none';
    el.style.left = `calc(var(--u)*${x})`;
    el.style.bottom = `calc(var(--u)*${y})`;
    el.style.zIndex = zFor(y);
    el.classList.toggle('flip', dir > 0);
  }
  function placeWalkers(dur) {
    placeWalker(charEl, cur.x, cur.y, cur.dir, dur);
    petEls.forEach((el, i) => {
      const px = clamp(cur.x - cur.dir * (9 + i * 7), 3, 117);
      placeWalker(el, px, clamp(cur.y + 3 + i, 2, 36), cur.dir, dur, 0.12 * (i + 1));
    });
    updateCamera(dur);
  }

  function walkTo(x, y, then) {
    const token = ++cur.walkToken;
    x = clamp(x, 3, 117); y = clamp(y, 2, 34);
    const dx = x - cur.x, dist = Math.hypot(dx, y - cur.y);
    if (Math.abs(dx) > 0.5) cur.dir = dx > 0 ? 1 : -1;
    const dur = dist < 1 ? 0 : Math.max(0.25, dist / 30);
    cur.x = x; cur.y = y;
    [charEl, ...petEls].forEach(el => el.classList.toggle('walking', dur > 0));
    placeWalkers(dur);
    clearTimeout(cur.walkTimer);
    cur.walkTimer = setTimeout(() => {
      if (token !== cur.walkToken) return;
      [charEl, ...petEls].forEach(el => el.classList.remove('walking'));
      then && then();
    }, dur * 1000 + 120 * petEls.length);
  }
  function face(x) {
    const d = x >= cur.x ? 1 : -1;
    if (d !== cur.dir) { cur.dir = d; charEl.classList.toggle('flip', d > 0); }
  }

  scene.addEventListener('click', e => {
    if (sheet) return;
    activity();
    const t = e.target.closest('[data-act]');
    const wr = world.getBoundingClientRect();
    if (t && world.contains(t)) {
      if (t.dataset.act === 'pet') { tapPet(+t.dataset.id, t); return; }
      const wx = +t.dataset.wx, wy = +t.dataset.wy;
      walkTo(wx, wy, () => { face(+(t.dataset.fx || wx)); act(t); });
      return;
    }
    const x = (e.clientX - wr.left) / cur.u, y = (wr.bottom - e.clientY) / cur.u;
    walkTo(x, y > 40 ? 30 : y);
  });

  function act(el) {
    const a = el.dataset.act;
    boing(el);
    if (a === 'obj') openObject(cur.room.objects.find(o => o.id === el.dataset.id), el);
    else if (a === 'door') useDoor(el);
    else if (a === 'parrot') parrot();
    else if (a === 'octo') octopus();
    else if (a === 'owl') owl();
    else if (a === 'bowl') bowl();
  }

  /* ---------- podpowiedzi ---------- */
  function activity() { lastAct = Date.now(); hidePointer(); }
  function nextGoal() {
    const room = cur.room, rs = roomState(room.id), idx = ROOMS.indexOf(room);
    const m = id => MASCOTS.find(x => x.id === id);
    if (isHungry()) {
      if (room.id === 'kitchen') return { x: 10, top: 34, say: T.goal.hungryHere };
      return { x: 6, top: 69, say: T.goal.hungryGo };
    }
    const un = room.objects.find(o => !rs.explored.includes(o.id));
    if (un) return { x: un.x, top: un.y + un.h, say: T.goal.open };
    if (!rs.stars[1]) return { x: m('parrot').x, top: m('parrot').y + 15, say: T.goal.parrot };
    if (!rs.stars[2]) return { x: m('octo').x, top: m('octo').y + 15, say: T.goal.octo };
    if (!S.badges.includes(room.id)) return { x: m('owl').x, top: m('owl').y + 16, say: T.goal.owl };
    if (idx < ROOMS.length - 1) return { x: 114, top: 69, say: T.goal.door };
    return null;
  }
  function showPointer(g) {
    pointerOn = true;
    pointerEl.hidden = false;
    pointerEl.style.left = `calc(var(--u)*${g.x})`;
    pointerEl.style.bottom = `calc(var(--u)*${g.top + 1})`;
    const sx = g.x * cur.u - cur.camX, vw = scene.clientWidth;
    edgeEl.hidden = sx > 20 && sx < vw - 20;
    edgeEl.textContent = sx <= 20 ? '👈' : '👉';
    edgeEl.className = sx <= 20 ? 'edge left' : 'edge right';
  }
  function hidePointer() { pointerOn = false; if (pointerEl) pointerEl.hidden = true; edgeEl.hidden = true; }
  function announceNext(delay = 400) {
    setTimeout(() => {
      if (sheet || $('#home').hidden) return;
      const g = nextGoal();
      if (!g) return;
      showPointer(g);
      lastHintSay = Date.now();
      say(g.say);
    }, delay);
  }
  setInterval(() => {
    if ($('#home').hidden || sheet || pointerOn) return;
    if (Date.now() - lastAct < 9000) return;
    const g = nextGoal();
    if (!g) return;
    showPointer(g);
    if (Date.now() - lastHintSay > 35000) { lastHintSay = Date.now(); say(g.say); }
  }, 1000);

  /* ---------- pasek u góry ---------- */
  const STAR_SLOTS = [
    { icon: '🔍' }, { icon: '🦜' }, { icon: '🐙' },
  ];
  function updateHud(popIdx = -1) {
    $('#meBtn').textContent = S.character || '🙂';
    const rs = roomState(cur.room.id);
    $('#stars').replaceChildren(...STAR_SLOTS.map((s, i) => {
      const b = h('button', { class: 'star-slot' + (rs.stars[i] ? ' got' : '') + (i === popIdx ? ' boing' : ''), 'aria-label': 'gwiazdka ' + (i + 1) },
        rs.stars[i] ? '⭐' : s.icon);
      b.onclick = () => { Sfx.pop(); say(rs.stars[i] ? T.starHave : T.starSlots[i]); };
      return b;
    }));
    $('#roomIcon').textContent = cur.room.icon;
  }
  $('#meBtn').onclick = () => { Sfx.pop(); openChooser(false); };
  $('#badgeBtn').onclick = () => { Sfx.pop(); openBadges(); };
  $('#roomIcon').onclick = () => { Sfx.pop(); greetRoom(); };

  function grantStar(i) {
    const rs = roomState(cur.room.id);
    if (rs.stars[i]) return false;
    rs.stars[i] = true; save();
    updateHud(i);
    return true;
  }
  const starsCount = () => roomState(cur.room.id).stars.filter(Boolean).length;

  /* ---------- zwierzątka ---------- */
  function updateNeeds() {
    const hungry = isHungry();
    petEls.forEach(el => { $('.need', el).hidden = !hungry; });
  }
  setInterval(() => { if (!$('#home').hidden) updateNeeds(); }, 30000);

  function tapPet(i, el) {
    activity();
    const p = PET_BY_ID[S.pets[i]];
    Sfx.pop(); boing(el);
    if (isHungry()) {
      say(T.petHungry(p));
    } else {
      hearts(el);
      say(T.petLove(p));
    }
  }

  /* ---------- drzwi ---------- */
  function useDoor(el) {
    const target = ROOMS.find(r => r.id === el.dataset.id);
    if (el.classList.contains('locked')) {
      Sfx.locked();
      const prev = ROOMS[ROOMS.indexOf(target) - 1];
      say(T.doorLocked(prev));
      return;
    }
    Sfx.pop();
    scene.classList.add('fade');
    setTimeout(() => {
      buildRoom(target.id, el.dataset.side === 'right' ? 'left' : 'right');
      scene.classList.remove('fade');
      greetRoom();
    }, 280);
  }

  /* ---------- otwieranie mebli ---------- */
  function artNode(o, cls) {
    return ART[o.art] ? h('div', { class: cls, html: ART[o.art] }) : h('div', { class: cls + ' emo' }, o.art);
  }
  function openObject(o, el) {
    el.classList.add('opened');
    Sfx.pop();
    const rs = roomState(cur.room.id);
    if (!rs.explored.includes(o.id)) { rs.explored.push(o.id); save(); $('.sparkle', el)?.remove(); }
    const s = openSheet({ cls: 'sheet-open', onClose: () => { el.classList.remove('opened'); afterExplore(); } });
    const sayObj = () => say(T.object(o));
    s.setRepeat(sayObj);
    const items = h('div', { class: 'items' });
    o.items.forEach(([e, pl, en], i) => {
      const b = h('button', { class: 'item pop', style: `animation-delay:${0.25 + i * 0.12}s`, 'aria-label': pl },
        h('span', { class: 'item-emoji' }, e), h('span', { class: 'item-en' }, en));
      b.onclick = () => { Sfx.pop(); boing(b); heard(en); say(T.item(pl, en)); };
      items.append(b);
    });
    s.body.append(h('div', { class: 'obj-head' }, artNode(o, 'obj-mini'), h('div', { class: 'word' }, h('b', {}, o.en), h('small', {}, o.pl))), items);
    heard(o.en);
    sayObj().then(() => {
      if (s.closed || S.tips.items) return;
      S.tips.items = true; save();
      say(T.tipItems);
    });
  }
  function afterExplore() {
    const rs = roomState(cur.room.id);
    if (rs.explored.length >= cur.room.objects.length && grantStar(0)) {
      Sfx.good(); confetti(40);
      say(T.allOpened).then(() => announceNext(200));
    }
  }

  /* ---------- pytania ---------- */
  const wordsOf = room => {
    const seen = new Set();
    return room.objects.flatMap(o => o.items).filter(([, , en]) => !seen.has(en) && seen.add(en));
  };

  function qFind(room, target) {
    const pool = wordsOf(room);
    const t = target || pick(pool);
    const others = shuffle(pool.filter(w => w[2] !== t[2])).slice(0, 2);
    return {
      kind: 'pick',
      say: T.findAsk(t[2]),
      okSay: T.findOk(t[2]),
      choices: shuffle([t, ...others]).map(w => ({
        ok: w === t, node: () => h('span', { class: 'choice-emoji' }, w[0]),
        wrongSay: T.thisIs(w[2]),
      })),
      after: () => heard(t[2]),
    };
  }
  function findSet(room, n) {
    return shuffle(wordsOf(room)).slice(0, n).map(t => qFind(room, t));
  }

  function numberChoices(n, lo, hi) {
    const set = new Set([n]);
    while (set.size < 3) { const c = clamp(n + pick([-2, -1, 1, 2]), lo, hi); set.add(c); if (hi - lo < 3) set.add(rint(lo, hi)); }
    return shuffle([...set]);
  }
  const countRow = (n, e) => h('div', { class: 'count-items' }, Array.from({ length: n }, () => h('span', { class: 'ci' }, e)));
  async function countAlong(stage, s) {
    const items = $$('.ci', stage);
    for (let i = 0; i < items.length; i++) {
      if (s.closed) return;
      items[i].classList.add('lit');
      await say(T.say1(i + 1));
    }
  }

  function qHowMany(room, lo = 1, hi = 10) {
    const n = rint(lo, hi), e = pick(room.mathEmoji);
    return {
      kind: 'pick',
      say: T.howManyAsk,
      show: () => countRow(n, e),
      okSay: T.number(n),
      teach: countAlong,
      choices: numberChoices(n, 1, 10).map(c => ({ ok: c === n, node: () => h('span', { class: 'digit' }, c), wrongSay: T.notNumber(c) })),
    };
  }
  function qCompare(room) {
    let a = rint(1, 9), b = rint(1, 9);
    while (Math.abs(a - b) < 2) b = rint(1, 9);
    const more = Math.random() < 0.65, e = pick(room.mathEmoji);
    const win = more ? Math.max(a, b) : Math.min(a, b), lose = a + b - win;
    return {
      kind: 'pick', wide: true,
      say: T.compareAsk(more),
      okSay: T.compareOk(more, win, lose),
      choices: [a, b].map(c => ({ ok: c === win, node: () => countRow(c, e), wrongSay: T.hereIs(c) })),
    };
  }
  function qAdd(room, max = 6) {
    const s = rint(2, max), a = rint(1, s - 1), b = s - a, e = pick(room.mathEmoji);
    return {
      kind: 'pick',
      say: T.addAsk(a, b),
      show: () => h('div', { class: 'sum' }, countRow(a, e), h('span', { class: 'op' }, '+'), countRow(b, e), h('span', { class: 'op' }, '= ?')),
      okSay: T.addOk(a, b),
      teach: countAlong,
      choices: numberChoices(s, 1, 10).map(c => ({ ok: c === s, node: () => h('span', { class: 'digit' }, c), wrongSay: T.notNumber(c) })),
    };
  }
  function qCount(k, first) {
    const target = rint(1, 5);
    const pet = S.pets.length ? PET_BY_ID[S.pets[k % S.pets.length]] : null;
    const fruit = pet ? null : pick(FRUITS);
    const e = pet ? pet.food : fruit.e;
    return { kind: 'count', target, e, pet, say: T.countAsk(pet, fruit, target, first && !S.tips.check) };
  }
  function mathQ(room, k) {
    if (room.math === 'count') return qCount(k, k === 0);
    if (room.math === 'mix') return k % 2 ? qCompare(room) : qHowMany(room);
    return qAdd(room);
  }

  function askPick(s, q, mode) {
    return new Promise(resolve => {
      const stage = s.body;
      stage.replaceChildren();
      if (q.show) stage.append(h('div', { class: 'show' }, q.show()));
      const grid = h('div', { class: 'choices' + (q.wide ? ' wide' : '') });
      stage.append(grid);
      let wrongs = 0, done = false;
      s.setRepeat(() => say(q.say));
      q.choices.forEach(c => {
        const b = h('button', { class: 'choice pop' }, c.node());
        if (c.ok) b.dataset.ok = '1';
        b.onclick = async () => {
          if (done || b.disabled) return;
          if (c.ok) {
            done = true; b.classList.add('right'); Sfx.good();
            q.after && q.after();
            await say([...praise(), ...q.okSay]);
            await sleep(250);
            resolve(wrongs === 0);
            return;
          }
          wrongs++; b.classList.add('wrong'); b.disabled = true; Sfx.oops();
          const right = $('[data-ok]', grid);
          if (mode === 'test') {
            done = true; right.classList.add('right');
            await say([...c.wrongSay, ...T.rightIsHere, ...q.okSay]);
            await sleep(300);
            resolve(false);
            return;
          }
          if (wrongs >= 2) right.classList.add('hint');
          await say([...c.wrongSay, ...pick(T.tryAgain)]);
          if (q.teach && wrongs === 1 && !s.closed) { await q.teach(stage, s); if (!s.closed) say(q.say); }
        };
        grid.append(b);
      });
      say(q.say);
    });
  }

  function askCount(s, q, mode) {
    return new Promise(resolve => {
      const stage = s.body;
      const pile = h('div', { class: 'pile' });
      const bowlIn = h('div', { class: 'bowl-in' });
      const ok = h('button', { class: 'ok-btn pop', 'aria-label': 'Gotowe' }, '✔');
      const head = h('div', { class: 'count-head' }, q.pet ? h('span', { class: 'count-pet' }, q.pet.e) : null, h('span', { class: 'target' }, q.target), h('span', { class: 'target-food' }, q.e));
      stage.replaceChildren(head, pile, h('div', { class: 'bowl-wrap' }, bowlIn, h('div', { class: 'bowl-dish' })), ok);
      let inBowl = 0, wrongs = 0, done = false;
      const total = Math.min(9, q.target + 3);
      const move = b => {
        if (done) return;
        Sfx.pop();
        if (b.parentNode === pile) { bowlIn.append(b); inBowl++; } else { pile.append(b); inBowl--; }
        say(inBowl ? T.say1(inBowl) : T.empty);
      };
      for (let i = 0; i < total; i++) {
        const b = h('button', { class: 'food pop', style: `animation-delay:${i * 0.05}s` }, q.e);
        b.onclick = () => move(b);
        pile.append(b);
      }
      s.setRepeat(() => say(q.say));
      ok.onclick = async () => {
        if (done) return;
        S.tips.check = true; save();
        if (inBowl === q.target) {
          done = true; Sfx.good(); boing(bowlIn);
          if (q.pet) hearts(head);
          await say([...praise(), ...T.number(q.target)]);
          await sleep(250);
          resolve(wrongs === 0);
          return;
        }
        wrongs++; Sfx.oops();
        const where = inBowl === 0 ? T.bowlEmpty : T.bowlWrong(inBowl, q.target);
        if (mode === 'test') {
          done = true;
          await say(where);
          await sleep(300);
          resolve(false);
          return;
        }
        say([...where, ...(inBowl > q.target ? T.tooMany : T.tooFew)]);
      };
      say(q.say);
    });
  }
  const ask = (s, q, mode) => (q.kind === 'count' ? askCount : askPick)(s, q, mode);

  async function runGame({ questions, mode, intro, cls = '', onDone }) {
    const s = openSheet({ cls: 'sheet-game ' + cls });
    s.setDots(questions.length, 0);
    if (intro) { s.body.replaceChildren(h('div', { class: 'big-mascot bounce' }, intro.icon)); await say(intro.parts); }
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      if (s.closed) return;
      s.setDots(questions.length, i);
      if (await ask(s, questions[i], mode)) score++;
    }
    if (s.closed) return;
    s.setDots(questions.length, questions.length);
    onDone(score, questions.length, s);
  }

  async function finishPractice(s, starIdx) {
    const isNew = grantStar(starIdx);
    s.setRepeat(null);
    s.body.replaceChildren(h('div', { class: 'big-star spin' }, '⭐'));
    Sfx.fanfare(); confetti(isNew ? 60 : 25);
    await say(isNew ? T.newStar : T.funAgain);
    if (s.closed) return;
    await sleep(500);
    if (s.closed) return;
    s.close();
    if (isNew) announceNext(300);
  }

  /* ---------- pomocnicy: papuga, ośmiornica, sowa ---------- */
  function parrot() {
    Sfx.pop();
    runGame({
      mode: 'practice',
      intro: { icon: '🦜', parts: T.parrotHi },
      questions: findSet(cur.room, 5),
      onDone: (sc, t, s) => finishPractice(s, 1),
    });
  }
  function octopus() {
    Sfx.pop();
    const room = cur.room;
    runGame({
      mode: 'practice',
      intro: { icon: '🐙', parts: T.octoHi[room.math] },
      questions: Array.from({ length: 5 }, (_, k) => mathQ(room, k)),
      onDone: (sc, t, s) => finishPractice(s, 2),
    });
  }
  function owl() {
    Sfx.pop();
    const room = cur.room, n = starsCount();
    if (n < 3) {
      say(T.owlNeed(n)).then(() => announceNext(100));
      return;
    }
    const finds = findSet(room, 3);
    const questions = [];
    for (let k = 0; k < 3; k++) questions.push(finds[k], mathQ(room, k));
    runGame({
      mode: 'test', cls: 'sheet-test',
      intro: { icon: '🦉', parts: T.owlStart },
      questions,
      onDone: (score, total, s) => finishTest(room, score, total, s),
    });
  }

  async function finishTest(room, score, total, s) {
    S.tests.push({ room: room.id, score, total, at: Date.now() });
    save();
    const pass = score >= total - 1;
    s.setRepeat(null);
    s.body.replaceChildren(
      h('div', { class: 'big-mascot' }, '🦉'),
      h('div', { class: 'score' }, Array.from({ length: total }, (_, i) => h('span', { class: i < score ? 'on' : '' }, i < score ? '⭐' : '•'))),
    );
    if (!pass) {
      Sfx.oops();
      const again = h('button', { class: 'ok-btn again pop', 'aria-label': 'Jeszcze raz' }, '↻');
      again.onclick = () => { Sfx.pop(); owl(); };
      s.body.append(again);
      say(T.testFail(score, total));
      return;
    }
    if (S.badges.includes(room.id)) {
      Sfx.fanfare(); confetti(40);
      await say(T.testAgain);
      if (!s.closed) s.close();
      return;
    }
    S.badges.push(room.id);
    save();
    celebrateBadge(room);
  }

  async function celebrateBadge(room) {
    const s = openSheet({ cls: 'sheet-reward', closable: false });
    s.body.replaceChildren(h('div', { class: 'medal pop' }, h('span', {}, room.icon)));
    Sfx.fanfare(); confetti(110);
    await say(T.badge(room));
    if (s.closed) return;
    if (S.pets.length < S.badges.length && S.pets.length < PETS.length) giftFlow(s, room);
    else finishReward(room);
  }

  function giftFlow(s, room) {
    const gift = h('button', { class: 'gift shake', 'aria-label': 'Prezent' }, '🎁');
    s.body.replaceChildren(gift);
    say(T.gift);
    gift.onclick = async () => {
      gift.onclick = null;
      Sfx.fanfare(); gift.classList.remove('shake'); gift.classList.add('burst');
      confetti(60);
      await sleep(600);
      choosePet(s, room);
    };
  }

  function choosePet(s, room) {
    let chosen = null;
    const ok = h('button', { class: 'ok-btn pop', hidden: true, 'aria-label': 'Gotowe' }, '✔');
    const grid = h('div', { class: 'tile-grid pets' }, PETS.filter(p => !S.pets.includes(p.id)).map(p => {
      const b = h('button', { class: 'tile', 'aria-label': p.pl }, h('span', { class: 'tile-emoji' }, p.e));
      b.onclick = () => {
        chosen = p; Sfx.pop(); boing(b);
        $$('.tile', grid).forEach(t => t.classList.toggle('on', t === b));
        ok.hidden = false;
        say(T.pet(p));
      };
      return b;
    }));
    s.body.replaceChildren(grid, ok);
    say(T.choosePet);
    ok.onclick = async () => {
      S.pets.push(chosen.id);
      S.fedAt = 0;
      save();
      Sfx.good();
      s.body.replaceChildren(h('div', { class: 'big-mascot bounce' }, chosen.e));
      hearts(s.body, 6);
      await say(T.petChosen(chosen));
      finishReward(room);
    };
  }

  async function finishReward(room) {
    const s = sheet;
    const next = ROOMS[ROOMS.indexOf(room) + 1];
    if (s && !s.closed) s.close();
    buildRoom(cur.room.id);
    if (next) await say(T.doorsOpen(next));
    else { confetti(120); await say(T.allBadges); }
    announceNext(200);
  }

  /* ---------- miska ---------- */
  function bowl() {
    Sfx.pop();
    if (!S.pets.length) {
      say(T.bowlInfo);
      return;
    }
        runGame({
      mode: 'practice',
      intro: { icon: '🥣', parts: isHungry() ? T.feedHungry : T.feedSnack },
      questions: Array.from({ length: 3 }, (_, k) => qCount(k, k === 0)),
      onDone: async (sc, t, s) => {
        S.fedAt = Date.now(); save();
        s.setRepeat(null);
        s.body.replaceChildren(h('div', { class: 'big-mascot bounce' }, S.pets.map(id => PET_BY_ID[id].e).join(' ')));
        hearts(s.body, 6); Sfx.fanfare();
        await say(T.thanks);
        if (!s.closed) s.close();
        updateNeeds();
        petEls.forEach(el => hearts(el));
      },
    });
  }

  /* ---------- odznaki ---------- */
  function openBadges() {
    const s = openSheet({ cls: 'sheet-badges' });
    const badges = h('div', { class: 'badge-row' }, ROOMS.map(r => {
      const got = S.badges.includes(r.id);
      const b = h('button', { class: 'badge' + (got ? ' got' : ''), 'aria-label': r.pl }, got ? r.icon : '?');
      b.onclick = () => { Sfx.pop(); boing(b); say(got ? T.badgeName(r) : T.badgeLocked); };
      return b;
    }));
    const pets = h('div', { class: 'pet-row' }, S.pets.length ? S.pets.map(id => {
      const p = PET_BY_ID[id];
      const b = h('button', { class: 'tile', 'aria-label': p.pl }, h('span', { class: 'tile-emoji' }, p.e));
      b.onclick = () => { Sfx.pop(); boing(b); say(T.pet(p)); };
      return b;
    }) : h('div', { class: 'tile ghost' }, h('span', { class: 'tile-emoji' }, '🎁')));
    s.body.append(h('div', { class: 'label' }, 'Odznaki'), badges, h('div', { class: 'label' }, 'Zwierzątka'), pets);
    const n = S.badges.length;
    say(T.badgeCount(n));
  }

  /* ---------- panel rodzica (przytrzymaj ⚙️) ---------- */
  let holdTimer;
  const gear = $('#parentBtn');
  gear.addEventListener('pointerdown', () => { gear.classList.add('holding'); holdTimer = setTimeout(() => { gear.classList.remove('holding'); openParent(); }, 1500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => gear.addEventListener(ev, () => { clearTimeout(holdTimer); gear.classList.remove('holding'); }));

  function openParent() {
    Voice.stop();
    const s = openSheet({ cls: 'sheet-parent' });
    const vi = Voice.info();
    const fmt = t => new Date(t).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const rows = ROOMS.map(r => {
      const rs = roomState(r.id);
      const tests = S.tests.filter(t => t.room === r.id).slice(-3).map(t => `${t.score}/${t.total} (${fmt(t.at)})`).join(', ') || 'brak';
      return h('tr', {}, h('td', {}, `${r.icon} ${cap(r.pl)}`), h('td', {}, `${rs.stars.filter(Boolean).length}/3`), h('td', {}, `${rs.explored.length}/${r.objects.length}`), h('td', {}, S.badges.includes(r.id) ? 'tak' : 'nie'), h('td', {}, tests));
    });
    const words = Object.keys(S.heard).length;
    const voiceLabel = () => (S.deviceVoice ? 'Głos: telefonu ✓' : 'Głos: nagrany ✓');
    const slow = h('button', { class: 'pbtn' }, voiceLabel());
    slow.onclick = () => { S.deviceVoice = !S.deviceVoice; save(); slow.textContent = voiceLabel(); say(T.voiceTest); };
    slow.disabled = !vi.device && !S.deviceVoice;
    const test = h('button', { class: 'pbtn' }, 'Sprawdź głos');
    test.onclick = () => say(T.voiceTest);
    let armed = false;
    const reset = h('button', { class: 'pbtn danger' }, 'Wyczyść postęp');
    reset.onclick = () => {
      if (!armed) { armed = true; reset.textContent = 'Na pewno? Dotknij jeszcze raz'; setTimeout(() => { armed = false; reset.textContent = 'Wyczyść postęp'; }, 4000); return; }
      S = fresh(); save(); closeSheet(true); show('start');
    };
    s.body.append(
      h('h2', {}, 'Panel rodzica'),
      h('p', {}, `Postać: ${S.character || '—'}  ·  Zwierzątka: ${S.pets.map(id => PET_BY_ID[id].e).join(' ') || 'brak'}  ·  Usłyszane słówka angielskie: ${words}`),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Pokój'), h('th', {}, 'Gwiazdki'), h('th', {}, 'Otwarte'), h('th', {}, 'Odznaka'), h('th', {}, 'Ostatnie testy'))),
        h('tbody', {}, rows))),
      h('p', { class: 'muted' }, `Gra ma ${vi.recorded} nagranych wypowiedzi i mówi nimi zawsze, także bez internetu. ` + (vi.device
        ? `Telefon ma też własne głosy (${vi.pl}, ${vi.en}). Brzmią ładniej, ale nie działają w każdej aplikacji. Jeśli po przełączeniu na „głos telefonu” gra milknie, wróć do nagranego.`
        : 'Telefon nie ma tu polskiego i angielskiego głosu, więc zostaje głos nagrany.')),
      h('div', { class: 'pbtns' }, slow, test, reset),
    );
  }

  /* ---------- start aplikacji ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* bez trybu offline */ }
  }
  show('start');
})();
