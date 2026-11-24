/* Pokemonyx · datos y reglas.
   La partida se guarda en el PC de casa (servidor.py → datos/estado.json) para que la tablet y el PC
   vean lo mismo. Si se abre con doble clic, se guarda solo en ese navegador. */
(function () {
  'use strict';
  const KEY = 'pokemonyx-v1';
  const API = 'api/estado';
  const HISTORY_MAX = 800;

  const blank = () => ({
    version: 1,
    pinHash: null,
    settings: { sound: true, birthdayBonus: 50, champDays: [6, 7], rocketHour: 15 },
    children: [],
    tasks: [],
    days: {},
    homeRewards: [],
    redemptions: [],
    history: [],
    createdAt: PK.now(),
    startDay: PK.dayKey(),
  });

  let state = null;
  let rev = 0;
  let server = false;
  let memoryOnly = false;
  let saving = false;
  let dirty = false;
  let timer = null;
  let offline = false;
  let holds = 0;
  const listeners = [];

  function normalizeChild(c) {
    c.energy ??= 0; c.lifetime ??= 0; c.difficulty ??= 'normal'; c.trainer ??= null;
    c.pokemon ??= []; c.active ??= null; c.bag ??= {}; c.badges ??= {}; c.seen ??= {};
    c.champ ??= {}; c.rocket ??= {}; c.stolen ??= []; c.care ??= {};
    c.achievements ??= {}; c.inbox ??= []; c.streakClaims ??= {}; c.birthdayClaims ??= {};
    c.bestStreak ??= 0; c.createdDay ??= PK.dayKey(); c.color ??= PK.CHILD_COLORS[0]; c.lastTick ??= PK.dayKey();
    c.stats ??= { spots: 0, caught: 0 }; c.gifts ??= {};
    // v2: entrenadores con dibujo oficial (los antiguos eran pixel art) y 5 Poké Balls de regalo.
    if (c.trainer && PK.CHARS && !PK.CHARS[c.trainer]) { c.trainer = null; c.newTrainers = true; }
    if (!c.gifts.balls) { c.gifts.balls = 1; c.bag['poke-ball'] = (c.bag['poke-ball'] || 0) + 5; }
    return c;
  }
  function migrate(s) {
    const b = blank();
    for (const k of Object.keys(b)) if (s[k] === undefined) s[k] = b[k];
    s.settings = Object.assign(b.settings, s.settings || {});
    s.children.forEach(normalizeChild);
  }

  const isWeb = () => /^https?:$/.test(location.protocol);
  async function req(url, opts = {}, ms = 5000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctl.signal, cache: 'no-store' }); }
    finally { clearTimeout(t); }
  }

  async function load() {
    let local = null;
    try { const raw = localStorage.getItem(KEY); if (raw) local = JSON.parse(raw); } catch (e) { memoryOnly = true; }
    if (isWeb()) {
      try {
        const r = await req(API);
        if (r.ok) {
          const doc = await r.json();
          server = true; rev = doc.rev || 0; state = doc.estado || null;
          if (!state && local) { state = local; migrate(state); dirty = true; push(); }
        }
      } catch (e) { server = false; }
    }
    if (!state) state = local || blank();
    if (!state || typeof state !== 'object' || !Array.isArray(state.children)) state = blank();
    migrate(state);
    saveLocal();
    return state;
  }
  function saveLocal() {
    if (memoryOnly) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* lleno o bloqueado */ }
  }
  function save() {
    saveLocal();
    if (!server) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(push, 350);
  }
  async function push() {
    if (!server) return;
    if (saving) { clearTimeout(timer); timer = setTimeout(push, 300); return; }
    saving = true; dirty = false;
    try {
      const r = await req(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev, estado: state }) }, 10000);
      if (r.status === 409) { adopt(await r.json(), true); }
      else if (r.ok) { rev = (await r.json()).rev; setOffline(false); }
      else throw new Error('HTTP ' + r.status);
    } catch (e) {
      dirty = true; setOffline(true);
      clearTimeout(timer); timer = setTimeout(push, 5000);
    } finally { saving = false; }
  }
  function adopt(doc, conflict) {
    if (!doc || !doc.estado) return;
    state = doc.estado; rev = doc.rev || rev; migrate(state); saveLocal();
    listeners.forEach(fn => { try { fn({ conflict }); } catch (e) { /* nada */ } });
  }
  function setOffline(v) {
    if (v === offline) return;
    offline = v;
    if (v) PK.ui && PK.ui.toast('⚠️ No llego al PC de casa. Lo intento otra vez…', 'warn');
    else PK.ui && PK.ui.toast('✅ Conectado otra vez con el PC', 'ok');
  }
  // Trae los cambios hechos en otro dispositivo (la tablet o el PC).
  async function sync(force = false) {
    if (!server || saving || dirty) return false;
    if (!force && (holds > 0 || (PK.ui && PK.ui.open) || document.visibilityState !== 'visible')) return false;
    try {
      const r = await req(API + '?rev=' + rev, {}, 4000);
      if (r.status === 204) return false;
      if (r.ok) { const doc = await r.json(); if ((doc.rev || 0) > rev) { adopt(doc, false); return true; } }
    } catch (e) { /* sin conexión: se reintenta */ }
    return false;
  }
  setInterval(() => sync(false), 8000);

  function replace(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.children) || !Array.isArray(obj.tasks)) throw new Error('Copia no válida');
    state = obj; migrate(state); save();
  }
  function reset() { state = blank(); save(); }

  PK.store = {
    load, save, replace, reset, sync,
    get s() { return state; },
    get server() { return server; },
    get memoryOnly() { return memoryOnly && !server; },
    exportJSON() { return JSON.stringify(state, null, 2); },
    onChange(fn) { listeners.push(fn); },
    // Mientras dura un combate o una misión no se cargan cambios de otro dispositivo.
    hold() { holds++; },
    release() { holds = Math.max(0, holds - 1); },
  };

  // ======================= Reglas =======================
  const L = PK.logic = {};
  const S = () => state;
  const dex = id => PK.DEX[id];
  L.dex = dex;

  L.child = id => S().children.find(c => c.id === id);
  L.addChild = ({ name, birthday, color, difficulty }) => {
    const c = normalizeChild({ id: PK.uid(), name: name.trim(), birthday: birthday || '', color: color || PK.CHILD_COLORS[S().children.length % PK.CHILD_COLORS.length], difficulty: difficulty || 'normal', createdDay: PK.dayKey() });
    S().children.push(c); save(); return c;
  };
  L.removeChild = id => {
    const s = S();
    s.children = s.children.filter(c => c.id !== id);
    s.tasks = s.tasks.filter(t => t.childId !== id);
    for (const k of Object.keys(s.days)) { delete s.days[k][id]; if (!Object.keys(s.days[k]).length) delete s.days[k]; }
    save();
  };

  L.log = (child, type, points, note) => {
    const s = S();
    s.history.unshift({ ts: PK.now(), childId: child.id, type, points, note });
    if (s.history.length > HISTORY_MAX) s.history.length = HISTORY_MAX;
  };
  L.unlock = (child, id) => {
    if (child.achievements[id] || !PK.ACHIEVEMENTS[id]) return false;
    child.achievements[id] = PK.dayKey();
    child.inbox.push({ type: 'logro', id });
    return true;
  };

  // ---------- Energía ⚡ ----------
  L.earn = (child, pts, type, note) => {
    if (!pts) return;
    child.energy += pts;
    if (pts > 0) child.lifetime += pts;
    L.log(child, type, pts, note);
    if (child.lifetime >= 500) L.unlock(child, 'energia500');
  };
  L.adjust = (child, pts, note) => {
    child.energy = Math.max(0, child.energy + pts);
    L.log(child, 'ajuste', pts, note || 'Ajuste de papá o mamá');
    save();
  };
  L.spend = (child, cost, note) => {
    if (cost <= 0) return true;
    if (child.energy < cost) return false;
    child.energy -= cost;
    L.log(child, 'gasto', -cost, note);
    return true;
  };

  // ---------- Tareas (igual que en Planetitos) ----------
  L.tasksOf = childId => S().tasks.filter(t => t.childId === childId);
  L.tasksFor = (childId, key) => {
    const wd = PK.weekday(key);
    return S().tasks.filter(t => t.childId === childId && t.days.includes(wd) && (t.createdDay || '0000-00-00') <= key);
  };
  L.addTask = (childId, { title, icon, points, days }) => {
    const t = { id: PK.uid(), childId, title: title.trim(), icon: icon || '⭐', points: PK.clamp(Math.round(points) || 5, 1, 100), days: days && days.length ? days : [1, 2, 3, 4, 5, 6, 7], createdDay: PK.dayKey() };
    S().tasks.push(t); save(); return t;
  };
  L.updateTask = (id, patch) => {
    const t = S().tasks.find(x => x.id === id); if (!t) return;
    Object.assign(t, patch);
    if (patch.points !== undefined) t.points = PK.clamp(Math.round(patch.points) || 1, 1, 100);
    save();
  };
  L.removeTask = id => { S().tasks = S().tasks.filter(t => t.id !== id); save(); };
  const snap = t => ({ id: t.id, title: t.title, icon: t.icon, points: t.points });

  L.day = (childId, key, create = true) => {
    const c = L.child(childId); if (!c || key < c.createdDay) return null;
    const s = S();
    let rec = s.days[key] && s.days[key][childId];
    const assigned = L.tasksFor(childId, key).map(snap);
    if (!rec) {
      if (!create || !assigned.length) return null;
      s.days[key] ??= {};
      rec = s.days[key][childId] = { tasks: assigned, marked: {}, approved: {}, validated: false, points: 0 };
      return rec;
    }
    if (!rec.validated && key === PK.dayKey()) {
      const map = new Map(assigned.map(t => [t.id, t]));
      const keep = rec.tasks.filter(t => map.has(t.id) || rec.marked[t.id]).map(t => map.get(t.id) || t);
      for (const t of assigned) if (!keep.some(x => x.id === t.id)) keep.push(t);
      const order = new Map(s.tasks.map((t, i) => [t.id, i]));
      keep.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
      rec.tasks = keep;
    }
    return rec;
  };
  L.mark = (childId, taskId, done) => {
    const rec = L.day(childId, PK.dayKey()); if (!rec || rec.validated) return false;
    if (done) rec.marked[taskId] = PK.now(); else delete rec.marked[taskId];
    save(); return true;
  };
  L.pendingDays = childId => {
    const c = L.child(childId); if (!c) return [];
    const today = PK.dayKey();
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const key = PK.addDays(today, -i);
      if (key < c.createdDay) continue;
      const rec = L.day(childId, key, true);
      if (rec && rec.tasks.length && !rec.validated) out.push(key);
    }
    return out;
  };
  const dayHasMarks = (childId, key) => { const r = L.day(childId, key, false); return !!(r && Object.keys(r.marked).length); };
  L.pendingTotal = () => S().children.reduce((n, c) => n + L.pendingDays(c.id).filter(k => k !== PK.dayKey() || dayHasMarks(c.id, k)).length, 0);

  L.streak = child => {
    const today = PK.dayKey(); const yest = PK.addDays(today, -1);
    let key = today, count = 0, start = null;
    for (let guard = 0; guard < 400; guard++) {
      if (key < child.createdDay) break;
      const rec = L.day(child.id, key, false);
      const assigned = rec ? rec.tasks.length : L.tasksFor(child.id, key).length;
      if (!assigned) { key = PK.addDays(key, -1); continue; }
      if (!rec || !rec.validated) {
        if (key === today || key === yest) { key = PK.addDays(key, -1); continue; }
        break;
      }
      if (!rec.tasks.every(t => rec.approved[t.id])) break;
      count++; start = key; key = PK.addDays(key, -1);
    }
    return { count, start };
  };
  function checkStreak(child) {
    const { count, start } = L.streak(child);
    if (count > child.bestStreak) child.bestStreak = count;
    const out = [];
    for (let d = 3; d <= count; d++) {
      const pts = PK.streakRewardFor(d); if (!pts) continue;
      const k = `${start}:${d}`;
      if (child.streakClaims[k]) continue;
      child.streakClaims[k] = PK.now();
      L.earn(child, pts, 'racha', `Racha de ${d} días`);
      child.inbox.push({ type: 'racha', days: d, points: pts });
      out.push({ days: d, points: pts });
      if (d === 3) L.unlock(child, 'racha3');
      if (d === 7) L.unlock(child, 'racha7');
      if (d === 14) L.unlock(child, 'racha14');
      if (d === 30) L.unlock(child, 'racha30');
    }
    return out;
  }
  L.validate = (childId, key, approvedIds) => {
    const c = L.child(childId); const rec = L.day(childId, key, true);
    if (!c || !rec || rec.validated) return null;
    rec.approved = {};
    let pts = 0, done = 0;
    for (const t of rec.tasks) if (approvedIds.has(t.id)) { rec.approved[t.id] = true; pts += t.points; done++; }
    rec.validated = true; rec.validatedAt = PK.now(); rec.points = pts;
    if (pts > 0) L.earn(c, pts, 'tareas', `Tareas de ${PK.fmtLong(key)}`);
    c.inbox.push({ type: 'tareas', day: key, points: pts, done, total: rec.tasks.length });
    if (done > 0) L.unlock(c, 'primera');
    const streaks = checkStreak(c);
    save();
    return { points: pts, done, total: rec.tasks.length, streaks };
  };

  // Premio de los padres: energía al momento, o puntos de nivel para su Pokémon (los recibe al entrar).
  // Lo que queda hoy de premio para un niño (energía o puntos de nivel), según PK.LIMITS.
  L.bonusLeft = (childId, kind = 'energia') => {
    const lim = kind === 'xp' ? PK.LIMITS.expDia : PK.LIMITS.premioDia;
    const type = kind === 'xp' ? 'xp' : 'bonus', today = PK.dayKey();
    const used = S().history.filter(h => h.childId === childId && h.type === type && PK.dayKey(new Date(h.ts)) === today)
      .reduce((n, h) => n + (h.points || 0), 0);
    return Math.max(0, lim - used);
  };
  L.bonus = (childId, amount, reason, kind = 'energia') => {
    const c = L.child(childId); if (!c) return 0;
    amount = Math.min(Math.round(amount) || 0, L.bonusLeft(childId, kind));
    if (!(amount > 0)) return 0;
    if (kind === 'xp') {
      c.inbox.push({ type: 'xp', amount, reason: reason || '' });
      L.log(c, 'xp', amount, reason || 'Puntos de nivel de regalo');
    } else {
      L.earn(c, amount, 'bonus', reason || 'Premio extra');
      c.inbox.push({ type: 'bonus', points: amount, reason: reason || '' });
    }
    L.unlock(c, 'bonus');
    save();
    return amount;
  };

  L.isBirthday = child => {
    if (!child.birthday) return false;
    const d = PK.date();
    const [, m, dd] = child.birthday.split('-').map(Number);
    return d.getMonth() + 1 === m && d.getDate() === dd;
  };
  L.checkBirthday = child => {
    if (!L.isBirthday(child)) return false;
    const year = PK.date().getFullYear();
    if (child.birthdayClaims[year]) return false;
    child.birthdayClaims[year] = PK.now();
    const pts = Number(S().settings.birthdayBonus) || 50;
    const age = year - Number(child.birthday.slice(0, 4));
    L.earn(child, pts, 'cumple', `¡Cumpleaños! ${age} años`);
    child.bag['rare-candy'] = (child.bag['rare-candy'] || 0) + 2;
    child.inbox.push({ type: 'cumple', points: pts, age, candy: 2 });
    L.unlock(child, 'cumple');
    save();
    return true;
  };

  // ======================= Pokémon =======================
  L.pname = p => p.nick || (dex(p.id) ? dex(p.id).n : '¿?');
  L.stats = (id, level) => {
    const b = dex(id).s;
    const o = k => Math.floor((2 * b[k] + 20) * level / 100) + 5;
    return { hp: Math.floor((2 * b[0] + 20) * level / 100) + level + 10, atk: o(1), def: o(2), spa: o(3), spd: o(4), spe: o(5) };
  };
  L.maxHp = p => L.stats(p.id, p.level).hp;
  L.hp = p => Math.max(0, L.maxHp(p) - (p.dmg || 0));
  L.fainted = p => L.hp(p) <= 0;
  L.xpNeed = level => Math.round(6 * Math.pow(level, 1.5) + 20);
  L.bst = id => dex(id).s.reduce((a, b) => a + b, 0);
  L.xpFor = (id, level, mult = 1) => Math.max(5, Math.round((L.bst(id) / 10 + 10) * level / 5 * mult));

  // Ataques: los de sus tipos que ya ha aprendido por nivel, hasta 4.
  L.moves = (id, level) => {
    const d = dex(id);
    const avail = t => (PK.MOVES_BY_TYPE[t] || []).filter(m => PK.TIER_LEVELS[PK.MOVES[m].tier] <= level);
    const [t1, t2] = d.t;
    const a1 = avail(t1), a2 = t2 ? avail(t2) : [];
    const an = t1 === 'normal' || t2 === 'normal' ? [] : avail('normal');
    const pick = [];
    const add = m => { if (m && !pick.includes(m) && pick.length < 4) pick.push(m); };
    add(a1[a1.length - 1]); add(a2[a2.length - 1]); add(a1[a1.length - 2]); add(an[an.length - 1]);
    [...a1.slice().reverse(), ...a2.slice().reverse(), ...an.slice().reverse()].forEach(add);
    if (pick.length < 2) add('quick-attack');
    return pick;
  };

  L.newMon = (id, level, from = 'inicial') => ({ uid: PK.uid(), id, nick: '', level, xp: 0, dmg: 0, amistad: 20, caught: PK.dayKey(), from });
  L.addPokemon = (c, id, level, from) => {
    const p = L.newMon(id, level, from);
    c.pokemon.push(p);
    c.seen[id] = 2;
    if (!c.active) c.active = p.uid;
    if (c.pokemon.length >= 3) L.unlock(c, 'equipo3');
    if (c.pokemon.length >= 6) L.unlock(c, 'equipo6');
    save();
    return p;
  };
  L.mon = (c, uid) => c.pokemon.find(p => p.uid === uid);
  L.active = c => L.mon(c, c.active) || c.pokemon[0] || null;
  L.setActive = (c, uid) => { if (L.mon(c, uid)) { c.active = uid; save(); } };
  L.see = (c, id) => { if (!c.seen[id]) { c.seen[id] = 1; } };
  L.bestLevel = c => c.pokemon.reduce((m, p) => Math.max(m, p.level), 5);

  // Sube puntos de nivel; devuelve los niveles ganados y los ataques nuevos.
  L.gainXp = (c, p, amount) => {
    const out = { from: p.level, levels: [], learned: [] };
    if (!amount || p.level >= 100) return out;
    const before = L.moves(p.id, p.level);
    p.xp += amount;
    while (p.level < 100 && p.xp >= L.xpNeed(p.level)) {
      p.xp -= L.xpNeed(p.level);
      const oldMax = L.maxHp(p);
      p.level++;
      p.dmg = Math.max(0, (p.dmg || 0) - (L.maxHp(p) - oldMax));
      out.levels.push(p.level);
    }
    if (p.level >= 100) p.xp = 0;
    const after = L.moves(p.id, p.level);
    out.learned = after.filter(m => !before.includes(m));
    if (p.level >= 20) L.unlock(c, 'nivel20');
    if (p.level >= 50) L.unlock(c, 'nivel50');
    save();
    return out;
  };

  // Evoluciones posibles ahora (por nivel o amistad) o con un objeto.
  L.evoOptions = (p, itemId = null) => {
    const d = dex(p.id); if (!d || !d.e) return [];
    const hour = PK.date().getHours();
    const isDay = hour >= 7 && hour < 20;
    return d.e.filter(r => PK.DEX[r.to] && !PK.EVO_BLOCK.has(r.to)).filter(r => {
      if (itemId) return r.item === itemId;
      if (r.item) return false;
      if (r.amistad) {
        if (p.amistad < 80) return false;
        if (r.hora === 'day' && !isDay) return false;
        if (r.hora === 'night' && isDay) return false;
        return true;
      }
      return p.level >= r.lv;
    });
  };
  L.canUseStone = (p, itemId) => L.evoOptions(p, itemId).length > 0;
  L.evolve = (c, p, toId) => {
    const fromName = L.pname(p);
    const oldMax = L.maxHp(p);
    p.id = toId;
    p.dmg = Math.max(0, (p.dmg || 0) - (L.maxHp(p) - oldMax));
    c.seen[toId] = 2;
    L.unlock(c, 'evolucion');
    L.log(c, 'evolucion', 0, `${fromName} evolucionó a ${dex(toId).n}`);
    save();
  };
  // Próxima evolución, para enseñarla como pista.
  L.evoHint = p => {
    const d = dex(p.id); if (!d || !d.e) return null;
    const r = d.e.filter(x => PK.DEX[x.to] && !PK.EVO_BLOCK.has(x.to));
    if (!r.length) return null;
    const lv = r.find(x => x.lv);
    if (lv) return `Evoluciona al nivel ${lv.lv}`;
    if (r.some(x => x.amistad)) return 'Evoluciona con mucha amistad 💛';
    if (r.some(x => x.item)) return `Evoluciona con una ${PK.itemName(r.find(x => x.item).item)}`;
    return null;
  };

  // Forma adecuada de un Pokémon para un nivel (para rivales y Pokémon salvajes).
  L.formFor = (id, level) => {
    let cur = id;
    for (let g = 0; g < 3; g++) {
      const d = dex(cur); if (!d || !d.p || !dex(d.p)) break;
      const rule = (dex(d.p).e || []).find(r => r.to === cur);
      const need = rule && rule.lv ? rule.lv : (d.st === 1 ? 22 : 36);
      if (level < need) cur = d.p; else break;
    }
    for (let g = 0; g < 3; g++) {
      const d = dex(cur);
      const rules = (d.e || []).filter(r => PK.DEX[r.to] && !PK.EVO_BLOCK.has(r.to));
      if (!rules.length) break;
      const lvRule = rules.find(r => r.lv && level >= r.lv);
      const other = rules.find(r => !r.lv);
      if (lvRule) cur = lvRule.to;
      else if (other && level >= (d.st === 0 ? 30 : 42)) cur = other.to;
      else break;
    }
    return cur;
  };

  // ---------- Cuidados, tienda y mochila ----------
  L.heal = (p, amount) => { p.dmg = Math.max(0, (p.dmg || 0) - amount); };
  L.healAll = c => c.pokemon.forEach(p => { p.dmg = 0; });
  L.friend = (p, n) => { p.amistad = PK.clamp((p.amistad || 0) + n, 0, 100); };
  L.cuddlesToday = (c, p) => ((c.care[PK.dayKey()] || {})[p.uid] || 0);
  L.cuddle = (c, p) => {
    const day = PK.dayKey();
    c.care = { [day]: c.care[day] || {} };
    const n = c.care[day][p.uid] || 0;
    if (n >= 5) return false;
    c.care[day][p.uid] = n + 1;
    L.friend(p, 1); save();
    return true;
  };
  L.care = (c, p, kind) => {
    const cost = PK.CARE[kind] || 0;
    if (!L.spend(c, cost, kind === 'centro' ? 'Centro Pokémon' : `${kind === 'jugar' ? 'Jugar' : 'Cepillar'} con ${L.pname(p)}`)) return false;
    if (kind === 'centro') L.healAll(c);
    if (kind === 'cepillar') L.friend(p, 4);
    if (kind === 'jugar') L.friend(p, 8);
    save();
    return true;
  };
  // Motivo por el que no se puede comprar (o '' si se puede): los objetos de combate, uno de cada en la mochila.
  L.cantBuy = (c, it) => it.held && (c.bag[it.id] || 0) >= 1 ? 'Ya tienes uno' : '';
  L.candyLeft = c => {
    const d = c.candyDay && c.candyDay.day === PK.dayKey() ? c.candyDay.n : 0;
    return Math.max(0, PK.LIMITS.caramelosDia - d);
  };
  L.buy = (c, itemId, qty = 1) => {
    const it = PK.item(itemId); if (!it || L.cantBuy(c, it)) return false;
    if (!L.spend(c, it.cost * qty, `${PK.itemName(itemId)}${qty > 1 ? ' ×' + qty : ''}`)) return false;
    c.bag[itemId] = (c.bag[itemId] || 0) + qty;
    save();
    return true;
  };

  // ---------- Metas para ahorrar ----------
  // Huevo misterioso: un Pokémon raro que aún no tiene (ni su familia), al nivel medio del equipo menos 3.
  L.eggPool = c => {
    const owned = id => c.pokemon.some(p => dex(p.id) && dex(id) && dex(p.id).c === dex(id).c);
    const pool = PK.EGG.pool.filter(id => PK.DEX[id] && !owned(id));
    return pool.length ? pool : PK.EGG.pool.filter(id => PK.DEX[id]);
  };
  L.hatchEgg = c => {
    const pool = L.eggPool(c);
    if (!pool.length || !L.spend(c, PK.EGG.cost, 'Huevo misterioso')) return null;
    const lv = Math.max(5, Math.round(c.pokemon.reduce((a, p) => a + p.level, 0) / Math.max(1, c.pokemon.length)) - 3);
    const p = L.addPokemon(c, L.formFor(PK.rand(pool), lv), lv, 'huevo');
    L.log(c, 'pokemon', 0, `Del huevo salió ${dex(p.id).n}`);
    save();
    return p;
  };
  // Premios de casa: los ponen papá y mamá; el niño los canjea y quedan pendientes hasta que se los dais.
  L.homeRewards = () => (S().homeRewards ??= []);
  L.addHomeReward = ({ title, icon, cost }) => {
    const r = { id: PK.uid(), title: String(title || '').trim().slice(0, 50), icon: icon || '🎁', cost: PK.clamp(Math.round(cost) || 50, 10, 2000) };
    if (!r.title) return null;
    L.homeRewards().push(r); save();
    return r;
  };
  L.removeHomeReward = id => { S().homeRewards = L.homeRewards().filter(r => r.id !== id); save(); };
  L.redemptions = () => (S().redemptions ??= []);
  L.pendingRedemptions = () => L.redemptions().filter(r => r.state === 'pendiente');
  L.redeem = (c, rid) => {
    const r = L.homeRewards().find(x => x.id === rid);
    if (!r || !L.spend(c, r.cost, `Premio de casa: ${r.title}`)) return null;
    const x = { id: PK.uid(), childId: c.id, title: r.title, icon: r.icon, cost: r.cost, ts: PK.now(), state: 'pendiente' };
    L.redemptions().unshift(x);
    if (L.redemptions().length > 100) L.redemptions().length = 100;
    save();
    return x;
  };
  // ok = true: entregado · ok = false: se anula y se devuelve la energía
  L.resolveRedemption = (id, ok) => {
    const x = L.redemptions().find(r => r.id === id && r.state === 'pendiente');
    if (!x) return null;
    x.state = ok ? 'entregado' : 'devuelto'; x.doneTs = PK.now();
    const c = L.child(x.childId);
    if (!ok && c) { c.energy += x.cost; L.log(c, 'ajuste', x.cost, `Devuelto: ${x.title}`); c.inbox.push({ type: 'bonus', points: x.cost, reason: `Te devolvemos la energía de «${x.title}»` }); }
    save();
    return x;
  };
  // Usa un objeto de la mochila. Devuelve lo que ha pasado (o null si no sirve).
  L.useItem = (c, itemId, p) => {
    const it = PK.item(itemId); if (!it || !(c.bag[itemId] > 0) || !p) return null;
    const res = { item: it };
    if (it.revive) { if (!L.fainted(p)) return null; p.dmg = Math.floor(L.maxHp(p) / 2); res.revived = true; }
    else if (it.food) {
      if (L.fainted(p)) return null;
      L.friend(p, it.amistad); L.heal(p, it.heal); res.food = true;
    } else if (it.heal) {
      if (L.fainted(p) || !p.dmg) return null;
      const before = L.hp(p); L.heal(p, it.heal); res.healed = L.hp(p) - before;
    } else if (it.candy) {
      if (p.level >= 100) return null;
      if (L.candyLeft(c) <= 0) return { item: it, limit: true };
      const usados = c.candyDay && c.candyDay.day === PK.dayKey() ? c.candyDay.n : 0;
      c.candyDay = { day: PK.dayKey(), n: usados + 1 };
      res.xp = L.gainXp(c, p, L.xpNeed(p.level) - p.xp);
    } else if (it.stone) {
      const opts = L.evoOptions(p, itemId);
      if (!opts.length) return null;
      res.evo = opts;
    } else if (it.held) {
      // Equipar: un Pokémon lleva un solo objeto de combate.
      if (p.held || L.fainted(p)) return null;
      p.held = itemId; res.equipped = true;
    }
    c.bag[itemId]--;
    if (!c.bag[itemId]) delete c.bag[itemId];
    save();
    return res;
  };

  // Paso del tiempo: por la noche descansan (se curan) y la amistad baja un poco si pasan días.
  L.tick = c => {
    const today = PK.dayKey();
    if (!c.lastTick || c.lastTick >= today) { c.lastTick = today; return; }
    const days = PK.clamp(PK.daysBetween(c.lastTick, today), 0, 30);
    c.pokemon.forEach(p => { p.dmg = 0; L.friend(p, -2 * days); });
    c.lastTick = today;
    save();
  };

  // ======================= Semana: región, campeonato y Team Rocket =======================
  L.weekKey = () => PK.mondayKey();
  L.weekIdx = (key = PK.dayKey()) => Math.max(0, PK.weeksBetween(S().startDay || key, key));
  L.weekLeader = (key = PK.dayKey()) => PK.GYMS[L.weekIdx(key) % PK.GYMS.length];
  L.weekRegion = (key = PK.dayKey()) => PK.region(L.weekLeader(key).region);
  L.weekNumber = (key = PK.dayKey()) => (L.weekIdx(key) % PK.GYMS.length) + 1;
  L.champOpen = () => (S().settings.champDays || [6, 7]).includes(PK.weekday(PK.dayKey()));
  L.nextChampDay = () => {
    const days = S().settings.champDays || [6, 7];
    for (let i = 0; i < 8; i++) { const k = PK.addDays(PK.dayKey(), i); if (days.includes(PK.weekday(k))) return k; }
    return null;
  };
  L.champ = c => (c.champ[L.weekKey()] ??= { round: 0, won: false });

  // ---------- Tareas de la semana: entrada al campeonato y cofre ----------
  // Tareas asignadas y aprobadas de la semana que empieza el lunes `mon` (hasta `hasta`, incluido).
  L.weekTasks = (c, mon = PK.mondayKey(), hasta = PK.addDays(mon, 6)) => {
    let asg = 0, ok = 0, dias = 0;
    for (let i = 0; i < 7; i++) {
      const k = PK.addDays(mon, i);
      if (k > hasta || k < c.createdDay) continue;
      const r = L.day(c.id, k, false);
      asg += r ? r.tasks.length : L.tasksFor(c.id, k).length;
      if (r && r.validated) { const n = Object.keys(r.approved).length; ok += n; if (n) dias++; }
    }
    return { asg, ok, dias };
  };
  L.champNeed = () => PK.clamp(S().settings.champTaskDays ?? PK.LIMITS.campeonatoDias, 0, 7);
  // Puede jugar el campeonato si lleva los días pedidos con tareas validadas (o si ya lo empezó esta semana).
  L.champReady = c => { const st = L.champ(c); return st.won || st.round > 0 || L.weekTasks(c).dias >= L.champNeed(); };

  // Cofre de la semana pasada: si se aprobó el 80 % de sus tareas. Se puede ganar hasta el domingo siguiente,
  // por si papá o mamá validan tarde. Devuelve el premio o null.
  L.weekChest = c => {
    const mon = PK.addDays(PK.mondayKey(), -7);
    c.chests ??= {};
    if (c.chests[mon] || PK.addDays(mon, 6) < c.createdDay) return null;
    const w = L.weekTasks(c, mon);
    if (!w.asg || w.ok / w.asg < PK.LIMITS.cofre) return null;
    const candy = PK.seed(`cofre:${mon}:${c.id}`) % 3 === 0;
    c.chests[mon] = PK.now();
    L.earn(c, PK.CHEST.energia, 'cofre', 'Cofre de la semana');
    c.bag['poke-ball'] = (c.bag['poke-ball'] || 0) + PK.CHEST.balls;
    c.bag['sitrus-berry'] = (c.bag['sitrus-berry'] || 0) + 1;
    if (candy) c.bag['rare-candy'] = (c.bag['rare-candy'] || 0) + 1;
    const res = { type: 'cofre', points: PK.CHEST.energia, pct: Math.round(w.ok / w.asg * 100), candy };
    c.inbox.push(res);
    save();
    return res;
  };

  const diffOf = c => PK.DIFFICULTY[c.difficulty] || PK.DIFFICULTY.normal;
  const rng = seed => { let s = seed >>> 0; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6D2B79F5) >>> 0; return (s >>> 0) / 4294967296; }; };

  // Un Pokémon salvaje de la región de la semana para entrenar.
  L.wildFor = c => {
    const r = PK.region(L.scenario().region);
    const p = L.active(c);
    const lv = PK.clamp((p ? p.level : 5) + diffOf(c).lv + Math.floor(Math.random() * 3) - 2, 2, 100);
    const id = L.formFor(PK.rand(r.wild), lv);
    return { kind: 'salvaje', team: [{ id, level: lv }] };
  };
  // Rival de cada ronda del campeonato (el mismo si se repite la ronda esa semana).
  // Nivel de referencia de un equipo: media de sus Pokémon y la fase de evolución más alta.
  // Sin equipo elegido, usa el de por defecto (el activo y los dos de más nivel).
  L.teamRef = (c, uids) => {
    let ps = uids && uids.length ? uids.map(u => L.mon(c, u)).filter(Boolean) : [L.active(c), ...c.pokemon.filter(p => p.uid !== c.active).sort((a, b) => b.level - a.level)].filter(Boolean).slice(0, 3);
    if (!ps.length) ps = c.pokemon;
    const lv = Math.round(ps.reduce((a, p) => a + p.level, 0) / Math.max(1, ps.length));
    const stage = ps.reduce((m, p) => Math.max(m, L.stage(p.id)), 0);
    return { lv, stage };
  };
  // Fase de evolución de una especie (0 = básica).
  L.stage = id => { let n = 0, cur = id; for (let g = 0; g < 6; g++) { const d = dex(cur); if (!d || !d.p || !dex(d.p)) break; n++; cur = d.p; } return n; };
  // Baja una forma a la fase máxima permitida.
  L.capStage = (id, max) => { let cur = id; for (let g = 0; g < 6 && L.stage(cur) > max; g++) cur = dex(cur).p; return cur; };
  // Rival de cada ronda del campeonato (el mismo si se repite la ronda esa semana).
  // Nivel igualado al equipo (±difficultad). Los aspirantes van una fase por detrás de tu equipo: al evolucionar, les sacas ventaja.
  L.champFoe = (c, round, ref) => {
    const week = L.weekKey();
    const rand = rng(PK.seed(`${c.id}:${week}:${round}`));
    const r = L.weekRegion(); const d = diffOf(c).lv;
    // El nivel sube con las medallas; el equipo solo lo acota (6 por debajo, 3 por encima): entrenar sí ayuda.
    const CL = PK.CHAMP_LEVEL;
    const base = PK.clamp(CL.base + CL.porMedalla * Object.keys(c.badges).length, ref.lv - CL.debajo, ref.lv + CL.encima);
    const lv = n => PK.clamp(base + d + n, 3, 100);
    const ld = L.weekLeader();
    if (round < 2) {
      const opts = PK.ASPIRANTES.filter(id => id !== ld.char && id !== c.trainer);
      const ch = opts[Math.floor(rand() * opts.length)];
      const pool = r.wild.slice();
      const cap = Math.max(0, ref.stage - 1);
      // En la segunda ronda, un rival lleva objeto (elegido al azar entre los de ataque).
      const item = round === 1 ? ['banda', 'gafas'][Math.floor(rand() * 2)] : null;
      const count = round === 0 ? 1 : 2;
      const team = Array.from({ length: count }, (_, i) => {
        const base = pool.splice(Math.floor(rand() * pool.length), 1)[0];
        return { id: L.capStage(L.formFor(base, lv(0)), cap), level: lv(0), boost: item && i === 0 ? { item, growth: 0.03, cap: 1.3 } : undefined };
      });
      return { kind: 'entrenador', name: `Aspirante ${PK.CHARS[ch].n}`, char: ch, team };
    }
    // El líder: sus Pokémon van a su nivel o un poco por encima; el primero lleva objeto y todos suben su ataque con la furia del turno.
    const item = Object.keys(PK.RIVAL_ITEMS)[Math.floor(rand() * Object.keys(PK.RIVAL_ITEMS).length)];
    return { kind: 'lider', name: ld.name, char: ld.char, leader: ld.id, team: ld.team.map((id, i) => {
      const n = i % 2 ? 1 : 0;
      return { id: L.capStage(L.formFor(id, lv(n)), ref.stage), level: lv(n), boost: { item: i === 0 ? item : null, growth: 0.04, cap: 1.4 } };
    }) };
  };
  L.champRoundWon = (c, round) => {
    const st = L.champ(c);
    st.round = Math.max(st.round, round + 1);
    if (round < 2) L.earn(c, PK.REWARDS.rondaEnergia, 'campeonato', `Ronda ${round + 1} del campeonato`);
    save();
  };
  // Premio del campeón: medalla, energía y tres Pokémon para elegir uno.
  L.champWin = c => {
    const st = L.champ(c);
    const ld = L.weekLeader(); const r = L.weekRegion();
    st.won = true; st.round = 3;
    c.badges[ld.id] = { day: PK.dayKey(), times: ((c.badges[ld.id] || {}).times || 0) + 1 };
    L.earn(c, PK.REWARDS.campeonEnergia, 'campeonato', `¡Campeón! ${ld.medal}`);
    if (PK.REWARDS.campeonCaramelos) c.bag['rare-candy'] = (c.bag['rare-candy'] || 0) + PK.REWARDS.campeonCaramelos;
    const n = Object.keys(c.badges).length;
    L.unlock(c, 'medalla1'); if (n >= 4) L.unlock(c, 'medallas4'); if (n >= 8) L.unlock(c, 'medallas8');
    if (n >= 26) L.unlock(c, 'medallas26'); if (n >= 52) L.unlock(c, 'medallas52');
    const owned = new Set(c.pokemon.map(p => p.id));
    const chainOwned = id => c.pokemon.some(p => dex(p.id).c === dex(id).c);
    let pool = r.wild.filter(id => !owned.has(id) && !chainOwned(id));
    if (pool.length < 3) pool = r.wild.slice();
    st.gifts = PK.shuffle(pool).slice(0, 3);
    st.giftLevel = Math.max(5, Math.round(c.pokemon.reduce((a, p) => a + p.level, 0) / Math.max(1, c.pokemon.length)) - 3);
    save();
    return st;
  };
  L.champGift = (c, id) => {
    const st = L.champ(c);
    if (!st.gifts || !st.gifts.includes(id)) return null;
    const p = L.addPokemon(c, L.formFor(id, st.giftLevel), st.giftLevel, 'campeonato');
    st.gifts = null; st.gift = id;
    L.log(c, 'pokemon', 0, `Nuevo Pokémon: ${dex(p.id).n}`);
    save();
    return p;
  };

  // ======================= Escenario del día (365 al año) =======================
  const weighted = (list, rand) => { const tot = list.reduce((a, [, w]) => a + w, 0); let x = rand() * tot; for (const [v, w] of list) { if ((x -= w) < 0) return v; } return list[0][0]; };
  const perm = (n, seed) => { const r = rng(seed); const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  L.dayOfYear = (key = PK.dayKey()) => { const d = PK.parseDay(key); return Math.round((d - new Date(d.getFullYear(), 0, 1)) / 86400000); };
  // Escenario pintado del día (js/dias.js): de la región del gimnasio de la semana, uno distinto cada día del ciclo de 52 semanas.
  const paintedFondo = key => {
    if (!PK.DIAS) return null;
    const gi = L.weekIdx(key) % PK.GYMS.length; const ld = PK.GYMS[gi];
    const list = PK.DIAS[ld.region] || [];
    if (!list.length) return null;
    const occ = PK.GYMS.slice(0, gi).filter(g => g.region === ld.region).length;
    const v = (occ * 7 + PK.weekday(key) - 1) % list.length;
    const e = list[v];
    const src = `${PK.DIAS_SRC}/${ld.region}-${String(v).padStart(3, '0')}.svg`;
    return { src, region: ld.region, place: e.p, t: e.t, z: 1, y: 50, hora: e.h, b: e.b, odd: e.o, esc: e.e || null,
      capa: e.c ? src.replace(/\.svg$/, '-capa.svg') : null, propio: true };
  };
  // Escondites del dibujo (árboles, arbustos, rocas, nubes, agua…) en un orden fijo para cada día.
  L.escCandidates = (key = PK.dayKey()) => {
    const esc = L.scenario(key).fondo.esc || [];
    return perm(esc.length, PK.seed('escondites:' + key)).map(i => {
      const [k, x0, y0, x1, y1, ax, ay, as, f] = esc[i];
      return { id: i, k, x0, y0, x1, y1, ax, ay, as, f: !!f };
    });
  };
  L.scenario = (key = PK.dayKey()) => {
    const doy = L.dayOfYear(key); const d = PK.parseDay(key);
    let fondo = paintedFondo(key);
    if (!fondo) {
      const N = PK.FONDOS.length;
      const order = perm(N, PK.seed(`fondos:${d.getFullYear()}:${Math.floor(doy / N)}`));
      fondo = PK.FONDOS[order[doy % N]];
    }
    const rand = rng(PK.seed('clima:' + key));
    let w = [['sol', 40], ['nubes', 18], ['lluvia', 12], ['atardecer', 14], ['niebla', 6]];
    if (fondo.t === 'nieve') w.push(['nieve', 60]); else if (d.getMonth() === 11 || d.getMonth() <= 1) w.push(['nieve', 8]);
    if (fondo.b === 'lava' || fondo.b === 'alien') w = [['sol', 1]];   // ni llueve ni nieva en la lava o en otro planeta
    // Los escenarios pintados con su propia luz (amanecer, atardecer o noche) no llevan otro atardecer encima
    const ws = fondo.hora && fondo.hora !== 'dia' ? w.filter(([v]) => v !== 'atardecer') : w;
    return { n: Math.min(365, doy + 1), fondo, region: fondo.region, weather: weighted(ws, rand) };
  };
  // Rarezas del escenario: cosas que no encajan, escondidas en el dibujo (x, y y radio en %).
  L.oddities = (key = PK.dayKey()) => (L.scenario(key).fondo.odd || []).map(([k, x, y, r], i) => ({ i, k, x, y, r }));
  const PSEUDO = new Set([147, 246, 371, 443, 610, 704, 885, 996]);
  // Huecos de los escondites (x, y en %): a la derecha y al fondo, para no tapar al entrenador ni a su Pokémon.
  const SLOTS = [[58, 93], [73, 88], [89, 92], [95, 74], [64, 74], [80, 66], [50, 62], [92, 58], [70, 57], [40, 57]];
  const KINDS = { campo: ['hierba', 'arbusto', 'roca', 'flores'], nieve: ['nieve', 'arbusto', 'roca'], ciudad: ['caja', 'maceta', 'arbusto'], playa: ['roca', 'arena', 'arbusto'], desierto: ['roca', 'arena', 'caja'] };
  const FINDS = [['oran-berry', 28], ['sitrus-berry', 14], ['potion', 14], ['poke-ball', 22], ['great-ball', 9], ['super-potion', 6], ['rare-candy', 3], ['ultra-ball', 2], ['stone', 2]];
  const STONES = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'ice-stone'];
  // Tipos de Pokémon que prefieren los escondites del dibujo (si la región tiene alguno de ese tipo).
  const KIND_TYPES = {
    agua: ['water'], nube: ['flying', 'fairy', 'dragon'], arbol: ['grass', 'bug'], arbusto: ['grass', 'bug', 'normal'], hierba: ['grass', 'bug', 'normal'],
    cerezo: ['grass', 'fairy', 'bug'], seta: ['grass', 'bug', 'poison', 'fairy'], roca: ['rock', 'ground', 'fighting', 'steel'], hielo: ['ice', 'water'],
    lava: ['fire'], hoguera: ['fire'], crater: ['psychic', 'ghost', 'dragon', 'steel'], tienda: ['normal', 'electric'], isla: ['flying', 'psychic', 'fairy'], ruinas: ['psychic', 'ghost', 'rock'],
  };
  // escKinds: tipo de escondite de cada hueco (escenario pintado), para que el Pokémon pegue con el sitio.
  L.spots = (c, key = PK.dayKey(), escKinds = []) => {
    const sc = L.scenario(key);
    const rand = rng(PK.seed('sitios:' + key));
    const crand = rng(PK.seed(`sitios:${key}:${c.id}`));
    const kinds = KINDS[sc.fondo.t] || KINDS.campo;
    const slots = perm(SLOTS.length, PK.seed('huecos:' + key)).slice(0, 6).map(i => SLOTS[i]);
    const contents = perm(6, PK.seed(`cont:${key}:${c.id}`)).map(i => ['pokemon', 'pokemon', 'item', 'item', 'item', 'nada'][i]);
    const pool = PK.region(sc.region).wild;
    const best = L.bestLevel(c);
    return slots.map(([x, y], i) => {
      const kind = kinds[Math.floor(rand() * kinds.length)];
      const type = contents[i];
      let content = { type };
      if (type === 'pokemon') {
        const lv = PK.clamp(best - 4 + Math.floor(crand() * 3), 3, 100);
        const pref = KIND_TYPES[escKinds[i]] || [];
        const typed = pref.length ? pool.filter(id => PK.DEX[id] && PK.DEX[id].t.some(t => pref.includes(t))) : [];
        const roll = pref.length ? crand() : 1;
        const from = typed.length && roll < 0.8 ? typed : pool;
        content = { type, id: L.formFor(from[Math.floor(crand() * from.length)], lv), level: lv };
      }
      if (type === 'item') { let it = weighted(FINDS, crand); if (it === 'stone') it = STONES[Math.floor(crand() * STONES.length)]; content = { type, item: it }; }
      return { id: 's' + i, x, y, kind, content };
    });
  };
  L.exploreState = c => { const today = PK.dayKey(); if (!c.explore || c.explore.day !== today) c.explore = { day: today, opened: {} }; c.explore.odd ??= {}; return c.explore; };
  // Encontrar una rareza: las Poké Balls se guardan en la mochila; lo demás da un objeto como los escondites.
  const ODD_BALL = { pokeball: 'poke-ball', superball: 'great-ball', ultraball: 'ultra-ball' };
  // visible: índices de las rarezas que se ven en esta pantalla (solo cuentan esas para «todas»).
  L.findOdd = (c, i, visible = null) => {
    const st = L.exploreState(c);
    const all = L.oddities();
    const list = visible ? all.filter(x => visible.includes(x.i)) : all;
    const o = all.find(x => x.i === i);
    if (!o || st.odd[i]) return null;
    const crand = rng(PK.seed(`rareza:${PK.dayKey()}:${c.id}:${i}`));
    let item = ODD_BALL[o.k];
    if (!item) { item = weighted(FINDS, crand); if (item === 'stone') item = STONES[Math.floor(crand() * STONES.length)]; }
    c.bag[item] = (c.bag[item] || 0) + 1;
    st.odd[i] = item;
    c.stats.rarezas = (c.stats.rarezas || 0) + 1;
    const done = list.length > 0 && list.every(x => st.odd[x.i]);
    if (done) L.unlock(c, 'detective');
    save();
    return { kind: o.k, item, all: done };
  };
  L.useOddHint = (c, visible = null) => {
    const st = L.exploreState(c); if (st.hint) return null;
    const o = L.oddities().find(x => !st.odd[x.i] && (!visible || visible.includes(x.i))); if (!o) return null;
    st.hint = true; save(); return o;
  };
  L.openSpot = (c, spot) => {
    const st = L.exploreState(c);
    if (st.opened[spot.id]) return st.opened[spot.id];
    const k = spot.content; let r;
    if (k.type === 'item') { c.bag[k.item] = (c.bag[k.item] || 0) + 1; r = { type: 'item', item: k.item }; }
    else if (k.type === 'pokemon') { r = { type: 'pokemon', id: k.id, level: k.level, state: 'visto', tries: 0 }; L.see(c, k.id); }
    else r = { type: 'nada' };
    st.opened[spot.id] = r;
    c.stats.spots = (c.stats.spots || 0) + 1;
    if (c.stats.spots >= 50) L.unlock(c, 'explorador');
    save();
    return r;
  };
  L.ballsOf = c => ['poke-ball', 'great-ball', 'ultra-ball'].filter(b => c.bag[b] > 0);
  L.throwBall = (c, spotId, ball) => {
    const r = L.exploreState(c).opened[spotId];
    if (!r || r.type !== 'pokemon' || r.state !== 'visto') return null;
    if (!(c.bag[ball] > 0)) return { noBall: true };
    c.bag[ball]--; if (!c.bag[ball]) delete c.bag[ball];
    r.tries++;
    const d = dex(r.id);
    let chance = [0.72, 0.52, 0.36][d.st] ?? 0.5;
    let root = r.id; for (let g = 0; g < 3 && dex(root).p && dex(dex(root).p); g++) root = dex(root).p;
    if (PSEUDO.has(root)) chance -= 0.15;
    chance = PK.clamp(chance + (PK.item(ball).ball || 0), 0.12, 0.95);
    const ok = Math.random() < chance;
    const out = { ok, shakes: ok ? 3 : 1 + Math.floor(Math.random() * 3) };
    if (ok) {
      r.state = 'atrapado';
      out.mon = L.addPokemon(c, r.id, r.level, 'captura');
      c.stats.caught = (c.stats.caught || 0) + 1;
      L.unlock(c, 'captura1'); if (c.stats.caught >= 10) L.unlock(c, 'capturas10');
      L.log(c, 'pokemon', 0, `Atrapado: ${dex(r.id).n}`);
    } else if (r.tries >= 3 || Math.random() < 0.25) { r.state = 'huido'; out.fled = true; }
    save();
    return out;
  };
  L.letGo = (c, spotId) => { const r = L.exploreState(c).opened[spotId]; if (r && r.type === 'pokemon' && r.state === 'visto') { r.state = 'libre'; save(); } };

  // Team Rocket: aparece un día al azar de lunes a viernes, por la tarde, y se queda hasta el domingo.
  L.rocketDay = (week = L.weekKey()) => 1 + (PK.seed('rocket:' + week) % 5);
  L.rocketAvailable = c => {
    if (!c.pokemon.length) return false;
    const week = L.weekKey();
    if (c.rocket[week] && c.rocket[week].done) return false;
    const wd = PK.weekday(PK.dayKey()); const day = L.rocketDay(week);
    if (wd < day) return false;
    if (wd === day && PK.date().getHours() < (S().settings.rocketHour ?? 15)) return false;
    return true;
  };
  L.rocketResult = (c, won) => {
    const week = L.weekKey();
    const res = { won };
    c.rocket[week] = { done: true, won, day: PK.dayKey() };
    if (won) {
      L.earn(c, PK.REWARDS.rocketEnergia, 'rocket', 'Misión del Team Rocket superada');
      L.unlock(c, 'rocket');
    } else if (c.pokemon.filter(p => p.uid !== c.active && p !== c.pokemon[c.pokemon.length - 1]).length) {
      // Nunca se llevan al Pokémon activo ni al último que ha llegado al equipo
      const last = c.pokemon[c.pokemon.length - 1];
      const options = c.pokemon.filter(p => p.uid !== c.active && p !== last);
      const p = PK.rand(options);
      c.pokemon = c.pokemon.filter(x => x.uid !== p.uid);
      p.stolenDay = PK.dayKey();
      c.stolen.push(p);
      res.stolen = p;
      L.log(c, 'rocket', 0, `El Team Rocket se llevó a ${L.pname(p)}`);
    } else {
      const lost = Math.min(PK.REWARDS.rocketRobo, c.energy);
      c.energy -= lost; res.energy = lost;
      L.log(c, 'rocket', -lost, 'El Team Rocket se llevó energía');
    }
    save();
    return res;
  };
  L.rescueAvailable = c => !!c.stolen.length && c.stolen[0].stolenDay < PK.dayKey() && c.rescueTried !== PK.dayKey();
  L.rescueResult = (c, won) => {
    if (!c.stolen.length) return null;
    if (!won) { c.rescueTried = PK.dayKey(); save(); return null; }
    const p = c.stolen.shift();
    delete p.stolenDay;
    L.friend(p, 10);
    c.pokemon.push(p);
    L.unlock(c, 'rescate');
    L.log(c, 'rocket', 0, `${L.pname(p)} rescatado`);
    save();
    return p;
  };
  L.freeStolen = c => { while (c.stolen.length) { const p = c.stolen.shift(); delete p.stolenDay; c.pokemon.push(p); } save(); };
})();
