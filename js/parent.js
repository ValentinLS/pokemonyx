/* Pokemonyx · panel de papá y mamá (con clave): validar, tareas, premios, niños, ajustes e historial */
(function () {
  'use strict';
  const L = PK.logic;
  const S = () => PK.store.s;
  const save = () => PK.store.save();
  const app = () => document.getElementById('app');
  const esc = PK.esc;
  let tab = 'validar';
  let sel = null;
  let fails = 0, lockedUntil = 0;

  // ======================= Clave =======================
  function pinPad({ title, sub, icon = '🔒', onPin }) {
    let val = '';
    const m = PK.ui.modal(`<div class="pin">
        <div class="pin-ico">${icon}</div><h2>${title}</h2><p class="muted" data-sub>${sub || ''}</p>
        <div class="pin-dots" data-dots>${'<span></span>'.repeat(4)}</div>
        <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="pin-key" data-k="${n}">${n}</button>`).join('')}<span></span><button class="pin-key" data-k="0">0</button><button class="pin-key alt" data-k="del" aria-label="Borrar">⌫</button></div>
      </div>`, { cls: 'pin-modal' });
    const dots = m.body.querySelectorAll('[data-dots] span');
    const subEl = m.body.querySelector('[data-sub]');
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
    const press = k => {
      if (Date.now() < lockedUntil) { subEl.textContent = `Demasiados intentos. Espera ${Math.ceil((lockedUntil - Date.now()) / 1000)} s.`; PK.fx.shake(m.body.querySelector('.pin')); return; }
      if (k === 'del') { val = val.slice(0, -1); paint(); return; }
      if (val.length >= 4) return;
      val += k; paint(); PK.sound.play('tap');
      if (val.length === 4) {
        const pin = val;
        setTimeout(() => {
          const r = onPin(pin, m);
          if (r === true) { m.close(); return; }
          val = ''; paint();
          if (r && r.next) { subEl.textContent = r.next; PK.sound.play('pop'); return; }
          PK.sound.play('error'); PK.fx.shake(m.body.querySelector('[data-dots]'));
          if (typeof r === 'string') subEl.textContent = r;
        }, 120);
      }
    };
    m.body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => press(b.dataset.k));
    const onKey = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
    document.addEventListener('keydown', onKey);
    const close0 = m.close; m.close = v => { document.removeEventListener('keydown', onKey); close0(v); };
    return m;
  }
  function open() {
    if (!S().pinHash) return createPin(() => { tab = S().children.length ? 'validar' : 'ninos'; panel(); });
    if (new URLSearchParams(location.search).has('nuevaclave')) {
      return PK.ui.confirm('¿Crear una clave nueva para el panel de papá y mamá?', { icon: '🗝️', ok: 'Crear clave', detail: 'La anterior dejará de valer. No se borra nada más.' })
        .then(ok => { if (ok) createPin(() => { history.replaceState(null, '', location.pathname); panel(); }); });
    }
    pinPad({
      title: 'Papá y mamá', sub: 'Escribe vuestra clave de 4 números',
      onPin: pin => {
        if (PK.hashPin(pin) === S().pinHash) { fails = 0; setTimeout(panel, 60); return true; }
        fails++;
        if (fails >= 5) { lockedUntil = Date.now() + 30000; fails = 0; return 'Demasiados intentos. Espera 30 segundos.'; }
        return 'Clave incorrecta';
      },
    });
  }
  function createPin(after) {
    let first = null;
    pinPad({
      icon: '🗝️', title: 'Crea vuestra clave', sub: '4 números que los niños no sepan',
      onPin: (pin, m) => {
        if (first === null) { first = pin; m.body.querySelector('h2').textContent = 'Repite la clave'; return { next: 'Escríbela otra vez para confirmar' }; }
        if (pin !== first) { first = null; m.body.querySelector('h2').textContent = 'Crea vuestra clave'; return 'No coinciden. Empieza otra vez.'; }
        S().pinHash = PK.hashPin(pin); save();
        PK.sound.play('success'); PK.ui.toast('🔐 Clave guardada', 'ok');
        setTimeout(after, 60);
        return true;
      },
    });
  }

  // ======================= Panel =======================
  const TABS = [
    { id: 'validar', name: 'Validar', ico: '✅' },
    { id: 'tareas', name: 'Tareas', ico: '📝' },
    { id: 'bonus', name: 'Premios', ico: '🎁' },
    { id: 'ninos', name: 'Niños', ico: '👧' },
    { id: 'ajustes', name: 'Ajustes', ico: '⚙️' },
    { id: 'historial', name: 'Historial', ico: '📜' },
  ];
  function panel() {
    PK.ui.closeAll();
    if (!sel || !L.child(sel)) sel = S().children[0] ? S().children[0].id : null;
    const pending = S().children.reduce((n, c) => n + L.pendingDays(c.id).length, 0);
    app().innerHTML = `<div class="screen parent">
        <header class="parent-top">
          <h1>👨‍👩‍👧‍👦 Papá y mamá</h1>
          <button class="btn btn-ghost btn-sm" data-exit>🔒 Salir</button>
        </header>
        <nav class="ptabs" role="tablist">${TABS.map(t => `<button class="ptab ${t.id === tab ? 'on' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === tab}"><span>${t.ico}</span>${t.name}${t.id === 'validar' && pending ? `<i class="badge">${pending}</i>` : ''}${t.id === 'bonus' && L.pendingRedemptions().length ? `<i class="badge">${L.pendingRedemptions().length}</i>` : ''}</button>`).join('')}</nav>
        <main class="pbody" data-pbody></main>
      </div>`;
    app().querySelector('[data-exit]').onclick = () => { PK.sound.play('tap'); PK.kid.home(); };
    app().querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { PK.sound.play('tap'); tab = b.dataset.tab; panel(); });
    const body = app().querySelector('[data-pbody]');
    ({ validar: tValidar, tareas: tTareas, bonus: tBonus, ninos: tNinos, ajustes: tAjustes, historial: tHistorial })[tab](body);
  }
  const kidChips = (current, attr = 'data-sel') => `<div class="kid-chips">${S().children.map(c => `<button class="kchip ${c.id === current ? 'on' : ''}" ${attr}="${c.id}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}</div>`;
  const noKids = el => { el.innerHTML = `<div class="pcard empty-card"><p>Todavía no hay niños.</p><button class="btn btn-primary" data-go>👧 Añadir niños</button></div>`; el.querySelector('[data-go]').onclick = () => { tab = 'ninos'; panel(); }; };
  const daysText = days => {
    const d = [...days].sort().join(',');
    if (d === '1,2,3,4,5,6,7') return 'Todos los días';
    if (d === '1,2,3,4,5') return 'De lunes a viernes';
    if (d === '6,7') return 'Fines de semana';
    return days.slice().sort().map(n => PK.DIAS_CORTOS[n - 1]).join(' · ');
  };

  // ----- Validar -----
  function tValidar(el) {
    if (!S().children.length) return noKids(el);
    const today = PK.dayKey();
    const atrasados = S().children.reduce((n, c) => n + L.pendingDays(c.id).filter(k => k !== today).length, 0);
    el.innerHTML = `<p class="lead">Marca lo que <b>de verdad</b> han hecho y valida el día. La energía ⚡ les llega al momento, con un aviso en su base.</p>` +
      (atrasados ? `<div class="pcard warn-card">⚠️ <b>${atrasados === 1 ? 'Hay 1 día' : `Hay ${atrasados} días`} sin validar.</b> Hasta que los validéis no les llega la energía de las tareas, y para entrar al campeonato necesitan ${L.champNeed()} días validados en la semana.</div>` : '') +
      S().children.map(c => {
        const days = L.pendingDays(c.id);
        const viejos = days.filter(k => k !== today);
        const w = L.weekTasks(c);
        return `<section class="pcard" style="--c:${c.color}">
          <h2 class="pc-title"><span class="dot"></span>${esc(c.name)} <small>⚡ ${c.energy} · 🔥 ${L.streak(c).count} · 🏆 ${w.dias}/${L.champNeed()} días esta semana</small></h2>
          ${!L.tasksOf(c.id).length ? `<p class="warn-line">⚠️ ${esc(c.name)} no tiene tareas: no puede ganar energía ni entrar al campeonato. <button class="btn btn-ghost btn-sm" data-ponertareas="${c.id}">📝 Ponerle tareas</button></p>` : ''}
          ${viejos.length > 1 ? `<div class="row-btns left"><button class="btn btn-ghost" data-validartodo="${c.id}">✅ Validar todo lo marcado (${viejos.length} días)</button></div>` : ''}
          ${days.length ? days.map(key => {
            const rec = L.day(c.id, key);
            return `<div class="vday" data-child="${c.id}" data-day="${key}">
              <div class="vday-head"><b>${PK.fmtDay(key, true)}</b>${key !== today && key !== PK.addDays(today, -1) ? '' : `<span class="muted">${PK.fmtLong(key)}</span>`}${key === today ? '<span class="tag">en curso</span>' : ''}</div>
              <div class="vlist">${rec.tasks.map(t => `<label class="vrow"><input type="checkbox" data-task="${t.id}" data-pts="${t.points}" ${rec.marked[t.id] ? 'checked' : ''}><span class="sw" aria-hidden="true"></span><span class="vi">${t.icon}</span><span class="vt">${esc(t.title)}<small>${rec.marked[t.id] ? `Marcada por ${esc(c.name)} ✓` : 'Sin marcar'}</small></span><span class="vp">+${t.points}</span></label>`).join('')}</div>
              <div class="vday-foot"><button class="btn btn-ghost btn-sm" data-all>Todas</button><button class="btn btn-ghost btn-sm" data-none>Ninguna</button><span class="grow"></span><button class="btn btn-primary" data-validate>Validar y dar <b data-sum>0</b> ⚡</button></div>
            </div>`;
          }).join('') : '<p class="muted ok-line">✓ Todo al día</p>'}
        </section>`;
      }).join('');
    el.querySelectorAll('[data-ponertareas]').forEach(b => b.onclick = () => { sel = b.dataset.ponertareas; tab = 'tareas'; panel(); });
    // Valida de golpe los días atrasados aprobando solo lo que el niño marcó como hecho.
    el.querySelectorAll('[data-validartodo]').forEach(b => b.onclick = async () => {
      const c = L.child(b.dataset.validartodo);
      const keys = L.pendingDays(c.id).filter(k => k !== today);
      const ok = await PK.ui.confirm(`¿Validar ${keys.length} días de ${esc(c.name)}?`, { icon: '✅', detail: 'Se aprueban solo las tareas que marcó como hechas. Lo que no marcó cuenta como no hecho.', ok: 'Validar' });
      if (!ok) return;
      let pts = 0, rachas = 0;
      for (const k of keys) {
        const rec = L.day(c.id, k);
        const r = rec && L.validate(c.id, k, new Set(Object.keys(rec.marked)));
        if (r) { pts += r.points; rachas += r.streaks.reduce((n, s) => n + s.points, 0); }
      }
      PK.sound.play('success');
      PK.ui.toast(`✅ ${esc(c.name)} recibe <b>+${pts} ⚡</b>${rachas ? ` y 🔥 +${rachas} ⚡ de racha` : ''}`, 'ok');
      panel();
    });
    el.querySelectorAll('.vday').forEach(box => {
      const sum = () => { box.querySelector('[data-sum]').textContent = [...box.querySelectorAll('[data-task]')].filter(i => i.checked).reduce((n, i) => n + Number(i.dataset.pts), 0); };
      sum();
      box.querySelectorAll('[data-task]').forEach(i => i.onchange = () => { PK.sound.play('tap'); sum(); });
      box.querySelector('[data-all]').onclick = () => { box.querySelectorAll('[data-task]').forEach(i => i.checked = true); sum(); };
      box.querySelector('[data-none]').onclick = () => { box.querySelectorAll('[data-task]').forEach(i => i.checked = false); sum(); };
      box.querySelector('[data-validate]').onclick = async () => {
        const childId = box.dataset.child, key = box.dataset.day;
        const c = L.child(childId);
        const ids = new Set([...box.querySelectorAll('[data-task]')].filter(i => i.checked).map(i => i.dataset.task));
        if (key === today && PK.date().getHours() < 18) {
          const ok = await PK.ui.confirm(`¿Validar ya el día de hoy de ${esc(c.name)}?`, { icon: '⏰', detail: 'Después ya no podrá marcar más tareas hoy.', ok: 'Validar' });
          if (!ok) return;
        }
        const r = L.validate(childId, key, ids);
        if (!r) return;
        PK.sound.play('success');
        let msg = `✅ ${esc(c.name)} recibe <b>+${r.points} ⚡</b>`;
        if (r.streaks.length) msg += ` y 🔥 premio de racha (+${r.streaks.reduce((n, s) => n + s.points, 0)} ⚡)`;
        PK.ui.toast(msg, 'ok');
        panel();
      };
    });
  }

  // ----- Tareas -----
  function tTareas(el) {
    if (!S().children.length) return noKids(el);
    const c = L.child(sel);
    const tasks = L.tasksOf(c.id);
    const others = S().children.filter(x => x.id !== c.id);
    const existing = new Set(tasks.map(t => t.title.toLowerCase()));
    const ideas = PK.TASK_TEMPLATES.filter(t => !existing.has(t.title.toLowerCase()));
    const total = L.tasksFor(c.id, PK.dayKey()).reduce((n, t) => n + t.points, 0);
    el.innerHTML = `${kidChips(c.id)}
      <section class="pcard" style="--c:${c.color}">
        <h2 class="pc-title"><span class="dot"></span>Tareas de ${esc(c.name)} <small>Hoy puede ganar hasta ${total} ⚡</small></h2>
        ${tasks.length ? `<div class="tlist">${tasks.map(t => `<div class="trow"><span class="ti">${t.icon}</span><div class="tt"><b>${esc(t.title)}</b><small>${daysText(t.days)}</small></div><span class="tp">+${t.points} ⚡</span><button class="mini-btn" data-edit="${t.id}" aria-label="Editar">✏️</button><button class="mini-btn" data-del="${t.id}" aria-label="Borrar">🗑️</button></div>`).join('')}</div>` : '<p class="muted">Aún no tiene tareas. Añade alguna o usa las ideas rápidas.</p>'}
        <button class="btn btn-primary" data-new>➕ Nueva tarea</button>
      </section>
      ${ideas.length ? `<section class="pcard"><h3>💡 Ideas rápidas <small class="muted">(un toque y se añade, todos los días)</small></h3><div class="idea-chips">${ideas.map(t => `<button class="idea" data-idea="${PK.TASK_TEMPLATES.indexOf(t)}">${t.icon} ${t.title} <b>+${t.points}</b></button>`).join('')}</div></section>` : ''}
      ${others.length && tasks.length ? `<section class="pcard"><h3>📋 Copiar estas tareas a…</h3><div class="row-btns left">${others.map(o => `<button class="btn btn-ghost btn-sm" data-copy="${o.id}">${esc(o.name)}</button>`).join('')}</div></section>` : ''}
      <p class="muted small">Referencia: un combate de entrenamiento cuesta ⚡ ${PK.COSTS.entrenar}, curar al equipo ⚡ ${PK.CARE.centro}, una Poción ⚡ 4. Unos 25-40 ⚡ al día dan para jugar bien.</p>`;
    el.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { sel = b.dataset.sel; panel(); });
    el.querySelector('[data-new]').onclick = () => taskEditor(c, null);
    el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => taskEditor(c, S().tasks.find(t => t.id === b.dataset.edit)));
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const t = S().tasks.find(x => x.id === b.dataset.del);
      if (await PK.ui.confirm(`¿Borrar la tarea «${esc(t.title)}» de ${esc(c.name)}?`, { icon: '🗑️', danger: true, ok: 'Borrar', detail: 'La energía que ya ganó no se pierde.' })) { L.removeTask(t.id); panel(); }
    });
    el.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { L.addTask(c.id, PK.TASK_TEMPLATES[Number(b.dataset.idea)]); PK.sound.play('pop'); panel(); });
    el.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
      const o = L.child(b.dataset.copy);
      const have = new Set(L.tasksOf(o.id).map(t => t.title.toLowerCase()));
      const add = tasks.filter(t => !have.has(t.title.toLowerCase()));
      if (!add.length) { PK.ui.toast(`${esc(o.name)} ya tiene todas estas tareas`); return; }
      if (!(await PK.ui.confirm(`¿Copiar ${add.length} ${add.length === 1 ? 'tarea' : 'tareas'} a ${esc(o.name)}?`, { icon: '📋', ok: 'Copiar' }))) return;
      add.forEach(t => L.addTask(o.id, { title: t.title, icon: t.icon, points: t.points, days: [...t.days] }));
      PK.ui.toast(`📋 Copiadas a ${esc(o.name)}`, 'ok');
    });
  }
  function taskEditor(c, task) {
    const t = task ? { ...task, days: [...task.days] } : { title: '', icon: '⭐', points: 5, days: [1, 2, 3, 4, 5, 6, 7] };
    const m = PK.ui.modal(`<div class="editor">
        <h2>${task ? '✏️ Editar tarea' : '➕ Nueva tarea'} <small>· ${esc(c.name)}</small></h2>
        <label class="field"><span>¿Qué tiene que hacer?</span><input class="input" data-title maxlength="40" placeholder="Por ejemplo: Recoger los juguetes" value="${esc(t.title)}"></label>
        <div class="field"><span>Dibujo</span><div class="icon-grid">${PK.TASK_ICONS.map(i => `<button type="button" class="icon-opt ${i === t.icon ? 'on' : ''}" data-icon="${i}">${i}</button>`).join('')}</div></div>
        <div class="field"><span>Energía que da ⚡</span><div class="stepper"><button type="button" class="btn btn-round" data-step="-1">−</button><b data-pts>${t.points}</b><button type="button" class="btn btn-round" data-step="1">+</button>${[5, 10, 15, 20].map(n => `<button type="button" class="btn btn-ghost btn-sm" data-preset="${n}">${n}</button>`).join('')}</div></div>
        <div class="field"><span>Qué días</span><div class="days">${PK.DIAS_CORTOS.map((d, i) => `<button type="button" class="day ${t.days.includes(i + 1) ? 'on' : ''}" data-day="${i + 1}">${d}</button>`).join('')}</div>
          <div class="row-btns left"><button type="button" class="btn btn-ghost btn-sm" data-qd="all">Todos</button><button type="button" class="btn btn-ghost btn-sm" data-qd="lv">Lunes a viernes</button><button type="button" class="btn btn-ghost btn-sm" data-qd="fin">Fin de semana</button></div></div>
        <div class="row-btns"><button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button></div>
      </div>`, { cls: 'wide' });
    const $ = s => m.body.querySelector(s);
    const paintDays = () => m.body.querySelectorAll('[data-day]').forEach(b => b.classList.toggle('on', t.days.includes(Number(b.dataset.day))));
    m.body.querySelectorAll('[data-icon]').forEach(b => b.onclick = () => { t.icon = b.dataset.icon; m.body.querySelectorAll('[data-icon]').forEach(x => x.classList.toggle('on', x === b)); });
    m.body.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { t.points = PK.clamp(t.points + Number(b.dataset.step), 1, 100); $('[data-pts]').textContent = t.points; });
    m.body.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { t.points = Number(b.dataset.preset); $('[data-pts]').textContent = t.points; });
    m.body.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { const d = Number(b.dataset.day); t.days = t.days.includes(d) ? t.days.filter(x => x !== d) : [...t.days, d]; paintDays(); });
    m.body.querySelectorAll('[data-qd]').forEach(b => b.onclick = () => { t.days = { all: [1, 2, 3, 4, 5, 6, 7], lv: [1, 2, 3, 4, 5], fin: [6, 7] }[b.dataset.qd]; paintDays(); });
    $('[data-cancel]').onclick = () => m.close();
    $('[data-save]').onclick = () => {
      const title = $('[data-title]').value.trim();
      if (!title) { PK.fx.shake($('[data-title]')); $('[data-title]').focus(); return; }
      if (!t.days.length) { PK.ui.toast('Elige al menos un día', 'warn'); return; }
      if (task) L.updateTask(task.id, { title, icon: t.icon, points: t.points, days: t.days.sort() });
      else L.addTask(c.id, { title, icon: t.icon, points: t.points, days: t.days.sort() });
      PK.sound.play('pop'); m.close(); panel();
    };
  }

  // ----- Premios -----
  function tBonus(el) {
    if (!S().children.length) return noKids(el);
    const c = L.child(sel);
    let kind = 'energia', amount = 10;
    const AM = { energia: [5, 10, 20, 30], xp: [25, 50, 100, 200] };
    const LIM = { energia: PK.LIMITS.premioDia, xp: PK.LIMITS.expDia };
    const recent = S().history.filter(h => h.type === 'bonus' || h.type === 'xp').slice(0, 8);
    const p = L.active(c);
    el.innerHTML = `${kidChips(c.id)}
      <section class="pcard" style="--c:${c.color}">
        <h2 class="pc-title"><span class="dot"></span>Premio extra para ${esc(c.name)}</h2>
        <p class="muted">Por ayudar en casa, portarse genial o cualquier cosa que queráis premiar. Le saldrá como sorpresa al entrar.</p>
        <div class="field"><span>¿Qué le dais?</span><div class="row-btns left"><button class="btn btn-ghost kind on" data-kind="energia">⚡ Energía</button><button class="btn btn-ghost kind" data-kind="xp" ${p ? '' : 'disabled'}>✨ Puntos de nivel${p ? ` para ${esc(L.pname(p))}` : ''}</button></div></div>
        <div class="field"><span>¿Cuánto?</span><div class="row-btns left" data-amounts></div><small class="muted" data-left></small></div>
        <div class="field"><span>¿Por qué?</span><div class="idea-chips">${PK.BONUS_REASONS.map(r => `<button class="idea" data-reason="${esc(r)}">${esc(r)}</button>`).join('')}</div>
          <input class="input" data-rtext maxlength="60" placeholder="O escribidlo vosotros"></div>
        <button class="btn btn-primary btn-lg" data-give>🎁 Dar <b data-am>${amount}</b> <span data-unit>⚡</span> a ${esc(c.name)}</button>
      </section>
      ${homeRewardsHtml()}
      ${recent.length ? `<section class="pcard"><h3>Últimos premios</h3><div class="hist">${recent.map(h => `<div class="hrow"><span>${PK.fmtTime(h.ts)}</span><b>${esc((L.child(h.childId) || {}).name || '—')}</b><span class="grow">${esc(h.note)}</span><span class="good">+${h.points} ${h.type === 'xp' ? 'EXP' : '⚡'}</span></div>`).join('')}</div></section>` : ''}`;
    el.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { sel = b.dataset.sel; panel(); });
    const am = el.querySelector('[data-am]'), unit = el.querySelector('[data-unit]'), box = el.querySelector('[data-amounts]');
    const paintAmounts = () => {
      const left = L.bonusLeft(c.id, kind), u = kind === 'xp' ? 'EXP' : '⚡';
      amount = Math.min(amount, left);
      box.innerHTML = AM[kind].map(n => `<button class="btn btn-ghost amount ${n === amount ? 'on' : ''}" data-amount="${n}" ${n > left ? 'disabled' : ''}>${n} ${u}</button>`).join('') + `<input class="input num" type="number" min="1" max="${left}" placeholder="Otra" data-custom ${left ? '' : 'disabled'}>`;
      el.querySelector('[data-left]').innerHTML = left
        ? `Hoy le podéis dar hasta <b>${left} ${u}</b> más (tope diario ${LIM[kind]} ${u}). Así la energía sale sobre todo de las tareas.`
        : `Hoy ya ha recibido el máximo de premios (${LIM[kind]} ${u}). Mañana se puede dar más.`;
      box.querySelectorAll('[data-amount]').forEach(b => b.onclick = () => { amount = Number(b.dataset.amount); box.querySelectorAll('[data-amount]').forEach(x => x.classList.toggle('on', x === b)); am.textContent = amount; });
      box.querySelector('[data-custom]').oninput = e => { const v = Math.round(Number(e.target.value)); if (v > 0) { amount = Math.min(left, v); box.querySelectorAll('[data-amount]').forEach(x => x.classList.remove('on')); am.textContent = amount; } };
      am.textContent = amount;
      el.querySelector('[data-give]').disabled = !left;
      unit.textContent = u;
    };
    paintAmounts();
    el.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { kind = b.dataset.kind; amount = AM[kind][1]; el.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); paintAmounts(); });
    const rt = el.querySelector('[data-rtext]');
    el.querySelectorAll('[data-reason]').forEach(b => b.onclick = () => { rt.value = b.dataset.reason; el.querySelectorAll('[data-reason]').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-give]').onclick = () => {
      const given = L.bonus(c.id, amount, rt.value.trim(), kind);
      if (!given) { PK.ui.toast('Hoy ya ha recibido el máximo de premios', 'warn'); panel(); return; }
      PK.sound.play('success'); PK.fx.confetti(40);
      PK.ui.toast(`🎁 ${esc(c.name)} recibe <b>+${given} ${kind === 'xp' ? 'EXP' : '⚡'}</b>`, 'ok');
      panel();
    };
    homeRewardsWire(el);
  }

  // ----- Premios de casa: los ponéis vosotros y los niños los canjean con energía -----
  function homeRewardsHtml() {
    const list = L.homeRewards();
    const pend = L.pendingRedemptions();
    const have = new Set(list.map(r => r.title.toLowerCase()));
    const ideas = PK.HOME_REWARD_IDEAS.filter(r => !have.has(r.title.toLowerCase()));
    return `${pend.length ? `<section class="pcard warn-card"><h3>🎁 Canjeados, pendientes de dar</h3>${pend.map(x => `<div class="home-row"><span>${esc(x.icon)}</span><b>${esc((L.child(x.childId) || {}).name || '—')}</b><span class="grow">${esc(x.title)} <small class="muted">⚡ ${x.cost} · ${PK.fmtTime(x.ts)}</small></span>
          <button class="btn btn-primary btn-sm" data-deliver="${x.id}">✅ Dado</button><button class="btn btn-ghost btn-sm" data-refund="${x.id}">↩️ Devolver ⚡</button></div>`).join('')}</section>` : ''}
      <section class="pcard"><h3>🏠 Premios de casa</h3>
        <p class="muted">Cosas de verdad que los niños pueden conseguir ahorrando energía. Al canjearlas os aparecen arriba para dárselas. Como referencia: un día con todas las tareas da unos ⚡40-60.</p>
        ${list.length ? list.map(r => `<div class="home-row"><span>${esc(r.icon)}</span><span class="grow">${esc(r.title)}</span><b>⚡ ${r.cost}</b><button class="btn btn-ghost btn-sm" data-delreward="${r.id}" aria-label="Quitar">✕</button></div>`).join('') : '<p class="muted">Todavía no hay ninguno.</p>'}
        ${ideas.length ? `<div class="field"><span>Ideas (un toque y se añade)</span><div class="idea-chips">${ideas.map(r => `<button class="idea" data-rewardidea="${PK.HOME_REWARD_IDEAS.indexOf(r)}">${r.icon} ${esc(r.title)} <b>⚡${r.cost}</b></button>`).join('')}</div></div>` : ''}
        <div class="field"><span>O uno vuestro</span><div class="row-btns left"><input class="input" data-rtitle maxlength="50" placeholder="Ej.: ir al parque de bolas"><input class="input num" type="number" min="10" max="2000" value="100" data-rcost aria-label="Precio en energía"><button class="btn btn-primary btn-sm" data-addreward>Añadir</button></div></div>
      </section>`;
  }
  function homeRewardsWire(el) {
    el.querySelectorAll('[data-deliver]').forEach(b => b.onclick = () => { L.resolveRedemption(b.dataset.deliver, true); PK.sound.play('success'); PK.ui.toast('¡Premio entregado!', 'ok'); panel(); });
    el.querySelectorAll('[data-refund]').forEach(b => b.onclick = async () => {
      if (!await PK.ui.confirm('¿Anular el canje y devolverle la energía?', { icon: '↩️', ok: 'Devolver', cancel: 'No' })) return;
      L.resolveRedemption(b.dataset.refund, false); PK.ui.toast('Energía devuelta', 'ok'); panel();
    });
    el.querySelectorAll('[data-delreward]').forEach(b => b.onclick = () => { L.removeHomeReward(b.dataset.delreward); panel(); });
    el.querySelectorAll('[data-rewardidea]').forEach(b => b.onclick = () => { L.addHomeReward(PK.HOME_REWARD_IDEAS[Number(b.dataset.rewardidea)]); PK.sound.play('pop'); panel(); });
    const add = el.querySelector('[data-addreward]');
    if (add) add.onclick = () => {
      const r = L.addHomeReward({ title: el.querySelector('[data-rtitle]').value, icon: '🎁', cost: Number(el.querySelector('[data-rcost]').value) });
      if (!r) { PK.ui.toast('Escribid el premio', 'warn'); return; }
      PK.sound.play('pop'); panel();
    };
  }

  // ----- Niños -----
  function tNinos(el) {
    const kids = S().children;
    el.innerHTML = `${kids.map(c => {
      const p = L.active(c);
      return `<section class="pcard kid-card" data-kid="${c.id}" style="--c:${c.color}">
        <div class="kc-head">
          <div class="kc-art">${p ? PK.art.mon(p.id) : c.trainer ? PK.art.trainer(c.trainer) : '<span class="pf-ball">❔</span>'}</div>
          <div><h2 class="pc-title">${esc(c.name)}</h2><p class="muted">${c.trainer ? `Entrenador: ${esc(PK.avatar(c.trainer).name)} · ` : 'Aún no ha elegido entrenador · '}${c.pokemon.length} Pokémon${p ? ` · compañero: ${esc(L.pname(p))} (Nv. ${p.level})` : ''}</p>
          <div class="chips"><span class="chip">⚡ ${c.energy} para gastar</span><span class="chip">🌟 ${c.lifetime} ganada</span><span class="chip">🏅 ${Object.keys(c.badges).length} medallas</span><span class="chip">🔥 ${L.streak(c).count} (mejor ${c.bestStreak})</span>${c.stolen.length ? `<span class="chip warn">🚀 Team Rocket tiene ${c.stolen.length}</span>` : ''}</div></div>
        </div>
        <div class="grid2">
          <label class="field"><span>Nombre</span><input class="input" data-name maxlength="20" value="${esc(c.name)}"></label>
          <label class="field"><span>Cumpleaños</span><input class="input" type="date" data-bday value="${c.birthday || ''}"></label>
        </div>
        <div class="field"><span>Dificultad de combates y retos del Team Rocket</span><div class="row-btns left">${Object.entries(PK.DIFFICULTY).map(([id, d]) => `<button type="button" class="btn btn-ghost btn-sm diff ${c.difficulty === id ? 'on' : ''}" data-diff="${id}">${d.name} <small>(${d.ages})</small></button>`).join('')}</div></div>
        <div class="field"><span>Color</span><div class="swatches">${PK.CHILD_COLORS.map(col => `<button type="button" class="sw-c ${col === c.color ? 'on' : ''}" data-col="${col}" style="background:${col}" aria-label="Color"></button>`).join('')}</div></div>
        <div class="row-btns left">
          <button class="btn btn-primary btn-sm" data-save>Guardar</button>
          <button class="btn btn-ghost btn-sm" data-adjust>± Ajustar energía</button>
          ${c.trainer ? '<button class="btn btn-ghost btn-sm" data-trainer>🧢 Cambiar de entrenador</button>' : ''}
          ${c.stolen.length ? '<button class="btn btn-ghost btn-sm" data-free>🦸 Rescatar ya del Team Rocket</button>' : ''}
          <button class="btn btn-ghost btn-sm danger-txt" data-remove>Eliminar</button>
        </div>
      </section>`;
    }).join('')}
      <section class="pcard add-kid">
        <h3>➕ Añadir niño</h3>
        <div class="grid2">
          <label class="field"><span>Nombre</span><input class="input" data-nname maxlength="20" placeholder="Nombre"></label>
          <label class="field"><span>Cumpleaños (para su premio)</span><input class="input" type="date" data-nbday></label>
        </div>
        <div class="field"><span>Dificultad</span><div class="row-btns left">${Object.entries(PK.DIFFICULTY).map(([id, d]) => `<button type="button" class="btn btn-ghost btn-sm ndiff ${id === 'normal' ? 'on' : ''}" data-ndiff="${id}">${d.name} <small>(${d.ages})</small></button>`).join('')}</div></div>
        <button class="btn btn-primary" data-add>Añadir</button>
        <p class="muted small">${kids.length ? 'Después, en <b>Tareas</b>, ponedle sus tareas del día.' : 'Añadid a cada niño. Al entrar por primera vez elegirá su entrenador y su primer Pokémon.'}</p>
      </section>`;
    el.querySelectorAll('[data-kid]').forEach(card => {
      const c = L.child(card.dataset.kid);
      let color = c.color, diff = c.difficulty;
      card.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { color = b.dataset.col; card.querySelectorAll('[data-col]').forEach(x => x.classList.toggle('on', x === b)); });
      card.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { diff = b.dataset.diff; card.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', x === b)); });
      card.querySelector('[data-save]').onclick = () => {
        const name = card.querySelector('[data-name]').value.trim();
        if (!name) return PK.fx.shake(card.querySelector('[data-name]'));
        c.name = name; c.birthday = card.querySelector('[data-bday]').value; c.color = color; c.difficulty = diff;
        save(); PK.ui.toast('Guardado ✓', 'ok'); panel();
      };
      card.querySelector('[data-adjust]').onclick = () => adjustEnergy(c);
      const tr = card.querySelector('[data-trainer]');
      if (tr) tr.onclick = async () => { if (await PK.ui.confirm(`¿Dejar que ${esc(c.name)} elija otro entrenador?`, { icon: '🧢', ok: 'Sí', detail: 'Conserva sus Pokémon, medallas y energía.' })) { c.trainer = null; save(); PK.ui.toast('La próxima vez que entre podrá elegir', 'ok'); panel(); } };
      const fr = card.querySelector('[data-free]');
      if (fr) fr.onclick = async () => { if (await PK.ui.confirm(`¿Devolver ya a ${esc(c.name)} sus Pokémon del Team Rocket?`, { icon: '🦸', ok: 'Devolver' })) { L.freeStolen(c); PK.ui.toast('Pokémon devueltos', 'ok'); panel(); } };
      card.querySelector('[data-remove]').onclick = async () => {
        if (!(await PK.ui.confirm(`¿Eliminar a ${esc(c.name)} del juego?`, { icon: '⚠️', danger: true, ok: 'Eliminar', detail: 'Se borran sus Pokémon, sus tareas, medallas y energía. No se puede deshacer.' }))) return;
        if (!(await PK.ui.confirm('¿Seguro? Esto no tiene vuelta atrás.', { icon: '🗑️', danger: true, ok: 'Sí, eliminar' }))) return;
        L.removeChild(c.id); sel = null; panel();
      };
    });
    let ndiff = 'normal';
    el.querySelectorAll('[data-ndiff]').forEach(b => b.onclick = () => { ndiff = b.dataset.ndiff; el.querySelectorAll('[data-ndiff]').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-add]').onclick = () => {
      const n = el.querySelector('[data-nname]');
      if (!n.value.trim()) { PK.fx.shake(n); n.focus(); return; }
      const c = L.addChild({ name: n.value, birthday: el.querySelector('[data-nbday]').value, difficulty: ndiff });
      sel = c.id; PK.sound.play('pop'); PK.ui.toast(`👋 ${esc(c.name)} añadido`, 'ok'); panel();
    };
  }
  function adjustEnergy(c) {
    let v = 0;
    const m = PK.ui.modal(`<div class="editor">
        <h2>± Energía de ${esc(c.name)}</h2>
        <p class="muted">Tiene ${c.energy} ⚡. Úsalo para corregir un error.</p>
        <div class="stepper big"><button class="btn btn-round" data-s="-10">−10</button><button class="btn btn-round" data-s="-1">−1</button><b data-v>0</b><button class="btn btn-round" data-s="1">+1</button><button class="btn btn-round" data-s="10">+10</button></div>
        <input class="input" data-note maxlength="60" placeholder="Motivo (opcional)">
        <div class="row-btns"><button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-ok>Aplicar</button></div>
      </div>`, { cls: 'small' });
    m.body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { v += Number(b.dataset.s); m.body.querySelector('[data-v]').textContent = (v > 0 ? '+' : '') + v; });
    m.body.querySelector('[data-cancel]').onclick = () => m.close();
    m.body.querySelector('[data-ok]').onclick = () => { if (v) L.adjust(c, v, m.body.querySelector('[data-note]').value.trim()); m.close(); panel(); };
  }

  // ----- Ajustes -----
  function tAjustes(el) {
    const st = S().settings;
    const r = L.weekRegion(), ld = L.weekLeader();
    el.innerHTML = `
      <section class="pcard"><h3>📱 Jugar en la tablet</h3><div data-net><p class="muted">Comprobando la conexión…</p></div></section>
      <section class="pcard"><h3>🔐 Clave</h3><p class="muted">Protege este panel. Es un candado para niños, no una caja fuerte.</p><button class="btn btn-ghost" data-pin>Cambiar la clave</button></section>
      <section class="pcard"><h3>🎛️ Juego</h3>
        <label class="toggle"><input type="checkbox" data-sound ${st.sound ? 'checked' : ''}><span class="sw"></span>Sonidos y gritos de los Pokémon</label>
        <div class="field" style="margin-top:12px"><span>🏆 Días del campeonato (esta semana: ${esc(r.name)}, líder ${esc(ld.name)})</span><div class="days">${PK.DIAS_CORTOS.map((d, i) => `<button type="button" class="day ${st.champDays.includes(i + 1) ? 'on' : ''}" data-cday="${i + 1}">${d}</button>`).join('')}</div></div>
        <label class="field inline"><span>🚀 El Team Rocket aparece a partir de las</span><input class="input num" type="number" min="0" max="22" data-rh value="${st.rocketHour}"> h</label>
        <label class="field inline"><span>🏆 Días con tareas validadas para entrar al campeonato</span><input class="input num" type="number" min="0" max="7" data-ctd value="${L.champNeed()}"> de 7</label>
        <label class="field inline"><span>🎂 Premio de cumpleaños</span><input class="input num" type="number" min="0" max="500" data-bb value="${st.birthdayBonus}"> ⚡</label>
      </section>
      <section class="pcard"><h3>🏆 Cómo funciona</h3>
        <div class="rules">
          <div><b>Energía ⚡</b><span>Llega al validar las tareas. Sirve para entrenar (⚡ ${PK.COSTS.entrenar}), curar en el Centro Pokémon (⚡ ${PK.CARE.centro}), cuidar (⚡ 1-2) y comprar en la tienda (pociones ⚡ 4-14, bayas ⚡ 2-4, Caramelo Raro ⚡ ${PK.item('rare-candy').cost}, piedras evolutivas ⚡ ${PK.item('fire-stone').cost}).</span></div>
          <div><b>Límites</b><span>Premios de papá y mamá: hasta ${PK.LIMITS.premioDia} ⚡ y ${PK.LIMITS.expDia} EXP por niño y día. Un Caramelo Raro al día. Los objetos de combate (Banda, Gafas, Vidasfera), uno de cada en la mochila. Así la energía sale sobre todo de las tareas.</span></div>
          <div><b>Cofre de la semana</b><span>Si un niño hace el ${Math.round(PK.LIMITS.cofre * 100)}% de sus tareas de la semana, el lunes encuentra un cofre: +${PK.CHEST.energia} ⚡, ${PK.CHEST.balls} Poké Balls, una Baya Zidra y a veces un Caramelo Raro. Se puede ganar hasta el domingo siguiente si validáis tarde.</span></div>
          <div><b>Escenario del día</b><span>Cada día hay un escenario pintado distinto, de la región del gimnasio de la semana. Los escondites son cosas del propio dibujo (arbustos, árboles, hierba alta, rocas, nubes, agua, la hoguera…) marcados con destellos: al tocarlos sale un Pokémon salvaje para atrapar con Poké Balls (⚡ 3-10 en la tienda) o un objeto de regalo. Además hay 3 rarezas asomando por detrás de las cosas del dibujo: cosas que no encajan (un patito, una Poké Ball, una medalla…). Cada rareza que encuentran da un objeto, y hay una pista al día.</span></div><div><b>Niveles y evolución</b><span>Los Pokémon ganan experiencia combatiendo (entrenamientos y campeonatos), en las misiones del Team Rocket y con vuestros premios. Evolucionan como en los juegos: al nivel oficial, con piedras o con mucha amistad.</span></div>
          <div><b>Campeonato semanal</b><span>Los días marcados arriba, si el niño lleva al menos ${L.champNeed()} días con tareas validadas esa semana. Tres combates (dos entrenadores y el líder del gimnasio de la semana). Cada ronda ganada da +${PK.REWARDS.rondaEnergia} ⚡; quien gana se lleva la medalla, +${PK.REWARDS.campeonEnergia} ⚡, un Caramelo Raro y elige un Pokémon nuevo. Los rivales suben de nivel con cada medalla (pero nunca más de ${PK.CHAMP_LEVEL.encima} niveles por encima del equipo ni más de ${PK.CHAMP_LEVEL.debajo} por debajo), así que entrenar ayuda a ganar. Hay 52 gimnasios, uno por semana del año.</span></div>
          <div><b>Metas para ahorrar</b><span>En la tienda (⭐ Metas): el huevo misterioso por ⚡${PK.EGG.cost}, con un Pokémon raro que no tengan, y los premios de casa que pongáis en «Premios». Cuando canjean uno, os sale ahí para dárselo o devolver la energía.</span></div>
          <div><b>Team Rocket</b><span>Aparece un día al azar de lunes a viernes desde la hora indicada. Tres retos (cálculo, memoria, lógica, rompecabezas…). Si supera 2, gana +${PK.REWARDS.rocketEnergia} ⚡ y experiencia; si no, se llevan un Pokémon (nunca el que lleva puesto ni el último que ha llegado; se puede rescatar desde el día siguiente) o algo de energía si no hay otro.</span></div>
          <div><b>Constancia</b><span>${PK.STREAK_REWARDS.map(x => `${x.days} días seguidos: +${x.points} ⚡`).join(' · ')}. Cuenta solo si se validan TODAS las tareas del día.</span></div>
          <div><b>Cumpleaños</b><span>+${st.birthdayBonus} ⚡ y 2 Caramelos Raros.</span></div>
        </div>
      </section>
      <section class="pcard"><h3>💾 Copia de seguridad</h3>
        <p class="muted">La partida se guarda en el PC (carpeta <code>Pokemonyx/datos</code>, con una copia diaria). Además podéis descargar una copia.</p>
        <div class="row-btns left"><button class="btn btn-ghost" data-export>⬇️ Descargar copia</button><label class="btn btn-ghost file-btn">⬆️ Restaurar copia<input type="file" accept="application/json,.json" data-import hidden></label></div>
      </section>
      <section class="pcard danger"><h3>⚠️ Empezar de cero</h3><p class="muted">Borra niños, Pokémon, tareas y energía.</p><button class="btn btn-danger" data-reset>Borrar todo</button></section>
      <p class="muted small">Pokemonyx es un juego familiar hecho en casa. Pokémon y sus personajes son de Nintendo, Game Freak, Creatures y The Pokémon Company; las imágenes se cargan de PokeAPI y Pokémon Showdown. Solo para uso privado: no se publica.</p>`;
    netInfo(el.querySelector('[data-net]'));
    el.querySelector('[data-pin]').onclick = () => createPin(() => panel());
    el.querySelector('[data-sound]').onchange = e => { st.sound = e.target.checked; save(); PK.sound.play('pop'); };
    el.querySelectorAll('[data-cday]').forEach(b => b.onclick = () => {
      const d = Number(b.dataset.cday);
      const next = st.champDays.includes(d) ? st.champDays.filter(x => x !== d) : [...st.champDays, d].sort();
      if (!next.length) { PK.ui.toast('Deja al menos un día de campeonato', 'warn'); return; }
      st.champDays = next; save(); b.classList.toggle('on');
    });
    el.querySelector('[data-rh]').onchange = e => { st.rocketHour = PK.clamp(Math.round(Number(e.target.value)) || 0, 0, 22); save(); PK.ui.toast('Guardado ✓', 'ok'); };
    el.querySelector('[data-ctd]').onchange = e => { st.champTaskDays = PK.clamp(Math.round(Number(e.target.value)) || 0, 0, 7); save(); PK.ui.toast('Guardado ✓', 'ok'); };
    el.querySelector('[data-bb]').onchange = e => { st.birthdayBonus = PK.clamp(Math.round(Number(e.target.value)) || 0, 0, 500); save(); PK.ui.toast('Guardado ✓', 'ok'); };
    el.querySelector('[data-export]').onclick = () => {
      const blob = new Blob([PK.store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `pokemonyx-copia-${PK.dayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      PK.ui.toast('⬇️ Copia descargada', 'ok');
    };
    el.querySelector('[data-import]').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!(await PK.ui.confirm('¿Restaurar esta copia?', { icon: '⬆️', danger: true, ok: 'Restaurar', detail: 'Sustituye toda la partida actual.' }))) { e.target.value = ''; return; }
      try { PK.store.replace(JSON.parse(await f.text())); PK.ui.toast('✅ Copia restaurada', 'ok'); sel = null; tab = 'validar'; panel(); }
      catch (err) { PK.ui.toast('❌ Ese archivo no es una copia de Pokemonyx', 'warn'); }
    };
    el.querySelector('[data-reset]').onclick = async () => {
      if (!(await PK.ui.confirm('¿Borrar TODO Pokemonyx?', { icon: '⚠️', danger: true, ok: 'Borrar todo', detail: 'Pokémon, energía, medallas, tareas y clave. No se puede deshacer (salvo con una copia).' }))) return;
      if (!(await PK.ui.confirm('Última confirmación: ¿seguro?', { icon: '🗑️', danger: true, ok: 'Sí, borrar' }))) return;
      PK.store.reset(); sel = null; tab = 'validar'; PK.kid.home();
    };
  }
  async function netInfo(box) {
    if (!PK.store.server) {
      box.innerHTML = `<p class="muted">Ahora mismo el juego <b>no está conectado al PC de casa</b> y la partida se guarda solo en este navegador. Para jugar en la tablet, abrid <b>Pokemonyx.bat</b> en el PC.</p>`;
      return;
    }
    try {
      const r = await fetch('api/info', { cache: 'no-store' });
      const info = await r.json();
      const urls = (info.urls || []).filter(u => !/localhost|127\.0\.0\.1/.test(u));
      box.innerHTML = urls.length
        ? `<p>Con el PC encendido y <b>Pokemonyx.bat</b> abierto, en la tablet (misma wifi) abrid:</p>${urls.map(u => `<p class="net-url">${esc(u)}</p>`).join('')}<p class="muted small">Consejo: añadidla a la pantalla de inicio de la tablet. Si no carga, revisad que Windows deje a Python usar la red privada.</p>`
        : '<p class="muted">El servidor solo está escuchando en este PC (modo local). Abrid <b>Pokemonyx.bat</b> para que se vea en la tablet.</p>';
    } catch (e) { box.innerHTML = '<p class="muted">No he podido leer la dirección del PC.</p>'; }
  }

  // ----- Historial -----
  function tHistorial(el) {
    const NAMES = { tareas: '✅ Tareas', bonus: '🎁 Premio', xp: '✨ Puntos de nivel', racha: '🔥 Racha', cumple: '🎂 Cumpleaños', gasto: '🛍️ Gasto', ajuste: '± Ajuste', campeonato: '🏆 Campeonato', cofre: '🧰 Cofre semanal', rocket: '🚀 Team Rocket', evolucion: '🌟 Evolución', pokemon: '📕 Pokémon nuevo' };
    let filter = 'all';
    const render = () => {
      const rows = S().history.filter(h => filter === 'all' || h.childId === filter).slice(0, 150);
      el.innerHTML = `<div class="kid-chips"><button class="kchip ${filter === 'all' ? 'on' : ''}" data-f="all">Todos</button>${S().children.map(c => `<button class="kchip ${filter === c.id ? 'on' : ''}" data-f="${c.id}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}</div>
        <section class="pcard">${rows.length ? `<div class="hist">${rows.map(h => `<div class="hrow"><span class="muted">${PK.fmtTime(h.ts)}</span><b>${esc((L.child(h.childId) || {}).name || '—')}</b><span>${NAMES[h.type] || h.type}</span><span class="grow">${esc(h.note || '')}</span>${h.points ? `<span class="${h.points >= 0 ? 'good' : 'bad'}">${h.points > 0 ? '+' : ''}${h.points} ${h.type === 'xp' ? 'EXP' : '⚡'}</span>` : ''}</div>`).join('')}</div>` : '<p class="muted">Todavía no hay movimientos.</p>'}</section>`;
      el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; render(); });
    };
    render();
  }

  PK.parent = { open, panel, visible: () => !!app().querySelector('.parent') };
})();
