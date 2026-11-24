/* Pokemonyx · núcleo: reloj, utilidades, sonido, efectos e interfaz común */
window.PK = window.PK || {};
(function () {
  'use strict';

  // ---------- Reloj ----------
  // Para probar se puede abrir con ?hoy=2026-12-01&hora=20 y el juego cree que es ese día.
  const params = new URLSearchParams(location.search);
  let offset = 0;
  const fakeDay = params.get('hoy');
  const fakeHour = params.get('hora');
  const hasDay = !!fakeDay && /^\d{4}-\d{2}-\d{2}$/.test(fakeDay);
  const hasHour = fakeHour !== null && fakeHour !== '' && !isNaN(Number(fakeHour));
  if (hasDay || hasHour) {
    const real = new Date();
    const t = new Date(real);
    if (hasDay) { const [y, m, d] = fakeDay.split('-').map(Number); t.setFullYear(y, m - 1, d); }
    if (hasHour) t.setHours(Number(fakeHour), 0, 0, 0);
    offset = t.getTime() - real.getTime();
  }
  PK.testMode = offset !== 0;
  PK.now = () => Date.now() + offset;
  PK.date = () => new Date(PK.now());
  const pad = n => String(n).padStart(2, '0');
  PK.dayKey = (d = PK.date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  PK.parseDay = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  PK.addDays = (key, n) => { const d = PK.parseDay(key); d.setDate(d.getDate() + n); return PK.dayKey(d); };
  PK.weekday = key => { const w = PK.parseDay(key).getDay(); return w === 0 ? 7 : w; }; // 1 = lunes … 7 = domingo
  PK.daysBetween = (a, b) => Math.round((PK.parseDay(b) - PK.parseDay(a)) / 86400000);
  PK.isNight = (d = PK.date()) => d.getHours() >= 21 || d.getHours() < 7;
  // Semanas de lunes a domingo: el lunes de la semana de un día y el número de semanas entre dos lunes.
  PK.mondayKey = (key = PK.dayKey()) => PK.addDays(key, 1 - PK.weekday(key));
  PK.weeksBetween = (a, b) => Math.round(PK.daysBetween(PK.mondayKey(a), PK.mondayKey(b)) / 7);
  // Número estable a partir de un texto (el sorteo de la semana sale igual en todos los dispositivos).
  PK.seed = txt => { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  PK.shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  PK.DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  PK.fmtDay = (key, cap = false) => {
    const today = PK.dayKey();
    let txt;
    if (key === today) txt = 'hoy';
    else if (key === PK.addDays(today, -1)) txt = 'ayer';
    else { const d = PK.parseDay(key); txt = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; }
    return cap ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;
  };
  PK.fmtLong = key => { const d = PK.parseDay(key); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
  PK.fmtTime = ts => { const d = new Date(ts); return `${d.getDate()}/${d.getMonth() + 1} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  // ---------- Utilidades ----------
  PK.uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
  PK.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  PK.rand = arr => arr[Math.floor(Math.random() * arr.length)];
  PK.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PK.h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  PK.$ = (sel, root = document) => root.querySelector(sel);
  PK.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  // Hash sencillo para el PIN (candado para niños, no es seguridad bancaria).
  PK.hashPin = pin => {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    const s = 'pokemonyx::' + pin + '::familia';
    for (let r = 0; r < 64; r++) {
      for (let i = 0; i < s.length; i++) {
        h1 ^= s.charCodeAt(i) + r; h1 = Math.imul(h1, 16777619) >>> 0;
        h2 ^= h1 >>> 3; h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519) >>> 0;
      }
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  };

  // ---------- Sonido (chiptune con WebAudio, sin archivos) ----------
  PK.sound = (() => {
    let ctx = null;
    const SEQ = {
      tap: [[880, 0, 0.05]],
      coin: [[988, 0, 0.07], [1319, 0.07, 0.16]],
      buy: [[660, 0, 0.07], [880, 0.07, 0.07], [1175, 0.14, 0.14]],
      success: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.24]],
      error: [[240, 0, 0.12, 'triangle'], [180, 0.13, 0.18, 'triangle']],
      eat: [[320, 0, 0.06], [420, 0.1, 0.06], [320, 0.2, 0.06], [420, 0.3, 0.06]],
      pop: [[1200, 0, 0.05, 'triangle'], [1600, 0.04, 0.05, 'triangle']],
      bubble: [[500, 0, 0.06, 'sine'], [800, 0.06, 0.06, 'sine'], [650, 0.12, 0.06, 'sine'], [950, 0.18, 0.08, 'sine']],
      evolve: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.12], [784, 0.5, 0.1], [1047, 0.6, 0.4]],
      hatch: [[392, 0, 0.1], [523, 0.1, 0.1], [659, 0.2, 0.1], [784, 0.3, 0.3]],
      sleep: [[440, 0, 0.3, 'sine'], [330, 0.32, 0.45, 'sine']],
      mark: [[784, 0, 0.06], [1175, 0.06, 0.12]],
      crack: [[200, 0, 0.05, 'square'], [150, 0.05, 0.05, 'square']],
      hit: [[220, 0, 0.06, 'square'], [110, 0.05, 0.1, 'square']],
      crit: [[330, 0, 0.05], [160, 0.05, 0.08], [80, 0.12, 0.16]],
      miss: [[520, 0, 0.08, 'triangle'], [390, 0.09, 0.1, 'triangle']],
      faint: [[620, 0, 0.1], [470, 0.1, 0.1], [330, 0.2, 0.14], [190, 0.35, 0.35]],
      levelup: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.08], [1047, 0.24, 0.22]],
      heal: [[659, 0, 0.12, 'sine'], [784, 0.14, 0.12, 'sine'], [988, 0.28, 0.12, 'sine'], [1319, 0.44, 0.34, 'sine']],
      rocket: [[392, 0, 0.12], [370, 0.13, 0.12], [349, 0.26, 0.12], [330, 0.39, 0.4], [262, 0.82, 0.3, 'triangle']],
      battle: [[440, 0, 0.08], [554, 0.08, 0.08], [659, 0.16, 0.08], [880, 0.24, 0.24], [659, 0.5, 0.08], [880, 0.58, 0.34]],
      win: [[784, 0, 0.1], [784, 0.12, 0.1], [784, 0.24, 0.1], [1047, 0.38, 0.36], [988, 0.8, 0.1], [1047, 0.92, 0.46]],
      lose: [[392, 0, 0.22, 'triangle'], [330, 0.24, 0.22, 'triangle'], [262, 0.48, 0.45, 'triangle']],
      select: [[1047, 0, 0.04], [1568, 0.04, 0.07]],
    };
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    function tone(c, freq, start, dur, type) {
      const o = c.createOscillator();
      const g = c.createGain();
      const vol = type === 'sine' ? 0.12 : 0.05;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(c.destination);
      o.start(start); o.stop(start + dur + 0.03);
    }
    return {
      enabled() { return !!(PK.store && PK.store.s && PK.store.s.settings.sound); },
      play(name) {
        if (!this.enabled()) return;
        const c = ensure(); if (!c) return;
        const t0 = c.currentTime + 0.01;
        (SEQ[name] || SEQ.tap).forEach(([f, s, d, type]) => tone(c, f, t0 + s, d, type || 'square'));
      },
      unlock() { ensure(); },
      cry(id, vol = 0.35) {
        if (!this.enabled() || !id) return;
        try { const a = new Audio(PK.URL.cry(id)); a.volume = vol; a.play().catch(() => {}); } catch (e) { /* sin grito */ }
      },
    };
  })();

  // ---------- Efectos (partículas, confeti, rebotes) ----------
  PK.fx = (() => {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = () => document.getElementById('fx-layer');
    function center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
    function burst(x, y, chars = ['💖'], n = 8, opts = {}) {
      const L = layer(); if (!L) return;
      const count = reduce ? Math.min(3, n) : n;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fx-p';
        el.textContent = chars[i % chars.length];
        el.style.left = x + 'px'; el.style.top = y + 'px';
        el.style.fontSize = (opts.size || 20 + Math.random() * 14) + 'px';
        L.appendChild(el);
        const ang = (opts.spread ?? Math.PI * 1.1) * (Math.random() - 0.5) - Math.PI / 2;
        const dist = (opts.dist || 60) + Math.random() * 60;
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
        const a = el.animate([
          { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${dy * 0.6}px)) scale(1.15)`, opacity: 1, offset: 0.35 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy - 40}px)) scale(.85)`, opacity: 0 },
        ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.3,1)' });
        a.onfinish = () => el.remove();
      }
    }
    function floatText(x, y, text, cls = '') {
      const L = layer(); if (!L) return;
      const el = document.createElement('div');
      el.className = 'fx-text ' + cls;
      el.textContent = text;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      L.appendChild(el);
      const a = el.animate([
        { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
        { transform: 'translate(-50%,-90%) scale(1.2)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%,-110%) scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%,-170%) scale(.9)', opacity: 0 },
      ], { duration: 1500, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      a.onfinish = () => el.remove();
    }
    function confetti(n = 70) {
      const L = layer(); if (!L) return;
      const colors = ['#ff6fa3', '#ffd23f', '#5ccf6a', '#3fa9f5', '#8f7cf7', '#ff9f40'];
      const count = reduce ? 12 : n;
      const W = window.innerWidth;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fx-confetti';
        el.style.background = colors[i % colors.length];
        el.style.left = Math.random() * W + 'px';
        el.style.top = '-20px';
        if (i % 3 === 0) el.style.borderRadius = '50%';
        L.appendChild(el);
        const drift = (Math.random() - 0.5) * 200;
        const rot = (Math.random() - 0.5) * 900;
        const a = el.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${drift}px, ${window.innerHeight + 60}px) rotate(${rot}deg)`, opacity: 0.9 },
        ], { duration: 2200 + Math.random() * 1600, delay: Math.random() * 500, easing: 'cubic-bezier(.25,.6,.45,1)' });
        a.onfinish = () => el.remove();
      }
    }
    // Rebote con estiramiento: el volumen se conserva y siempre vuelve a escala 1.
    function pop(el, k = 1) {
      if (!el || reduce) return;
      el.animate([
        { transform: 'scale(1,1)' },
        { transform: `scale(${1 + 0.22 * k},${1 - 0.22 * k})` },
        { transform: `scale(${1 - 0.1 * k},${1 + 0.12 * k})` },
        { transform: 'scale(1,1)' },
      ], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }
    function shake(el) {
      if (!el) return;
      el.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(8px)' },
        { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' },
      ], { duration: 360, easing: 'ease-out' });
    }
    function flyTo(fromEl, toEl, char, done) {
      const L = layer(); if (!L || !fromEl || !toEl) { done && done(); return; }
      const [x1, y1] = center(fromEl); const [x2, y2] = center(toEl);
      const el = document.createElement('div');
      el.className = 'fx-p'; el.textContent = char; el.style.fontSize = '40px';
      el.style.left = x1 + 'px'; el.style.top = y1 + 'px';
      L.appendChild(el);
      const a = el.animate([
        { transform: 'translate(-50%,-50%) scale(1)' },
        { transform: `translate(calc(-50% + ${(x2 - x1) / 2}px), calc(-50% + ${(y2 - y1) / 2 - 80}px)) scale(1.3)`, offset: 0.5 },
        { transform: `translate(calc(-50% + ${x2 - x1}px), calc(-50% + ${y2 - y1}px)) scale(.5)`, opacity: 0.4 },
      ], { duration: reduce ? 200 : 650, easing: 'cubic-bezier(.45,0,.55,1)' });
      // Por si la animación no llega a terminar (pestaña en segundo plano), el efecto se aplica igual.
      let fired = false;
      const fin = () => { if (fired) return; fired = true; el.remove(); done && done(); };
      a.onfinish = fin;
      setTimeout(fin, (reduce ? 200 : 650) + 250);
    }
    // Destello suave (como mucho uno cada 400 ms: lejos del límite de 3 por segundo).
    let lastFlash = 0;
    function flash(color = '#fff') {
      const L = layer(); if (!L || reduce || Date.now() - lastFlash < 400) return;
      lastFlash = Date.now();
      const el = document.createElement('div');
      el.className = 'fx-flash'; el.style.background = color;
      L.appendChild(el);
      el.animate([{ opacity: 0 }, { opacity: 0.75, offset: 0.25 }, { opacity: 0 }], { duration: 380, easing: 'ease-out' }).onfinish = () => el.remove();
    }
    const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 150) : ms));
    return { burst, floatText, confetti, pop, shake, center, flyTo, flash, wait, reduce };
  })();

  // ---------- Interfaz común: modales, hojas, avisos, confirmaciones ----------
  PK.ui = (() => {
    const stack = [];
    function root() { return document.getElementById('modal-root'); }
    function trapFocus(el) {
      const f = el.querySelector('[autofocus], .btn-primary, button, input, select, textarea');
      if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
    }
    function modal(html, opts = {}) {
      const wrap = PK.h(`<div class="modal-back ${opts.cls || ''}" role="dialog" aria-modal="true">
        <div class="modal-card">${opts.closable === false ? '' : '<button class="modal-x" aria-label="Cerrar">✕</button>'}<div class="modal-body"></div></div></div>`);
      const body = wrap.querySelector('.modal-body');
      if (typeof html === 'string') body.innerHTML = html; else body.appendChild(html);
      root().appendChild(wrap);
      const api = {
        el: wrap, body,
        close(val) {
          if (api.closed) return; api.closed = true;
          const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
          wrap.classList.add('closing');
          setTimeout(() => wrap.remove(), 180);
          opts.onClose && opts.onClose(val);
        },
      };
      const x = wrap.querySelector('.modal-x');
      if (x) x.onclick = () => { PK.sound.play('tap'); api.close(); };
      if (opts.closable !== false && opts.backdrop !== false) wrap.addEventListener('pointerdown', e => { if (e.target === wrap) api.close(); });
      stack.push(api);
      trapFocus(wrap);
      return api;
    }
    function sheet(title, html, opts = {}) {
      const wrap = PK.h(`<div class="sheet-back" role="dialog" aria-modal="true" aria-label="${PK.esc(title)}">
        <section class="sheet ${opts.cls || ''}">
          <header class="sheet-head"><h2>${title}</h2><button class="sheet-x" aria-label="Cerrar">✕</button></header>
          <div class="sheet-body"></div>
        </section></div>`);
      const body = wrap.querySelector('.sheet-body');
      if (typeof html === 'string') body.innerHTML = html; else if (html) body.appendChild(html);
      root().appendChild(wrap);
      const api = {
        el: wrap, body,
        close() {
          if (api.closed) return; api.closed = true;
          const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
          wrap.classList.add('closing');
          setTimeout(() => wrap.remove(), 200);
          opts.onClose && opts.onClose();
        },
      };
      wrap.querySelector('.sheet-x').onclick = () => { PK.sound.play('tap'); api.close(); };
      wrap.addEventListener('pointerdown', e => { if (e.target === wrap) api.close(); });
      stack.push(api);
      trapFocus(wrap);
      return api;
    }
    function confirm(text, opts = {}) {
      return new Promise(res => {
        const m = modal(`<div class="confirm">
          <div class="confirm-ico">${opts.icon || '❓'}</div>
          <p class="confirm-txt">${text}</p>
          ${opts.detail ? `<p class="muted">${opts.detail}</p>` : ''}
          <div class="row-btns">
            <button class="btn btn-ghost" data-v="0">${opts.cancel || 'Cancelar'}</button>
            <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-v="1">${opts.ok || 'Sí'}</button>
          </div></div>`, { cls: 'small', onClose: v => res(v === true) });
        m.body.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { PK.sound.play('tap'); m.close(b.dataset.v === '1'); });
      });
    }
    function toast(msg, cls = '') {
      const r = document.getElementById('toast-root'); if (!r) return;
      const el = PK.h(`<div class="toast ${cls}">${msg}</div>`);
      r.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
    }
    function closeAll() { [...stack].reverse().forEach(m => m.close()); }
    function top() { return stack[stack.length - 1]; }
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) { const t = top(); if (!t.noEsc) t.close(); } });
    return { modal, sheet, confirm, toast, closeAll, top, get open() { return stack.length; } };
  })();
})();
