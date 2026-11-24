/* Pokemonyx · misiones del Team Rocket: retos de memoria, cálculo, lógica, rompecabezas y más (9-11 años) */
(function () {
  'use strict';
  const L = PK.logic;
  const wait = ms => PK.fx.wait(ms);
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const uniq = arr => [...new Set(arr)];

  PK.CHALLENGES = {
    calculo: { icon: '🧮', name: 'Cálculo relámpago', how: 'Resuelve las operaciones antes de que se acabe el tiempo.' },
    memoria: { icon: '🃏', name: 'Memoria Pokémon', how: 'Encuentra todas las parejas antes de que se acabe el tiempo.' },
    logica: { icon: '🧠', name: '¿Qué viene después?', how: 'Descubre la regla de cada serie y elige lo que sigue.' },
    puzle: { icon: '🧩', name: 'Rompecabezas', how: 'Mueve las piezas hasta recomponer la imagen.' },
    silueta: { icon: '❓', name: '¿Quién es ese Pokémon?', how: 'Adivina qué Pokémon se esconde en cada sombra.' },
    palabras: { icon: '🔤', name: 'Letras revueltas', how: 'Ordena las letras para formar el nombre del Pokémon.' },
    tipos: { icon: '⚔️', name: 'Maestro de tipos', how: 'Demuestra que sabes qué ataques son más eficaces.' },
  };
  const TAUNTS = [
    '¡Ja, ja, ja! ¡Hemos venido a por tus Pokémon!',
    '¡Prepárate! Esta vez tenemos un plan infalible.',
    '¡Tus Pokémon serán nuestros! A no ser que superes nuestras pruebas…',
    '¡Nadie supera los retos del Team Rocket! ¿O sí?',
  ];

  // ---------- Temporizador ----------
  function timer(el, seconds, onEnd) {
    const t0 = performance.now(); let stopped = false;
    el.innerHTML = '<i></i>';
    const bar = el.querySelector('i');
    const iv = setInterval(() => {
      if (stopped) return;
      const left = Math.max(0, 1 - (performance.now() - t0) / (seconds * 1000));
      bar.style.width = (left * 100) + '%';
      el.classList.toggle('low', left < 0.25);
      if (left <= 0) { stopped = true; clearInterval(iv); onEnd && onEnd(); }
    }, 100);
    return { stop() { stopped = true; clearInterval(iv); }, get elapsed() { return (performance.now() - t0) / 1000; } };
  }

  // ---------- Preguntas de opción múltiple ----------
  async function quiz(area, { questions, need, perQ, optCls = '' }) {
    let ok = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const opts = PK.shuffle(q.options);
      area.innerHTML = `<div class="q-head"><span>Pregunta ${i + 1} de ${questions.length}</span><span class="q-score">✅ ${ok} · necesitas ${need}</span></div>
        <div class="q-timer" data-t></div>
        <div class="q-prompt">${q.prompt}</div>
        <div class="q-opts ${optCls}">${opts.map((o, j) => `<button class="q-opt" data-j="${j}">${o.label ?? o}</button>`).join('')}</div>`;
      const answer = await new Promise(res => {
        const t = timer(area.querySelector('[data-t]'), perQ, () => res(null));
        area.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { t.stop(); res(Number(b.dataset.j)); });
      });
      const correctIdx = opts.findIndex(o => (o.value ?? o) === q.answer);
      const btns = area.querySelectorAll('[data-j]');
      btns.forEach(b => b.disabled = true);
      btns[correctIdx].classList.add('right');
      if (answer === correctIdx) { ok++; PK.sound.play('coin'); PK.fx.pop(btns[correctIdx]); }
      else { PK.sound.play('error'); if (answer != null) btns[answer].classList.add('wrong'); else PK.ui.toast('⏰ ¡Se acabó el tiempo!', 'warn'); }
      if (q.reveal) q.reveal(area, answer === correctIdx);
      await wait(q.reveal ? 1400 : 900);
      if (ok >= need) break;
      if (ok + (questions.length - i - 1) < need) break;
    }
    return ok >= need;
  }
  const numOptions = (answer, spread = [1, 2, 10, -1, -2, -10]) => {
    const set = new Set([answer]);
    for (const d of PK.shuffle(spread)) { if (set.size >= 4) break; const v = answer + d; if (v >= 0) set.add(v); }
    let k = 3; while (set.size < 4) set.add(answer + k++);
    return [...set];
  };

  // ---------- Cálculo ----------
  function genCalc(diff) {
    const gens = {
      facil: [
        () => { const a = ri(5, 50), b = ri(3, 50 - Math.min(a, 45)); return [`${a} + ${b}`, a + b]; },
        () => { const a = ri(20, 99), b = ri(3, a - 5); return [`${a} − ${b}`, a - b]; },
        () => { const a = PK.rand([2, 3, 4, 5, 10]), b = ri(1, 10); return [`${a} × ${b}`, a * b]; },
        () => { const a = ri(2, 20) * 2; return [`La mitad de ${a}`, a / 2]; },
      ],
      normal: [
        () => { const a = ri(120, 700), b = ri(40, 290); return [`${a} + ${b}`, a + b]; },
        () => { const a = ri(200, 900), b = ri(30, a - 50); return [`${a} − ${b}`, a - b]; },
        () => { const a = ri(3, 10), b = ri(3, 10); return [`${a} × ${b}`, a * b]; },
        () => { const b = ri(2, 10), q = ri(2, 10); return [`${b * q} ÷ ${b}`, q]; },
        () => { const a = ri(3, 9), b = ri(3, 9); return [`${a} × ? = ${a * b}`, b]; },
      ],
      dificil: [
        () => { const a = ri(12, 49), b = ri(3, 9); return [`${a} × ${b}`, a * b]; },
        () => { const b = ri(3, 9), q = ri(11, 25); return [`${b * q} ÷ ${b}`, q]; },
        () => { const a = ri(2, 20), b = ri(2, 9), c = ri(2, 9); return [`${a} + ${b} × ${c}`, a + b * c]; },
        () => { const a = ri(4, 12); return [`${a} × ${a}`, a * a]; },
        () => { const a = ri(150, 999), b = ri(150, 999); return [`${a} + ${b}`, a + b]; },
      ],
    };
    const g = gens[diff] || gens.normal;
    return Array.from({ length: 5 }, () => { const [txt, ans] = PK.rand(g)(); return { prompt: `<div class="big-op">${txt} = ?</div>`, answer: ans, options: numOptions(ans) }; });
  }

  // ---------- Lógica: series y patrones ----------
  function genLogic(diff) {
    const E = ['🔥', '💧', '🍃', '⚡', '❄️', '⭐', '🌙', '✨'];
    const series = {
      facil: [
        () => { const s = ri(1, 10), k = PK.rand([2, 3, 5, 10]); return [0, 1, 2, 3].map(i => s + k * i).concat(s + 4 * k); },
        () => { const s = ri(40, 60), k = PK.rand([2, 5, 10]); return [0, 1, 2, 3].map(i => s - k * i).concat(s - 4 * k); },
      ],
      normal: [
        () => { const s = ri(1, 4); return [s, s * 2, s * 4, s * 8, s * 16]; },
        () => { const s = ri(1, 9); return [s, s + 1, s + 3, s + 6, s + 10]; },
        () => { const s = ri(2, 9), a = ri(2, 5), b = ri(6, 9); return [s, s + a, s + a + b, s + 2 * a + b, s + 2 * a + 2 * b]; },
        () => { const s = ri(60, 99), k = ri(3, 9); return [0, 1, 2, 3, 4].map(i => s - k * i); },
      ],
      dificil: [
        () => { const s = ri(1, 3); return [s, s * 3, s * 9, s * 27, s * 81]; },
        () => { const s = ri(1, 4); return [s, s + 1, s + 2].map(x => x * x).concat([(s + 3) ** 2, (s + 4) ** 2]); },
        () => { const a = ri(1, 3), b = ri(2, 4); const f = [a, b]; while (f.length < 5) f.push(f[f.length - 1] + f[f.length - 2]); return f; },
        () => { const s = ri(2, 6); return [s, s + 3, (s + 3) * 2, (s + 3) * 2 + 3, ((s + 3) * 2 + 3) * 2]; },
      ],
    };
    const patterns = {
      facil: [[0, 1], [0, 0, 1], [0, 1, 2]],
      normal: [[0, 1, 1], [0, 1, 2, 2], [0, 0, 1, 1, 2, 2]],
      dificil: [[0, 1, 2, 1], [0, 1, 1, 2, 2, 2], [0, 1, 0, 2]],
    };
    const qs = [];
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        const s = PK.rand(series[diff] || series.normal)();
        const ans = s[s.length - 1];
        qs.push({ prompt: `<div class="big-op seq">${s.slice(0, -1).join(' · ')} · ?</div>`, answer: ans, options: numOptions(ans, [1, -1, 2, -2, 3, 5, -5, 10]) });
      } else {
        const cyc = PK.rand(patterns[diff] || patterns.normal);
        const sym = PK.shuffle(E).slice(0, 3);
        const show = Math.max(5, cyc.length <= 3 ? cyc.length * 2 : cyc.length + 3);
        const seq = Array.from({ length: show }, (_, k) => sym[cyc[k % cyc.length]]);
        const ans = sym[cyc[show % cyc.length]];
        const opts = uniq([ans, ...sym, ...PK.shuffle(E)]).slice(0, 4);
        qs.push({ prompt: `<div class="big-op seq emo">${seq.join(' ')} ?</div>`, answer: ans, options: opts });
      }
    }
    return qs;
  }

  // ---------- ¿Quién es ese Pokémon? ----------
  const ALL = () => Object.keys(PK.DEX).map(Number).filter(id => id <= 905);
  function genSilhouettes(diff, n = 5) {
    const pool = diff === 'facil' ? ALL().filter(id => id <= 151 || [25, 133, 152, 155, 158].includes(id)) : ALL();
    const picks = PK.shuffle(pool).slice(0, n);
    return picks.map(id => {
      const others = PK.shuffle(pool.filter(x => x !== id)).slice(0, 3);
      return {
        prompt: `<div class="sil-wrap">${PK.art.mon(id, 'sil')}</div>`,
        answer: id,
        options: [id, ...others].map(x => ({ value: x, label: PK.esc(PK.DEX[x].n) })),
        reveal: (area, ok) => { const img = area.querySelector('.sil'); img.classList.add('show'); area.querySelector('.q-prompt').insertAdjacentHTML('beforeend', `<div class="sil-name">¡Es ${PK.esc(PK.DEX[id].n)}!</div>`); },
      };
    });
  }

  // ---------- Tipos ----------
  function genTypes(diff) {
    const basic = ['fire', 'water', 'grass', 'electric', 'ground', 'flying', 'rock', 'ice'];
    const types = diff === 'facil' ? basic : Object.keys(PK.TYPES);
    const qs = [];
    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        let def, strong;
        for (let g = 0; g < 50; g++) { def = PK.rand(types); strong = types.filter(a => PK.eff(a, [def]) >= 2); if (strong.length) break; }
        const ans = PK.rand(strong);
        const wrong = PK.shuffle(types.filter(a => PK.eff(a, [def]) <= 1)).slice(0, 3);
        qs.push({ prompt: `<div class="q-txt">¿Qué ataque es <b>muy eficaz</b> contra un Pokémon de tipo ${PK.art.type(def)}?</div>`, answer: ans, options: [ans, ...wrong].map(t => ({ value: t, label: PK.art.type(t) })) });
      } else {
        const a = PK.rand(types), d = PK.rand(types);
        const e = PK.eff(a, [d]);
        const ans = e >= 2 ? 'muy' : e === 0 ? 'nada' : e < 1 ? 'poco' : 'normal';
        qs.push({ prompt: `<div class="q-txt">Un ataque de tipo ${PK.art.type(a)} contra un Pokémon de tipo ${PK.art.type(d)} es…</div>`, answer: ans, options: [{ value: 'muy', label: '💥 Muy eficaz' }, { value: 'normal', label: '😐 Normal' }, { value: 'poco', label: '🛡️ Poco eficaz' }, { value: 'nada', label: '🚫 No le afecta' }] });
      }
    }
    return qs;
  }

  // ---------- Memoria ----------
  async function memoria(area, diff, c) {
    const pairs = { facil: 6, normal: 8, dificil: 10 }[diff] || 8;
    const secs = { facil: 80, normal: 95, dificil: 115 }[diff] || 95;
    const region = L.weekRegion();
    const pool = uniq([...c.pokemon.map(p => p.id), ...region.wild, ...PK.STARTERS.flatMap(s => s.ids)]);
    const ids = PK.shuffle(pool).slice(0, pairs);
    const cards = PK.shuffle([...ids, ...ids]);
    area.innerHTML = `<div class="q-head"><span>Parejas: <b data-found>0</b> / ${pairs}</span></div><div class="q-timer" data-t></div>
      <div class="mem-grid" style="--cols:${pairs > 8 ? 5 : 4};--rows:${pairs * 2 / (pairs > 8 ? 5 : 4)}">${cards.map((id, i) => `<button class="mem-card" data-i="${i}" data-id="${id}"><span class="mem-back">❓</span><span class="mem-front">${PK.art.mon(id)}</span></button>`).join('')}</div>`;
    return new Promise(res => {
      let open = [], found = 0, lock = false, over = false;
      const t = timer(area.querySelector('[data-t]'), secs, () => { if (!over) { over = true; res(false); } });
      area.querySelectorAll('.mem-card').forEach(b => b.onclick = () => {
        if (lock || over || b.classList.contains('up')) return;
        b.classList.add('up'); PK.sound.play('tap'); open.push(b);
        if (open.length < 2) return;
        lock = true;
        const [x, y] = open;
        if (x.dataset.id === y.dataset.id) {
          found++; x.classList.add('done'); y.classList.add('done'); PK.sound.play('coin');
          area.querySelector('[data-found]').textContent = found;
          open = []; lock = false;
          if (found === pairs) { over = true; t.stop(); setTimeout(() => res(true), 500); }
        } else {
          setTimeout(() => { x.classList.remove('up'); y.classList.remove('up'); open = []; lock = false; }, 750);
        }
      });
    });
  }

  // ---------- Rompecabezas deslizante ----------
  async function puzle(area, diff, c) {
    const n = diff === 'dificil' ? 4 : 3;
    const shuffles = { facil: 14, normal: 40, dificil: 70 }[diff] || 40;
    const secs = { facil: 150, normal: 180, dificil: 240 }[diff] || 180;
    const p = L.active(c);
    const img = PK.URL.art(p ? p.id : 25);
    let tiles = Array.from({ length: n * n }, (_, i) => i); // el último es el hueco
    const empty = () => tiles.indexOf(n * n - 1);
    const neighbors = i => [i - n, i + n, i % n ? i - 1 : -1, (i + 1) % n ? i + 1 : -1].filter(j => j >= 0 && j < n * n);
    let last = -1;
    for (let s = 0; s < shuffles; s++) { const e = empty(); const opts = neighbors(e).filter(j => j !== last); const j = PK.rand(opts); [tiles[e], tiles[j]] = [tiles[j], tiles[e]]; last = e; }
    if (tiles.every((v, i) => v === i)) { const e = empty(); const j = neighbors(e)[0]; [tiles[e], tiles[j]] = [tiles[j], tiles[e]]; }
    area.innerHTML = `<div class="q-head"><span>Movimientos: <b data-moves>0</b></span><span class="pz-ref"><img src="${img}" alt=""></span></div><div class="q-timer" data-t></div>
      <div class="pz-grid" style="--n:${n}" data-grid></div>`;
    const grid = area.querySelector('[data-grid]');
    let moves = 0;
    const paint = () => {
      grid.innerHTML = tiles.map((v, i) => v === n * n - 1 ? `<div class="pz-tile hole"></div>` : `<button class="pz-tile" data-i="${i}" style="background-image:url('${img}');background-size:${n * 100}% ${n * 100}%;background-position:${(v % n) / (n - 1) * 100}% ${Math.floor(v / n) / (n - 1) * 100}%"></button>`).join('');
    };
    paint();
    return new Promise(res => {
      let over = false;
      const t = timer(area.querySelector('[data-t]'), secs, () => { if (!over) { over = true; res(false); } });
      grid.addEventListener('click', e => {
        const b = e.target.closest('[data-i]'); if (!b || over) return;
        const i = Number(b.dataset.i); const e0 = empty();
        if (!neighbors(e0).includes(i)) { PK.fx.shake(b); return; }
        [tiles[e0], tiles[i]] = [tiles[i], tiles[e0]];
        moves++; area.querySelector('[data-moves]').textContent = moves;
        PK.sound.play('tap'); paint();
        if (tiles.every((v, k) => v === k)) { over = true; t.stop(); grid.classList.add('solved'); PK.sound.play('success'); setTimeout(() => res(true), 900); }
      });
    });
  }

  // ---------- Letras revueltas ----------
  async function palabras(area, diff) {
    const clean = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const [min, max] = { facil: [4, 6], normal: [5, 8], dificil: [6, 10] }[diff] || [5, 8];
    const pool = ALL().filter(id => (diff !== 'facil' || id <= 251) && /^[A-Za-zÀ-ÿ]+$/.test(PK.DEX[id].n) && PK.DEX[id].n.length >= min && PK.DEX[id].n.length <= max);
    const words = PK.shuffle(pool).slice(0, 4);
    let ok = 0;
    for (let w = 0; w < words.length; w++) {
      const id = words[w]; const word = clean(PK.DEX[id].n);
      let letters = PK.shuffle(word.split('').map((ch, i) => ({ ch, i })));
      if (letters.map(l => l.ch).join('') === word) letters = letters.reverse();
      const hint = diff === 'facil' ? 1 : 0;
      const solved = await new Promise(res => {
        let typed = word.slice(0, hint).split('').map(ch => ({ ch, fixed: true }));
        let used = new Set();
        if (hint) { const k = letters.findIndex(l => l.ch === word[0]); used.add(k); }
        let tries = 0;
        area.innerHTML = `<div class="q-head"><span>Palabra ${w + 1} de ${words.length}</span><span class="q-score">✅ ${ok} · necesitas 3</span></div><div class="q-timer" data-t></div>
          <div class="wd-pic">${PK.art.mon(id, 'sil')}</div>
          <div class="wd-slots" data-slots></div><div class="wd-letters" data-letters></div>
          <div class="row-btns"><button class="btn btn-ghost btn-sm" data-undo>⌫ Borrar</button></div>`;
        const t = timer(area.querySelector('[data-t]'), diff === 'facil' ? 50 : 45, () => res(false));
        const paint = () => {
          area.querySelector('[data-slots]').innerHTML = word.split('').map((_, i) => `<span class="wd-slot ${typed[i] ? 'on' : ''}">${typed[i] ? typed[i].ch : ''}</span>`).join('');
          area.querySelector('[data-letters]').innerHTML = letters.map((l, k) => `<button class="wd-letter" data-k="${k}" ${used.has(k) ? 'disabled' : ''}>${l.ch}</button>`).join('');
          area.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
            const k = Number(b.dataset.k); used.add(k); typed.push({ ch: letters[k].ch, k }); PK.sound.play('tap');
            if (typed.length === word.length) {
              if (typed.map(x => x.ch).join('') === word) { t.stop(); area.querySelector('.sil').classList.add('show'); PK.sound.play('coin'); paint(); setTimeout(() => res(true), 900); return; }
              tries++; PK.sound.play('error'); PK.fx.shake(area.querySelector('[data-slots]'));
              if (tries >= 2) { t.stop(); area.querySelector('[data-slots]').innerHTML = word.split('').map(ch => `<span class="wd-slot on reveal">${ch}</span>`).join(''); area.querySelector('.sil').classList.add('show'); setTimeout(() => res(false), 1400); return; }
              typed = typed.filter(x => x.fixed); used = new Set(hint ? [letters.findIndex(l => l.ch === word[0])] : []);
            }
            paint();
          });
        };
        area.querySelector('[data-undo]').onclick = () => { const x = typed[typed.length - 1]; if (x && !x.fixed) { typed.pop(); used.delete(x.k); paint(); } };
        paint();
      });
      if (solved) ok++;
      if (ok >= 3 || ok + (words.length - w - 1) < 3) break;
    }
    return ok >= 3;
  }

  // ---------- Un reto completo ----------
  async function challenge(kind, area, diff, c) {
    switch (kind) {
      case 'calculo': return quiz(area, { questions: genCalc(diff), need: diff === 'facil' ? 3 : 4, perQ: { facil: 22, normal: 16, dificil: 14 }[diff] || 16 });
      case 'logica': return quiz(area, { questions: genLogic(diff), need: 3, perQ: { facil: 28, normal: 24, dificil: 22 }[diff] || 24 });
      case 'silueta': return quiz(area, { questions: genSilhouettes(diff), need: diff === 'facil' ? 3 : 4, perQ: 15, optCls: 'names' });
      case 'tipos': return quiz(area, { questions: genTypes(diff), need: 3, perQ: 20, optCls: 'types' });
      case 'memoria': return memoria(area, diff, c);
      case 'puzle': return puzle(area, diff, c);
      case 'palabras': return palabras(area, diff);
      default: return quiz(area, { questions: genCalc(diff), need: 4, perQ: 16 });
    }
  }
  // Tres retos distintos: siempre uno de cálculo y dos al azar.
  const pickKinds = (n = 3) => n === 1 ? [PK.rand(Object.keys(PK.CHALLENGES))] : ['calculo', ...PK.shuffle(Object.keys(PK.CHALLENGES).filter(k => k !== 'calculo')).slice(0, n - 1)].sort(() => Math.random() - 0.5);

  // Abre la misión. Devuelve { won, passed, total }.
  function run({ child, rescue = false }) {
    return new Promise(async resolve => {
      const c = child;
      const diff = c.difficulty || 'normal';
      const kinds = pickKinds(rescue ? 1 : 3);
      const need = rescue ? 1 : 2;
      PK.store.hold();
      const m = PK.ui.modal(`<div class="mission">
          <div class="m-bg">${PK.art.scene('rocket')}</div>
          <div class="m-top"><div class="m-rocket" data-rocket>${PK.rocketTrio ? PK.rocketTrio() : ''}</div><div class="m-bubble" data-bubble></div></div>
          <div class="m-prog" data-prog>${kinds.map(() => '<i></i>').join('')}</div>
          <div class="m-area" data-area></div>
        </div>`, { cls: 'mission-modal', closable: false });
      m.noEsc = true;
      const $ = s => m.body.querySelector(s);
      const bubble = $('[data-bubble]'), area = $('[data-area]');
      const say = (t) => { bubble.innerHTML = t; PK.fx.pop(bubble, .5); };
      PK.sound.play('rocket');
      say(rescue ? `¿Quieres recuperar a <b>${PK.esc(L.pname(c.stolen[0]))}</b>? ¡Tendrás que superar nuestra prueba!` : PK.rand(TAUNTS));
      area.innerHTML = `<div class="m-intro"><p>${rescue ? 'Supera <b>1 prueba</b> para rescatarlo.' : 'Supera <b>2 de las 3 pruebas</b> y el Team Rocket saldrá volando.<br>Si no, ¡se llevará uno de tus Pokémon!'}</p><button class="btn btn-primary btn-lg" data-go>¡Acepto el reto!</button></div>`;
      await new Promise(r => { $('[data-go]').onclick = () => { PK.sound.play('select'); r(); }; });
      let passed = 0;
      for (let i = 0; i < kinds.length; i++) {
        const k = PK.CHALLENGES[kinds[i]];
        say(`Prueba ${i + 1}: <b>${k.icon} ${k.name}</b>`);
        area.innerHTML = `<div class="m-intro"><div class="ch-ico">${k.icon}</div><h2>${k.name}</h2><p>${k.how}</p><button class="btn btn-primary btn-lg" data-go>¡Empezar!</button></div>`;
        await new Promise(r => { $('[data-go]').onclick = () => { PK.sound.play('select'); r(); }; });
        const ok = await challenge(kinds[i], area, diff, c);
        const dot = $('[data-prog]').children[i];
        dot.classList.add(ok ? 'ok' : 'ko');
        if (ok) { passed++; PK.sound.play('success'); say(PK.rand(['¡¿Qué?! ¡Lo ha conseguido!', '¡Grrr! ¡Ha superado la prueba!', '¡No puede ser!'])); }
        else { PK.sound.play('lose'); say(PK.rand(['¡Ja, ja, ja! ¡Esa prueba es nuestra!', '¡Muy lento, entrenador!', '¡Uno menos!'])); }
        area.innerHTML = `<div class="m-intro"><div class="ch-ico">${ok ? '✅' : '❌'}</div><h2>${ok ? '¡Prueba superada!' : 'Prueba fallada'}</h2></div>`;
        await wait(1300);
        if (passed >= need || passed + (kinds.length - i - 1) < need) break;
      }
      const won = passed >= need;
      PK.store.release();
      m.close();
      resolve({ won, passed, total: kinds.length });
    });
  }

  PK.missions = { run, challenge };
})();
