/* Pokemonyx · combates por turnos (entrenamientos, rondas del campeonato y líderes de gimnasio) */
(function () {
  'use strict';
  const L = PK.logic;
  const wait = ms => PK.fx.wait(ms);
  const st = x => L.stats(x.id, x.level);
  const maxHp = x => st(x).hp;
  const hpOf = x => Math.max(0, maxHp(x) - (x.dmg || 0));
  const nm = x => (x.uid ? L.pname(x) : PK.DEX[x.id].n);
  const tcol = t => (PK.TYPES[t] || PK.TYPES.normal).c;

  // Multiplicador de ataque de un rival: objeto equipado + fórmula por turnos (furia: +growth por turno desde el 4.º, con tope).
  function foeBoost(att, m, turn) {
    const b = att.boost; if (!b) return 1;
    let x = 1;
    const it = PK.RIVAL_ITEMS[b.item];
    if (it && (it.stat === 'all' || it.stat === (m.c === 'physical' ? 'phys' : 'spec'))) x *= it.m;
    if (b.growth) x *= Math.min(1 + b.growth * Math.max(0, turn - 3), b.cap || 1.5);
    return x;
  }
  // Objeto de combate del Pokémon del jugador (se marca para gastarlo al terminar el combate).
  function heldBoost(att, m) {
    const it = att.held && PK.item(att.held); if (!it || !it.held) return 1;
    const e = PK.RIVAL_ITEMS[it.held]; if (!e) return 1;
    if (e.stat === 'all' || e.stat === (m.c === 'physical' ? 'phys' : 'spec')) { att._heldUsed = true; return e.m; }
    return 1;
  }
  function damage(att, def, moveId, mine, diff, turn = 0) {
    const m = PK.MOVES[moveId];
    const sa = st(att), sd = st(def);
    const phys = m.c === 'physical';
    const A = phys ? sa.atk : sa.spa;
    const D = phys ? sd.def : sd.spd;
    const base = Math.floor(Math.floor(Math.floor(2 * att.level / 5 + 2) * m.p * A / D) / 50) + 2;
    const stab = PK.DEX[att.id].t.includes(m.t) ? 1.5 : 1;
    const eff = PK.eff(m.t, PK.DEX[def.id].t);
    const crit = Math.random() < 1 / 16;
    let mult = stab * eff * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15);
    mult *= mine ? (1 + (att.amistad || 0) / 500) * heldBoost(att, m) : diff.dmg * foeBoost(att, m, turn);
    return { dmg: eff === 0 ? 0 : Math.max(1, Math.floor(base * mult)), eff, crit };
  }
  function estimate(att, def, moveId, mine, diff, turn = 0) {
    const m = PK.MOVES[moveId]; const sa = st(att), sd = st(def);
    const phys = m.c === 'physical';
    const base = Math.floor(Math.floor(Math.floor(2 * att.level / 5 + 2) * m.p * (phys ? sa.atk : sa.spa) / (phys ? sd.def : sd.spd)) / 50) + 2;
    const eff = PK.eff(m.t, PK.DEX[def.id].t);
    if (eff === 0) return 0;
    const mult = (PK.DEX[att.id].t.includes(m.t) ? 1.5 : 1) * eff * 0.925 * (mine ? 1 + (att.amistad || 0) / 500 : diff.dmg * foeBoost(att, m, turn));
    return Math.max(1, Math.round(base * mult));
  }
  const effHint = e => e === 0 ? ['🚫', 'No le afecta'] : e >= 2 ? ['💥', '¡Muy eficaz!'] : e < 1 ? ['🛡️', 'Poco eficaz'] : ['', ''];

  function pickFoeMove(foe, target, diff) {
    const all = L.moves(foe.id, foe.level);
    // Solo ataques que sí afectan al objetivo (si ninguno afecta, usa cualquiera).
    const moves = all.filter(id => PK.eff(PK.MOVES[id].t, PK.DEX[target.id].t) > 0);
    const pool = moves.length ? moves : all;
    if (Math.random() < 0.3 || diff.lv < 0 && Math.random() < 0.3) return PK.rand(pool);
    let best = pool[0], bv = -1;
    for (const id of pool) {
      const m = PK.MOVES[id];
      const v = m.p * PK.eff(m.t, PK.DEX[target.id].t) * (PK.DEX[foe.id].t.includes(m.t) ? 1.5 : 1);
      if (v > bv) { bv = v; best = id; }
    }
    return best;
  }

  // Abre un combate. Devuelve una promesa con el resultado.
  function start(o) { return new Promise(res => run(o, res)); }

  async function run(o, resolve) {
    const c = o.child;
    const diff = PK.DIFFICULTY[c.difficulty] || PK.DIFFICULTY.normal;
    const team = (o.team && o.team.length ? o.team : [c.active]).map(uid => L.mon(c, uid)).filter(Boolean);
    const foes = o.foe.team.map(f => ({ id: f.id, level: f.level, dmg: 0, amistad: 0, boost: f.boost }));
    // Se precargan las imágenes de todos los rivales: así el segundo aparece al momento cuando sale.
    foes.forEach(f => { const im = new Image(); im.src = PK.URL.art(f.id); });
    const wild = o.foe.kind === 'salvaje';
    let mi = Math.max(0, team.findIndex(p => hpOf(p) > 0));
    let fi = 0;
    let turn = 0; // turno en curso (lo usan las fórmulas de los rivales)
    const out = { won: false, ran: false, forfeit: false, xp: 0, levelUps: [] };
    PK.store.hold();

    const m = PK.ui.modal(`<div class="battle ${o.scene === 'gimnasio' ? 'in-gym' : ''}">
        <div class="b-bg">${o.bg ? PK.art.photo({ src: o.bg, region: o.region || 'kanto', y: 45 }, { weather: 'sol', night: false }) : PK.art.scene(o.scene || 'kanto', o.sceneOpts || {})}</div>
        <div class="b-turn" data-turn hidden></div>
        <div class="b-side-foe">
          <div class="b-hud foe" data-fhud hidden><div class="hud-top"><b data-fname></b><span class="lv" data-flv></span></div><div data-fbar></div><div class="hud-hp" data-fhp></div><div class="b-balls" data-fballs></div><div class="foe-moves" data-fmoves></div></div>
          <div class="b-spot foe"><span class="b-plat"></span><div class="b-mon" data-fmon></div></div>
        </div>
        <div class="b-side-me">
          <div class="b-hud me" data-mhud hidden><div class="hud-top"><b data-mname></b><span class="lv" data-mlv></span></div><div data-mbar></div><div class="hud-hp" data-mhp></div><div data-mxp></div><div class="b-balls" data-mballs></div></div>
          <div class="b-spot me"><span class="b-plat"></span><div class="b-mon" data-mmon></div></div>
        </div>
        <div class="b-trainer foe" data-ftr></div>
        <div class="b-trainer me" data-mtr></div>
        <div class="b-panel"><div class="b-msg" data-msg aria-live="polite"></div><div class="b-acts" data-acts hidden></div></div>
        <button class="b-quit" data-quit aria-label="${wild ? 'Huir' : 'Rendirse'}">${wild ? '🏃' : '🏳️'}</button>
      </div>`, { cls: 'battle-modal', closable: false });
    m.noEsc = true;
    const $ = s => m.body.querySelector(s);
    const msgEl = $('[data-msg]'), acts = $('[data-acts]');
    let tapResolve = null;
    m.body.querySelector('.b-panel').addEventListener('pointerdown', () => { if (tapResolve) { const r = tapResolve; tapResolve = null; r(); } });
    const say = (txt, ms = 1100) => { msgEl.innerHTML = txt; return Promise.race([wait(ms), new Promise(r => { tapResolve = r; })]); };
    let quitting = false;
    $('[data-quit]').onclick = async () => {
      if (quitting) return;
      if (wild) { quitting = true; out.ran = true; return; }
      if (await PK.ui.confirm('¿Rendirse en este combate?', { icon: '🏳️', ok: 'Rendirse', detail: 'Contará como combate perdido.' })) { quitting = true; out.forfeit = true; }
    };

    const fMon = $('[data-fmon]'), mMon = $('[data-mmon]');
    const balls = (arr, el) => { el.innerHTML = arr.map(x => `<i class="${hpOf(x) > 0 ? '' : 'out'}"></i>`).join(''); };
    function paintFoe(anim = false) {
      const f = foes[fi];
      $('[data-fhud]').hidden = false;
      $('[data-fname]').textContent = PK.DEX[f.id].n;
      $('[data-flv]').textContent = `Nv. ${f.level}`;
      $('[data-fbar]').innerHTML = PK.art.bar(hpOf(f), maxHp(f), 'hp');
      $('[data-fhp]').textContent = `${hpOf(f)} / ${maxHp(f)} PS`;
      balls(foes, $('[data-fballs]'));
      paintFoeMoves();
      if (anim) { fMon.innerHTML = PK.art.mon(f.id, 'b-art foe'); L.see(c, f.id); }
    }
    function paintFoeMoves() {
      const f = foes[fi], p = team[mi]; if (!f || !p) return;
      $('[data-fmoves]').innerHTML = `<small>Sus ataques contra ${PK.esc(nm(p))}:</small>` + L.moves(f.id, f.level).map(id => { const mv = PK.MOVES[id]; const dmg = estimate(f, p, id, false, diff, turn); return `<span class="fm" style="--tc:${tcol(mv.t)}">${PK.TYPES[mv.t].e} ${PK.esc(mv.n)} <b>${dmg ? '≈ ' + dmg + ' PS' : 'no afecta'}</b></span>`; }).join('');
    }
    function paintMe(anim = false) {
      const p = team[mi];
      $('[data-mhud]').hidden = false;
      $('[data-mname]').textContent = L.pname(p);
      $('[data-mlv]').textContent = `Nv. ${p.level}`;
      $('[data-mbar]').innerHTML = PK.art.bar(hpOf(p), maxHp(p), 'hp');
      $('[data-mhp]').textContent = `${hpOf(p)} / ${maxHp(p)} PS`;
      $('[data-mxp]').innerHTML = PK.art.bar(p.xp, L.xpNeed(p.level), 'xp');
      balls(team, $('[data-mballs]'));
      if (anim) mMon.innerHTML = PK.art.mon(p.id, 'b-art me');
      if ($('[data-fhud]') && !$('[data-fhud]').hidden) paintFoeMoves();
    }
    const setHp = (who, x) => {
      const bar = $(who === 'me' ? '[data-mbar] .bar' : '[data-fbar] .bar');
      if (!bar) return;
      const pct = PK.clamp(hpOf(x) / maxHp(x) * 100, 0, 100);
      bar.querySelector('i').style.width = pct + '%';
      bar.classList.remove('ok', 'mid', 'low'); bar.classList.add(pct > 50 ? 'ok' : pct > 20 ? 'mid' : 'low');
      $(who === 'me' ? '[data-mhp]' : '[data-fhp]').textContent = `${hpOf(x)} / ${maxHp(x)} PS`;
    };
    const enter = (el, from) => el.animate([{ transform: `translateX(${from}) scale(.6)`, opacity: 0 }, { transform: 'translateX(0) scale(1)', opacity: 1 }], { duration: PK.fx.reduce ? 1 : 520, easing: 'cubic-bezier(.34,1.4,.64,1)' });
    const lunge = (el, dx, dy) => el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px) scale(1.08)` }, { transform: 'translate(0,0)' }], { duration: PK.fx.reduce ? 1 : 360, easing: 'ease-in-out' });
    // Los entrenadores se apartan al sacar a su Pokémon (y se ocultan del todo aunque la animación no termine).
    const hideTr = sel => { const t = $(sel); t.classList.add('gone'); setTimeout(() => { if (t.classList.contains('gone')) t.hidden = true; }, 600); };
    const blink = el => el.animate([{ opacity: 1 }, { opacity: .15 }, { opacity: 1 }, { opacity: .15 }, { opacity: 1 }], { duration: 420 });

    // ----- Presentación -----
    PK.sound.play('battle');
    if (!wild) {
      const vs = PK.h(`<div class="vs-splash"><div class="vs-side me">${PK.art.trainer(c.trainer)}<b>${PK.esc(c.name)}</b></div><div class="vs-side foe">${PK.art.trainer(o.foe.char)}<b>${PK.esc(o.foe.name)}</b></div><div class="vs-txt">VS</div></div>`);
      m.body.querySelector('.battle').appendChild(vs);
      await wait(1700);
      vs.classList.add('out'); setTimeout(() => vs.remove(), 400);
      $('[data-ftr]').innerHTML = PK.art.trainer(o.foe.char);
      await say(o.foe.kind === 'lider' ? `¡${PK.esc(o.foe.name)}, líder del gimnasio, te desafía!` : `¡${PK.esc(o.foe.name)} quiere luchar!`, 1500);
      hideTr('[data-ftr]');
      paintFoe(true); enter(fMon, '60%');
      PK.sound.cry(foes[fi].id, 0.25);
      await say(`¡${PK.esc(o.foe.name)} sacó a ${PK.esc(nm(foes[fi]))}!`);
    } else {
      paintFoe(true); enter(fMon, '60%');
      PK.sound.cry(foes[fi].id, 0.25);
      await say(`¡Un ${PK.esc(nm(foes[fi]))} salvaje apareció!`, 1300);
    }
    $('[data-mtr]').innerHTML = PK.art.trainer(c.trainer);
    await wait(200);
    hideTr('[data-mtr]');
    paintMe(true); enter(mMon, '-60%');
    PK.sound.cry(team[mi].id, 0.3);
    await say(`¡Adelante, ${PK.esc(nm(team[mi]))}!`, 900);

    // ----- Turnos -----
    const choose = () => new Promise(res => {
      const p = team[mi]; const f = foes[fi];
      const moves = L.moves(p.id, p.level);
      acts.innerHTML = `<div class="b-moves">${moves.map(id => {
        const mv = PK.MOVES[id]; const [ico, txt] = effHint(PK.eff(mv.t, PK.DEX[f.id].t));
        const dmg = estimate(p, f, id, true, diff);
        return `<button class="b-move" data-move="${id}" style="--tc:${tcol(mv.t)}"><b>${PK.esc(mv.n)}</b><small>${PK.TYPES[mv.t].e} ${PK.esc(PK.typeName(mv.t))} · ${dmg ? '≈ ' + dmg + ' PS de daño' : 'no le afecta'}</small>${ico ? `<em title="${txt}">${ico} ${txt}</em>` : ''}</button>`;
      }).join('')}</div>
        <div class="b-side">
          <div class="b-team">${team.map((x, i) => `<button class="bt ${i === mi ? 'on' : ''} ${hpOf(x) > 0 ? '' : 'ko'}" data-swi="${i}" ${i === mi || hpOf(x) <= 0 ? 'disabled' : ''} aria-label="Sacar a ${PK.esc(nm(x))}">${PK.art.mon(x.id)}<i style="width:${PK.clamp(hpOf(x) / maxHp(x) * 100, 0, 100)}%"></i></button>`).join('')}</div>
          <button class="btn btn-ghost btn-sm" data-bag>🎒 Mochila</button><button class="btn btn-ghost btn-sm" data-sw ${team.filter(x => x !== p && hpOf(x) > 0).length ? '' : 'disabled'}>🔄 Cambiar</button>
        </div>`;
      acts.hidden = false;
      msgEl.innerHTML = `¿Qué hará <b>${PK.esc(nm(p))}</b>?`;
      const done = v => { acts.hidden = true; clearInterval(qi); res(v); };
      const qi = setInterval(() => { if (quitting) done({ quit: true }); }, 200);
      acts.querySelectorAll('[data-move]').forEach(b => b.onclick = () => { PK.sound.play('select'); done({ move: b.dataset.move }); });
      acts.querySelector('[data-bag]').onclick = () => { PK.sound.play('tap'); bagMenu().then(v => { if (v) done(v); }); };
      acts.querySelectorAll('[data-swi]').forEach(b => b.onclick = () => { PK.sound.play('select'); done({ sw: Number(b.dataset.swi) }); });
      const sw = acts.querySelector('[data-sw]');
      if (sw) sw.onclick = () => { PK.sound.play('tap'); switchMenu(false).then(v => { if (v != null) done({ sw: v }); }); };
    });
    const bagMenu = () => new Promise(res => {
      const p = team[mi];
      let picked = null;
      // Curación y objetos de combate (estos últimos se equipan en el Pokémon activo y cuentan como turno).
      const items = Object.entries(c.bag).filter(([id, n]) => n > 0 && PK.item(id) && (PK.item(id).heal || PK.item(id).revive || PK.item(id).held));
      const sh = PK.ui.sheet('🎒 Mochila', items.length ? `<div class="bag-list">${items.map(([id, n]) => `<button class="bag-row" data-it="${id}">${PK.art.item(id)}<b>${PK.esc(PK.itemName(id))}</b><small>${PK.esc(PK.item(id).txt)}${PK.item(id).held ? `<br>Para ${PK.esc(nm(p))}${p.held ? ' (ya lleva un objeto)' : ''}` : ''}</small><span class="qty">×${n}</span></button>`).join('')}</div>` : '<p class="muted center">No tienes objetos. Cómpralos en la Tienda con energía ⚡.</p>', { onClose: () => res(picked) });
      sh.body.querySelectorAll('[data-it]').forEach(b => b.onclick = () => {
        const it = PK.item(b.dataset.it);
        if (it.held) {
          if (p.held || hpOf(p) <= 0) { PK.ui.toast(p.held ? `${PK.esc(nm(p))} ya lleva un objeto` : `${PK.esc(nm(p))} está debilitado`, 'warn'); return; }
          picked = { item: b.dataset.it, target: p }; sh.close(); return;
        }
        const target = it.revive ? team.find(x => hpOf(x) <= 0) : p;
        if (!target || (it.revive ? hpOf(target) > 0 : hpOf(target) >= maxHp(target))) { PK.ui.toast(it.revive ? 'No hay ningún Pokémon debilitado' : `${PK.esc(nm(p))} tiene los PS al máximo`, 'warn'); return; }
        picked = { item: b.dataset.it, target }; sh.close();
      });
    });
    const switchMenu = forced => new Promise(res => {
      let picked = null;
      const opts = team.map((x, i) => ({ x, i })).filter(({ x, i }) => i !== mi && hpOf(x) > 0);
      const sh = PK.ui.sheet(forced ? '¿Qué Pokémon sacas?' : '🔄 Cambiar de Pokémon', `<div class="sw-list">${opts.map(({ x, i }) => `<button class="sw-row" data-i="${i}">${PK.art.mon(x.id, 'sw-art')}<b>${PK.esc(nm(x))}</b><small>Nv. ${x.level} · ${hpOf(x)}/${maxHp(x)} PS</small></button>`).join('')}</div>`, { onClose: () => res(picked != null ? picked : (forced ? opts[0].i : null)) });
      sh.body.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { picked = Number(b.dataset.i); sh.close(); });
    });

    async function doSwitch(i) {
      await say(`¡${PK.esc(nm(team[mi]))}, vuelve!`, 700);
      mMon.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.3)' }], { duration: 300, fill: 'forwards' });
      await wait(320);
      // Quitar la animación de «vuelve» (fill forwards, opacidad 0) antes de entrar; si no, el nuevo Pokémon se queda invisible.
      mMon.getAnimations().forEach(a => a.cancel());
      mi = i; paintMe(true); enter(mMon, '-60%');
      PK.sound.cry(team[mi].id, 0.3);
      await say(`¡Adelante, ${PK.esc(nm(team[mi]))}!`, 900);
    }

    async function attack(att, def, moveId, mine) {
      const mv = PK.MOVES[moveId];
      const aEl = mine ? mMon : fMon, dEl = mine ? fMon : mMon;
      const who = mine ? PK.esc(nm(att)) : `${PK.esc(nm(att))} ${wild ? 'salvaje' : 'rival'}`;
      await say(`¡${who} usó <b style="color:${tcol(mv.t)}">${PK.esc(mv.n)}</b>!`, 700);
      lunge(aEl, mine ? 60 : -60, mine ? -30 : 30);
      await wait(260);
      if (Math.random() * 100 >= Math.max(mv.a, 80)) { PK.sound.play('miss'); await say(`¡Pero ${mine ? 'ha fallado' : 'falló'}!`, 900); return; }
      const r = damage(att, def, moveId, mine, diff, turn);
      if (r.eff === 0) { await say(`No afecta a ${PK.esc(nm(def))}…`, 1000); return; }
      const [x, y] = PK.fx.center(dEl);
      PK.fx.burst(x, y, [PK.TYPES[mv.t].e], r.eff >= 2 ? 12 : 7, { dist: 40 });
      PK.sound.play(r.crit || r.eff >= 2 ? 'crit' : 'hit');
      blink(dEl); PK.fx.shake(dEl);
      if (r.eff >= 2) PK.fx.flash('#fff');
      let dmg = r.dmg;
      // La amistad: a veces aguanta el golpe con 1 PS (como en los juegos).
      if (!mine && hpOf(def) - dmg <= 0 && hpOf(def) > 1 && (def.amistad || 0) >= 70 && Math.random() < 0.25) { dmg = hpOf(def) - 1; def._endured = true; }
      def.dmg = (def.dmg || 0) + Math.min(dmg, hpOf(def));
      setHp(mine ? 'foe' : 'me', def);
      PK.fx.floatText(x, y - 30, `-${dmg}`, 'bad');
      await wait(500);
      if (r.crit) await say('¡Un golpe crítico!', 800);
      if (r.eff >= 2) await say('¡Es muy eficaz!', 900);
      else if (r.eff < 1) await say('No es muy eficaz…', 900);
      if (def._endured) { def._endured = false; await say(`¡${PK.esc(nm(def))} aguantó el golpe para no preocuparte! 💛`, 1500); }
    }

    async function foeFainted() {
      const f = foes[fi];
      PK.sound.play('faint');
      fMon.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(50px)', opacity: 0 }], { duration: 500, fill: 'forwards' });
      await say(`¡${PK.esc(nm(f))} ${wild ? 'salvaje ' : 'rival '}se debilitó!`, 1100);
      balls(foes, $('[data-fballs]'));
      const p = team[mi];
      const mult = wild ? 1 : o.foe.kind === 'lider' ? 2 : 1.5;
      const xp = L.xpFor(f.id, f.level, mult);
      out.xp += xp;
      await say(`${PK.esc(nm(p))} ganó <b>${xp}</b> puntos de experiencia.`, 1100);
      const g = L.gainXp(c, p, xp);
      $('[data-mxp]').innerHTML = PK.art.bar(p.xp, L.xpNeed(p.level), 'xp');
      for (const lv of g.levels) {
        PK.sound.play('levelup');
        const [x, y] = PK.fx.center(mMon); PK.fx.burst(x, y, ['⬆️', '✨'], 8);
        paintMe(false);
        await say(`¡${PK.esc(nm(p))} subió al nivel <b>${lv}</b>!`, 1200);
      }
      for (const mvId of g.learned) await say(`¡${PK.esc(nm(p))} aprendió <b>${PK.esc(PK.MOVES[mvId].n)}</b>!`, 1200);
      if (g.levels.length) out.levelUps.push({ uid: p.uid, levels: g.levels });
    }

    // ----- Bucle del combate -----
    let result = null;
    const turnEl = $('[data-turn]');
    while (!result) {
      const p = team[mi], f = foes[fi];
      turn++; turnEl.hidden = false; turnEl.textContent = `Turno ${turn}`;
      const ch = await choose();
      if (ch.quit || quitting) { result = wild ? 'ran' : 'lose'; break; }
      let myMove = null;
      if (ch.sw != null) await doSwitch(ch.sw);
      else if (ch.item) {
        const r = L.useItem(c, ch.item, ch.target);
        if (r) {
          PK.sound.play('heal');
          await say(r.equipped ? `${PK.esc(nm(ch.target))} lleva ${PK.esc(PK.itemName(ch.item))} para este combate.` : r.revived ? `¡${PK.esc(nm(ch.target))} se ha recuperado!` : `${PK.esc(nm(ch.target))} recuperó PS con ${PK.esc(PK.itemName(ch.item))}.`, 1100);
          paintMe(false);
        }
      } else myMove = ch.move;
      const me = team[mi];
      const foeMove = pickFoeMove(f, me, diff);
      // Cada Pokémon ataca una vez por turno: primero el tuyo y después el del rival.
      const order = myMove ? ['me', 'foe'] : ['foe'];
      for (const side of order) {
        if (hpOf(team[mi]) <= 0 || hpOf(foes[fi]) <= 0) break;
        if (side === 'me') await attack(team[mi], foes[fi], myMove, true);
        else await attack(foes[fi], team[mi], foeMove, false);
      }
      PK.store.save();
      // ¿Alguien se ha debilitado?
      if (hpOf(foes[fi]) <= 0) {
        await foeFainted();
        const next = foes.findIndex(x => hpOf(x) > 0);
        if (next < 0) { result = 'win'; break; }
        fi = next; fMon.getAnimations().forEach(a => a.cancel()); // quita el «desmayo» del anterior rival (opacidad 0)
        paintFoe(true); enter(fMon, '60%');
        PK.sound.cry(foes[fi].id, 0.25);
        await say(`¡${PK.esc(o.foe.name)} sacó a ${PK.esc(nm(foes[fi]))}!`);
      }
      if (hpOf(team[mi]) <= 0) {
        PK.sound.play('faint');
        mMon.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(50px)', opacity: 0 }], { duration: 500, fill: 'forwards' });
        await say(`¡${PK.esc(nm(team[mi]))} se debilitó!`, 1100);
        balls(team, $('[data-mballs]'));
        if (!team.some(x => hpOf(x) > 0)) { result = 'lose'; break; }
        const i = await switchMenu(true);
        mMon.getAnimations().forEach(a => a.cancel()); // quita el «desmayo» (opacidad 0) antes de sacar al siguiente
        mi = i; paintMe(true); enter(mMon, '-60%');
        PK.sound.cry(team[mi].id, 0.3);
        await say(`¡Adelante, ${PK.esc(nm(team[mi]))}!`, 900);
      }
    }

    // ----- Final -----
    if (result === 'win') {
      out.won = true;
      PK.sound.play('win'); PK.fx.confetti(60);
      if (!wild) { const t = $('[data-ftr]'); t.hidden = false; t.classList.remove('gone'); }
      await say(wild ? '¡Has ganado el combate!' : `¡Has vencido a ${PK.esc(o.foe.name)}!`, 1600);
    } else if (result === 'ran') {
      await say('¡Escapaste sin problemas!', 1000);
    } else {
      out.won = false;
      PK.sound.play('lose');
      await say(out.forfeit ? 'Te has rendido. ¡La próxima vez saldrá mejor!' : 'No te quedan Pokémon en pie… ¡A descansar y a intentarlo otra vez!', 1800);
    }
    // Los objetos de combate se gastan al terminar, si el Pokémon llegó a usarlos.
    team.forEach(p => { if (p._heldUsed) delete p.held; delete p._heldUsed; });
    PK.store.save();
    PK.store.release();
    m.close();
    resolve(out);
  }

  PK.battle = { start };
})();
