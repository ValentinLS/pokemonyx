/* Pokemonyx · pantallas de los niños: portada, entrenador, primer Pokémon, base, cuidados, tienda,
   entrenamiento, campeonato semanal, Team Rocket, Pokédex, mensajes y evoluciones */
(function () {
  'use strict';
  const L = PK.logic;
  const S = () => PK.store.s;
  const save = () => PK.store.save();
  const app = () => document.getElementById('app');
  const esc = PK.esc;
  let cur = null;          // { id } del niño en pantalla
  let tipTimer = null;

  const hearts = v => { const n = Math.round(PK.clamp(v, 0, 100) / 20); return `<span class="hearts" aria-label="Amistad ${v} de 100">${'💛'.repeat(n)}${'🤍'.repeat(5 - n)}</span>`; };
  const energyChip = c => `<span class="chip energy" data-energy>⚡ <b>${c.energy}</b></span>`;
  const leaveTimers = () => { clearInterval(tipTimer); tipTimer = null; };

  // ======================= Portada =======================
  function home() {
    leaveTimers(); cur = null; PK.ui.closeAll();
    const kids = S().children;
    const ld = L.weekLeader(); const sc = L.scenario();
    const pending = L.pendingTotal();
    app().innerHTML = `<div class="screen home">
        <div class="home-bg">${PK.art.photo(sc.fondo, { weather: sc.weather })}</div>
        <header class="home-head">
          <h1 class="logo">Pokemonyx</h1>
          <p class="home-sub">Semana ${L.weekNumber()} de 52: gimnasio de <b>${esc(ld.name)}</b> ${PK.art.type(ld.type)} · Escenario ${sc.n} de 365: ${esc(sc.fondo.place)}</p>
        </header>
        ${kids.length ? `<div class="profiles">${kids.map(profileCard).join('')}</div>` : welcome()}
        <footer class="home-foot">
          <button class="btn btn-ghost" data-parents>🔒 Papá y mamá${pending ? `<i class="badge">${pending}</i>` : ''}</button>
          ${PK.testMode ? `<span class="chip warn">🧪 Modo prueba: ${esc(PK.fmtLong(PK.dayKey()))}</span>` : ''}
          ${PK.store.memoryOnly ? '<span class="chip warn">⚠️ Este navegador no guarda la partida</span>' : ''}
          ${!PK.store.server && /^https?:$/.test(location.protocol) ? '<span class="chip warn">⚠️ Sin conexión con el PC: se guarda solo aquí</span>' : ''}
        </footer>
      </div>`;
    app().querySelector('[data-parents]').onclick = () => { PK.sound.play('tap'); PK.parent.open(); };
    const setup = app().querySelector('[data-setup]');
    if (setup) setup.onclick = () => { PK.sound.play('tap'); PK.parent.open(); };
    app().querySelectorAll('[data-kid]').forEach(b => b.onclick = () => { PK.sound.play('select'); open(b.dataset.kid); });
  }
  function profileCard(c) {
    const p = L.active(c);
    const medals = Object.keys(c.badges).length;
    const rocket = L.rocketAvailable(c);
    return `<button class="profile" data-kid="${c.id}" style="--c:${c.color}">
        <div class="pf-art">${p ? PK.art.mon(p.id, 'pf-mon') : '<span class="pf-ball">❔</span>'}${c.trainer ? PK.art.trainer(c.trainer, 'pf-trainer') : ''}</div>
        <b class="pf-name">${esc(c.name)}</b>
        <span class="pf-info">⚡ ${c.energy} · 🏅 ${medals} · 📕 ${c.pokemon.length}</span>
        ${rocket ? '<span class="pf-alert">🚀 ¡Team Rocket!</span>' : ''}
        ${!c.trainer ? '<span class="pf-new">¡Empieza tu aventura!</span>' : ''}
      </button>`;
  }
  function welcome() {
    return `<section class="welcome">
        <div class="w-art">${PK.art.trainer('oak', 'w-oak')}${PK.art.mon(25, 'w-mon')}</div>
        <h2>¡Bienvenidos a Pokemonyx!</h2>
        <p>Cada niño elige su <b>entrenador</b> y su <b>primer Pokémon</b>. Haciendo las tareas de casa consigue <b>energía ⚡</b> para cuidar, entrenar y combatir.
        Cada fin de semana hay <b>campeonato</b> contra un líder de gimnasio… y entre semana, ¡cuidado con el <b>Team Rocket</b>!</p>
        <button class="btn btn-primary btn-lg" data-setup>👨‍👩‍👧‍👦 Empezar (papá o mamá)</button>
      </section>`;
  }

  // ======================= Entrada de un niño =======================
  function open(id) {
    const c = L.child(id); if (!c) return home();
    cur = { id };
    L.tick(c);
    L.checkBirthday(c);
    L.weekChest(c);
    if (!c.trainer) return chooseTrainer(c);
    if (!c.pokemon.length && !c.stolen.length) return chooseStarter(c);
    main(c);
  }
  const child = () => (cur ? L.child(cur.id) : null);
  function refresh() {
    const c = child();
    if (!c) return home();
    if (app().querySelector('.base')) main(c, true);
  }

  // ----- Elegir entrenador -----
  function chooseTrainer(c, again = false) {
    leaveTimers();
    let pick = c.trainer || null;
    app().innerHTML = `<div class="screen onboard">
        <div class="home-bg">${PK.art.photo(PK.FONDOS[0], { night: false })}</div>
        <div class="ob-box">
          <div class="oak-talk">${PK.art.trainer('oak', 'oak')}<div class="speech">¡Hola, <b>${esc(c.name)}</b>! Soy el Profesor Oak. ${c.newTrainers ? '¡Ahora los entrenadores tienen el dibujo de la serie! Elige otra vez <b>qué entrenador quieres ser</b>.' : again ? '¿Quieres cambiar de entrenador?' : 'Antes de empezar tu aventura Pokémon, dime: <b>¿qué entrenador quieres ser?</b>'}</div></div>
          <div class="av-grid">${PK.AVATARS.map(a => `<button class="av ${a.id === pick ? 'on' : ''}" data-av="${a.id}">${PK.art.trainer(a.id)}<span>${esc(a.name)}</span></button>`).join('')}</div>
          <div class="row-btns"><button class="btn btn-ghost" data-back>← Volver</button><button class="btn btn-primary btn-lg" data-ok ${pick ? '' : 'disabled'}>¡Este soy yo!</button></div>
        </div>
      </div>`;
    const ok = app().querySelector('[data-ok]');
    app().querySelectorAll('[data-av]').forEach(b => b.onclick = () => {
      pick = b.dataset.av; PK.sound.play('select');
      app().querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x === b));
      PK.fx.pop(b); ok.disabled = false;
    });
    app().querySelector('[data-back]').onclick = () => { PK.sound.play('tap'); again ? main(c) : home(); };
    ok.onclick = () => {
      c.trainer = pick; delete c.newTrainers; save(); PK.sound.play('success');
      if (!c.pokemon.length && !c.stolen.length) chooseStarter(c); else main(c);
    };
  }

  // ----- Elegir el primer Pokémon -----
  function chooseStarter(c) {
    leaveTimers();
    let region = 'kanto';
    const paint = () => {
      const group = PK.STARTERS.find(s => s.region === region);
      app().innerHTML = `<div class="screen onboard">
          <div class="home-bg">${PK.art.photo(PK.FONDOS.find(x => x.region === region) || PK.FONDOS[0], { night: false })}</div>
          <div class="ob-box wide">
            <div class="oak-talk">${PK.art.trainer('oak', 'oak')}<div class="speech">¡Genial, ${esc(PK.avatar(c.trainer).name)}! Ahora elige a tu <b>primer compañero Pokémon</b>. Hay de todas las regiones: ¡mira bien!</div></div>
            <div class="reg-tabs">${PK.STARTERS.map(s => `<button class="kchip ${s.region === region ? 'on' : ''}" data-reg="${s.region}">${s.region === 'especial' ? '⭐ Especiales' : esc(PK.region(s.region).name)}</button>`).join('')}</div>
            <div class="starter-row">${group.ids.map(id => `<button class="starter" data-id="${id}" style="--tc:${PK.TYPES[PK.DEX[id].t[0]].c}">${PK.art.mon(id, 'st-art')}<b>${esc(PK.DEX[id].n)}</b>${PK.art.types(id)}</button>`).join('')}</div>
            <div class="row-btns"><button class="btn btn-ghost" data-back>← Cambiar de entrenador</button></div>
          </div>
        </div>`;
      app().querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { PK.sound.play('tap'); region = b.dataset.reg; paint(); });
      app().querySelectorAll('[data-id]').forEach(b => b.onclick = () => { PK.sound.play('select'); starterDetail(c, Number(b.dataset.id)); });
      app().querySelector('[data-back]').onclick = () => chooseTrainer(c);
    };
    paint();
  }
  function starterDetail(c, id) {
    const d = PK.DEX[id];
    PK.sound.cry(id);
    const m = PK.ui.modal(`<div class="mon-detail" style="--tc:${PK.TYPES[d.t[0]].c}">
        <div class="md-art">${PK.art.mon(id, 'md-img')}</div>
        <h2>${esc(d.n)}</h2><p class="muted">${esc(d.g)}</p>${PK.art.types(id)}
        <label class="field"><span>¿Le pones un mote? (opcional)</span><input class="input" data-nick maxlength="12" placeholder="${esc(d.n)}"></label>
        <div class="row-btns"><button class="btn btn-ghost" data-no>Ver otros</button><button class="btn btn-primary btn-lg" data-yes>¡Te elijo a ti!</button></div>
      </div>`, { cls: 'wide' });
    m.body.querySelector('[data-no]').onclick = () => m.close();
    m.body.querySelector('[data-yes]').onclick = async () => {
      const nick = m.body.querySelector('[data-nick]').value.trim();
      m.close();
      const p = L.addPokemon(c, id, 5, 'inicial');
      if (nick) p.nick = nick;
      c.active = p.uid;
      c.bag.potion = (c.bag.potion || 0) + 3;
      c.bag['oran-berry'] = (c.bag['oran-berry'] || 0) + 2;
      save();
      PK.sound.play('evolve'); PK.fx.confetti(80);
      await new Promise(res => {
        const w = PK.ui.modal(`<div class="celebrate"><div class="cel-art">${PK.art.trainer(c.trainer, 'cel-trainer')}${PK.art.mon(id, 'cel-mon')}</div>
          <h2>¡${esc(L.pname(p))} y ${esc(c.name)} empiezan su aventura!</h2>
          <p>Para empezar te regalo <b>3 Pociones</b> y <b>2 Bayas Aranja</b>. Haz tus tareas para conseguir energía ⚡ y ¡a por las medallas!</p>
          <button class="btn btn-primary btn-lg" data-go>¡Vamos!</button></div>`, { onClose: res });
        w.body.querySelector('[data-go]').onclick = () => w.close();
      });
      main(c);
    };
  }

  // ======================= Base (pantalla principal) =======================
  function main(c, quiet = false) {
    leaveTimers();
    cur = { id: c.id };
    const p = L.active(c);
    const sc = L.scenario(); const spots = L.spots(c); const ex = L.exploreState(c);
    const found = spots.filter(x => ex.opened[x.id]).length;
    const odds = L.oddities(); const oddFound = odds.filter(o => ex.odd[o.i]).length;
    // Escenario pintado: los escondites son elementos del dibujo (sin pegatinas) y van con la capa encima.
    const painted = !!(sc.fondo.esc && sc.fondo.esc.length);
    const rec = L.day(c.id, PK.dayKey(), true);
    const left = rec && !rec.validated ? rec.tasks.filter(t => !rec.marked[t.id]).length : 0;
    const champOpen = L.champOpen() && !L.champ(c).won && L.champReady(c);
    app().innerHTML = `<div class="screen base" style="--c:${c.color}">
        <header class="kid-top">
          <button class="icon-btn" data-home aria-label="Volver al inicio">🏠</button>
          <button class="kid-chip" data-profile>${PK.art.trainer(c.trainer, 'kc-trainer')}<b>${esc(c.name)}</b></button>
          <span class="grow"></span>
          ${energyChip(c)}
          <button class="chip medals" data-medals>🏅 <b>${Object.keys(c.badges).length}</b></button>
          <button class="icon-btn" data-sound aria-label="Sonido">${S().settings.sound ? '🔊' : '🔇'}</button>
        </header>
        <div class="alerts">
          ${L.rocketAvailable(c) ? '<button class="alert rocket" data-rocket>🚀 ¡ALERTA! ¡El Team Rocket ha aparecido! <b>Toca para enfrentarte</b></button>' : ''}
          ${L.rescueAvailable(c) ? `<button class="alert rescue" data-rescue>🦸 ¡Rescata a ${esc(L.pname(c.stolen[0]))} del Team Rocket!</button>` : ''}
          ${c.stolen.length && !L.rescueAvailable(c) ? `<div class="alert info">😢 El Team Rocket tiene a ${esc(L.pname(c.stolen[0]))}. ${c.rescueTried === PK.dayKey() ? 'Mañana podrás intentarlo otra vez.' : 'Mañana podrás rescatarlo.'}</div>` : ''}
          ${champOpen ? `<button class="alert champ" data-goto="campeonato">🏆 ¡Hoy hay campeonato contra ${esc(L.weekLeader().name)}! <b>Toca para ir al estadio</b></button>` : ''}
        </div>
        <main class="stage">
          <div class="stage-bg">${PK.art.photo(sc.fondo, { weather: sc.weather, capa: painted })}</div>
          ${painted ? '<svg class="esc-layer" data-esclayer viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>' : ''}
          ${odds.length ? `<svg class="odd-layer" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${odds.map(o => `<circle class="odd ${ex.odd[o.i] ? 'found' : ''}" data-odd="${o.i}" cx="${(o.x * 19.2).toFixed(0)}" cy="${(o.y * 10.8).toFixed(0)}" r="${(o.r * 19.2).toFixed(0)}"/>`).join('')}</svg>` : ''}
          <div class="scene-tag">📍 ${esc(sc.fondo.place)} · ${esc(PK.region(sc.region).name)} · Escenario ${sc.n}/365 ${WEATHER[sc.weather] || ''} · 🔍 <span data-spotcount>${found}/${spots.length}</span>${odds.length ? ` · 🧐 <span data-oddcount>${oddFound}/${odds.length}</span> rarezas${oddFound < odds.length ? ` <button class="odd-hint" data-oddhint ${ex.hint ? 'disabled' : ''} aria-label="Pista">💡</button>` : ' ✅'}` : ''}</div>
          ${painted ? '' : `<div class="spots">${spots.map(sp => spotHtml(sp, ex.opened[sp.id])).join('')}</div>`}
          ${p ? `<div class="stage-trainer">${PK.art.trainer(c.trainer, 'st-trainer')}</div>
          <button class="stage-mon ${L.fainted(p) ? 'ko' : ''}" data-mon aria-label="Dar mimos a ${esc(L.pname(p))}">${PK.art.mon(p.id, 'stage-art')}<span class="stage-shadow"></span></button>
          <div class="bubble" data-bubble hidden></div>` : '<p class="stage-empty">El Team Rocket tiene a tu Pokémon… ¡rescátalo!</p>'}
        </main>
        ${p ? monCard(c, p) : ''}
        <div class="team-strip" role="list">${c.pokemon.map(x => `<button class="tm ${x.uid === c.active ? 'on' : ''} ${L.fainted(x) ? 'ko' : ''}" data-uid="${x.uid}" role="listitem" aria-label="${esc(L.pname(x))}">${PK.art.mon(x.id, 'tm-art')}<span class="tm-lv">${x.level}</span></button>`).join('')}</div>
        <nav class="kid-nav">
          <button class="nav-btn" data-goto="tareas" style="--b:#3fb950;--bd:#23843a"><span class="ni">📝</span>Tareas${left ? `<i class="badge">${left}</i>` : ''}</button>
          <button class="nav-btn" data-goto="cuidar" style="--b:#ff6fa3;--bd:#d43f78"><span class="ni">💖</span>Cuidar</button>
          <button class="nav-btn" data-goto="entrenar" style="--b:#ff8a1f;--bd:#cf6400"><span class="ni">⚔️</span>Entrenar</button>
          <button class="nav-btn" data-goto="tienda" style="--b:#2a75bb;--bd:#1a4f86"><span class="ni">🛒</span>Tienda</button>
          <button class="nav-btn" data-goto="campeonato" style="--b:#e3350d;--bd:#a82508"><span class="ni">🏆</span>Campeonato${champOpen ? '<i class="badge">!</i>' : ''}</button>
          <button class="nav-btn" data-goto="pokedex" style="--b:#7b4cd9;--bd:#5631a8"><span class="ni">📕</span>Pokédex</button>
        </nav>
      </div>`;
    const $ = s => app().querySelector(s);
    $('[data-home]').onclick = () => { PK.sound.play('tap'); home(); };
    $('[data-profile]').onclick = () => { PK.sound.play('tap'); profileSheet(c); };
    $('[data-medals]').onclick = () => { PK.sound.play('tap'); medalsSheet(c); };
    $('[data-sound]').onclick = e => { S().settings.sound = !S().settings.sound; save(); e.currentTarget.textContent = S().settings.sound ? '🔊' : '🔇'; PK.sound.play('pop'); };
    app().querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { PK.sound.play('tap'); go(c, b.dataset.goto); });
    app().querySelectorAll('[data-uid]').forEach(b => b.onclick = () => {
      if (b.dataset.uid === c.active) { monSheet(c, L.mon(c, b.dataset.uid)); return; }
      L.setActive(c, b.dataset.uid); PK.sound.play('select'); PK.sound.cry(L.mon(c, b.dataset.uid).id, 0.25); main(c, true);
      PK.fx.pop(app().querySelector('[data-mon]'));
    });
    app().querySelectorAll('[data-spot]').forEach(b => b.onclick = () => exploreSpot(c, spots.find(x => x.id === b.dataset.spot), b));
    app().querySelectorAll('[data-odd]').forEach(el => el.addEventListener('click', e => findOddity(c, Number(el.dataset.odd), el, e)));
    const oh = $('[data-oddhint]');
    if (oh) oh.onclick = () => {
      const o = L.useOddHint(c, scene.visibleOdd);
      oh.disabled = true;
      if (!o) return;
      PK.sound.play('pop');
      const el = app().querySelector(`[data-odd="${o.i}"]`);
      if (el) { el.classList.add('hint'); setTimeout(() => el.classList.remove('hint'), 3200); }
      PK.ui.toast('💡 ¡Mira donde brilla el círculo!', 'ok');
    };
    const rk = $('[data-rocket]'); if (rk) rk.onclick = () => rocketMission(c);
    const rs = $('[data-rescue]'); if (rs) rs.onclick = () => rescueMission(c);
    const mon = $('[data-mon]');
    if (mon) {
      mon.onclick = () => {
        const pp = L.active(c);
        if (L.fainted(pp)) { say('Estoy debilitado… llévame al Centro Pokémon 🏥'); PK.fx.shake(mon); return; }
        const [x, y] = PK.fx.center(mon);
        if (L.cuddle(c, pp)) {
          PK.fx.burst(x, y - 40, ['💛', '💖', '✨'], 7); PK.fx.pop(mon, 0.8); PK.sound.cry(pp.id, 0.3);
          const hc = app().querySelector('[data-hearts]'); if (hc) hc.innerHTML = hearts(pp.amistad);
        } else { say('¡Ya me has dado muchos mimos hoy! Mañana más 😊'); PK.fx.pop(mon, 0.4); }
      };
      app().querySelector('.mc-info') && (app().querySelector('.mc-info').onclick = () => monSheet(c, L.active(c)));
      tipTimer = setInterval(() => { if (!PK.ui.open) say(tip(c)); }, 16000);
      if (!quiet) setTimeout(() => say(tip(c)), 900);
    }
    if (!quiet) processQueue(c);
    // Qué escondites y rarezas se ven en esta pantalla (cuando ya está colocada; otra vez al cargar el entrenador).
    scene.visibleOdd = null; scene.spots = [];
    if (painted || odds.length) {
      requestAnimationFrame(() => layoutScene(c));
      const ti = app().querySelector('.stage-trainer img');
      if (ti && !ti.complete) ti.addEventListener('load', () => layoutScene(c), { once: true });
    }
  }
  // ======================= Escenario interactivo: escondites y capturas =======================
  const WEATHER = { sol: '☀️', nubes: '☁️', lluvia: '🌧️', atardecer: '🌇', niebla: '🌫️', nieve: '❄️' };

  // ----- Escenario pintado: los escondites son elementos del dibujo -----
  // El dibujo va con object-fit: cover (lo mismo que preserveAspectRatio xMidYMid slice): se recorta según la pantalla.
  // Se eligen 6 escondites que se vean y no queden tapados por el entrenador, su Pokémon o la etiqueta del escenario;
  // lo escondido va entre el dibujo y la capa (el mismo dibujo recortado con la silueta de los escondites).
  const scene = { spots: [], visibleOdd: null };
  const ESC_FX = { arbusto: ['🍃', '🌿'], hierba: ['🌿', '🍃'], arbol: ['🍃', '🍂'], cerezo: ['🌸', '🍃'], seta: ['🍄', '✨'], roca: ['💨', '✨'],
    nube: ['☁️', '💨'], agua: ['💧', '🫧'], hielo: ['❄️', '💎'], lava: ['🔥', '✨'], hoguera: ['🔥', '✨'], crater: ['💫', '✨'], tienda: ['✨', '💤'], isla: ['🍃', '✨'], ruinas: ['💨', '✨'] };
  const ESC_NADA = { agua: 'Solo hay agua…', nube: 'Solo hay nube…', roca: 'Detrás de la roca no hay nada…', hielo: 'Solo hay hielo…', lava: '¡Solo hay lava! 🔥',
    hoguera: 'Solo hay ascuas…', crater: 'El cráter está vacío…', tienda: 'La tienda está vacía…', hierba: 'Solo hay hierba…', seta: 'Solo hay esporas…' };
  function sceneGeometry() {
    const stage = app().querySelector('.stage'); if (!stage) return null;
    const R = stage.getBoundingClientRect(); if (!R.width || !R.height) return null;
    const k = Math.max(R.width / 1920, R.height / 1080);
    const ox = (R.width - 1920 * k) / 2, oy = (R.height - 1080 * k) / 2;
    const rel = el => { const b = el.getBoundingClientRect(); return [b.left - R.left, b.top - R.top, b.right - R.left, b.bottom - R.top]; };
    const blockers = [];
    const tr = app().querySelector('.stage-trainer');
    if (tr) { const b = rel(tr); const w = Math.max(b[2] - b[0], (b[3] - b[1]) * 0.55); blockers.push([b[0] - 10, b[1] - 10, b[0] + w + 10, b[3] + 10]); }
    ['[data-mon]', '.scene-tag'].forEach(sel => { const el = app().querySelector(sel); if (el) { const b = rel(el); blockers.push([b[0] - 10, b[1] - 10, b[2] + 10, b[3] + 10]); } });
    // slack: cuánto puede salirse la caja por los bordes de la pantalla (lo que se asoma puede quedar algo cortado).
    const free = (box, slack = 0) => box[0] >= 4 - slack && box[1] >= 4 - slack && box[2] <= R.width - 4 + slack && box[3] <= R.height - 4 + slack
      && !blockers.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
    return { R, k, free, toStage: (xp, yp) => [ox + xp / 100 * 1920 * k, oy + yp / 100 * 1080 * k] };
  }
  function layoutScene(c) {
    if (!cur || cur.id !== c.id) return;
    const G = sceneGeometry(); if (!G) return;
    const ex = L.exploreState(c);
    // Rarezas: solo cuentan (y se pueden tocar) las que se ven en esta pantalla.
    const odds = L.oddities();
    const visible = [];
    app().querySelectorAll('[data-odd]').forEach(el => {
      const o = odds.find(x => x.i === Number(el.dataset.odd)); if (!o) return;
      const [x, y] = G.toStage(o.x, o.y); const r = o.r / 100 * 1920 * G.k * 0.55;
      const ok = G.free([x - r, y - r, x + r, y + r]);
      el.style.display = ok ? '' : 'none';
      if (ok) visible.push(o.i);
    });
    scene.visibleOdd = visible;
    const oc = app().querySelector('[data-oddcount]');
    if (oc) oc.textContent = `${visible.filter(i => ex.odd[i]).length}/${visible.length}`;
    // Escondites del dibujo: los 6 primeros del día que se ven (como mucho 2 del mismo tipo), sin pisarse.
    const layer = app().querySelector('[data-esclayer]'); if (!layer) return;
    const cands = L.escCandidates();
    const chosen = [];
    // Primero escondites grandes (lo que se asoma se ve bien) y variados; si faltan, también los pequeños.
    const pickFrom = (maxPerKind, minSize) => {
      for (const e of cands) {
        if (chosen.length === 6) return;
        if (chosen.some(o => o.id === e.id) || chosen.filter(o => o.k === e.k).length >= maxPerKind) continue;
        const [ax, ay] = G.toStage(e.ax, e.ay); const sz = e.as / 100 * 1920 * G.k;
        if (sz < minSize) continue;
        // Basta con que se vea el escondite y el sitio de lo escondido; lo que se asoma puede salirse un poco por arriba.
        if (!G.free([ax - sz * 0.4, ay - sz * 0.75, ax + sz * 0.4, ay], sz * 0.35)) continue;
        if (chosen.some(o => Math.hypot(o.sx - ax, o.sy - ay) < Math.max(sz, o.sz) * 0.8 + 20)) continue;
        chosen.push({ ...e, sx: ax, sy: ay, sz });
      }
    };
    pickFrom(2, 48); pickFrom(2, 30); pickFrom(6, 48); pickFrom(6, 30);
    const spots = L.spots(c, undefined, chosen.map(e => e.k)).slice(0, chosen.length).map((sp, i) => ({ ...sp, esc: chosen[i] }));
    scene.spots = spots;
    const sc = app().querySelector('[data-spotcount]');
    if (sc) sc.textContent = `${spots.filter(s => ex.opened[s.id]).length}/${spots.length}`;
    // Lo que espera escondido (un Pokémon visto y sin atrapar) se asoma por detrás; en el agua, por delante.
    const unit = 1 / G.k;   // un píxel de pantalla en unidades del dibujo
    let mid = '', front = '';
    const g = spots.map(sp => {
      const e = sp.esc; const r = ex.opened[sp.id];
      const s = e.as * 19.2, ax = e.ax * 19.2, ay = e.ay * 10.8;
      const x0 = Math.min(e.x0 * 19.2, ax - s / 2), x1 = Math.max(e.x1 * 19.2, ax + s / 2);
      const y0 = Math.min(e.y0 * 10.8, ay - s), y1 = Math.max(e.y1 * 10.8, ay);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
      const waiting = r && r.type === 'pokemon' && r.state === 'visto';
      if (waiting) {
        const img = `<image class="peek" href="${PK.URL.art(r.id)}" x="${(ax - s / 2).toFixed(0)}" y="${(ay - s).toFixed(0)}" width="${s.toFixed(0)}" height="${s.toFixed(0)}"/>`;
        if (e.f) front += img; else mid += img;
      }
      const st = 13 * unit;
      const twinkles = r ? '' : `<path class="twinkle" d="${star(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.22, st)}"/><path class="twinkle t2" d="${star(x0 + (x1 - x0) * 0.72, y0 + (y1 - y0) * 0.4, st * 0.8)}"/>`;
      const bang = waiting ? `<g class="bang"><circle cx="${(ax + s * 0.38).toFixed(0)}" cy="${(ay - s * 0.92).toFixed(0)}" r="${(15 * unit).toFixed(0)}" stroke-width="${(3 * unit).toFixed(1)}"/><text x="${(ax + s * 0.38).toFixed(0)}" y="${(ay - s * 0.92 + 6 * unit).toFixed(0)}" font-size="${(18 * unit).toFixed(0)}" text-anchor="middle">!</text></g>` : '';
      return `<g class="esc ${r ? 'opened' : ''} ${waiting ? 'waiting' : ''}" data-esc="${sp.id}"><ellipse class="esc-hit" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}"/><ellipse class="esc-ring" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}"/>${twinkles}${bang}</g>`;
    }).join('');
    layer.innerHTML = front + g;
    const md = app().querySelector('[data-mid]'); if (md) md.innerHTML = mid;
    layer.querySelectorAll('[data-esc]').forEach(el => el.addEventListener('click', ev => exploreEsc(c, scene.spots.find(s => s.id === el.dataset.esc), el, ev)));
  }
  const star = (x, y, r) => { const k = r * 0.22; return `M${x.toFixed(1)},${(y - r).toFixed(1)} Q${(x + k).toFixed(1)},${(y - k).toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)} Q${(x + k).toFixed(1)},${(y + k).toFixed(1)} ${x.toFixed(1)},${(y + r).toFixed(1)} Q${(x - k).toFixed(1)},${(y + k).toFixed(1)} ${(x - r).toFixed(1)},${y.toFixed(1)} Q${(x - k).toFixed(1)},${(y - k).toFixed(1)} ${x.toFixed(1)},${(y - r).toFixed(1)}Z`; };
  // Algo sale de detrás del escondite (o del agua): un objeto que sube y se desvanece, o un Pokémon que se asoma.
  function showPop(sp, href, stay) {
    const e = sp.esc; const s = e.as * 19.2, ax = e.ax * 19.2, ay = e.ay * 10.8;
    const host = app().querySelector(e.f ? '[data-esclayer]' : '[data-mid]'); if (!host) return;
    const w = stay ? s : s * 0.55;
    host.insertAdjacentHTML(e.f ? 'afterbegin' : 'beforeend', `<image class="${stay ? 'emerge' : 'pop'}" href="${href}" x="${(ax - w / 2).toFixed(0)}" y="${(ay - w).toFixed(0)}" width="${w.toFixed(0)}" height="${w.toFixed(0)}"/>`);
  }
  let exploring = false;
  async function exploreEsc(c, sp, el, ev) {
    if (!sp || exploring) return;
    const prev = L.exploreState(c).opened[sp.id];
    if (prev) {
      if (prev.type === 'pokemon' && prev.state === 'visto') { await catchFlow(c, sp); main(L.child(c.id), true); }
      else { PK.ui.toast('Aquí ya has mirado 👀'); }
      return;
    }
    exploring = true;
    try {
      el.classList.add('rustle'); PK.sound.play('crack');
      PK.fx.burst(ev.clientX, ev.clientY, ESC_FX[sp.esc.k] || ['🍃'], 7);
      await PK.fx.wait(550);
      const r = L.openSpot(c, sp);
      if (r.type === 'item') {
        showPop(sp, PK.URL.item(r.item), false);
        PK.sound.play('coin'); PK.fx.burst(ev.clientX, ev.clientY - 30, ['✨', '⭐'], 6);
        PK.ui.toast(`🎒 ¡Has encontrado: <b>${esc(PK.itemName(r.item))}</b>!`, 'ok');
        await PK.fx.wait(1100);
      } else if (r.type === 'nada') {
        PK.sound.play('pop');
        PK.ui.toast(`${ESC_NADA[sp.esc.k] || 'Aquí solo hay hojas…'} ¡Prueba en otro escondite!`);
      } else {
        showPop(sp, PK.URL.art(r.id), true);
        PK.sound.cry(r.id, 0.4);
        await PK.fx.wait(900);
        await catchFlow(c, sp);
      }
    } finally { exploring = false; }
    main(L.child(c.id), true);
  }
  // Si cambia el tamaño de la pantalla (girar la tablet), se vuelven a colocar escondites y rarezas.
  let relayout = null;
  window.addEventListener('resize', () => {
    clearTimeout(relayout);
    relayout = setTimeout(() => { if (cur && app().querySelector('.stage')) { const c = L.child(cur.id); if (c) layoutScene(c); } }, 250);
  });
  function spotHtml(sp, r) {
    const sc = (0.62 + (sp.y - 55) / 40 * 0.55).toFixed(2);
    let mark = '';
    if (r) mark = r.type === 'item' ? `<span class="spot-mark">${PK.art.item(r.item)}</span>` : r.type === 'nada' ? '<span class="spot-mark">🍃</span>'
      : r.state === 'visto' ? `<span class="spot-mark wild">${PK.art.mon(r.id)}<b>!</b></span>` : r.state === 'atrapado' ? '<span class="spot-mark">✅</span>' : '<span class="spot-mark">💨</span>';
    return `<button class="spot ${r ? 'opened' : ''} ${r && r.type === 'pokemon' && r.state === 'visto' ? 'waiting' : ''}" data-spot="${sp.id}" style="left:${sp.x}%;top:${sp.y}%;--s:${sc}" aria-label="${r ? 'Escondite mirado' : 'Mirar aquí'}">${PK.art.spot(sp.kind)}${mark}</button>`;
  }
  // Rarezas: cosas que no encajan en el escenario. Al tocarlas se marcan y dan un premio.
  function findOddity(c, i, el, e) {
    const r = L.findOdd(c, i, scene.visibleOdd);
    if (!r) return;
    el.classList.add('found'); el.classList.remove('hint');
    PK.sound.play('levelup');
    PK.fx.burst(e.clientX, e.clientY, ['✨', '🔎', '⭐'], 10);
    const name = (PK.RAREZAS && PK.RAREZAS[r.kind]) || 'algo raro';
    const isBall = ['pokeball', 'superball', 'ultraball'].includes(r.kind);
    PK.ui.toast(`🔎 ¡Has encontrado ${esc(name)}! ${isBall ? '¡Te la quedas! 🎒' : `${esc(PK.itemName(r.item))} a la mochila 🎒`}`, 'ok');
    const st = L.exploreState(c);
    const vis = scene.visibleOdd || L.oddities().map(o => o.i);
    const cnt = app().querySelector('[data-oddcount]'); if (cnt) cnt.textContent = `${vis.filter(j => st.odd[j]).length}/${vis.length}`;
    if (r.all) {
      const hb = app().querySelector('[data-oddhint]'); if (hb) hb.remove();
      setTimeout(() => { PK.fx.confetti(70); PK.ui.toast('🕵️ ¡Has encontrado todas las rarezas de hoy! ¡Eres un detective!', 'ok'); }, 900);
    }
  }

  async function exploreSpot(c, sp, el) {
    if (!sp) return;
    const prev = L.exploreState(c).opened[sp.id];
    if (prev) {
      if (prev.type === 'pokemon' && prev.state === 'visto') { await catchFlow(c, sp); main(L.child(c.id), true); }
      else PK.fx.pop(el, 0.4);
      return;
    }
    el.classList.add('rustle'); PK.sound.play('crack');
    await PK.fx.wait(700);
    const r = L.openSpot(c, sp);
    const [x, y] = PK.fx.center(el);
    if (r.type === 'item') {
      PK.sound.play('coin'); PK.fx.burst(x, y, ['✨', '⭐'], 7);
      PK.ui.toast(`🎒 ¡Has encontrado: <b>${esc(PK.itemName(r.item))}</b>!`, 'ok');
    } else if (r.type === 'nada') {
      PK.sound.play('pop'); PK.fx.burst(x, y, ['🍃'], 6);
      PK.ui.toast('Aquí solo hay hojas… ¡prueba en otro escondite!');
    } else {
      PK.sound.cry(r.id, 0.4); PK.fx.burst(x, y, ['❗'], 3);
      await catchFlow(c, sp);
    }
    main(L.child(c.id), true);
  }
  function catchFlow(c, sp) {
    return new Promise(resolve => {
      const r = L.exploreState(c).opened[sp.id];
      const d = PK.DEX[r.id];
      const m = PK.ui.modal('', { cls: 'catch-modal', onClose: resolve });
      const paint = (msg = '') => {
        const balls = L.ballsOf(c);
        m.body.innerHTML = `<div class="catch">
            <div class="catch-stage">${PK.art.mon(r.id, 'catch-mon')}<img class="catch-ball" alt="" hidden></div>
            <h2>¡Un ${esc(d.n)} salvaje! <small>Nv. ${r.level}</small></h2>${PK.art.types(r.id)}
            <p class="catch-msg">${msg || 'Lanza una Poké Ball para atraparlo. ¡Tienes 3 intentos!'}</p>
            ${balls.length ? `<div class="ball-row">${balls.map(b => `<button class="ball-btn" data-ball="${b}">${PK.art.item(b)}<b>${esc(PK.itemName(b))}</b><small>Tienes ${c.bag[b]}</small></button>`).join('')}</div>`
              : `<p class="muted">No te quedan Poké Balls. Cómpralas en la Tienda (⚡ 3) y vuelve: el Pokémon te espera aquí hasta mañana.</p>`}
            <div class="row-btns"><button class="btn btn-ghost" data-later>Volver luego</button><button class="btn btn-ghost" data-letgo>Dejarlo ir</button></div>
          </div>`;
        m.body.querySelector('[data-later]').onclick = () => m.close();
        m.body.querySelector('[data-letgo]').onclick = () => { L.letGo(c, sp.id); PK.ui.toast(`¡Adiós, ${esc(d.n)}! 👋`); m.close(); };
        m.body.querySelectorAll('[data-ball]').forEach(b => b.onclick = () => throwIt(b.dataset.ball));
      };
      const throwIt = async ball => {
        m.body.querySelectorAll('button').forEach(b => b.disabled = true);
        const res = L.throwBall(c, sp.id, ball);
        if (!res || res.noBall) { paint(); return; }
        const mon = m.body.querySelector('.catch-mon'), bi = m.body.querySelector('.catch-ball');
        bi.src = PK.URL.item(ball); bi.hidden = false;
        PK.sound.play('tap');
        bi.animate([{ transform: 'translate(-50%, 240px) scale(.6) rotate(0)' }, { transform: 'translate(-50%, -40px) scale(1.1) rotate(540deg)', offset: .6 }, { transform: 'translate(-50%, 40px) scale(1) rotate(720deg)' }], { duration: PK.fx.reduce ? 1 : 650, easing: 'ease-out', fill: 'forwards' });
        await PK.fx.wait(560);
        PK.fx.flash('#fff');
        mon.animate([{ transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(.1)', opacity: 0, filter: 'brightness(3)' }], { duration: 300, fill: 'forwards' });
        await PK.fx.wait(450);
        for (let i = 0; i < res.shakes; i++) { PK.sound.play('crack'); bi.classList.remove('wobble'); void bi.offsetWidth; bi.classList.add('wobble'); await PK.fx.wait(700); }
        if (res.ok) {
          PK.sound.play('win'); PK.sound.cry(r.id, 0.35); PK.fx.confetti(90);
          m.body.querySelector('.catch-msg').innerHTML = `<b class="good">¡Ya está! ¡${esc(d.n)} atrapado!</b> Se une a tu equipo.`;
          bi.classList.add('caught');
          await PK.fx.wait(1600);
          m.close();
          return;
        }
        mon.animate([{ transform: 'scale(.1)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], { duration: 400, fill: 'forwards' });
        bi.hidden = true;
        PK.sound.play('error');
        if (res.fled) {
          m.body.querySelector('.catch-msg').innerHTML = `¡Oh, no! ¡El ${esc(d.n)} salvaje ha huido! 💨`;
          await PK.fx.wait(1500);
          m.close();
          return;
        }
        paint(`¡Oh, no! ¡Se ha escapado de la ${esc(PK.itemName(ball))}! Inténtalo otra vez (${3 - r.tries} ${3 - r.tries === 1 ? 'intento' : 'intentos'}).`);
      };
      paint();
    });
  }

  function monCard(c, p) {
    const need = L.xpNeed(p.level);
    const hint = L.evoHint(p);
    return `<section class="mon-card" style="--tc:${PK.TYPES[PK.DEX[p.id].t[0]].c}">
        <button class="mc-info" aria-label="Ver detalles"><div class="mc-head"><b class="mc-name">${esc(L.pname(p))}</b><span class="lv">Nv. ${p.level}</span>${PK.art.types(p.id)}</div></button>
        <div class="mc-row"><span class="mc-l">PS</span>${PK.art.bar(L.hp(p), L.maxHp(p), 'hp')}<small>${L.hp(p)}/${L.maxHp(p)}</small></div>
        <div class="mc-row"><span class="mc-l">EXP</span>${PK.art.bar(p.xp, need, 'xp')}<small>${p.level >= 100 ? 'máx.' : `${p.xp}/${need}`}</small></div>
        <div class="mc-row"><span class="mc-l">Amistad</span><span data-hearts>${hearts(p.amistad)}</span></div>
        ${hint ? `<p class="mc-hint">✨ ${esc(hint)}</p>` : ''}
      </section>`;
  }
  function say(txt) {
    const b = app().querySelector('[data-bubble]'); if (!b) return;
    b.innerHTML = txt; b.hidden = false;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 6000);
  }
  function tip(c) {
    const p = L.active(c); if (!p) return '';
    const tips = [];
    const rec = L.day(c.id, PK.dayKey(), true);
    const left = rec && !rec.validated ? rec.tasks.filter(t => !rec.marked[t.id]).length : 0;
    if (L.rocketAvailable(c)) tips.push('¡Cuidado! ¡El Team Rocket anda cerca! 🚀');
    if (L.fainted(p)) tips.push('Estoy muy cansado… ¿me llevas al Centro Pokémon? 🏥');
    else if (L.hp(p) < L.maxHp(p) / 2) tips.push('Me duele un poco… una Poción me vendría genial 🧪');
    if (left) tips.push(`¡Te quedan ${left} ${left === 1 ? 'tarea' : 'tareas'}! Así conseguimos energía ⚡`);
    if (L.champOpen() && !L.champ(c).won && L.champReady(c)) tips.push('¡Hoy hay campeonato! ¿Vamos al estadio? 🏆');
    if (p.amistad < 40) tips.push('¿Jugamos un rato? 🎾');
    const hint = L.evoHint(p); if (hint) tips.push(`${hint} ✨`);
    tips.push('¡Tócame para darme mimos! 💛', '¡Vamos a entrenar para ganar el campeonato! 💪');
    return PK.rand(tips.slice(0, Math.max(2, Math.min(3, tips.length - 1))));
  }

  function go(c, where) {
    ({ tareas: sheetTareas, cuidar: sheetCuidar, entrenar: sheetEntrenar, tienda: sheetTienda, campeonato: sheetCampeonato, pokedex: pokedex })[where](c);
  }
  const updateEnergy = c => { const e = app().querySelector('[data-energy] b'); if (e) { e.textContent = c.energy; PK.fx.pop(e.parentElement, .6); } };

  // ======================= Tareas =======================
  function sheetTareas(c) {
    const rec = L.day(c.id, PK.dayKey(), true);
    const paint = sh => {
      const r = L.day(c.id, PK.dayKey(), true);
      const pend = L.pendingDays(c.id).filter(k => k !== PK.dayKey());
      sh.body.innerHTML = !r ? '<p class="muted center">Hoy no tienes tareas. ¡Disfruta del día con tus Pokémon! 🎈</p>' : `
        <p class="muted">${r.validated ? `✅ Papá o mamá ya han validado hoy: <b>+${r.points} ⚡</b>` : 'Marca lo que ya has hecho. Papá o mamá lo revisarán y te llegará la energía ⚡.'}</p>
        <div class="task-list">${r.tasks.map(t => `<button class="task ${r.marked[t.id] ? 'done' : ''} ${r.validated ? (r.approved[t.id] ? 'ok' : 'no') : ''}" data-t="${t.id}" ${r.validated ? 'disabled' : ''}><span class="ti">${t.icon}</span><span class="tt">${esc(t.title)}</span><span class="tp">+${t.points} ⚡</span><span class="tc">${r.marked[t.id] ? '✅' : '⬜'}</span></button>`).join('')}</div>
        ${pend.length ? `<p class="muted small">⏳ ${pend.length === 1 ? 'Un día pendiente' : `${pend.length} días pendientes`} de validar.</p>` : ''}
        ${(() => {
          const w = L.weekTasks(c), need = L.champNeed(), pct = w.asg ? Math.round(w.ok / w.asg * 100) : 0;
          return `<div class="week-goals"><p>🏆 Campeonato: <b>${Math.min(w.dias, need)} de ${need}</b> días validados ${w.dias >= need ? '✅' : ''}</p>
            <p>🧰 Cofre del lunes: <b>${pct}%</b> de las tareas de la semana (hace falta el ${Math.round(PK.LIMITS.cofre * 100)}%) ${pct >= PK.LIMITS.cofre * 100 ? '✅' : ''}</p></div>`;
        })()}`;
      sh.body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
        const done = !r.marked[b.dataset.t];
        if (L.mark(c.id, b.dataset.t, done)) {
          PK.sound.play(done ? 'mark' : 'tap');
          if (done) { const [x, y] = PK.fx.center(b); PK.fx.burst(x, y, ['⚡', '⭐'], 6); }
          paint(sh);
        }
      });
    };
    const sh = PK.ui.sheet('📝 Mis tareas de hoy', '', { onClose: () => main(c, true) });
    if (rec || true) paint(sh);
  }

  // ======================= Cuidar (Centro Pokémon y mochila) =======================
  function sheetCuidar(c) {
    const sh = PK.ui.sheet('💖 Cuidar a mis Pokémon', '', { onClose: () => main(c, true) });
    const paint = () => {
      const p = L.active(c);
      const hurt = c.pokemon.filter(x => x.dmg > 0).length;
      const cud = p ? L.cuddlesToday(c, p) : 0;
      const usable = Object.entries(c.bag).filter(([id, n]) => n > 0 && PK.item(id));
      sh.body.innerHTML = `${p ? `<div class="care-mon">${PK.art.mon(p.id, 'care-art')}<div><b>${esc(L.pname(p))}</b> <span class="lv">Nv. ${p.level}</span><div class="mc-row"><span class="mc-l">PS</span>${PK.art.bar(L.hp(p), L.maxHp(p), 'hp')}<small>${L.hp(p)}/${L.maxHp(p)}</small></div><div>${hearts(p.amistad)}</div></div></div>` : ''}
        <div class="care-grid">
          <button class="care" data-care="centro">${PK.art.mon(113, 'care-nurse')}<b>Centro Pokémon</b><small>${hurt ? `Cura a todo tu equipo (${hurt} ${hurt === 1 ? 'herido' : 'heridos'})` : 'Tu equipo está en plena forma'}</small><span class="cost">⚡ ${PK.CARE.centro}</span></button>
          <button class="care" data-care="cepillar" ${p && !L.fainted(p) ? '' : 'disabled'}><span class="care-ico">🪮</span><b>Cepillar</b><small>+4 de amistad</small><span class="cost">⚡ ${PK.CARE.cepillar}</span></button>
          <button class="care" data-care="jugar" ${p && !L.fainted(p) ? '' : 'disabled'}><span class="care-ico">🎾</span><b>Jugar</b><small>+8 de amistad</small><span class="cost">⚡ ${PK.CARE.jugar}</span></button>
          <button class="care" data-care="mimos" ${p && !L.fainted(p) && cud < 5 ? '' : 'disabled'}><span class="care-ico">🤗</span><b>Mimos</b><small>+1 de amistad (${cud}/5 hoy)</small><span class="cost free">Gratis</span></button>
        </div>
        <h3 class="sh-sub">🎒 Mochila</h3>
        ${usable.length ? `<div class="bag-list">${usable.map(([id, n]) => `<button class="bag-row" data-it="${id}">${PK.art.item(id)}<b>${esc(PK.itemName(id))}</b><small>${esc(PK.item(id).txt)}</small><span class="qty">×${n}</span></button>`).join('')}</div>` : '<p class="muted">La mochila está vacía. Compra cosas en la Tienda 🛒.</p>'}
        <p class="muted small">💤 Por la noche tus Pokémon descansan y amanecen curados. La amistad baja un poquito cada día que no juegas con ellos.</p>`;
      sh.body.querySelectorAll('[data-care]').forEach(b => b.onclick = async () => {
        const kind = b.dataset.care; const pp = L.active(c);
        if (kind === 'mimos') { if (L.cuddle(c, pp)) { PK.sound.cry(pp.id, 0.3); const [x, y] = PK.fx.center(sh.body.querySelector('.care-art')); PK.fx.burst(x, y, ['💛', '💖'], 7); } paint(); return; }
        if (kind === 'centro' && !hurt) { PK.ui.toast('Tu equipo ya está en plena forma 💪'); return; }
        if (c.energy < PK.CARE[kind]) { noEnergy(c, PK.CARE[kind]); return; }
        if (!L.care(c, pp, kind)) return;
        updateEnergy(c);
        if (kind === 'centro') {
          PK.sound.play('heal');
          const [x, y] = PK.fx.center(b); PK.fx.burst(x, y, ['✨', '💖', '➕'], 10);
          PK.ui.toast('🏥 ¡Tus Pokémon están como nuevos! Esperamos volver a verte.', 'ok');
        } else {
          PK.sound.play(kind === 'jugar' ? 'bubble' : 'pop'); PK.sound.cry(pp.id, 0.25);
          const art = sh.body.querySelector('.care-art'); const [x, y] = PK.fx.center(art);
          PK.fx.burst(x, y, kind === 'jugar' ? ['🎾', '💛', '✨'] : ['✨', '💛'], 8); PK.fx.pop(art);
        }
        await checkEvolutions(c, pp, true);
        paint();
      });
      sh.body.querySelectorAll('[data-it]').forEach(b => b.onclick = () => useItemFlow(c, b.dataset.it, paint));
    };
    paint();
  }
  // Usar un objeto de la mochila fuera de combate.
  async function useItemFlow(c, itemId, after) {
    const it = PK.item(itemId);
    let target = L.active(c);
    if (it.revive || it.stone || it.held) {
      const opts = c.pokemon.filter(p => it.revive ? L.fainted(p) : it.held ? (!p.held && !L.fainted(p)) : L.canUseStone(p, itemId));
      if (!opts.length) { PK.ui.toast(it.revive ? 'Ninguno de tus Pokémon está debilitado' : it.held ? 'Todos tus Pokémon ya llevan un objeto' : `Ninguno de tus Pokémon puede usar ${esc(PK.itemName(itemId))}`, 'warn'); return; }
      target = opts.length === 1 ? opts[0] : await pickMon(c, opts, `¿Con quién usas ${esc(PK.itemName(itemId))}?`);
      if (!target) return;
    }
    const res = L.useItem(c, itemId, target);
    if (res && res.limit) { PK.sound.play('error'); PK.ui.toast('🍬 Hoy ya has usado tu Caramelo Raro. ¡Mañana podrás usar otro!', 'warn'); return; }
    if (!res) {
      PK.ui.toast(it.candy ? 'Ya está en el nivel máximo' : L.fainted(target) ? `${esc(L.pname(target))} está debilitado: usa un Revivir o ve al Centro Pokémon` : `${esc(L.pname(target))} no lo necesita ahora`, 'warn');
      return;
    }
    PK.sound.play(res.candy || res.xp ? 'levelup' : 'heal');
    if (res.food) { PK.sound.play('eat'); PK.ui.toast(`😋 ¡A ${esc(L.pname(target))} le ha encantado!`, 'ok'); }
    if (res.healed) PK.ui.toast(`🧪 ${esc(L.pname(target))} ha recuperado ${res.healed} PS`, 'ok');
    if (res.revived) PK.ui.toast(`✨ ¡${esc(L.pname(target))} se ha recuperado!`, 'ok');
    if (res.equipped) PK.ui.toast(`🎒 ${esc(L.pname(target))} lleva ${esc(PK.itemName(itemId))} para el próximo combate`, 'ok');
    if (res.xp) await showLevelUps(c, target, res.xp);
    if (res.evo) await runEvolution(c, target, res.evo.length > 1 ? await chooseEvo(target, res.evo) : res.evo[0].to);
    else await checkEvolutions(c, target, true);
    after && after();
  }
  function pickMon(c, list, title) {
    return new Promise(res => {
      let picked = null;
      const sh = PK.ui.sheet(title, `<div class="sw-list">${list.map(p => `<button class="sw-row" data-uid="${p.uid}">${PK.art.mon(p.id, 'sw-art')}<b>${esc(L.pname(p))}</b><small>Nv. ${p.level} · ${L.hp(p)}/${L.maxHp(p)} PS</small></button>`).join('')}</div>`, { onClose: () => res(picked) });
      sh.body.querySelectorAll('[data-uid]').forEach(b => b.onclick = () => { picked = L.mon(c, b.dataset.uid); sh.close(); });
    });
  }
  function noEnergy(c, need) {
    PK.sound.play('error');
    PK.ui.toast(`Te faltan ${need - c.energy} ⚡. ¡Haz tus tareas para conseguir energía!`, 'warn');
  }

  // ======================= Entrenar =======================
  function sheetEntrenar(c) {
    const p = L.active(c); const sc = L.scenario(); const r = PK.region(sc.region);
    const sh = PK.ui.sheet('⚔️ Entrenamiento', `<div class="train">
        <div class="train-art">${p ? PK.art.mon(p.id, 'train-mon') : ''}<span class="vs">VS</span><span class="train-wild">❔</span></div>
        <p>Lucha contra <b>Pokémon salvajes de ${esc(r.name)}</b> para ganar <b>experiencia</b> y subir de nivel. ¡Así estarás listo para el campeonato!</p>
        <p class="muted small">Cada combate cuesta ⚡ ${PK.COSTS.entrenar}. Elige un ataque que sea <b>💥 muy eficaz</b> contra el rival.</p>
        <button class="btn btn-primary btn-lg" data-go ${p ? '' : 'disabled'}>⚔️ ¡A luchar! <span class="cost-in">⚡ ${PK.COSTS.entrenar}</span></button>
      </div>`, { onClose: () => main(c, true) });
    sh.body.querySelector('[data-go]').onclick = async () => {
      const pp = L.active(c);
      if (L.fainted(pp)) { PK.ui.toast(`${esc(L.pname(pp))} está debilitado. Llévalo al Centro Pokémon 🏥`, 'warn'); return; }
      if (c.energy < PK.COSTS.entrenar) { noEnergy(c, PK.COSTS.entrenar); return; }
      await PK.store.sync(true);
      const cc = L.child(c.id);
      if (!L.spend(cc, PK.COSTS.entrenar, 'Combate de entrenamiento')) return;
      save();
      sh.close();
      const res = await PK.battle.start({ child: cc, foe: L.wildFor(cc), bg: sc.fondo.src, region: sc.region });
      await afterBattle(cc, res);
      main(cc, true);
    };
  }
  async function afterBattle(c, res) {
    for (const lu of res.levelUps) { const p = L.mon(c, lu.uid); if (p) await checkEvolutions(c, p, false); }
    if (res.won) PK.ui.toast(`¡Combate ganado! +${res.xp} de experiencia`, 'ok');
    save();
  }

  // ======================= Tienda =======================
  function sheetTienda(c) {
    let cat = 'capturar';
    const CATS = [['metas', '⭐ Metas'], ['capturar', '🔴 Poké Balls'], ['curar', '🧪 Curación'], ['bayas', '🍇 Bayas'], ['evolucion', '💎 Evolución'], ['combate', '⚔️ Combate']];
    const sh = PK.ui.sheet('🛒 Tienda Pokémon', '', { onClose: () => main(c, true) });
    // Metas: cosas grandes para ahorrar (el huevo misterioso y los premios de casa de papá y mamá)
    const metas = () => {
      const bar = cost => `<div class="goal-bar"><i style="width:${Math.min(100, Math.round(c.energy / cost * 100))}%"></i></div><small>${c.energy >= cost ? '¡Ya lo puedes conseguir!' : `Te faltan ⚡ ${cost - c.energy}`}</small>`;
      const egg = `<div class="shop-item goal"><div class="goal-ico">🥚</div><b>Huevo misterioso</b><small>Sale un Pokémon raro que aún no tienes (Dratini, Larvitar, Gible, Eevee…).</small>${bar(PK.EGG.cost)}
          <button class="btn btn-buy btn-sm" data-egg ${c.energy < PK.EGG.cost ? 'disabled' : ''}>⚡ ${PK.EGG.cost}</button></div>`;
      const casa = L.homeRewards().map(r => `<div class="shop-item goal"><div class="goal-ico">${esc(r.icon)}</div><b>${esc(r.title)}</b><small>Premio de casa: papá o mamá te lo dan cuando lo canjees.</small>${bar(r.cost)}
          <button class="btn btn-buy btn-sm" data-redeem="${r.id}" ${c.energy < r.cost ? 'disabled' : ''}>⚡ ${r.cost}</button></div>`).join('');
      const mios = L.pendingRedemptions().filter(x => x.childId === c.id);
      return `<div class="shop-grid">${egg}${casa}</div>
        ${L.homeRewards().length ? '' : '<p class="muted small">Pide a papá o mamá que pongan premios de casa (tiempo de tablet, elegir la peli…).</p>'}
        ${mios.length ? `<p class="small">⏳ Esperando a que te los den: ${mios.map(x => `${esc(x.icon)} ${esc(x.title)}`).join(', ')}</p>` : ''}`;
    };
    const paint = () => {
      const items = PK.SHOP.filter(i => i.cat === cat);
      sh.body.innerHTML = `<div class="shop-head"><div class="reg-tabs">${CATS.map(([id, n]) => `<button class="kchip ${id === cat ? 'on' : ''}" data-cat="${id}">${n}</button>`).join('')}</div>${energyChip(c)}</div>
        ${cat === 'metas' ? metas() : ''}<div class="shop-grid">${items.map(it => {
          const users = it.stone ? c.pokemon.filter(p => L.canUseStone(p, it.id)) : [];
          return `<div class="shop-item ${it.stone && !users.length ? 'dim' : ''}">${PK.art.item(it.id, 'shop-img')}<b>${esc(PK.itemName(it.id))}</b><small>${esc(it.txt)}${it.stone ? `<br>${users.length ? `✨ Sirve para: ${users.map(p => esc(L.pname(p))).join(', ')}` : 'Ahora no sirve para ninguno de tus Pokémon'}` : ''}</small>
            <span class="have">${c.bag[it.id] ? `Tienes ${c.bag[it.id]}` : ''}</span>
            ${L.cantBuy(c, it) ? `<button class="btn btn-buy btn-sm" disabled>${esc(L.cantBuy(c, it))}</button>` : `<button class="btn btn-buy btn-sm" data-buy="${it.id}" ${c.energy < it.cost ? 'disabled' : ''}>⚡ ${it.cost}</button>`}</div>`;
        }).join('')}</div>`;
      sh.body.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { PK.sound.play('tap'); cat = b.dataset.cat; paint(); });
      sh.body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
        const it = PK.item(b.dataset.buy);
        if (c.energy < it.cost) { noEnergy(c, it.cost); return; }
        if (L.buy(c, it.id, 1)) {
          PK.sound.play('buy'); updateEnergy(c);
          const [x, y] = PK.fx.center(b); PK.fx.burst(x, y, ['🛍️', '✨'], 6);
          PK.ui.toast(`🎒 ${esc(PK.itemName(it.id))} a la mochila`, 'ok');
          paint();
        }
      });
      const egg = sh.body.querySelector('[data-egg]');
      if (egg) egg.onclick = async () => {
        if (c.energy < PK.EGG.cost) { noEnergy(c, PK.EGG.cost); return; }
        if (!await PK.ui.confirm(`¿Abrir el huevo misterioso por ⚡ ${PK.EGG.cost}?`, { icon: '🥚', ok: '¡Ábrelo!', cancel: 'Mejor no' })) return;
        const p = L.hatchEgg(c);
        if (!p) return;
        updateEnergy(c); PK.sound.cry(p.id); PK.sound.play('success'); PK.fx.confetti(80);
        await info('🥚✨', `¡Del huevo ha salido ${esc(PK.DEX[p.id].n)}!`, `Nivel ${p.level}. Ya está en tu equipo: cuídalo y entrénalo.`, '¡Hola!');
        paint();
      };
      sh.body.querySelectorAll('[data-redeem]').forEach(b => b.onclick = async () => {
        const r = L.homeRewards().find(x => x.id === b.dataset.redeem);
        if (!r) return;
        if (c.energy < r.cost) { noEnergy(c, r.cost); return; }
        if (!await PK.ui.confirm(`¿Canjear «${esc(r.title)}» por ⚡ ${r.cost}?`, { icon: r.icon, ok: '¡Sí!', cancel: 'Mejor no', detail: 'Papá o mamá lo verán en su panel y te lo darán.' })) return;
        if (L.redeem(c, r.id)) {
          updateEnergy(c); PK.sound.play('buy'); PK.fx.confetti(40);
          PK.ui.toast(`${esc(r.icon)} ¡Canjeado! Avisa a papá o mamá`, 'ok');
          paint();
        }
      });
    };
    paint();
  }

  // ======================= Campeonato semanal =======================
  const ROUND_NAMES = ['Ronda 1', 'Ronda 2', 'Final'];
  function sheetCampeonato(c) {
    const ld = L.weekLeader(); const r = L.weekRegion(); const st = L.champ(c);
    const open = L.champOpen();
    const next = L.nextChampDay();
    const ref = L.teamRef(c);
    const foes = [0, 1, 2].map(i => L.champFoe(c, i, ref));
    const sh = PK.ui.sheet(`🏆 Campeonato · semana ${L.weekNumber()} de 52`, `<div class="champ">
        <div class="champ-leader" style="--tc:${PK.TYPES[ld.type].c}">${PK.art.trainer(ld.char, 'cl-sprite')}<div><small>Gimnasio de la semana · ${esc(r.name)}</small><b>${esc(ld.name)}</b>${PK.art.type(ld.type)}<span class="cl-medal">${PK.art.medal(ld.id)} ${esc(ld.medal)}</span><span class="cl-team">${ld.team.map(id => PK.art.mon(id, 'cl-mon')).join('')}</span></div></div>
        <div class="rounds">${foes.map((f, i) => `<div class="round ${st.round > i ? 'won' : st.round === i && !st.won ? 'next' : ''}">${PK.art.trainer(f.char, 'rd-sprite')}<b>${ROUND_NAMES[i]}</b><small>${esc(f.name)}</small><span>${st.round > i ? '✅' : `${f.team.length} Pokémon`}</span></div>`).join('')}</div>
        ${st.won ? `<div class="champ-done">🏅 <b>¡Eres el campeón de esta semana!</b><br>La semana que viene te espera otro líder en otra región.</div>`
          : open && !L.champReady(c) ? `<div class="champ-wait">🔒 Para entrar al estadio necesitas <b>${L.champNeed()} días con tareas validadas</b> esta semana.<br>Llevas <b>${L.weekTasks(c).dias}</b>. ¡Haz tus tareas y pide a papá o mamá que las validen!</div>`
          : open ? `<p>Elige tu equipo (hasta 3 Pokémon). La enfermera del estadio los cura antes de cada combate.</p>
            <div class="pick-team">${c.pokemon.map(p => `<button class="pt" data-uid="${p.uid}">${PK.art.mon(p.id, 'pt-art')}<b>${esc(L.pname(p))}</b><small>Nv. ${p.level}</small>${PK.art.types(p.id)}</button>`).join('')}</div>
            <button class="btn btn-primary btn-lg" data-fight disabled>🏟️ ¡Al estadio! (${ROUND_NAMES[st.round]})</button>`
          : `<div class="champ-wait">⏳ El estadio abre ${next ? `el <b>${esc(PK.fmtDay(next))}</b>` : 'el fin de semana'}.<br>¡Mientras tanto, entrena a tus Pokémon y haz tus tareas!</div>`}
      </div>`, { onClose: () => main(c, true), cls: 'wide-sheet' });
    const fight = sh.body.querySelector('[data-fight]');
    if (!fight) return;
    const picked = [];
    // Por defecto: el activo y los dos de más nivel.
    const auto = [L.active(c), ...c.pokemon.filter(p => p.uid !== c.active).sort((a, b) => b.level - a.level)].filter(Boolean).slice(0, 3);
    const paint = () => { sh.body.querySelectorAll('[data-uid]').forEach(b => { const i = picked.indexOf(b.dataset.uid); b.classList.toggle('on', i >= 0); b.dataset.n = i >= 0 ? i + 1 : ''; }); fight.disabled = !picked.length; };
    auto.forEach(p => picked.push(p.uid)); paint();
    sh.body.querySelectorAll('[data-uid]').forEach(b => b.onclick = () => {
      const i = picked.indexOf(b.dataset.uid);
      if (i >= 0) picked.splice(i, 1); else if (picked.length < 3) picked.push(b.dataset.uid); else { PK.ui.toast('Máximo 3 Pokémon', 'warn'); return; }
      PK.sound.play('tap'); paint();
    });
    fight.onclick = async () => {
      sh.close();
      await champRun(c.id, picked.slice());
    };
  }
  async function champRun(childId, teamUids) {
    await PK.store.sync(true);
    const c = L.child(childId);
    const st = L.champ(c);
    const ld = L.weekLeader();
    while (!st.won) {
      const round = st.round;
      L.healAll(c); save();
      const foe = L.champFoe(c, round, L.teamRef(c, teamUids));
      const bg = PK.ESTADIOS.general;
      const res = await PK.battle.start({ child: c, foe, team: teamUids.filter(u => L.mon(c, u)), bg, region: ld.region });
      await afterBattle(c, res);
      if (!res.won) {
        L.healAll(c); save();
        await info('💪', '¡Casi lo consigues!', `Tus Pokémon se han recuperado. Entrena un poco más y vuelve a intentarlo: seguirás en la <b>${ROUND_NAMES[round]}</b>.`);
        break;
      }
      L.champRoundWon(c, round);
      if (round < 2) {
        const goOn = await PK.ui.confirm(`¡Has ganado la ${ROUND_NAMES[round]}! +${PK.REWARDS.rondaEnergia} ⚡`, { icon: '🎉', ok: round === 1 ? `¡A la final contra ${esc(ld.name)}!` : 'Siguiente ronda', cancel: 'Descansar', detail: 'La enfermera del estadio cura a tu equipo.' });
        if (!goOn) break;
        continue;
      }
      L.champWin(c);
      await medalCeremony(c, ld);
      await giftChoice(c);
      break;
    }
    L.healAll(c); save();
    main(L.child(childId), true);
  }
  function info(icon, title, text, btn = 'Vale') {
    return new Promise(res => {
      const m = PK.ui.modal(`<div class="confirm"><div class="confirm-ico">${icon}</div><p class="confirm-txt">${title}</p><p class="muted">${text}</p><div class="row-btns"><button class="btn btn-primary" data-ok>${btn}</button></div></div>`, { cls: 'small', onClose: res });
      m.body.querySelector('[data-ok]').onclick = () => m.close();
    });
  }
  function medalCeremony(c, ld) {
    PK.sound.play('win'); PK.fx.confetti(110);
    return new Promise(res => {
      const m = PK.ui.modal(`<div class="ceremony"><div class="cer-medal">${PK.art.medal(ld.id, 'big')}</div>
          <h2>¡Has conseguido la ${esc(ld.medal)}!</h2>
          <p>${esc(ld.name)}: «¡Ha sido un combate increíble! Te la has ganado».</p>
          <p class="good">+${PK.REWARDS.campeonEnergia} ⚡ de premio${PK.REWARDS.campeonCaramelos ? ` y ${PK.REWARDS.campeonCaramelos === 1 ? 'un Caramelo Raro' : PK.REWARDS.campeonCaramelos + ' Caramelos Raros'} 🍬` : ''}</p>
          <button class="btn btn-primary btn-lg" data-ok>¡Genial!</button></div>`, { onClose: res });
      m.body.querySelector('[data-ok]').onclick = () => m.close();
    });
  }
  function giftChoice(c) {
    const st = L.champ(c);
    if (!st.gifts || !st.gifts.length) return Promise.resolve();
    return new Promise(res => {
      const m = PK.ui.modal(`<div class="gift"><h2>🎁 ¡Elige un nuevo Pokémon para tu equipo!</h2>
          <div class="starter-row">${st.gifts.map(id => { const fid = L.formFor(id, st.giftLevel); return `<button class="starter" data-id="${id}" style="--tc:${PK.TYPES[PK.DEX[fid].t[0]].c}">${PK.art.mon(fid, 'st-art')}<b>${esc(PK.DEX[fid].n)}</b>${PK.art.types(fid)}<small>Nv. ${st.giftLevel}</small></button>`; }).join('')}</div></div>`, { cls: 'wide', closable: false });
      m.noEsc = true;
      m.body.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => {
        const p = L.champGift(c, Number(b.dataset.id));
        m.close();
        if (p) {
          PK.sound.cry(p.id); PK.sound.play('success'); PK.fx.confetti(60);
          await info('🎉', `¡${esc(PK.DEX[p.id].n)} se une a tu equipo!`, 'Cuídalo mucho y entrénalo para el próximo campeonato.', '¡Bienvenido!');
        }
        res();
      });
    });
  }

  // ======================= Team Rocket =======================
  async function rocketMission(c) {
    leaveTimers();
    await PK.store.sync(true);
    c = L.child(c.id);
    if (!L.rocketAvailable(c)) return main(c, true);
    const res = await PK.missions.run({ child: c });
    const out = L.rocketResult(c, res.won);
    if (res.won) {
      const p = L.active(c);
      const xp = 50 + 10 * (p ? p.level : 5);
      await rocketOutro(true, `¡Has superado ${res.passed} de ${res.total} pruebas! Recibes <b>+${PK.REWARDS.rocketEnergia} ⚡</b>${p ? ` y <b>${esc(L.pname(p))}</b> gana <b>${xp}</b> de experiencia` : ''}.`);
      if (p) { const g = L.gainXp(c, p, xp); await showLevelUps(c, p, g); await checkEvolutions(c, p, false); }
    } else {
      await rocketOutro(false, out.stolen ? `¡Se han llevado a <b>${esc(L.pname(out.stolen))}</b>! A partir de mañana podrás intentar rescatarlo.` : `¡Se han llevado <b>${out.energy} ⚡</b> de energía! La semana que viene, ¡a por ellos!`, out.stolen);
    }
    main(L.child(c.id), true);
  }
  async function rescueMission(c) {
    leaveTimers();
    await PK.store.sync(true);
    c = L.child(c.id);
    if (!L.rescueAvailable(c)) return main(c, true);
    const res = await PK.missions.run({ child: c, rescue: true });
    const p = L.rescueResult(c, res.won);
    if (p) {
      PK.sound.cry(p.id); PK.fx.confetti(80);
      await rocketOutro(true, `¡Has rescatado a <b>${esc(L.pname(p))}</b>! Te ha echado mucho de menos 💛`);
    } else {
      await info('😢', '¡Casi!', 'El Team Rocket se ha escapado otra vez. Mañana podrás volver a intentarlo.');
    }
    main(L.child(c.id), true);
  }
  function rocketTrio() { return `<span class="rocket-trio"><img class="rt-face" src="${PK.ROCKET.jessie}" alt="Jessie"><img class="rt-face" src="${PK.ROCKET.james}" alt="James">${PK.art.mon(PK.ROCKET.meowth, 'rt-meowth')}</span>`; }
  PK.rocketTrio = rocketTrio;
  function rocketOutro(won, text, stolen) {
    PK.sound.play(won ? 'win' : 'rocket');
    if (won) PK.fx.confetti(70);
    return new Promise(res => {
      const m = PK.ui.modal(`<div class="rocket-out ${won ? 'won' : 'lost'}">
          <div class="ro-scene">${PK.art.scene('rocket')}<div class="ro-rocket">${rocketTrio()}${stolen ? PK.art.mon(stolen.id, 'ro-mon') : ''}</div>${won ? '<span class="ro-star">✦</span>' : ''}</div>
          <h2>${won ? '¡El Team Rocket sale volando otra vez!' : '¡Ja, ja, ja! ¡Misión cumplida!'}</h2>
          <p>${text}</p>
          <button class="btn btn-primary btn-lg" data-ok>${won ? '¡Bien!' : 'Vale…'}</button></div>`, { onClose: res, cls: 'wide' });
      m.body.querySelector('[data-ok]').onclick = () => m.close();
    });
  }

  // ======================= Evoluciones y subidas de nivel =======================
  async function showLevelUps(c, p, g) {
    if (!g || !g.levels || !g.levels.length) return;
    PK.sound.play('levelup');
    await info('⬆️', `¡${esc(L.pname(p))} ha subido al nivel ${p.level}!`, g.learned.length ? `Ha aprendido: <b>${g.learned.map(m => esc(PK.MOVES[m].n)).join(', ')}</b>` : '¡Cada vez es más fuerte!', '¡Genial!');
  }
  function chooseEvo(p, opts) {
    return new Promise(res => {
      let pick = opts[0].to;
      const m = PK.ui.modal(`<div class="gift"><h2>✨ ¡${esc(L.pname(p))} puede evolucionar de varias formas!</h2><p class="muted">Elige en qué quieres que se convierta.</p>
          <div class="starter-row">${opts.map(o => `<button class="starter" data-to="${o.to}" style="--tc:${PK.TYPES[PK.DEX[o.to].t[0]].c}">${PK.art.mon(o.to, 'st-art')}<b>${esc(PK.DEX[o.to].n)}</b>${PK.art.types(o.to)}</button>`).join('')}</div></div>`, { cls: 'wide', onClose: () => res(pick) });
      m.body.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { pick = Number(b.dataset.to); m.close(); });
    });
  }
  async function checkEvolutions(c, p, quietIfNone) {
    for (let guard = 0; guard < 3; guard++) {
      const opts = L.evoOptions(p);
      if (!opts.length) return;
      const to = opts.length > 1 ? await chooseEvo(p, opts) : opts[0].to;
      await runEvolution(c, p, to);
    }
  }
  function runEvolution(c, p, to) {
    const fromId = p.id; const fromName = L.pname(p);
    return new Promise(res => {
      PK.sound.cry(fromId, 0.3);
      const m = PK.ui.modal(`<div class="evo"><div class="evo-stage"><img class="evo-a" src="${PK.URL.art(fromId)}" alt=""><img class="evo-b" src="${PK.URL.art(to)}" alt=""></div>
          <p class="evo-txt" data-txt>¿Eh? ¡${esc(fromName)} está evolucionando!</p><button class="btn btn-primary btn-lg" data-ok hidden>¡Genial!</button></div>`, { cls: 'evo-modal', closable: false, onClose: res });
      m.noEsc = true;
      const a = m.body.querySelector('.evo-a'), b = m.body.querySelector('.evo-b');
      a.classList.add('glow'); b.classList.add('glow');
      let i = 0; let delay = 520;
      const step = () => {
        i++;
        a.style.opacity = i % 2 ? 0 : 1; b.style.opacity = i % 2 ? 1 : 0;
        PK.sound.play('tap');
        delay = Math.max(110, delay * 0.82);
        if (i < 14) setTimeout(step, PK.fx.reduce ? 60 : delay);
        else {
          PK.fx.flash('#fff');
          a.style.opacity = 0; b.style.opacity = 1; b.classList.remove('glow');
          L.evolve(c, p, to);
          PK.sound.play('evolve'); PK.sound.cry(to, 0.35); PK.fx.confetti(90);
          m.body.querySelector('[data-txt]').innerHTML = `¡Enhorabuena! ¡Tu ${esc(fromName)} ha evolucionado en <b>${esc(PK.DEX[to].n)}</b>!`;
          const ok = m.body.querySelector('[data-ok]'); ok.hidden = false; ok.onclick = () => m.close();
        }
      };
      setTimeout(step, 1200);
    });
  }

  // ======================= Mensajes (tareas validadas, premios, racha, cumple, logros) =======================
  let processing = false;
  async function processQueue(c) {
    if (processing) return;
    processing = true;
    try {
      const logros = [];
      while (cur && cur.id === c.id && c.inbox.length) {
        const msg = c.inbox.shift(); save();
        if (msg.type === 'logro') { logros.push(msg.id); continue; }
        await showMessage(c, msg);
      }
      const p = L.active(c);
      if (p && cur && cur.id === c.id) await checkEvolutions(c, p, true);
      logros.forEach((id, i) => setTimeout(() => { const a = PK.ACHIEVEMENTS[id]; if (a) { PK.sound.play('success'); PK.ui.toast(`${a.icon} ¡Logro! <b>${esc(a.name)}</b>`, 'ok'); } }, i * 800));
      if (cur && cur.id === c.id && app().querySelector('.base')) main(c, true);
    } finally { processing = false; }
  }
  async function showMessage(c, msg) {
    const p = L.active(c);
    if (msg.type === 'xp') {
      if (!p) return;
      PK.sound.play('success');
      await info('🎁', `¡Regalo de papá y mamá!`, `<b>${esc(L.pname(p))}</b> recibe <b>${msg.amount}</b> puntos de nivel${msg.reason ? `<br><i>${esc(msg.reason)}</i>` : ''}`, '¡Gracias!');
      const g = L.gainXp(c, p, msg.amount);
      await showLevelUps(c, p, g);
      return;
    }
    const T = {
      tareas: () => ['✅', msg.points ? '¡Tareas validadas!' : 'Día revisado', msg.points ? `Papá o mamá han revisado tus tareas ${msg.day === PK.dayKey() ? 'de hoy' : msg.day === PK.addDays(PK.dayKey(), -1) ? 'de ayer' : 'del ' + esc(PK.fmtLong(msg.day))}: hiciste ${msg.done} de ${msg.total}. <b class="good">+${msg.points} ⚡</b>` : 'Esta vez no hay energía. ¡Mañana seguro que sí!'],
      bonus: () => ['🎁', '¡Premio sorpresa!', `<b class="good">+${msg.points} ⚡</b>${msg.reason ? `<br><i>${esc(msg.reason)}</i>` : ''}`],
      racha: () => ['🔥', `¡Racha de ${msg.days} días!`, `Has hecho todas tus tareas ${msg.days} días seguidos. <b class="good">+${msg.points} ⚡</b>`],
      cofre: () => ['🧰', '¡Cofre de la semana!', `La semana pasada hiciste el <b>${msg.pct}%</b> de tus tareas. Dentro hay <b class="good">+${msg.points} ⚡</b>, ${PK.CHEST.balls} Poké Balls y una Baya Zidra${msg.candy ? ' ¡y un Caramelo Raro! 🍬' : ''}`],
      cumple: () => ['🎂', `¡Feliz cumpleaños, ${esc(c.name)}!`, `¡${msg.age} años! Tus Pokémon te regalan <b class="good">+${msg.points} ⚡</b> y <b>${msg.candy} Caramelos Raros</b> 🍬`],
    };
    const f = T[msg.type]; if (!f) return;
    const [icon, title, text] = f();
    if (msg.points) { PK.sound.play('coin'); PK.fx.confetti(msg.type === 'cumple' ? 120 : 40); }
    await info(icon, title, text, '¡Bien!');
  }

  // ======================= Ficha de un Pokémon, perfil y medallas =======================
  function monSheet(c, p) {
    if (!p) return;
    const d = PK.DEX[p.id]; const s = L.stats(p.id, p.level);
    const moves = L.moves(p.id, p.level);
    const sh = PK.ui.sheet(`${esc(L.pname(p))}`, `<div class="mon-sheet" style="--tc:${PK.TYPES[d.t[0]].c}">
        <div class="ms-art">${PK.art.mon(p.id, 'md-img')}</div>
        <div class="ms-info"><p class="muted">${esc(d.n)} · ${esc(d.g)} · Nv. ${p.level}</p>${PK.art.types(p.id)}${p.held ? `<p class="mc-hint">🎒 Lleva: ${esc(PK.itemName(p.held))}</p>` : ''}
          <div class="ms-stats">${[['PS', s.hp], ['Ataque', s.atk], ['Defensa', s.def], ['At. Esp.', s.spa], ['Def. Esp.', s.spd], ['Velocidad', s.spe]].map(([n, v]) => `<div><span>${n}</span><b>${v}</b></div>`).join('')}</div>
          <h3 class="sh-sub">Ataques</h3><div class="ms-moves">${moves.map(id => `<span class="mv" style="--tc:${PK.TYPES[PK.MOVES[id].t].c}">${PK.TYPES[PK.MOVES[id].t].e} ${esc(PK.MOVES[id].n)} <small>${PK.MOVES[id].p}</small></span>`).join('')}</div>
          ${L.evoHint(p) ? `<p class="mc-hint">✨ ${esc(L.evoHint(p))}</p>` : '<p class="muted small">Ya está en su última evolución.</p>'}
          <label class="field"><span>Mote</span><div class="row-btns left"><input class="input" data-nick maxlength="12" value="${esc(p.nick || '')}" placeholder="${esc(d.n)}"><button class="btn btn-ghost btn-sm" data-save>Guardar</button></div></label>
          <p class="muted small">Con ${esc(c.name)} desde el ${esc(PK.fmtLong(p.caught))}.</p>
        </div></div>`, { onClose: () => main(c, true) });
    PK.sound.cry(p.id, 0.3);
    sh.body.querySelector('[data-save]').onclick = () => { p.nick = sh.body.querySelector('[data-nick]').value.trim(); save(); PK.ui.toast('Mote guardado ✓', 'ok'); };
  }
  function profileSheet(c) {
    const ach = Object.keys(c.achievements);
    PK.ui.sheet(`🎒 ${esc(c.name)}`, `<div class="profile-sheet">
        <div class="ps-head">${PK.art.trainer(c.trainer, 'ps-trainer')}<div><b>${esc(c.name)}</b><small>Entrenador como ${esc(PK.avatar(c.trainer).name)}</small>
          <div class="chips"><span class="chip">⚡ ${c.lifetime} ganada</span><span class="chip">🔥 racha ${L.streak(c).count} (mejor ${c.bestStreak})</span><span class="chip">📕 ${Object.keys(c.seen).length} vistos</span></div></div></div>
        <h3 class="sh-sub">🏅 Logros (${ach.length}/${Object.keys(PK.ACHIEVEMENTS).length})</h3>
        <div class="ach-grid">${Object.entries(PK.ACHIEVEMENTS).map(([id, a]) => `<div class="ach ${c.achievements[id] ? 'on' : ''}"><span>${a.icon}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`).join('')}</div>
      </div>`, { onClose: () => main(c, true) });
  }
  function medalsSheet(c) {
    const now = L.weekNumber();
    PK.ui.sheet(`🏅 Mis medallas (${Object.keys(c.badges).length} de 52)`, `<p class="muted">Cada semana del año, un gimnasio distinto. Esta es la semana ${now}.</p>
      <div class="medal-grid">${PK.GYMS.map((l, i) => `<div class="medal ${c.badges[l.id] ? 'on' : ''} ${i + 1 === now ? 'now' : ''}"><span class="md-n">${i + 1}</span>${PK.art.trainer(l.char, 'md-char')}${PK.art.medal(l.id)}<b>${esc(l.medal)}</b><small>${esc(l.name)}${c.badges[l.id] ? ` · ✅ ${esc(PK.fmtLong(c.badges[l.id].day))}` : ''}</small></div>`).join('')}</div>`, { onClose: () => main(c, true), cls: 'wide-sheet' });
  }

  // ======================= Pokédex =======================
  function pokedex(c) {
    let reg = PK.regionOfDex(L.active(c) ? L.active(c).id : 1);
    const REGS = [...PK.REGIONS.map(r => [r.id, r.name]), ['paldea', 'Otros']];
    const owned = new Set(c.pokemon.map(p => p.id));
    const ids = Object.keys(PK.DEX).map(Number).sort((a, b) => a - b);
    const sh = PK.ui.sheet('📕 Pokédex', '', { onClose: () => main(c, true), cls: 'wide-sheet' });
    const paint = () => {
      const list = ids.filter(id => PK.regionOfDex(id) === reg);
      const seen = Object.keys(c.seen).length;
      sh.body.innerHTML = `<p class="dex-count">Vistos: <b>${seen}</b> · Tuyos: <b>${owned.size}</b> · En el juego: <b>${ids.length}</b></p>
        <div class="reg-tabs">${REGS.map(([id, n]) => `<button class="kchip ${id === reg ? 'on' : ''}" data-reg="${id}">${esc(n)}</button>`).join('')}</div>
        <div class="dex-grid">${list.map(id => { const s = c.seen[id]; return `<button class="dex ${owned.has(id) ? 'own' : s ? 'seen' : 'unknown'}" data-id="${id}"><span class="dex-n">#${String(id).padStart(3, '0')}</span>${PK.art.mon(id, s ? '' : 'sil')}<b>${s ? esc(PK.DEX[id].n) : '???'}</b></button>`; }).join('')}</div>`;
      sh.body.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { PK.sound.play('tap'); reg = b.dataset.reg; paint(); });
      sh.body.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
        const id = Number(b.dataset.id);
        if (!c.seen[id]) { PK.ui.toast('Todavía no has visto este Pokémon. ¡Sigue entrenando!'); return; }
        dexDetail(c, id);
      });
    };
    paint();
  }
  function dexDetail(c, id) {
    const d = PK.DEX[id];
    const chain = Object.keys(PK.DEX).map(Number).filter(x => PK.DEX[x].c === d.c && !PK.EVO_BLOCK.has(x)).sort((a, b) => PK.DEX[a].st - PK.DEX[b].st || a - b);
    const total = d.s.reduce((a, b) => a + b, 0);
    PK.sound.cry(id, 0.3);
    PK.ui.modal(`<div class="mon-detail" style="--tc:${PK.TYPES[d.t[0]].c}">
        <div class="md-art">${PK.art.mon(id, 'md-img')}</div>
        <h2>#${String(id).padStart(3, '0')} ${esc(d.n)}</h2><p class="muted">${esc(d.g)}</p>${PK.art.types(id)}
        <div class="ms-stats">${[['PS', 0], ['Ataque', 1], ['Defensa', 2], ['At. Esp.', 3], ['Def. Esp.', 4], ['Velocidad', 5]].map(([n, k]) => `<div><span>${n}</span>${PK.art.bar(d.s[k], 160, 'stat')}<b>${d.s[k]}</b></div>`).join('')}<div><span>Total</span><b>${total}</b></div></div>
        ${chain.length > 1 ? `<h3 class="sh-sub">Evoluciones</h3><div class="evo-line">${chain.map(x => `<span class="el ${x === id ? 'on' : ''}">${c.seen[x] ? PK.art.mon(x) : PK.art.mon(x, 'sil')}<small>${c.seen[x] ? esc(PK.DEX[x].n) : '???'}</small></span>`).join('')}</div>` : ''}
      </div>`, { cls: 'wide' });
  }

  PK.kid = { home, open, refresh, main: c => main(c) };
})();
