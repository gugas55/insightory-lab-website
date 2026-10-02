(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motion.matches;
  motion.addEventListener?.('change', (e) => { reduceMotion = e.matches; });
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const ua = navigator.userAgent;
  const isChromium = /Chrome\/\d+/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const isFirefox = /Firefox\/\d+/.test(ua);

  /* ---------- Um único ciclo de animação para tudo o que se move ---------- */
  const Ticker = (() => {
    const jobs = new Set();
    let raf = 0;
    let last = 0;
    const frame = (now) => {
      const dt = Math.min(0.034, (now - last) / 1000 || 0.016);
      last = now;
      jobs.forEach((job) => { if (job(dt, now) === false) jobs.delete(job); });
      raf = jobs.size ? requestAnimationFrame(frame) : 0;
    };
    return {
      add(job) {
        jobs.add(job);
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      },
    };
  })();

  /* ---------- Mola: massa e amortecimento, nunca valores instantâneos ---------- */
  const spring = (stiffness, damping) => ({
    x: 0, v: 0, t: 0,
    step(dt) {
      this.v += (stiffness * (this.t - this.x) - damping * this.v) * dt;
      this.x += this.v * dt;
    },
    settled(eps = 0.05) { return Math.abs(this.t - this.x) < eps && Math.abs(this.v) < eps; },
    snap() { this.x = this.t; this.v = 0; },
  });

  /* ---------- Refração real do vidro ----------
     Para cada elemento gera-se um mapa de deslocamento com a sua forma: o centro
     fica plano e a margem curva a luz para dentro, como numa lente convexa.
     Chromium aplica-o ao que está por trás (backdrop-filter); Chromium e Firefox
     aplicam-no ao conteúdo das lentes. Nos restantes fica o vidro fosco. */
  const Refract = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const defs = $('#refractDefs');
    const built = new Map();

    const buildMap = (w, h, r, bezel) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const hw = w / 2;
      const hh = h / 2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = x + 0.5 - hw;
          const py = y + 0.5 - hh;
          const qx = Math.abs(px) - (hw - r);
          const qy = Math.abs(py) - (hh - r);
          const inside = r - Math.min(Math.max(qx, qy), 0) - Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
          let nx = 0;
          let ny = 0;
          if (qx > 0 && qy > 0) { const len = Math.hypot(qx, qy) || 1; nx = qx / len; ny = qy / len; }
          else if (qx > qy) nx = 1;
          else ny = 1;
          if (px < 0) nx = -nx;
          if (py < 0) ny = -ny;
          let m = 0;
          if (inside >= 0 && inside < bezel) { const t = 1 - inside / bezel; m = t * t; }
          const i = (y * w + x) * 4;
          d[i] = Math.round(128 - nx * m * 127);
          d[i + 1] = Math.round(128 - ny * m * 127);
          d[i + 2] = 128;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL();
    };

    const set = (el, attrs) => { Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k])); };

    const make = (id, width, height, radius, bezel, depth) => {
      const w = Math.round(width);
      const h = Math.round(height);
      if (!defs || w < 4 || h < 4) return;
      // O mapa é desenhado à resolução do ecrã; em 2x não há degraus na margem da lente
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const key = [w, h, radius, bezel, depth, dpr].join('|');
      if (built.get(id) === key) return;
      built.set(id, key);
      let filter = document.getElementById(id);
      if (!filter) {
        filter = document.createElementNS(NS, 'filter');
        filter.id = id;
        filter.append(document.createElementNS(NS, 'feImage'), document.createElementNS(NS, 'feDisplacementMap'));
        defs.append(filter);
      }
      set(filter, { x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
      const r = Math.min(radius, w / 2, h / 2);
      set(filter.children[0], { href: buildMap(Math.round(w * dpr), Math.round(h * dpr), r * dpr, bezel * dpr), x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' });
      set(filter.children[1], { in: 'SourceGraphic', in2: 'map', scale: depth * 2, xChannelSelector: 'R', yChannelSelector: 'G' });
    };

    // Só depois de os filtros existirem é que o CSS os pode referir
    const activate = () => {
      if (isChromium) root.classList.add('rf-backdrop');
      if (isChromium || isFirefox) root.classList.add('rf-element');
    };

    return { make, activate };
  })();

  /* ---------- Navegação ---------- */
  (() => {
    const nav = $('#nav');
    if (!nav) return;
    const bar = $('.nav__bar', nav);
    const linksBox = $('#navLinks');
    const thumb = $('.nav__thumb', linksBox);
    const links = $$('a', linksBox);
    const toggle = $('#navToggle');
    const sheet = $('#navSheet');

    const refract = () => {
      const r = bar.getBoundingClientRect();
      Refract.make('rf-nav', r.width, r.height, r.height / 2, Math.min(18, r.height * 0.34), 8);
    };
    refract();
    new ResizeObserver(refract).observe(bar);

    // Indicador de vidro que desliza entre ligações e estica com a velocidade
    const px = spring(260, 25);
    const pw = spring(260, 25);
    let current = null;
    const paint = () => {
      const stretch = clamp(Math.abs(px.v) / 2600, 0, 0.16);
      thumb.style.setProperty('--x', px.x.toFixed(2) + 'px');
      thumb.style.setProperty('--w', Math.max(0, pw.x).toFixed(2) + 'px');
      thumb.style.setProperty('--sx', (1 + stretch).toFixed(3));
      thumb.style.setProperty('--sy', (1 - stretch * 0.5).toFixed(3));
    };
    const job = (dt) => {
      px.step(dt / 2); px.step(dt / 2);
      pw.step(dt / 2); pw.step(dt / 2);
      if (px.settled() && pw.settled()) { px.snap(); pw.snap(); paint(); return false; }
      paint();
      return true;
    };
    const moveThumb = (link) => {
      if (!link) { linksBox.classList.remove('has-thumb'); return; }
      px.t = link.offsetLeft;
      pw.t = link.offsetWidth;
      if (reduceMotion || !linksBox.classList.contains('has-thumb')) { px.snap(); pw.snap(); paint(); }
      linksBox.classList.add('has-thumb');
      Ticker.add(job);
    };
    links.forEach((a) => {
      a.addEventListener('pointerenter', () => moveThumb(a));
      a.addEventListener('focus', () => moveThumb(a));
    });
    linksBox.addEventListener('pointerleave', () => moveThumb(current));
    linksBox.addEventListener('focusout', (e) => { if (!linksBox.contains(e.relatedTarget)) moveThumb(current); });

    // Secção atual
    if ('IntersectionObserver' in window) {
      const visible = new Set();
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) visible.add(en.target.id); else visible.delete(en.target.id); });
        const active = links.filter((a) => visible.has(a.hash.slice(1))).pop() || null;
        if (active === current) return;
        current = active;
        links.forEach((a) => { if (a === active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        if (!linksBox.matches(':hover') && !linksBox.contains(document.activeElement)) moveThumb(active);
      }, { rootMargin: '-45% 0px -54% 0px' });
      links.forEach((a) => { const target = $(a.hash); if (target) spy.observe(target); });
    }

    // Tom adaptativo: o vidro escurece sobre superfícies pretas
    const darkZones = $$('[data-nav-tone="dark"]');
    let toneQueued = false;
    const tone = () => {
      toneQueued = false;
      const r = bar.getBoundingClientRect();
      const y = r.top + r.height / 2;
      const dark = sheet.hidden && darkZones.some((el) => {
        const z = el.getBoundingClientRect();
        return z.top <= y && z.bottom >= y;
      });
      nav.classList.toggle('nav--dark', dark);
    };
    const queueTone = () => { if (!toneQueued) { toneQueued = true; requestAnimationFrame(tone); } };
    window.addEventListener('scroll', queueTone, { passive: true });
    window.addEventListener('resize', queueTone);
    tone();

    // Menu móvel
    const setSheet = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      sheet.hidden = !open;
      tone();
    };
    toggle.addEventListener('click', () => setSheet(sheet.hidden));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setSheet(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !sheet.hidden) { setSheet(false); toggle.focus(); }
    });
    document.addEventListener('pointerdown', (e) => { if (!sheet.hidden && !nav.contains(e.target)) setSheet(false); });
    window.matchMedia('(min-width: 56.01rem)').addEventListener?.('change', (e) => { if (e.matches) setSheet(false); });
  })();

  /* ---------- Relógio (hora de Portugal continental) ---------- */
  (() => {
    const clock = $('#clock');
    if (!clock) return;
    const fmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Lisbon' });
    const tick = () => {
      const now = new Date();
      clock.textContent = fmt.format(now);
      clock.dateTime = now.toISOString();
    };
    tick();
    setInterval(tick, 15000);
  })();

  /* ---------- Copiar email ---------- */
  (() => {
    const btn = $('#copyMail');
    if (!btn) return;
    const done = $('.hero__mail-done', btn);
    let timer;
    btn.addEventListener('click', async () => {
      const mail = btn.dataset.mail;
      try {
        await navigator.clipboard.writeText(mail);
        done.textContent = 'Email copiado';
      } catch (err) {
        // Sem acesso à área de transferência: abre a aplicação de email
        window.location.href = 'mailto:' + mail;
        return;
      }
      btn.classList.add('is-copied');
      clearTimeout(timer);
      timer = setTimeout(() => { btn.classList.remove('is-copied'); done.textContent = ''; }, 2200);
    });
  })();

  /* ---------- Lente: posição com mola, corpo que estica com a velocidade ---------- */
  const createLens = (lens, magnify) => {
    const view = $('.lens__view', lens);
    const sx = spring(95, 15);
    const sy = spring(95, 15);
    let d = 0;
    return {
      sx, sy,
      get d() { return d; },
      measure() { d = lens.offsetWidth; return d; },
      step(dt) { for (let i = 0; i < 3; i++) { sx.step(dt / 3); sy.step(dt / 3); } },
      snap() { sx.snap(); sy.snap(); },
      render(offsetX = 0) {
        const stretch = reduceMotion ? 0 : clamp(Math.hypot(sx.v, sy.v) / 3200, 0, 0.09);
        let squash = '';
        if (stretch > 0.002) {
          const a = Math.atan2(sy.v, sx.v).toFixed(3);
          squash = ` rotate(${a}rad) scale(${(1 + stretch).toFixed(3)}, ${(1 - stretch * 0.7).toFixed(3)}) rotate(${-a}rad)`;
        }
        lens.style.transform = `translate3d(${(sx.x + offsetX - d / 2).toFixed(2)}px, ${(sy.x - d / 2).toFixed(2)}px, 0)${squash}`;
        view.style.transform = `translate3d(${(d / 2).toFixed(2)}px, ${(d / 2).toFixed(2)}px, 0) scale(${magnify}) translate3d(${(-sx.x).toFixed(2)}px, ${(-sy.x).toFixed(2)}px, 0)`;
      },
    };
  };

  /* ---------- Hero: a lente percorre as quatro áreas ---------- */
  (() => {
    const field = $('#field');
    const strip = $('#fieldStrip');
    const lensEl = $('#lens');
    if (!field || !strip || !lensEl) return;

    const names = ['Identidade e marca', 'Websites e e-commerce', 'Plataformas e dashboards', 'Automação de processos'];
    const tour = [2, 3, 2, 1, 0, 1];
    const lift = [-0.05, 0.04, -0.02, 0.05];
    const L = createLens(lensEl, 1.06);
    const zoneName = $('#zoneName');
    let fw = 0;
    let fh = 0;
    let sw = 0;
    let zone = 2;
    let tourAt = 0;
    let idleAt = 0;
    let inView = true;
    let engaged = false;
    let drag = null;

    const panning = () => sw > fw + 1;
    const bound = () => {
      const padX = L.d * 0.34;
      // A lente quase não sai da faixa na vertical; o espaço à volta está reservado no CSS (--lens-over)
      const padY = Math.min(L.d * 0.45, fh / 2);
      L.sx.t = clamp(L.sx.t, padX, sw - padX);
      L.sy.t = clamp(L.sy.t, padY, fh - padY);
    };
    const goZone = (i) => {
      L.sx.t = (i + 0.5) * sw / 4;
      L.sy.t = fh * (0.5 + lift[i]);
      bound();
    };
    const measure = () => {
      fw = field.clientWidth;
      fh = field.clientHeight;
      sw = strip.offsetWidth;
      const d = L.measure();
      // Margem fina: o vidro curva a luz só junto à borda e o interior fica nítido
      Refract.make('rf-lens', d, d, d / 2, Math.round(d * 0.1), Math.round(d * 0.045));
    };
    const draw = () => {
      // Quando a faixa é mais larga do que o ecrã, desliza sob a lente
      const offset = panning() ? clamp(fw / 2 - L.sx.x, fw - sw, 0) : 0;
      strip.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
      L.render(offset);
      const z = clamp(Math.floor(L.sx.x / (sw / 4)), 0, 3);
      if (z !== zone) {
        zone = z;
        lensEl.setAttribute('aria-valuenow', String(z + 1));
        lensEl.setAttribute('aria-valuetext', names[z]);
        // O nome da área fica fora do vidro: nunca é distorcido nem cortado
        if (zoneName) zoneName.textContent = names[z].replace(' e ', ' & ');
      }
    };
    const job = (dt, now) => {
      if (!inView) return false;
      if (reduceMotion) { L.snap(); draw(); return false; }
      if (!engaged && !drag && now > idleAt) {
        tourAt = (tourAt + 1) % tour.length;
        goZone(tour[tourAt]);
        idleAt = now + 3000;
      }
      L.step(dt);
      draw();
      return true;
    };
    const wake = () => { if (inView) Ticker.add(job); };
    const rest = (ms) => { idleAt = performance.now() + ms; };
    const local = (e) => {
      const r = field.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    // Rato: a lente segue o ponteiro
    field.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const p = local(e);
      engaged = true;
      L.sx.t = p.x * sw / fw;
      L.sy.t = p.y;
      bound();
      wake();
    });
    field.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      engaged = false;
      rest(1800);
    });

    // Toque: arrastar move a lente (ou a faixa, quando esta não cabe no ecrã)
    field.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tx: L.sx.t, ty: L.sy.t, moved: false };
    });
    field.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
        field.setPointerCapture?.(e.pointerId);
      }
      if (panning()) {
        L.sx.t = drag.tx - dx * 1.15;
      } else {
        L.sx.t = drag.tx + dx;
        L.sy.t = drag.ty + dy;
      }
      bound();
      wake();
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {
        if (panning()) goZone(clamp(Math.round(L.sx.t / (sw / 4) - 0.5), 0, 3));
      } else if (e.type === 'pointerup') {
        const p = local(e);
        if (panning()) goZone(clamp(zone + (p.x < fw * 0.35 ? -1 : p.x > fw * 0.65 ? 1 : 0), 0, 3));
        else { L.sx.t = p.x; L.sy.t = p.y; bound(); }
      }
      drag = null;
      rest(4500);
      wake();
    };
    field.addEventListener('pointerup', endDrag);
    field.addEventListener('pointercancel', endDrag);

    // Teclado: setas mudam de área
    lensEl.addEventListener('keydown', (e) => {
      const stepBy = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
      let z;
      if (stepBy) z = clamp(zone + stepBy, 0, 3);
      else if (e.key === 'Home') z = 0;
      else if (e.key === 'End') z = 3;
      else return;
      e.preventDefault();
      goZone(z);
      rest(6000);
      wake();
    });
    lensEl.addEventListener('focus', () => rest(6000));

    measure();
    goZone(2);
    L.snap();
    draw();
    rest(2400);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        inView = en.isIntersecting;
        if (inView) { rest(1200); wake(); }
      }).observe(field);
    }
    new ResizeObserver(() => {
      const z = zone;
      measure();
      goZone(z);
      L.snap();
      draw();
      wake();
    }).observe(field);
    wake();
  })();

  /* ---------- Rodapé: a mesma lente, sobre o nome ---------- */
  (() => {
    const mark = $('#footMark');
    const lensEl = $('#footLens');
    if (!mark || !lensEl || !canHover) return;
    const view = $('.lens__view', lensEl);
    const L = createLens(lensEl, 1.16);
    let w = 0;
    let h = 0;
    let inView = false;
    let hovering = false;

    const measure = () => {
      w = mark.clientWidth;
      h = mark.clientHeight;
      view.style.width = w + 'px';
      view.style.height = h + 'px';
      const d = L.measure();
      Refract.make('rf-lens-foot', d, d, d / 2, Math.round(d * 0.1), Math.round(d * 0.045));
    };
    const home = () => { L.sx.t = w * 0.87; L.sy.t = h * 0.5; };
    const job = (dt) => {
      if (!inView) return false;
      if (reduceMotion) L.snap(); else L.step(dt);
      L.render();
      return hovering || !(L.sx.settled() && L.sy.settled());
    };

    mark.classList.add('is-live');
    measure();
    home();
    L.snap();
    L.render();

    mark.addEventListener('pointermove', (e) => {
      const r = mark.getBoundingClientRect();
      hovering = true;
      L.sx.t = clamp(e.clientX - r.left, 0, w);
      L.sy.t = clamp(e.clientY - r.top, 0, h);
      Ticker.add(job);
    });
    mark.addEventListener('pointerleave', () => { hovering = false; home(); Ticker.add(job); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { inView = en.isIntersecting; if (inView) Ticker.add(job); }).observe(mark);
    } else inView = true;
    new ResizeObserver(() => {
      measure();
      if (!hovering) { home(); L.snap(); }
      L.render();
    }).observe(mark);
  })();

  /* ---------- Antes / depois: alterna sozinho enquanto está à vista ----------
     Entra desarrumado, arruma-se, e a partir daí vai e volta para o visitante ver as duas versões.
     Pára fora do ecrã, com o separador em segundo plano, enquanto o ponteiro ou o foco estão no
     controlo, e para sempre assim que alguém escolhe um estado (fica no que escolheu).
     Com "reduzir movimento" não alterna: o controlo continua a funcionar à mão. */
  (() => {
    const desk = $('#desk');
    const seg = $('#deskSeg');
    if (!desk || !seg) return;
    const opts = $$('.seg__opt', desk);
    const dwell = { before: 3600, after: 4800 };   // o painel organizado tem mais para ler
    let timer = 0;
    let visible = false;
    let holding = false;   // ponteiro ou foco no controlo
    let manual = false;    // alguém escolheu um estado
    let first = true;

    const set = (state) => {
      desk.dataset.state = state;
      opts.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.set === state)));
    };
    const running = () => !manual && !reduceMotion && visible && !holding && !document.hidden;
    const wait = (ms) => {
      clearTimeout(timer);
      if (running()) timer = setTimeout(step, ms);
    };
    const step = () => {
      if (!running()) return;
      set(desk.dataset.state === 'before' ? 'after' : 'before');
      first = false;
      wait(dwell[desk.dataset.state]);
    };
    const hold = () => { holding = true; clearTimeout(timer); };
    const release = () => { holding = false; wait(dwell[desk.dataset.state]); };

    opts.forEach((b) => b.addEventListener('click', () => { manual = true; clearTimeout(timer); set(b.dataset.set); }));
    seg.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold(); });
    seg.addEventListener('pointerleave', release);
    seg.addEventListener('focusin', hold);
    seg.addEventListener('focusout', release);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else wait(dwell[desk.dataset.state]); });

    if (reduceMotion || !('IntersectionObserver' in window)) return;
    set('before');   // entra em cena desarrumado
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) wait(first ? 1100 : dwell[desk.dataset.state]);
      else clearTimeout(timer);
    }, { threshold: 0.35 }).observe(desk);
  })();

  /* ---------- Clientes: faixa de logótipos em ciclo contínuo ----------
     No HTML mantém-se uma só lista. Aqui duplica-se o suficiente para cobrir a
     largura do ecrã e desloca-se exatamente uma lista, o que torna o ciclo sem corte. */
  (() => {
    const section = $('#clientes');
    const marquee = $('#clientsMarquee');
    const track = $('#clientsTrack');
    const pause = $('#clientsPause');
    if (!section || !marquee || !track) return;
    const base = $$('.clients__item', track);
    if (!base.length) return;
    const SPEED = 42;   // píxeis por segundo

    const build = () => {
      $$('[data-clone]', track).forEach((el) => el.remove());
      if (reduceMotion) return;
      const one = track.getBoundingClientRect().width;
      if (!one) return;
      const extra = Math.max(1, Math.ceil(marquee.clientWidth / one));
      for (let k = 0; k < extra; k++) {
        base.forEach((el) => {
          const copy = el.cloneNode(true);
          copy.setAttribute('aria-hidden', 'true');
          copy.setAttribute('data-clone', '');
          track.append(copy);
        });
      }
      track.style.setProperty('--clients-shift', `${one.toFixed(2)}px`);
      track.style.setProperty('--clients-dur', `${(one / SPEED).toFixed(2)}s`);
    };

    if (pause) {
      pause.hidden = false;
      pause.addEventListener('click', () => {
        const paused = section.classList.toggle('is-paused');
        pause.setAttribute('aria-pressed', String(paused));
        pause.textContent = paused ? 'Retomar' : 'Pausar';
      });
    }

    build();
    window.addEventListener('load', build);
    motion.addEventListener?.('change', build);
    if ('ResizeObserver' in window) {
      let w = marquee.clientWidth;
      new ResizeObserver(() => {
        if (Math.abs(marquee.clientWidth - w) < 2) return;
        w = marquee.clientWidth;
        build();
      }).observe(marquee);
    }
  })();

  /* ---------- Serviços: mostrador fixo em ecrãs largos ---------- */
  (() => {
    const section = $('#servicos');
    const track = $('#servicesTrack');
    const ring = $('#dialRing');
    if (!section || !track || !ring) return;
    const items = $$('.service', section);
    const art = $$('.services__art svg', section);
    const nums = $$('.dial__n', ring);
    const loupe = $('.dial__loupe', section);
    const wide = window.matchMedia('(min-width: 64rem) and (min-height: 38rem)');
    const turn = spring(140, 17);
    let pinned = false;
    let active = -1;
    let queued = false;

    const job = (dt) => {
      if (reduceMotion) turn.snap(); else { turn.step(dt / 2); turn.step(dt / 2); }
      if (turn.settled(0.0005)) { turn.snap(); ring.style.setProperty('--p', turn.x.toFixed(4)); return false; }
      ring.style.setProperty('--p', turn.x.toFixed(4));
      return true;
    };
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      items.forEach((el, k) => { el.classList.toggle('is-active', k === i); el.classList.toggle('is-past', k < i); });
      art.forEach((el, k) => el.classList.toggle('is-active', k === i));
      nums.forEach((el, k) => el.classList.toggle('is-active', k === i));
      turn.t = i;
      Ticker.add(job);
    };
    const update = () => {
      queued = false;
      if (!pinned) return;
      const r = track.getBoundingClientRect();
      const t = clamp(-r.top / (r.height - window.innerHeight), 0, 1);
      setActive(clamp(Math.floor(t * items.length), 0, items.length - 1));
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    const apply = () => {
      pinned = wide.matches;
      section.classList.toggle('is-pinned', pinned);
      active = -1;
      if (!pinned) return;
      const r = loupe.getBoundingClientRect();
      Refract.make('rf-loupe', r.width, r.height, r.width / 2, Math.round(r.width * 0.3), Math.round(r.width * 0.13));
      update();
      turn.snap();
      ring.style.setProperty('--p', turn.x.toFixed(4));
    };
    wide.addEventListener?.('change', apply);
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    apply();
  })();

  /* ---------- Processo: uma conta de vidro marca o passo em foco ---------- */
  (() => {
    const steps = $('#steps');
    if (!steps) return;
    const items = $$('.step', steps);
    const bead = $('.steps__bead', steps);
    const pos = spring(120, 19);
    let nodes = [];
    let focus = -1;
    let queued = false;

    const measure = () => {
      const base = steps.getBoundingClientRect();
      nodes = items.map((el) => {
        const r = $('.step__n', el).getBoundingClientRect();
        return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
      });
      const b = bead.offsetWidth;
      if (b) Refract.make('rf-bead', b, b, b / 2, Math.round(b * 0.3), Math.round(b * 0.13));
    };
    const place = () => {
      if (!nodes.length) return;
      const i = clamp(pos.x, 0, nodes.length - 1);
      const a = Math.floor(i);
      const b = Math.min(nodes.length - 1, a + 1);
      const x = lerp(nodes[a].x, nodes[b].x, i - a);
      const y = lerp(nodes[a].y, nodes[b].y, i - a);
      bead.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%)`;
    };
    const job = (dt) => {
      if (reduceMotion) pos.snap(); else { pos.step(dt / 2); pos.step(dt / 2); }
      place();
      return !pos.settled(0.001);
    };
    const update = () => {
      queued = false;
      const r = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = clamp((vh * 0.74 - r.top) / (r.height + vh * 0.42), 0, 1);
      const i = clamp(Math.floor(t * items.length), 0, items.length - 1);
      if (i === focus) return;
      focus = i;
      items.forEach((el, k) => { el.classList.toggle('is-focus', k === i); el.classList.toggle('is-done', k < i); });
      pos.t = i;
      Ticker.add(job);
    };

    steps.classList.add('is-live');
    measure();
    update();
    pos.snap();
    place();
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    new ResizeObserver(() => { measure(); place(); }).observe(steps);
  })();

  /* ---------- Pranchas do portefólio: deslocam-se a velocidades ligeiramente diferentes ---------- */
  (() => {
    const plates = $$('.plate[data-drift]');
    const desktop = window.matchMedia('(min-width: 56.01rem)');
    if (!plates.length || reduceMotion) return;
    let boxes = [];
    let queued = false;
    const measure = () => {
      boxes = plates.map((el) => {
        el.style.removeProperty('--dy');
        const r = el.getBoundingClientRect();
        return { el, mid: r.top + window.scrollY + r.height / 2, drift: Number(el.dataset.drift) || 0 };
      });
    };
    const update = () => {
      queued = false;
      if (!desktop.matches) return;
      const vh = window.innerHeight;
      boxes.forEach(({ el, mid, drift }) => {
        const p = clamp((mid - window.scrollY - vh / 2) / vh, -1, 1);
        el.style.setProperty('--dy', (p * drift).toFixed(1) + 'px');
      });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    const reset = () => { measure(); update(); };
    reset();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', reset);
    window.addEventListener('load', reset);
  })();

  /* ---------- Formulário: valida e abre o email com a mensagem pronta ---------- */
  (() => {
    const form = $('#contactForm');
    if (!form) return;
    const status = $('#formStatus');
    const fields = ['name', 'email', 'message'].map((id) => ({ input: $('#' + id), error: $('#' + id + '-err') }));
    form.noValidate = true;

    const check = ({ input, error }) => {
      const ok = input.value.trim() !== '' && input.checkValidity();
      input.setAttribute('aria-invalid', String(!ok));
      error.hidden = ok;
      return ok;
    };
    fields.forEach((f) => {
      f.input.addEventListener('blur', () => { if (f.input.value) check(f); });
      f.input.addEventListener('input', () => { if (f.input.getAttribute('aria-invalid') === 'true') check(f); });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = fields.filter((f) => !check(f));
      if (invalid.length) {
        status.textContent = '';
        invalid[0].input.focus();
        return;
      }
      const [name, email, message] = fields.map((f) => f.input.value.trim());
      const to = form.getAttribute('action').replace(/^mailto:/, '');
      const subject = encodeURIComponent('Novo projeto: ' + name);
      const body = encodeURIComponent(`${message}\n\n${name}\n${email}`);
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      // Não sabemos se há uma aplicação de email configurada: damos sempre o endereço
      status.textContent = `A abrir o seu email com a mensagem pronta. Se nada abrir, escreva-nos para ${to}.`;
    });
  })();

  /* ---------- Chat: botão de vidro e ponto de ligação para um agente ----------
     window.InsightoryChat expõe open(), close(), toggle(), isOpen, mount (o elemento #chatMount)
     e ready() (esconde o contacto por email quando há um agente a funcionar).
     Os eventos 'insightory:chat-open' e 'insightory:chat-close' são emitidos no document. */
  (() => {
    const chat = $('#chat');
    const launcher = $('#chatLauncher');
    const panel = $('#chatPanel');
    const mount = $('#chatMount');
    if (!chat || !launcher || !panel) return;

    // Refração do vidro, à medida do botão
    const shape = () => {
      const r = launcher.getBoundingClientRect();
      Refract.make('rf-chat', r.width, r.height, r.width / 2, Math.round(r.width * 0.34), Math.round(r.width * 0.17));
    };
    shape();
    new ResizeObserver(shape).observe(launcher);

    let open = false;
    const set = (next, focus = true) => {
      if (next === open) return;
      open = next;
      launcher.setAttribute('aria-expanded', String(open));
      launcher.setAttribute('aria-label', open ? 'Fechar chat' : 'Abrir chat');
      panel.hidden = !open;
      if (focus) (open ? panel : launcher).focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent(open ? 'insightory:chat-open' : 'insightory:chat-close', { detail: { panel, mount } }));
    };
    launcher.addEventListener('click', () => set(!open));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) set(false); });
    // As ligações para a própria página (o formulário) fecham o painel
    panel.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) set(false, false); });

    window.InsightoryChat = {
      open: () => set(true),
      close: () => set(false),
      toggle: () => set(!open),
      get isOpen() { return open; },
      mount,
      ready() { panel.dataset.agent = 'ready'; },
    };

    // O vidro escurece quando o botão passa sobre um painel preto
    const darkZones = $$('[data-nav-tone="dark"]');
    let queued = false;
    const tone = () => {
      queued = false;
      const r = launcher.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dark = darkZones.some((el) => {
        const z = el.getBoundingClientRect();
        return cx >= z.left && cx <= z.right && cy >= z.top && cy <= z.bottom;
      });
      chat.classList.toggle('chat--dark', dark);
    };
    const queueTone = () => { if (!queued) { queued = true; requestAnimationFrame(tone); } };
    window.addEventListener('scroll', queueTone, { passive: true });
    window.addEventListener('resize', queueTone);
    tone();
  })();

  /* ---------- Pormenores ---------- */
  // O brilho dos botões acompanha o ponteiro
  if (canHover) {
    document.addEventListener('pointermove', (e) => {
      const btn = e.target.closest?.('.btn, .chat__launcher');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      btn.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  // Ligações ainda por preencher não devem saltar para o topo
  $$('a[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  Refract.activate();
  root.classList.add('ready');
})();
