'use strict';
(() => {
  /* ---------- pomocnicze ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rnd = n => Math.floor(Math.random() * n);
  const rint = (a, b) => a + rnd(b - a + 1);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  const SAVE_KEY = 'mojDomek.v2';
  const fresh = () => ({ hero: null, pets: [], activePet: null, owned: [], wear: {}, prog: {}, ep: 0, treats: 0, fed: 0, tut: {}, voiceMode: 'auto', storyDone: false });
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* brak zapisu */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* tryb prywatny */ } }
  const epProg = id => S.prog[id] || (S.prog[id] = { stars: [] });
  const doneCount = ep => { const st = epProg(ep.id).stars; let i = 0; while (i < ep.nodes.length && st[i]) i++; return i; };
  const epDone = ep => doneCount(ep) >= ep.nodes.length;
  const epUnlocked = i => i === 0 || epDone(EPISODES[i - 1]);
  const totalStars = () => Object.values(S.prog).reduce((t, p) => t + p.stars.reduce((a, b) => a + (b || 0), 0), 0);

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

  /* ---------- głos ----------
     auto: naturalne głosy telefonu (Chrome, Safari), a gdy ich nie ma albo milczą, nagrania z audio/voice-pack.js.
     Gdy paczka nagrań jest z naturalnego lektora (VOICE_PACK_ENGINE = 'neural'), zawsze nagrania. */
  const Voice = (() => {
    const synth = window.speechSynthesis;
    const pack = () => window.VOICE_PACK || {};
    const buffers = new Map();
    let plV = null, enV = null, token = 0, bubbleTimer, src = null, last = null, keepAlive = null, deviceOK = null;
    window.__voiceMissing = [];
    window.__voiceUsed = { device: 0, clip: 0 };

    function choose() {
      if (!synth) return;
      const vs = synth.getVoices();
      const by = re => vs.filter(v => re.test(v.lang.replace('_', '-')));
      const rank = v => (/natural|neural|enhanced|premium|siri/i.test(v.name) ? 3 : /google/i.test(v.name) ? 2 : v.localService ? 1 : 0);
      const best = list => list.sort((a, b) => rank(b) - rank(a))[0] || null;
      plV = best(by(/^pl/i));
      enV = best(by(/^en-(US|GB)/i)) || best(by(/^en/i));
    }
    if (synth) { choose(); synth.addEventListener?.('voiceschanged', choose); }
    const estimate = parts => parts.reduce((t, [, s]) => t + s.length * 70 + 250, 300);

    function bubble(parts) {
      const b = $('#bubble');
      b.replaceChildren(...parts.map(([lang, text]) => (lang === 'en' ? h('b', {}, text + ' ') : text + ' ')));
      b.hidden = false;
    }
    function hideBubble(my) { clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { if (my === token) $('#bubble').hidden = true; }, 1200); }

    function decode(lang, text) {
      const k = lang + '|' + text;
      if (buffers.has(k)) return buffers.get(k);
      const b64 = pack()[k], a = audio();
      if (!b64 || !a) return Promise.resolve(null);
      const bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const p = new Promise((res, rej) => a.decodeAudioData(bytes.buffer, res, rej)).catch(() => null);
      buffers.set(k, p);
      if (buffers.size > 150) buffers.delete(buffers.keys().next().value);
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
        window.__voiceUsed.clip++;
      });
    }
    async function clips(parts, my) {
      const bufs = parts.map(([l, t]) => decode(l, t));
      for (let i = 0; i < parts.length; i++) {
        if (my !== token) return;
        const buf = await bufs[i];
        if (buf) { await play(buf, my); await sleep(80); continue; }
        window.__voiceMissing.push(parts[i].join('|'));
      }
    }
    function device(parts, my) {
      return new Promise(resolve => {
        let started = false, left = parts.length, fin = false;
        const finish = fallback => {
          if (fin) return;
          fin = true; clearTimeout(safety); clearTimeout(probe);
          if (fallback) { synth.cancel(); clips(parts, my).then(resolve); } else resolve();
        };
        const safety = setTimeout(() => finish(false), estimate(parts) + 4000);
        const probe = deviceOK === true ? 0 : setTimeout(() => { if (!started) { deviceOK = false; finish(true); } }, 1800);
        parts.forEach(([lang, text]) => {
          const u = new SpeechSynthesisUtterance(text);
          const v = lang === 'en' ? enV : plV;
          u.voice = v; u.lang = v.lang;
          u.rate = lang === 'en' ? 0.85 : 1;
          u.onstart = () => { started = true; deviceOK = true; window.__voiceUsed.device++; };
          u.onend = () => { if (--left <= 0) finish(false); };
          u.onerror = e => {
            if (!started && deviceOK !== true && my === token) { deviceOK = false; finish(true); return; }
            if (--left <= 0) finish(false);
          };
          synth.speak(u);
        });
      });
    }
    function useDevice() {
      if (S.voiceMode === 'recorded' || !synth || !plV || !enV) return false;
      if (S.voiceMode === 'device') return true;
      if (window.VOICE_PACK_ENGINE === 'neural') return false;
      return deviceOK !== false;
    }
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
      if (synth && synth.getVoices().length === 0) choose();
    }
    return {
      say, stop, unlock, repeat: () => last && say(last),
      info: () => ({
        recorded: Object.keys(pack()).length, neural: window.VOICE_PACK_ENGINE === 'neural',
        device: !!(synth && plV && enV), deviceWorks: deviceOK, pl: plV && plV.name, en: enV && enV.name, using: useDevice() ? 'device' : 'recorded',
      }),
    };
  })();
  const say = parts => Voice.say(parts);
  $('#bubble').addEventListener('click', () => Voice.repeat());

  /* ---------- efekty dźwiękowe ---------- */
  const Sfx = (() => {
    function tone(f, t0, d, type = 'sine', g = 0.13) {
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
      pop: () => tone(760, 0, 0.1, 'triangle', 0.1),
      flip: () => { tone(520, 0, 0.08, 'triangle', 0.08); tone(780, 0.05, 0.08, 'triangle', 0.08); },
      good: () => [659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle')),
      oops: () => tone(220, 0, 0.22, 'sine', 0.12),
      star: i => tone([784, 988, 1175][i] || 1175, 0, 0.35, 'triangle', 0.14),
      fanfare: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.12)),
      chomp: () => { tone(300, 0, 0.06, 'square', 0.05); tone(260, 0.12, 0.06, 'square', 0.05); tone(300, 0.24, 0.06, 'square', 0.05); },
      locked: () => { tone(180, 0, 0.1, 'square', 0.05); tone(180, 0.14, 0.1, 'square', 0.05); },
    };
  })();

  function confetti(n = 70) {
    const box = $('#confetti');
    const colors = ['#FF6B5B', '#FFC93C', '#2FBF84', '#5BB8FF', '#7A5CFA', '#FF8AD8'];
    for (let i = 0; i < n; i++) {
      const p = h('i', { style: `left:${rnd(100)}%;background:${pick(colors)};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.8 + Math.random() * 1.4}s` });
      box.append(p);
      setTimeout(() => p.remove(), 3800);
    }
  }
  function hearts(el, n = 4) {
    for (let i = 0; i < n; i++) {
      const x = h('span', { class: 'heart', style: `left:${25 + rnd(50)}%;animation-delay:${i * 0.15}s` }, '❤️');
      el.append(x);
      setTimeout(() => x.remove(), 1800);
    }
  }
  function boing(el) { el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing'); }

  /* ---------- zwierzak z ozdobami ---------- */
  function petNode(petId, cls = '') {
    const p = PET_BY_ID[petId];
    const wrap = h('span', { class: 'petwrap ' + cls }, h('span', { class: 'pet-body' }, p.e));
    (S.wear[petId] || []).forEach(id => {
      const a = ACCESSORIES.find(x => x.id === id);
      if (a) wrap.append(h('span', { class: 'acc acc-' + a.spot }, a.e));
    });
    return wrap;
  }

  /* ---------- ekrany i okienka ---------- */
  function show(id) { $$('.screen').forEach(s => { s.hidden = s.id !== id; }); }
  let sheet = null;
  function openSheet({ cls = '', closable = true, onClose = null } = {}) {
    closeSheet(true);
    const closeBtn = h('button', { class: 'round-btn sheet-close', 'aria-label': 'Zamknij' }, '✖');
    const body = h('div', { class: 'sheet-body' });
    const el = h('div', { class: 'sheet ' + cls }, closable ? closeBtn : null, body);
    $('#overlay').replaceChildren(el);
    $('#overlay').hidden = false;
    const s = { el, body, closed: false, onClose, close: () => closeSheet() };
    closeBtn.onclick = () => { Sfx.pop(); closeSheet(); };
    sheet = s;
    return s;
  }
  function closeSheet(silent) {
    const s = sheet;
    if (!s) return;
    s.closed = true; sheet = null;
    $('#overlay').hidden = true; $('#overlay').replaceChildren();
    if (!silent && s.onClose) s.onClose();
  }

  /* ---------- start ---------- */
  $('#play').addEventListener('click', () => {
    Sfx.pop();
    Voice.unlock();
    if (!S.hero) chooseHero(true);
    else if (!S.pets.length) choosePet(true);
    else openMap();
  });

  /* ---------- wybór postaci i zwierzaka ---------- */
  function chooser({ icon, items, render, speak, selected, onOk, back, intro }) {
    show('chooser');
    $('#chooserIcon').textContent = icon;
    const grid = $('#chooserGrid'), ok = $('#chooserOk');
    let chosen = selected;
    ok.hidden = chosen == null;
    grid.replaceChildren(...items.map(it => {
      const b = h('button', { class: 'tile' + (it === chosen ? ' on' : '') }, h('span', { class: 'tile-emoji' }, render(it)));
      b.onclick = () => {
        chosen = it;
        $$('.tile', grid).forEach(t => t.classList.toggle('on', t === b));
        ok.hidden = false; Sfx.pop(); boing(b); say(speak(it));
      };
      return b;
    }));
    ok.onclick = () => { Sfx.good(); onOk(chosen); };
    $('#chooserBack').hidden = !back;
    $('#chooserBack').onclick = () => { Sfx.pop(); back(); };
    if (intro) say(intro);
  }
  function chooseHero(first) {
    chooser({
      icon: '🙂', items: CHARACTERS, render: c => c.e, speak: T.hero,
      selected: CHARACTERS.find(c => c.e === S.hero), intro: first ? T.hello : null,
      back: first ? null : openMap,
      onOk: c => { S.hero = c.e; save(); if (!S.pets.length) choosePet(true); else openMap(); },
    });
  }
  function choosePet(first, onDone) {
    const items = PETS.filter(p => !S.pets.includes(p.id));
    chooser({
      icon: '🐾', items, render: p => p.e, speak: T.pet, selected: null,
      intro: first ? T.choosePet : T.friend, back: null,
      onOk: p => {
        S.pets.push(p.id); S.activePet = p.id; save();
        if (onDone) onDone(); else openMap({ story: true });
      },
    });
  }
  $('#heroBtn').onclick = () => { Sfx.pop(); chooseHero(false); };

  /* ---------- mapa ---------- */
  const NODE_GAP = 118, MAP_PAD = 150;
  const nodeX = i => 50 + 27 * Math.sin(i * 1.15);
  function openMap({ story = false, walkFrom = null, fanfareEp = false } = {}) {
    show('map');
    if (S.ep >= EPISODES.length || !epUnlocked(S.ep)) S.ep = 0;
    renderMap(walkFrom);
    if (story && !S.storyDone) { S.storyDone = true; save(); say([...T.story]); }
    else if (fanfareEp) say(T.episode[EPISODES[S.ep].id]);
  }
  function renderMap(walkFrom) {
    const ep = EPISODES[S.ep];
    const world = $('#mapWorld'), scroll = $('#mapScroll');
    const prog = epProg(ep.id), cur = doneCount(ep);
    const H = MAP_PAD * 2 + (ep.nodes.length - 1) * NODE_GAP;
    world.style.height = H + 'px';
    $('#map').style.setProperty('--sky1', ep.sky[0]);
    $('#map').style.setProperty('--sky2', ep.sky[1]);
    $('#map').style.setProperty('--ground', ep.ground);
    $('#heroBtn').textContent = S.hero;
    $('#houseBtnPet').replaceChildren(S.activePet ? petNode(S.activePet) : '🏠');
    $('#epTitle').replaceChildren(h('span', { class: 'ep-icon' }, ep.icon), h('span', { class: 'ep-name' }, ep.pl));
    $('#epPrev').style.visibility = S.ep > 0 ? 'visible' : 'hidden';
    $('#epNext').style.visibility = S.ep < EPISODES.length - 1 ? 'visible' : 'hidden';
    $('#epNext').classList.toggle('locked', !epUnlocked(S.ep + 1));

    const pos = i => ({ x: nodeX(i), y: H - MAP_PAD - i * NODE_GAP });
    const pts = ep.nodes.map((_, i) => pos(i));
    const W = world.clientWidth || 360;
    let d = '';
    pts.forEach((p, i) => {
      const x = p.x / 100 * W;
      if (!i) d = `M ${x} ${p.y}`;
      else { const q = pts[i - 1], qx = q.x / 100 * W; d += ` C ${qx} ${q.y - NODE_GAP / 2}, ${x} ${p.y + NODE_GAP / 2}, ${x} ${p.y}`; }
    });
    const svg = `<svg class="path" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${d}" class="path-base"/><path d="${d}" class="path-dash"/></svg>`;
    world.innerHTML = svg;

    for (let i = 0; i < 9; i++) {
      const left = i % 2 ? 4 + rnd(10) : 84 + rnd(10);
      world.append(h('span', { class: 'deco', style: `left:${left}%;top:${(i + 0.5) * H / 9}px` }, ep.deco[i % ep.deco.length]));
    }

    ep.nodes.forEach((n, i) => {
      const st = prog.stars[i] || 0;
      const state = i < cur ? 'done' : i === cur ? 'current' : 'locked';
      const icon = n.kind === 'chest' ? (st ? '✨' : '🎁') : n.kind === 'boss' ? '🦉' : TYPE_ICON[n.type];
      const b = h('button', { class: `node ${n.kind} ${state}`, style: `left:${pts[i].x}%;top:${pts[i].y}px`, 'aria-label': 'poziom ' + (i + 1) },
        h('span', { class: 'node-icon' }, state === 'locked' ? '🔒' : icon));
      if (n.kind !== 'chest' && st) b.append(h('span', { class: 'node-stars' }, '⭐'.repeat(st)));
      b.onclick = () => tapNode(i, state);
      world.append(b);
    });

    const walkerAt = Math.min(cur, ep.nodes.length - 1);
    const walker = h('div', { class: 'walker' }, h('span', { class: 'walker-hero' }, S.hero), S.activePet ? petNode(S.activePet, 'walker-pet') : null);
    const place = i => { walker.style.left = `calc(${pts[i].x}% + 46px)`; walker.style.top = `${pts[i].y}px`; };
    world.append(walker);
    if (walkFrom != null && walkFrom !== walkerAt) {
      place(walkFrom);
      walker.classList.add('walking');
      requestAnimationFrame(() => requestAnimationFrame(() => { walker.style.transition = 'left 1.1s ease-in-out, top 1.1s ease-in-out'; place(walkerAt); }));
      setTimeout(() => walker.classList.remove('walking'), 1200);
    } else place(walkerAt);
    const target = pts[walkerAt].y - scroll.clientHeight * 0.55;
    scroll.scrollTo({ top: target, behavior: walkFrom != null ? 'smooth' : 'auto' });
  }
  $('#epPrev').onclick = () => { Sfx.pop(); S.ep--; save(); renderMap(); say(T.episode[EPISODES[S.ep].id]); };
  $('#epNext').onclick = () => {
    if (!epUnlocked(S.ep + 1)) { Sfx.locked(); boing($('#epNext')); say(T.locked); return; }
    Sfx.pop(); S.ep++; save(); renderMap(); say(T.episode[EPISODES[S.ep].id]);
  };
  window.addEventListener('resize', () => { if (!$('#map').hidden) renderMap(); });

  function tapNode(i, state) {
    const ep = EPISODES[S.ep], node = ep.nodes[i];
    if (state === 'locked') { Sfx.locked(); say(T.locked); return; }
    Sfx.pop();
    if (node.kind === 'chest') { openChest(ep, i); return; }
    playLevel(S.ep, i);
  }

  /* ---------- skrzynka ze skarbem ---------- */
  function giveAccessory() {
    const a = ACCESSORIES.find(x => !S.owned.includes(x.id));
    if (!a) return null;
    S.owned.push(a.id);
    wear(S.activePet, a.id);
    return a;
  }
  function wear(petId, accId) {
    const a = ACCESSORIES.find(x => x.id === accId);
    const list = (S.wear[petId] || []).filter(id => ACCESSORIES.find(x => x.id === id).spot !== a.spot);
    S.wear[petId] = [...list, accId];
  }
  async function openChest(ep, i) {
    const prog = epProg(ep.id), first = !prog.stars[i];
    const s = openSheet({ cls: 'sheet-reward', closable: false });
    const chest = h('button', { class: 'chest shake' }, '🎁');
    s.body.append(chest);
    chest.onclick = async () => {
      chest.onclick = null;
      Sfx.fanfare(); confetti(80);
      chest.classList.remove('shake'); chest.classList.add('burst');
      await sleep(500);
      const a = first ? giveAccessory() : null;
      prog.stars[i] = 1; save();
      s.body.replaceChildren(h('div', { class: 'reward-pet pop' }, petNode(S.activePet, 'big')), a ? h('div', { class: 'reward-acc pop' }, a.e) : null);
      await say(T.chest);
      await sleep(600);
      closeSheet(true);
      openMap({ walkFrom: i });
    };
  }

  /* ---------- poziom ---------- */
  let run = null;
  async function playLevel(epIdx, nodeIdx) {
    const ep = EPISODES[epIdx], node = ep.nodes[nodeIdx];
    const tasks = node.kind === 'boss'
      ? node.p.tasks.map(([t, p]) => makeTask(t, p, ep))
      : node.type === 'memory' ? [makeTask('memory', node.p, ep), makeTask('memory', node.p, ep)]
        : Array.from({ length: 5 }, () => makeTask(node.type, node.p, ep));
    const my = run = { closed: false };
    show('level');
    $('#level').style.setProperty('--sky1', ep.sky[0]);
    $('#level').style.setProperty('--sky2', ep.sky[1]);
    $('#buddy').replaceChildren(petNode(S.activePet));
    $('#stage').replaceChildren();
    const bar = $('#lvBar');
    bar.style.width = '0%';
    if (node.kind === 'boss') {
      $('#stage').append(h('div', { class: 'boss-owl bounce' }, '🦉'));
      await say(T.boss);
      if (my.closed) return;
    }
    let mistakes = 0;
    for (let k = 0; k < tasks.length; k++) {
      const t = tasks[k];
      if (!S.tut[t.type] && T.tutorial[t.type]) {
        S.tut[t.type] = true; save();
        t.tutorial = T.tutorial[t.type];
      }
      mistakes += await t.run($('#stage'), my);
      if (my.closed) return;
      bar.style.width = ((k + 1) / tasks.length * 100) + '%';
    }
    const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
    finishLevel(epIdx, nodeIdx, stars);
  }
  $('#lvClose').onclick = () => { Sfx.pop(); if (run) run.closed = true; Voice.stop(); openMap(); };
  $('#lvRepeat').onclick = () => { Sfx.pop(); Voice.repeat(); };

  function buddy(mood) {
    const b = $('#buddy');
    b.classList.remove('happy', 'sad'); void b.offsetWidth; b.classList.add(mood);
    if (mood === 'happy') hearts(b, 2);
  }

  /* Zadanie z kartami do wyboru. Zwraca liczbę pomyłek. */
  function choose(stage, my, { prompt, tutorial, show, cards, cls = '', okSay }) {
    return new Promise(async resolve => {
      stage.replaceChildren();
      if (show) stage.append(h('div', { class: 'show' }, show));
      const grid = h('div', { class: `cards n${cards.length} ${cls}` });
      stage.append(grid);
      let m = 0, done = false;
      cards.forEach((c, i) => {
        const b = h('button', { class: 'card pop', style: `animation-delay:${i * 0.06}s` }, c.node);
        if (c.ok) b.dataset.ok = '1';
        b.onclick = async () => {
          if (done || b.classList.contains('dim')) return;
          if (c.ok) {
            done = true; b.classList.add('right'); Sfx.good(); buddy('happy');
            await say(okSay || pick(T.praise));
            await sleep(300);
            resolve(m);
            return;
          }
          m++; Sfx.oops(); buddy('sad');
          b.classList.add('wrong', 'dim');
          if (c.wrongSay) say(c.wrongSay);
          if (m >= 2) $('[data-ok]', grid).classList.add('hint');
        };
        grid.append(b);
      });
      await say([...(tutorial || []), ...prompt]);
    });
  }

  const emojiCard = e => h('span', { class: 'emoji' }, e);
  const digitCard = n => h('span', { class: 'digit' }, n);
  const row = (n, e, cls = '') => h('div', { class: 'row ' + cls }, Array.from({ length: n }, () => h('span', { class: 'it' }, e)));
  function numChoices(n, lo, hi) {
    const set = new Set([n]);
    let guard = 0;
    while (set.size < 3 && guard++ < 50) set.add(Math.max(lo, Math.min(hi, n + pick([-2, -1, 1, 2]))));
    for (let v = lo; set.size < 3 && v <= hi; v++) set.add(v);
    return shuffle([...set]);
  }
  function dots(n) {
    return h('span', { class: 'dots d' + n }, Array.from({ length: n }, () => h('i')));
  }
  function shapeSvg(id, color) {
    const paths = {
      circle: '<circle cx="50" cy="50" r="40"/>',
      square: '<rect x="12" y="12" width="76" height="76" rx="6"/>',
      triangle: '<path d="M50 10 L92 86 H8 Z"/>',
      star: '<path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 72 L21 92 L32 58 L4 38 L38 38 Z"/>',
      heart: '<path d="M50 88 C10 60 4 34 22 20 C36 10 48 18 50 28 C52 18 64 10 78 20 C96 34 90 60 50 88 Z"/>',
      rectangle: '<rect x="4" y="26" width="92" height="48" rx="6"/>',
    };
    return h('span', { class: 'shape', html: `<svg viewBox="0 0 100 100" fill="${color}" stroke="#2B2140" stroke-width="5" stroke-linejoin="round">${paths[id]}</svg>` });
  }

  function makeTask(type, p, ep) {
    const words = ep.words.map(id => WORDS[id]);
    const emo = () => pick(ep.emo);
    const t = { type };
    const go = fn => { t.run = (stage, my) => fn(stage, my, t); return t; };
    switch (type) {
      case 'listen': return go((stage, my) => {
        const opts = shuffle(words).slice(0, p.n), w = pick(opts);
        return choose(stage, my, {
          tutorial: t.tutorial, prompt: T.word(w[2]),
          cards: opts.map(o => ({ node: emojiCard(o[0]), ok: o === w, wrongSay: T.word(o[2]) })),
        });
      });
      case 'colors': return go((stage, my) => {
        const opts = shuffle(COLORS).slice(0, p.n), c = pick(opts);
        return choose(stage, my, {
          tutorial: t.tutorial, prompt: T.word(c.en), cls: 'balloons',
          cards: opts.map(o => ({ node: h('span', { class: 'balloon', style: `--c:${o.hex}` }), ok: o === c, wrongSay: T.word(o.en) })),
        });
      });
      case 'shapes': return go((stage, my) => {
        const opts = shuffle(SHAPES.slice(0, p.set)).slice(0, p.n), sh = pick(opts);
        const cols = shuffle(COLORS);
        return choose(stage, my, {
          tutorial: t.tutorial, prompt: T.word(sh.en),
          cards: opts.map((o, i) => ({ node: shapeSvg(o.id, cols[i].hex), ok: o === sh, wrongSay: T.word(o.en) })),
        });
      });
      case 'numEN': return go((stage, my) => {
        const n = rint(1, p.max);
        return choose(stage, my, {
          tutorial: t.tutorial, prompt: T.word(EN_NUM[n]),
          cards: numChoices(n, 1, p.max < 3 ? 3 : p.max).map(c => ({ node: dots(c), ok: c === n, wrongSay: T.word(EN_NUM[c]) })),
        });
      });
      case 'count': return go((stage, my) => {
        const n = rint(1, p.max), e = emo();
        return choose(stage, my, {
          tutorial: t.tutorial, prompt: T.ask.count, show: row(n, e),
          cards: numChoices(n, 1, Math.max(3, p.max)).map(c => ({ node: digitCard(c), ok: c === n })), okSay: T.numBoth(n),
        });
      });
      case 'compare': return go((stage, my) => {
        let a = rint(1, p.max), b = rint(1, p.max);
        while (Math.abs(a - b) < 2) { a = rint(1, p.max); b = rint(1, p.max); }
        const less = p.less && Math.random() < 0.4, win = less ? Math.min(a, b) : Math.max(a, b), e = emo();
        return choose(stage, my, {
          prompt: less ? T.ask.less : T.ask.more, cls: 'wide',
          cards: [a, b].map(c => ({ node: row(c, e, 'small'), ok: c === win })),
        });
      });
      case 'size': return go((stage, my) => {
        const small = Math.random() < 0.4, e = emo(), sizes = shuffle([0.55, 0.8, 1.15]);
        const goal = small ? Math.min(...sizes) : Math.max(...sizes);
        return choose(stage, my, {
          prompt: small ? T.ask.small : T.ask.big, cls: 'sizes',
          cards: sizes.map(s => ({ node: h('span', { class: 'emoji', style: `font-size:calc(var(--card-emoji) * ${s})` }, e), ok: s === goal })),
        });
      });
      case 'pattern': return go((stage, my) => {
        const kind = pick(p.kinds), letters = [...new Set(kind)];
        const pool = shuffle([...ep.emo, ...GROUPS.fruit, ...GROUPS.toys]);
        const map = {}; letters.forEach((l, i) => { map[l] = pool[i]; });
        const seq = [];
        while (seq.length < Math.max(6, kind.length * 2 + 1)) seq.push(map[kind[seq.length % kind.length]]);
        const answer = seq.pop();
        const others = shuffle([...new Set([...letters.map(l => map[l]), pool[letters.length]])].filter(x => x !== answer)).slice(0, 2);
        return choose(stage, my, {
          prompt: T.ask.pattern,
          show: h('div', { class: 'seq' }, seq.map(x => h('span', { class: 'it' }, x)), h('span', { class: 'it q' }, '?')),
          cards: shuffle([answer, ...others]).map(x => ({ node: emojiCard(x), ok: x === answer })),
        });
      });
      case 'odd': return go((stage, my) => {
        const [ga, gb] = shuffle(Object.keys(GROUPS));
        const items = shuffle(GROUPS[ga]).slice(0, p.n - 1), odd = pick(GROUPS[gb]);
        return choose(stage, my, {
          prompt: T.ask.odd,
          cards: shuffle([...items, odd]).map(x => ({ node: emojiCard(x), ok: x === odd })),
        });
      });
      case 'add': return go((stage, my) => {
        const s = rint(2, p.max), a = rint(1, s - 1), b = s - a, e = emo();
        return choose(stage, my, {
          prompt: T.ask.add, okSay: T.numBoth(s),
          show: h('div', { class: 'sum' }, row(a, e, 'grp'), h('span', { class: 'op' }, '+'), row(b, e, 'grp')),
          cards: numChoices(s, 1, 10).map(c => ({ node: digitCard(c), ok: c === s })),
        });
      });
      case 'sub': return go(async (stage, my) => {
        const n = rint(3, p.max), k = rint(1, n - 1), e = emo();
        stage.replaceChildren(h('div', { class: 'show' }, row(n, e)));
        await say(t.tutorial || []);
        await sleep(700);
        if (my.closed) return 0;
        const its = $$('.it', stage);
        shuffle(its).slice(0, k).forEach(x => x.classList.add('fly'));
        Sfx.flip();
        await sleep(1000);
        const show = h('div', { class: 'show' }, h('div', { class: 'row' }, its.map(x => h('span', { class: x.classList.contains('fly') ? 'it gone' : 'it' }, e))));
        return choose(stage, my, {
          prompt: T.ask.sub, show, okSay: T.numBoth(n - k),
          cards: numChoices(n - k, 1, 10).map(c => ({ node: digitCard(c), ok: c === n - k })),
        });
      });
      case 'tapN': return go((stage, my) => new Promise(async resolve => {
        const n = rint(1, p.max), total = Math.min(10, n + 3), food = emo();
        const pile = h('div', { class: 'pile' }), bowl = h('div', { class: 'bowl-in' });
        const ok = h('button', { class: 'ok-btn pop', 'aria-label': 'Gotowe' }, '✔');
        const pet = h('div', { class: 'feed-pet' }, petNode(S.activePet));
        stage.replaceChildren(h('div', { class: 'feed-head' }, pet, h('span', { class: 'target' }, n)), pile, h('div', { class: 'bowl' }, bowl, h('div', { class: 'bowl-dish' })), ok);
        let inBowl = 0, m = 0, done = false;
        for (let i = 0; i < total; i++) {
          const b = h('button', { class: 'food pop', style: `animation-delay:${i * 0.04}s` }, food);
          b.onclick = () => {
            if (done) return;
            Sfx.pop();
            if (b.parentNode === pile) { bowl.append(b); inBowl++; } else { pile.append(b); inBowl--; }
            if (inBowl) say(T.num(inBowl));
          };
          pile.append(b);
        }
        ok.onclick = async () => {
          if (done) return;
          if (inBowl === n) {
            done = true; Sfx.chomp(); buddy('happy'); hearts(pet, 4); boing(pet);
            bowl.classList.add('eaten');
            await say(T.numBoth(n));
            await sleep(300);
            resolve(m);
            return;
          }
          m++; Sfx.oops(); buddy('sad'); boing(bowl);
          say([...T.oops, ...T.give(n)]);
        };
        say([...(t.tutorial || []), ...T.give(n)]);
      }));
      case 'memory': return go((stage, my) => new Promise(resolve => {
        const pairs = shuffle(words).slice(0, p.pairs);
        const deck = shuffle([...pairs, ...pairs]);
        const grid = h('div', { class: 'memory m' + deck.length });
        stage.replaceChildren(grid);
        let open = [], found = 0, misses = 0, busy = false;
        deck.forEach(w => {
          const c = h('button', { class: 'mcard pop' }, h('span', { class: 'mback' }, '❓'), h('span', { class: 'mface' }, w[0]));
          c.onclick = async () => {
            if (busy || c.classList.contains('up')) return;
            c.classList.add('up'); Sfx.flip(); say(T.word(w[2]));
            open.push([c, w]);
            if (open.length < 2) return;
            const [[c1, w1], [c2, w2]] = open; open = [];
            if (w1 === w2) {
              found++; c1.classList.add('match'); c2.classList.add('match'); buddy('happy');
              setTimeout(() => Sfx.good(), 250);
              if (found === pairs.length) { await sleep(900); if (!my.closed) { await say(pick(T.praise)); resolve(Math.max(0, Math.floor((misses - p.pairs) / 2))); } }
            } else {
              misses++; busy = true;
              await sleep(1100);
              c1.classList.remove('up'); c2.classList.remove('up'); busy = false;
            }
          };
          grid.append(c);
        });
        say([...(t.tutorial || []), ...T.ask.memory]);
      }));
    }
    throw new Error('Nieznane zadanie: ' + type);
  }

  /* ---------- koniec poziomu ---------- */
  async function finishLevel(epIdx, nodeIdx, stars) {
    const ep = EPISODES[epIdx], node = ep.nodes[nodeIdx], prog = epProg(ep.id);
    const firstTime = !prog.stars[nodeIdx];
    prog.stars[nodeIdx] = Math.max(prog.stars[nodeIdx] || 0, stars);
    S.treats += stars;
    save();
    const s = openSheet({ cls: 'sheet-result', closable: false });
    const starEls = [0, 1, 2].map(() => h('span', { class: 'rstar' }, '⭐'));
    s.body.append(h('div', { class: 'rstars' }, starEls), h('div', { class: 'treat-gain' }, `+${stars} 🍪`));
    for (let i = 0; i < 3; i++) {
      await sleep(350);
      if (i < stars) { starEls[i].classList.add('on'); Sfx.star(i); } else starEls[i].classList.add('off');
    }
    if (stars === 3) confetti(60);
    say(T.done[stars - 1]);

    if (node.kind === 'boss' && firstTime) {
      await sleep(1600);
      bossReward(epIdx);
      return;
    }
    const goMap = () => { closeSheet(true); openMap({ walkFrom: firstTime ? nodeIdx : null }); };
    const btns = h('div', { class: 'result-btns' },
      h('button', { class: 'round-btn big', 'aria-label': 'Jeszcze raz', onclick: () => { Sfx.pop(); closeSheet(true); playLevel(epIdx, nodeIdx); } }, '↻'),
      h('button', { class: 'ok-btn', 'aria-label': 'Dalej', onclick: () => { Sfx.pop(); goMap(); } }, '▶'),
    );
    s.body.append(btns);
  }

  async function bossReward(epIdx) {
    const ep = EPISODES[epIdx];
    const s = openSheet({ cls: 'sheet-reward', closable: false });
    const gift = h('button', { class: 'chest shake' }, '🎁');
    s.body.append(gift);
    Sfx.fanfare(); confetti(120);
    gift.onclick = async () => {
      gift.onclick = null;
      gift.classList.remove('shake'); gift.classList.add('burst');
      Sfx.fanfare();
      await sleep(500);
      closeSheet(true);
      const after = () => {
        giveAccessory(); save();
        const next = epIdx + 1 < EPISODES.length ? epIdx + 1 : epIdx;
        S.ep = next; save();
        openMap();
        say([...T.next[ep.id], ...(next !== epIdx ? T.episode[EPISODES[next].id] : [])]);
      };
      if (S.pets.length < PETS.length) choosePet(false, after); else after();
    };
  }

  /* ---------- domek zwierzaka ---------- */
  function openHouse() {
    show('house');
    renderHouse();
    say(S.treats ? T.house : T.noTreats);
  }
  function renderHouse() {
    $('#treats').textContent = `🍪 ${S.treats}`;
    const pet = petNode(S.activePet, 'big');
    pet.onclick = () => { Sfx.pop(); boing(pet); hearts($('#housePet'), 3); say(T.love); };
    $('#housePet').replaceChildren(pet);
    $('#treatJar').classList.toggle('empty', S.treats <= 0);
    $('#accTray').replaceChildren(...S.owned.map(id => {
      const a = ACCESSORIES.find(x => x.id === id);
      const on = (S.wear[S.activePet] || []).includes(id);
      const b = h('button', { class: 'tray-item' + (on ? ' on' : '') }, a.e);
      b.onclick = () => {
        Sfx.pop();
        if (on) S.wear[S.activePet] = S.wear[S.activePet].filter(x => x !== id); else wear(S.activePet, id);
        save(); renderHouse();
      };
      return b;
    }));
    $('#petTray').replaceChildren(...S.pets.map(id => {
      const b = h('button', { class: 'tray-item' + (id === S.activePet ? ' on' : '') }, PET_BY_ID[id].e);
      b.onclick = () => { Sfx.pop(); S.activePet = id; save(); renderHouse(); say(T.pet(PET_BY_ID[id])); };
      return b;
    }));
  }
  $('#houseBtn').onclick = () => { Sfx.pop(); openHouse(); };
  $('#houseClose').onclick = () => { Sfx.pop(); Voice.stop(); openMap(); };
  $('#treatJar').onclick = async () => {
    if (S.treats <= 0) { Sfx.locked(); say(T.noTreats); return; }
    S.treats--; S.fed++; save();
    const jar = $('#treatJar'), petBox = $('#housePet');
    const jr = jar.getBoundingClientRect(), pr = petBox.getBoundingClientRect();
    const fly = h('span', { class: 'flying', style: `left:${jr.left + jr.width / 2}px;top:${jr.top}px` }, '🍪');
    document.body.append(fly);
    requestAnimationFrame(() => { fly.style.left = `${pr.left + pr.width / 2}px`; fly.style.top = `${pr.top + pr.height * 0.45}px`; fly.style.transform = 'translate(-50%,-50%) scale(.4)'; });
    await sleep(600);
    fly.remove();
    Sfx.chomp(); hearts(petBox, 3); boing($('.petwrap', petBox));
    $('#treats').textContent = `🍪 ${S.treats}`;
    $('#treatJar').classList.toggle('empty', S.treats <= 0);
  };

  /* ---------- panel rodzica (przytrzymaj ⚙️) ---------- */
  let holdTimer;
  const gear = $('#parentBtn');
  gear.addEventListener('pointerdown', () => { gear.classList.add('holding'); holdTimer = setTimeout(() => { gear.classList.remove('holding'); openParent(); }, 1500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => gear.addEventListener(ev, () => { clearTimeout(holdTimer); gear.classList.remove('holding'); }));
  gear.addEventListener('click', () => boing(gear));

  function openParent() {
    Voice.stop();
    const s = openSheet({ cls: 'sheet-parent' });
    const vi = Voice.info();
    const rows = EPISODES.map((ep, i) => {
      const st = epProg(ep.id).stars;
      return h('tr', {}, h('td', {}, `${ep.icon} ${ep.pl}`), h('td', {}, `${doneCount(ep)}/${ep.nodes.length}`),
        h('td', {}, String(st.reduce((a, b) => a + (b || 0), 0))), h('td', {}, epUnlocked(i) ? 'tak' : 'nie'));
    });
    const modes = [['auto', 'Automatycznie'], ['device', 'Głos telefonu'], ['recorded', 'Nagrania']];
    const modeBtns = h('div', { class: 'pbtns' }, modes.map(([m, label]) => {
      const b = h('button', { class: 'pbtn' + (S.voiceMode === m ? ' on' : '') }, label);
      b.onclick = () => { S.voiceMode = m; save(); $$('.pbtn', modeBtns).forEach(x => x.classList.toggle('on', x === b)); say(T.voiceTest); };
      return b;
    }));
    const test = h('button', { class: 'pbtn' }, 'Sprawdź głos');
    test.onclick = () => say(T.voiceTest);
    let armed = false;
    const reset = h('button', { class: 'pbtn danger' }, 'Wyczyść postęp');
    reset.onclick = () => {
      if (!armed) { armed = true; reset.textContent = 'Na pewno? Dotknij jeszcze raz'; setTimeout(() => { armed = false; reset.textContent = 'Wyczyść postęp'; }, 4000); return; }
      S = fresh(); save(); closeSheet(true); show('start');
    };
    const unlock = h('button', { class: 'pbtn' }, 'Odblokuj wszystkie krainy');
    unlock.onclick = () => {
      EPISODES.forEach(ep => { const pr = epProg(ep.id); ep.nodes.forEach((_, i) => { pr.stars[i] = pr.stars[i] || 1; }); });
      save(); closeSheet(true); renderMap();
    };
    const voiceNote = vi.device
      ? `Telefon ma naturalne głosy: ${vi.pl} i ${vi.en}. ` + (vi.deviceWorks === false ? 'W tej aplikacji nie działają, więc gra używa nagrań.' : 'Gra używa ich automatycznie.')
      : 'Ta przeglądarka nie ma głosów telefonu, więc gra używa nagrań. Najładniej brzmi w Chrome (Android) albo Safari (iPhone).';
    s.body.append(
      h('h2', {}, 'Panel rodzica'),
      h('p', {}, `Gwiazdki: ${totalStars()} · Zwierzaki: ${S.pets.map(id => PET_BY_ID[id].e).join(' ')} · Smakołyki: ${S.treats}`),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Kraina'), h('th', {}, 'Poziomy'), h('th', {}, 'Gwiazdki'), h('th', {}, 'Otwarta'))),
        h('tbody', {}, rows))),
      h('h3', {}, 'Głos'),
      h('p', { class: 'muted' }, voiceNote + (vi.neural ? ' Nagrania: naturalny lektor.' : ' Nagrania: głos syntetyczny (zapasowy).')),
      modeBtns,
      h('div', { class: 'pbtns' }, test, unlock, reset),
    );
  }

  /* ---------- start aplikacji ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.host)) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* bez trybu offline */ }
  }
  window.__game = { S: () => S, EPISODES };
  show('start');
})();
