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
  const fresh = () => ({ character: null, pets: [], room: 'kitchen', rooms: {}, badges: [], fedAt: 0, tests: [], heard: {}, slowVoice: false, introDone: false, tips: {} });
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

  /* ---------- głos ---------- */
  const Voice = (() => {
    const synth = window.speechSynthesis;
    let pl = null, en = null, token = 0, bubbleTimer;
    function choose() {
      if (!synth) return;
      const vs = synth.getVoices();
      const by = re => vs.filter(v => re.test(v.lang.replace('_', '-')));
      const pref = list => list.find(v => /google|natural|enhanced|premium|siri/i.test(v.name)) || list[0] || null;
      pl = pref(by(/^pl/i));
      en = pref(by(/^en-(US|GB)/i)) || pref(by(/^en/i));
    }
    if (synth) { choose(); synth.addEventListener?.('voiceschanged', choose); }
    const estimate = parts => parts.reduce((t, [, s]) => t + s.length * 75 + 250, 300);

    function bubble(parts) {
      const b = $('#bubble');
      b.innerHTML = '';
      parts.forEach(([lang, text]) => b.append(lang === 'en' ? h('b', {}, text + ' ') : text + ' '));
      b.hidden = false;
    }
    function hideBubble(my) { clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { if (my === token) $('#bubble').hidden = true; }, 1400); }

    function say(parts) {
      const my = ++token;
      bubble(parts);
      if (!synth) return sleep(estimate(parts)).then(() => hideBubble(my));
      synth.cancel();
      return new Promise(resolve => {
        let left = parts.length, finished = false;
        const finish = () => { if (finished) return; finished = true; clearTimeout(safety); hideBubble(my); resolve(); };
        const safety = setTimeout(finish, estimate(parts) + 3000);
        parts.forEach(([lang, text]) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang === 'en' ? 'en-US' : 'pl-PL';
          const v = lang === 'en' ? en : pl;
          if (v) { u.voice = v; u.lang = v.lang; }
          u.rate = (lang === 'en' ? 0.8 : 0.95) * (S.slowVoice ? 0.8 : 1);
          u.pitch = 1.1;
          u.onend = u.onerror = () => { if (--left <= 0) finish(); };
          synth.speak(u);
        });
      });
    }
    function stop() { token++; if (synth) synth.cancel(); $('#bubble').hidden = true; }
    function unlock() { if (!synth) return; const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); }
    return { say, stop, unlock, info: () => ({ supported: !!synth, pl: pl && pl.name, en: en && en.name }) };
  })();
  const say = parts => Voice.say(parts);
  const sayPl = text => Voice.say([['pl', text]]);

  /* ---------- dźwięki ---------- */
  const Sfx = (() => {
    let ctx;
    function c() {
      if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f, t0, d, type = 'sine', g = 0.14) {
      const a = c(); if (!a) return;
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

  const PRAISE = [[['pl', 'Brawo!']], [['en', 'Great job!']], [['pl', 'Super!']], [['en', 'Well done!']], [['pl', 'Świetnie!']], [['en', 'Excellent!']], [['pl', 'Ekstra!']]];
  const praise = () => pick(PRAISE);

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
        say([['pl', cap(c.pl) + '!'], ['en', c.en]]);
      };
      return b;
    }));
    ok.onclick = () => { S.character = chosen; save(); Sfx.good(); enterHome(); };
    const back = $('#charBack');
    back.hidden = first || !S.character;
    back.onclick = () => { Sfx.pop(); enterHome(); };
    sayPl(first ? 'Cześć! Wybierz swoją postać. Dotknij tej, którą lubisz najbardziej.' : 'Wybierz postać.');
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
      say([
        ['pl', 'To jest twój domek! Jesteśmy w kuchni. Po angielsku:'], ['en', 'kitchen.'],
        ['pl', 'Dotknij podłogi, żeby chodzić. Dotknij szafki, żeby ją otworzyć.'],
        ['pl', 'Zbierz trzy gwiazdki, a potem sowa zrobi ci test. Za test dostaniesz prezent: zwierzątko!'],
      ]);
    } else {
      greetRoom();
    }
  }
  function greetRoom() {
    const r = cur.room;
    const extra = isHungry() ? [['pl', 'Twoje zwierzątko jest głodne!']] : [];
    say([['pl', cap(r.pl) + '. Po angielsku:'], ['en', r.en + '.'], ...extra]);
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
      if (room.id === 'kitchen') return { x: 10, top: 34, say: 'Twoje zwierzątko jest głodne! Dotknij miski.' };
      return { x: 6, top: 69, say: 'Twoje zwierzątko jest głodne. Idź do kuchni, do miski!' };
    }
    const un = room.objects.find(o => !rs.explored.includes(o.id));
    if (un) return { x: un.x, top: un.y + un.h, say: 'Dotknij tutaj, żeby otworzyć!' };
    if (!rs.stars[1]) return { x: m('parrot').x, top: m('parrot').y + 15, say: 'Idź do papugi! Papuga mówi po angielsku.' };
    if (!rs.stars[2]) return { x: m('octo').x, top: m('octo').y + 15, say: 'Idź do ośmiornicy! Ośmiornica uczy liczyć.' };
    if (!S.badges.includes(room.id)) return { x: m('owl').x, top: m('owl').y + 16, say: 'Idź do sowy! Zrób test i zdobądź odznakę!' };
    if (idx < ROOMS.length - 1) return { x: 114, top: 69, say: 'Przejdź przez drzwi do następnego pokoju!' };
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
      sayPl(g.say);
    }, delay);
  }
  setInterval(() => {
    if ($('#home').hidden || sheet || pointerOn) return;
    if (Date.now() - lastAct < 9000) return;
    const g = nextGoal();
    if (!g) return;
    showPointer(g);
    if (Date.now() - lastHintSay > 35000) { lastHintSay = Date.now(); sayPl(g.say); }
  }, 1000);

  /* ---------- pasek u góry ---------- */
  const STAR_SLOTS = [
    { icon: '🔍', say: 'Otwórz wszystkie szafki w tym pokoju.' },
    { icon: '🦜', say: 'Pobaw się z papugą.' },
    { icon: '🐙', say: 'Pobaw się z ośmiornicą.' },
  ];
  function updateHud(popIdx = -1) {
    $('#meBtn').textContent = S.character || '🙂';
    const rs = roomState(cur.room.id);
    $('#stars').replaceChildren(...STAR_SLOTS.map((s, i) => {
      const b = h('button', { class: 'star-slot' + (rs.stars[i] ? ' got' : '') + (i === popIdx ? ' boing' : ''), 'aria-label': 'gwiazdka ' + (i + 1) },
        rs.stars[i] ? '⭐' : s.icon);
      b.onclick = () => { Sfx.pop(); sayPl(rs.stars[i] ? 'Ta gwiazdka jest już twoja!' : s.say); };
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
  const STARS_WORD = ['zero gwiazdek', 'jedną gwiazdkę', 'dwie gwiazdki', 'trzy gwiazdki'];

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
      say([['pl', `${cap(p.pl)} jest ${p.f ? 'głodna' : 'głodny'}! Nakarm ${p.f ? 'ją' : 'go'} przy misce w kuchni.`]]);
    } else {
      hearts(el);
      say([['pl', cap(p.pl) + '. Po angielsku:'], ['en', p.en + '.'], ['en', 'I love you!']]);
    }
  }

  /* ---------- drzwi ---------- */
  function useDoor(el) {
    const target = ROOMS.find(r => r.id === el.dataset.id);
    if (el.classList.contains('locked')) {
      Sfx.locked();
      const prev = ROOMS[ROOMS.indexOf(target) - 1];
      sayPl(`Te drzwi są zamknięte. Zdobądź odznakę ${prev.gen} u sowy, a się otworzą!`);
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
    const sayObj = () => say([['pl', cap(o.pl) + '. Po angielsku:'], ['en', o.en + '.'], ['en', o.en + '!']]);
    s.setRepeat(sayObj);
    const items = h('div', { class: 'items' });
    o.items.forEach(([e, pl, en], i) => {
      const b = h('button', { class: 'item pop', style: `animation-delay:${0.25 + i * 0.12}s`, 'aria-label': pl },
        h('span', { class: 'item-emoji' }, e), h('span', { class: 'item-en' }, en));
      b.onclick = () => { Sfx.pop(); boing(b); heard(en); say([['pl', cap(pl) + '.'], ['en', en + '.']]); };
      items.append(b);
    });
    s.body.append(h('div', { class: 'obj-head' }, artNode(o, 'obj-mini'), h('div', { class: 'word' }, h('b', {}, o.en), h('small', {}, o.pl))), items);
    heard(o.en);
    sayObj().then(() => {
      if (s.closed || S.tips.items) return;
      S.tips.items = true; save();
      sayPl('Dotknij rzeczy w środku, a powiem, jak się nazywają!');
    });
  }
  function afterExplore() {
    const rs = roomState(cur.room.id);
    if (rs.explored.length >= cur.room.objects.length && grantStar(0)) {
      Sfx.good(); confetti(40);
      say([['pl', 'Brawo! Wszystko otwarte! Masz gwiazdkę!'], ['en', 'Star!']]).then(() => announceNext(200));
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
      say: [['pl', 'Pokaż:'], ['en', t[2] + '.']],
      okSay: [['en', t[2] + '!']],
      choices: shuffle([t, ...others]).map(w => ({
        ok: w === t, node: () => h('span', { class: 'choice-emoji' }, w[0]),
        wrongSay: [['pl', 'To jest'], ['en', w[2] + '.']],
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
      await sayPl(PL_NUM[i + 1]);
    }
  }

  function qHowMany(room, lo = 1, hi = 10) {
    const n = rint(lo, hi), e = pick(room.mathEmoji);
    return {
      kind: 'pick',
      say: [['pl', 'Policz! Ile ich jest?']],
      show: () => countRow(n, e),
      okSay: [['pl', cap(PL_NUM[n]) + '! Po angielsku:'], ['en', EN_NUM[n] + '.']],
      teach: countAlong,
      choices: numberChoices(n, 1, 10).map(c => ({ ok: c === n, node: () => h('span', { class: 'digit' }, c), wrongSay: [['pl', 'To nie ' + PL_NUM[c] + '.']] })),
    };
  }
  function qCompare(room) {
    let a = rint(1, 9), b = rint(1, 9);
    while (Math.abs(a - b) < 2) b = rint(1, 9);
    const more = Math.random() < 0.65, e = pick(room.mathEmoji);
    const win = more ? Math.max(a, b) : Math.min(a, b), lose = a + b - win;
    return {
      kind: 'pick', wide: true,
      say: [['pl', more ? 'Gdzie jest więcej?' : 'Gdzie jest mniej?'], ['en', more ? 'More!' : 'Less!']],
      okSay: [['pl', `${cap(PL_NUM[win])} to ${more ? 'więcej' : 'mniej'} niż ${PL_NUM[lose]}.`]],
      choices: [a, b].map(c => ({ ok: c === win, node: () => countRow(c, e), wrongSay: [['pl', `Tu jest ${PL_NUM[c]}.`]] })),
    };
  }
  function qAdd(room, max = 6) {
    const s = rint(2, max), a = rint(1, s - 1), b = s - a, e = pick(room.mathEmoji);
    return {
      kind: 'pick',
      say: [['pl', `${cap(PL_NUM[a])} plus ${PL_NUM[b]}. Ile to razem?`]],
      show: () => h('div', { class: 'sum' }, countRow(a, e), h('span', { class: 'op' }, '+'), countRow(b, e), h('span', { class: 'op' }, '= ?')),
      okSay: [['pl', `${cap(PL_NUM[a])} plus ${PL_NUM[b]} to ${PL_NUM[s]}!`], ['en', `${EN_NUM[a]} plus ${EN_NUM[b]} is ${EN_NUM[s]}.`]],
      teach: countAlong,
      choices: numberChoices(s, 1, 10).map(c => ({ ok: c === s, node: () => h('span', { class: 'digit' }, c), wrongSay: [['pl', 'To nie ' + PL_NUM[c] + '.']] })),
    };
  }
  function qCount(k, first) {
    const target = rint(1, 5);
    const pet = S.pets.length ? PET_BY_ID[S.pets[k % S.pets.length]] : null;
    const fruit = pet ? null : pick(FRUITS);
    const e = pet ? pet.food : fruit.e;
    const lead = pet ? `Daj ${pet.dat} tyle ${pet.foodGen}:` : `Włóż do miski tyle ${fruit.gen}:`;
    const tip = first && !S.tips.check ? [['pl', 'Potem dotknij zielonego ptaszka.']] : [];
    return { kind: 'count', target, e, pet, say: [['pl', lead], ['pl', PL_NUM[target] + '.'], ['en', EN_NUM[target] + '!'], ...tip] };
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
            await say([...c.wrongSay, ['pl', 'Dobra odpowiedź jest tutaj.'], ...q.okSay]);
            await sleep(300);
            resolve(false);
            return;
          }
          if (wrongs >= 2) right.classList.add('hint');
          await say([...c.wrongSay, ['pl', pick(['Spróbuj jeszcze raz!', 'Prawie! Jeszcze raz!'])]]);
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
        Voice.say([['pl', inBowl ? PL_NUM[inBowl] : 'pusto']]);
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
          await say([...praise(), ['pl', cap(PL_NUM[q.target]) + '! Po angielsku:'], ['en', EN_NUM[q.target] + '.']]);
          await sleep(250);
          resolve(wrongs === 0);
          return;
        }
        wrongs++; Sfx.oops();
        const where = inBowl === 0 ? 'Miska jest pusta.' : `W misce jest ${PL_NUM[inBowl]}. A ma być ${PL_NUM[q.target]}.`;
        if (mode === 'test') {
          done = true;
          await say([['pl', where]]);
          await sleep(300);
          resolve(false);
          return;
        }
        say([['pl', where], ['pl', inBowl > q.target ? 'Za dużo! Zabierz trochę.' : 'Za mało! Dodaj jeszcze.']]);
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
    await say(isNew ? [['pl', 'Brawo! Masz nową gwiazdkę!'], ['en', 'Star!']] : [['pl', 'Brawo! Świetna zabawa!']]);
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
      intro: { icon: '🦜', parts: [['pl', 'Cześć! Jestem papuga. Mówię po angielsku. Posłuchaj i pokaż!']] },
      questions: findSet(cur.room, 5),
      onDone: (sc, t, s) => finishPractice(s, 1),
    });
  }
  function octopus() {
    Sfx.pop();
    const room = cur.room;
    const intro = room.math === 'count' ? 'Cześć! Jestem ośmiornica. Mam osiem rączek i lubię liczyć!'
      : room.math === 'mix' ? 'Cześć! Policzymy razem. Gotowe?'
        : 'Cześć! Dzisiaj dodajemy. Plus znaczy: dokładamy!';
    runGame({
      mode: 'practice',
      intro: { icon: '🐙', parts: [['pl', intro]] },
      questions: Array.from({ length: 5 }, (_, k) => mathQ(room, k)),
      onDone: (sc, t, s) => finishPractice(s, 2),
    });
  }
  function owl() {
    Sfx.pop();
    const room = cur.room, n = starsCount();
    if (n < 3) {
      sayPl(`Hu hu! Jestem sowa. Masz ${STARS_WORD[n]}. Zbierz trzy gwiazdki, a potem zrobimy test!`).then(() => announceNext(100));
      return;
    }
    const finds = findSet(room, 3);
    const questions = [];
    for (let k = 0; k < 3; k++) questions.push(finds[k], mathQ(room, k));
    runGame({
      mode: 'test', cls: 'sheet-test',
      intro: { icon: '🦉', parts: [['pl', 'Hu hu! Zaczynamy test. Sześć pytań. Dasz radę!']] },
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
      say([['pl', `Prawie! Masz ${PL_NUM[score]} na ${PL_NUM[total]}. Poćwicz z papugą i ośmiornicą, i spróbuj jeszcze raz!`]]);
      return;
    }
    if (S.badges.includes(room.id)) {
      Sfx.fanfare(); confetti(40);
      await say([['pl', 'Hu hu! Znowu świetnie! Brawo!']]);
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
    await say([['pl', `Brawo! Masz odznakę! ${cap(room.pl)}, po angielsku:`], ['en', room.en + '!']]);
    if (s.closed) return;
    if (S.pets.length < S.badges.length && S.pets.length < PETS.length) giftFlow(s, room);
    else finishReward(room);
  }

  function giftFlow(s, room) {
    const gift = h('button', { class: 'gift shake', 'aria-label': 'Prezent' }, '🎁');
    s.body.replaceChildren(gift);
    say([['pl', 'Mam dla ciebie prezent! Dotknij prezentu!']]);
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
        say([['pl', cap(p.pl) + '!'], ['en', p.en]]);
      };
      return b;
    }));
    s.body.replaceChildren(grid, ok);
    sayPl('Wybierz zwierzątko, którym będziesz się opiekować!');
    ok.onclick = async () => {
      S.pets.push(chosen.id);
      S.fedAt = 0;
      save();
      Sfx.good();
      s.body.replaceChildren(h('div', { class: 'big-mascot bounce' }, chosen.e));
      hearts(s.body, 6);
      await say([['pl', `Hurra! ${cap(chosen.pl)} jest teraz z tobą! ${chosen.f ? 'Ona jest głodna' : 'On jest głodny'}. Nakarm ${chosen.f ? 'ją' : 'go'} przy misce w kuchni.`]]);
      finishReward(room);
    };
  }

  async function finishReward(room) {
    const s = sheet;
    const next = ROOMS[ROOMS.indexOf(room) + 1];
    if (s && !s.closed) s.close();
    buildRoom(cur.room.id);
    if (next) await say([['pl', `Otworzyły się drzwi do ${next.gen}! Po angielsku:`], ['en', next.en + '!']]);
    else { confetti(120); await sayPl('Masz wszystkie odznaki w domku! Brawo, brawo, brawo!'); }
    announceNext(200);
  }

  /* ---------- miska ---------- */
  function bowl() {
    Sfx.pop();
    if (!S.pets.length) {
      say([['pl', 'To miska. Po angielsku:'], ['en', 'bowl.'], ['pl', 'Tu będzie jadło twoje zwierzątko. Zdobądź odznakę u sowy!']]);
      return;
    }
    const intro = isHungry() ? 'Mniam! Nakarmimy zwierzątka. Licz uważnie!' : 'Zwierzątka chcą przekąskę. Policzymy?';
    runGame({
      mode: 'practice',
      intro: { icon: '🥣', parts: [['pl', intro]] },
      questions: Array.from({ length: 3 }, (_, k) => qCount(k, k === 0)),
      onDone: async (sc, t, s) => {
        S.fedAt = Date.now(); save();
        s.setRepeat(null);
        s.body.replaceChildren(h('div', { class: 'big-mascot bounce' }, S.pets.map(id => PET_BY_ID[id].e).join(' ')));
        hearts(s.body, 6); Sfx.fanfare();
        await say([['pl', 'Mniam, mniam! Dziękuję!'], ['en', 'Thank you!']]);
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
      b.onclick = () => { Sfx.pop(); boing(b); say(got ? [['pl', 'Odznaka: ' + r.pl + '.'], ['en', r.en + '!']] : [['pl', 'Tej odznaki jeszcze nie masz.']]); };
      return b;
    }));
    const pets = h('div', { class: 'pet-row' }, S.pets.length ? S.pets.map(id => {
      const p = PET_BY_ID[id];
      const b = h('button', { class: 'tile', 'aria-label': p.pl }, h('span', { class: 'tile-emoji' }, p.e));
      b.onclick = () => { Sfx.pop(); boing(b); say([['pl', cap(p.pl) + '.'], ['en', p.en + '.']]); };
      return b;
    }) : h('div', { class: 'tile ghost' }, h('span', { class: 'tile-emoji' }, '🎁')));
    s.body.append(h('div', { class: 'label' }, 'Odznaki'), badges, h('div', { class: 'label' }, 'Zwierzątka'), pets);
    const n = S.badges.length;
    say([['pl', n ? `Masz ${n === 1 ? 'jedną odznakę' : PL_NUM[n] + ' odznaki'}!` : 'Nie masz jeszcze odznak. Sowa da ci odznakę za test!']]);
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
    const slow = h('button', { class: 'pbtn' }, S.slowVoice ? 'Głos: wolniej ✓' : 'Głos: normalnie');
    slow.onclick = () => { S.slowVoice = !S.slowVoice; save(); slow.textContent = S.slowVoice ? 'Głos: wolniej ✓' : 'Głos: normalnie'; say([['pl', 'Tak mówię po polsku.'], ['en', 'And this is English.']]); };
    const test = h('button', { class: 'pbtn' }, 'Sprawdź głos');
    test.onclick = () => say([['pl', 'Tak mówię po polsku.'], ['en', 'And this is English.']]);
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
      h('p', { class: 'muted' }, vi.supported
        ? `Głos polski: ${vi.pl || 'nie znaleziono'} · angielski: ${vi.en || 'nie znaleziono'}.` + (vi.pl ? '' : ' Zainstaluj polski głos w ustawieniach telefonu: Ustawienia → Ułatwienia dostępu → Zamiana tekstu na mowę.')
        : 'Ta przeglądarka nie obsługuje mowy. Spróbuj w Chrome (Android) lub Safari (iPhone).'),
      h('div', { class: 'pbtns' }, slow, test, reset),
    );
  }

  /* ---------- start aplikacji ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* bez trybu offline */ }
  }
  show('start');
})();
