/* MedForge site previews: small interactive samples of the in-app games. Data is injected per page as JSON. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const srcLinks = ids => (ids || []).map(i => window.SOURCES[i]).filter(Boolean).map(s => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(' · ');

  // ---- ECG rhythm quiz (pre-rendered strips)
  window.initEcg = function (root, data) {
    let n = 0, score = 0, order = shuffle(data.items);
    const box = $(root);
    function show() {
      const q = order[n % order.length];
      const opts = shuffle([q.id].concat(shuffle(q.confused).slice(0, 3)));
      box.innerHTML = `<div>${q.svg}</div><p class="hint" style="margin-top:10px">What is the rhythm? Score: <b>${score}</b></p><div class="opts"></div><div class="feedback" hidden></div>`;
      const o = $('.opts', box), f = $('.feedback', box);
      opts.forEach(id => {
        const b = el('button', 'opt', esc(data.names[id])); b.onclick = () => {
          if (!f.hidden) return;
          const ok = id === q.id; if (ok) score += 10;
          b.classList.add(ok ? 'ok' : 'no'); [...o.children].forEach(x => { if (x.textContent === data.names[q.id]) x.classList.add('ok'); });
          f.hidden = false;
          f.innerHTML = `<b>${esc(q.name)}</b> (${esc(q.rate)})<ul class="clean">${q.findings.map(x => `<li>${esc(x)}</li>`).join('')}</ul><i class="serif">${esc(q.pearl)}</i><br><small>${srcLinks(q.sources)}</small><br><br><button class="btn">Next strip</button>`;
          $('.btn', f).onclick = () => { n++; show(); };
        }; o.appendChild(b);
      });
    }
    show();
  };

  // ---- Acid-base solver (live)
  const ph = (h, p) => Math.round((6.1 + Math.log10(h / (0.03 * p))) * 100) / 100;
  function solve(i) {
    const pH = ph(i.hco3, i.pco2), out = [];
    const state = pH < 7.35 ? 'acidemia' : pH > 7.45 ? 'alkalemia' : 'normal';
    out.push(`<b>pH ${pH.toFixed(2)}</b>: ${state === 'normal' ? 'normal pH (does not exclude a disorder)' : state}.`);
    let primary = 'none';
    if (state === 'acidemia') primary = (i.hco3 < 22 || !(i.pco2 > 45)) ? 'metabolic acidosis' : 'respiratory acidosis';
    if (state === 'alkalemia') primary = (i.hco3 > 26 || !(i.pco2 < 35)) ? 'metabolic alkalosis' : 'respiratory alkalosis';
    out.push(primary === 'none' ? 'No primary disturbance from pH, PaCO2 and HCO3; check the anion gap.' : `Primary process: <b>${primary}</b>.`);
    const f1 = x => x.toFixed(1);
    if (primary === 'metabolic acidosis') { const e = 1.5 * i.hco3 + 8; out.push(`Expected PaCO2 = 1.5 x ${i.hco3} + 8 = ${f1(e)} (${f1(e - 2)} to ${f1(e + 2)}): ` + (i.pco2 > e + 2 ? 'concurrent respiratory acidosis.' : i.pco2 < e - 2 ? 'concurrent respiratory alkalosis.' : 'appropriate compensation.')); }
    if (primary === 'metabolic alkalosis') { const e = 40 + 0.7 * (i.hco3 - 24); out.push(`Expected PaCO2 = 40 + 0.7 x (${i.hco3} - 24) = ${f1(e)} (${f1(e - 5)} to ${f1(e + 5)}): ` + (i.pco2 > e + 5 ? 'concurrent respiratory acidosis.' : i.pco2 < e - 5 ? 'concurrent respiratory alkalosis.' : 'appropriate compensation.')); }
    if (primary === 'respiratory acidosis') { const d = (i.pco2 - 40) / 10, a = 24 + d, c = 24 + 3.5 * d; out.push(`Expected HCO3: acute ${f1(a)}, chronic ${f1(c)}: ` + (i.hco3 < a - 2 ? 'concurrent metabolic acidosis.' : i.hco3 > c + 2 ? 'concurrent metabolic alkalosis.' : i.hco3 <= a + 1 ? 'acute.' : i.hco3 >= c - 1 ? 'chronic.' : 'acute on chronic.')); }
    if (primary === 'respiratory alkalosis') { const d = (40 - i.pco2) / 10, a = 24 - 2 * d, c = 24 - 4 * d; out.push(`Expected HCO3: acute ${f1(a)}, chronic ${f1(c)}: ` + (i.hco3 < c - 2 ? 'concurrent metabolic acidosis.' : i.hco3 > a + 2 ? 'concurrent metabolic alkalosis.' : i.hco3 >= a - 1 ? 'acute.' : i.hco3 <= c + 1 ? 'chronic.' : 'between acute and chronic.')); }
    const ag = i.na - (i.cl + i.hco3), cag = ag + 2.5 * Math.max(0, 4 - i.albumin);
    let g = `Anion gap = ${i.na} - (${i.cl} + ${i.hco3}) = <b>${ag}</b>` + (i.albumin < 4 ? `, albumin-corrected ${f1(cag)}` : '') + '. ';
    if (cag > 12) { const dh = 24 - i.hco3; if (dh <= 0) g += 'Gap is high but HCO3 has not fallen: a hidden metabolic alkalosis.'; else { const r = (cag - 12) / dh; g += `Delta ratio ${f1(r)}: ` + (r < 0.8 ? 'concurrent non-gap acidosis.' : r <= 2 ? 'pure gap acidosis.' : 'concurrent metabolic alkalosis.'); } }
    else g += 'Normal gap.';
    out.push(g); return out;
  }
  window.initAbg = function (root, data) {
    const box = $(root);
    const v = { hco3: 8, pco2: 20, na: 134, cl: 96, albumin: 4 };
    const defs = [['hco3', 'HCO3', 4, 45, 1], ['pco2', 'PaCO2', 10, 100, 1], ['na', 'Na', 120, 155, 1], ['cl', 'Cl', 80, 125, 1], ['albumin', 'Albumin', 1, 5, 0.5]];
    box.innerHTML = `<div class="opts" id="presets" style="grid-auto-flow:column;grid-auto-columns:max-content;overflow:auto;margin-bottom:10px"></div><div class="ticket"></div><div id="sl"></div><div class="feedback"></div>`;
    const sl = $('#sl', box), tk = $('.ticket', box), fb = $('.feedback', box);
    function render() {
      tk.innerHTML = `<div><b>${ph(v.hco3, v.pco2).toFixed(2)}</b><span>pH</span></div><div><b>${v.pco2}</b><span>PaCO2 mmHg</span></div><div><b>${v.hco3}</b><span>HCO3 mEq/L</span></div>`;
      fb.innerHTML = solve(v).map(x => `<p style="margin:6px 0">${x}</p>`).join('');
    }
    defs.forEach(([k, label, lo, hi, st]) => {
      const row = el('div', 'sl', `<span>${label}</span><input type="range" min="${lo}" max="${hi}" step="${st}" value="${v[k]}"><b class="mono">${v[k]}</b>`);
      const inp = $('input', row), out = $('b', row);
      inp.oninput = () => { v[k] = parseFloat(inp.value); out.textContent = v[k]; render(); };
      row.dataset.k = k; sl.appendChild(row);
    });
    data.cases.forEach(c => {
      const b = el('button', 'opt', esc(c.title)); b.style.whiteSpace = 'nowrap';
      b.onclick = () => { Object.assign(v, c.inputs); [...sl.children].forEach(r => { const k = r.dataset.k; $('input', r).value = v[k]; $('b', r).textContent = v[k]; }); render(); };
      $('#presets', box).appendChild(b);
    });
    render();
  };

  // ---- Chest pain detective
  window.initDetective = function (root, data) {
    const box = $(root), c = data.case, cost = [4, 6, 10, 14], col = ['#5E5B85', '#2F7A6C', '#B3202E', '#4A5563'], short = ['HISTORY', 'EXAM', 'ECG/LAB', 'IMAGING'];
    const rev = []; let wrong = [], over = false;
    function render() {
      const spent = rev.reduce((s, i) => s + cost[c.clues[i].c], 0) + wrong.length * 15;
      box.innerHTML = `<p class="serif" style="font-size:19px;margin:0 0 6px"><b>${esc(c.opening)}</b></p><p class="hint">Points left: <b>${Math.max(0, 100 - spent)}</b></p><div class="chart"></div>`;
      const ch = $('.chart', box);
      rev.forEach(i => ch.appendChild(el('div', 'clue', `<span class="chip" style="background:${col[c.clues[i].c]}">${short[c.clues[i].c]}</span><span>${esc(c.clues[i].t)}</span>`)));
      if (over) return;
      const o = el('div', 'opts'); o.style.gridTemplateColumns = 'repeat(auto-fit,minmax(170px,1fr))';
      data.categories.forEach((name, ci) => {
        const left = c.clues.filter((x, i) => x.c === ci && !rev.includes(i)).length;
        const b = el('button', 'opt', `${esc(name)}<br><small class="mono">${left ? '-' + cost[ci] + ' pts, ' + left + ' left' : 'nothing more'}</small>`); b.disabled = !left;
        b.onclick = () => { const idx = c.clues.findIndex((x, i) => x.c === ci && !rev.includes(i)); rev.push(idx); render(); }; o.appendChild(b);
      });
      box.appendChild(o);
      box.appendChild(el('p', 'hint', '<br>Name the diagnosis:'));
      const d = el('div', 'opts'); d.style.gridTemplateColumns = 'repeat(auto-fit,minmax(200px,1fr))';
      data.diagnoses.forEach(x => {
        const b = el('button', 'opt' + (wrong.includes(x.id) ? ' no' : ''), esc(x.name)); b.disabled = wrong.includes(x.id);
        b.onclick = () => {
          if (x.id === c.answer) { over = true; render(); const spent2 = rev.reduce((s, i) => s + cost[c.clues[i].c], 0) + wrong.length * 15;
            box.appendChild(el('div', 'feedback', `<b>Correct: ${esc(x.name)}</b> (${Math.max(10, 100 - spent2)} points)<ul class="clean">${c.teaching.map(t => `<li>${esc(t)}</li>`).join('')}</ul><small>${srcLinks(c.sources)}</small>`)); }
          else { wrong.push(x.id); render(); }
        }; d.appendChild(b);
      });
      box.appendChild(d);
    }
    render();
  };

  // ---- Drug pathway
  window.initDrug = function (root, data) {
    const box = $(root), d = data.drug, slots = [['target', 'TARGET', 'Where does it act?'], ['effect', 'EFFECT', 'What does that change?'], ['benefit', 'BENEFIT', 'Why does that help?'], ['adverse', 'ADVERSE EFFECT', 'What can go wrong?']];
    const picks = {}, opts = {}; slots.forEach(([k]) => { opts[k] = shuffle([d[k]].concat(shuffle(data.others.map(o => o[k])).slice(0, 3))); });
    let checked = false;
    function render() {
      box.innerHTML = `<div style="background:var(--accent);color:#fff;border-radius:14px;padding:14px;text-align:center"><div class="serif" style="font-size:26px;font-weight:700">${esc(d.name)}</div><i>${esc(d.drugClass)}</i></div>`;
      slots.forEach(([k, title, prompt]) => {
        const ok = checked ? picks[k] === d[k] : null;
        const n = el('div', 'box', `<div class="tag" style="color:${ok === null ? 'var(--soft)' : ok ? 'var(--good)' : 'var(--bad)'}">${title}${ok === null ? '' : ok ? ' ✓' : ' ✕'}</div><div>${esc(picks[k] || prompt)}</div>`);
        n.style.margin = '8px 0';
        if (checked && !ok) n.appendChild(el('div', '', `<small style="color:var(--good)">Correct: ${esc(d[k])}</small>`));
        if (!checked) { const o = el('div', 'opts'); opts[k].forEach(t => { const b = el('button', 'opt' + (picks[k] === t ? ' ok' : ''), esc(t)); b.style.fontWeight = 500; b.style.fontSize = '14px'; b.onclick = () => { picks[k] = t; render(); }; o.appendChild(b); }); n.appendChild(o); }
        box.appendChild(n);
      });
      if (!checked) { const b = el('button', 'btn', 'Check pathway'); b.disabled = Object.keys(picks).length < 4; b.style.opacity = b.disabled ? .4 : 1; b.onclick = () => { checked = true; render(); }; box.appendChild(b); }
      else box.appendChild(el('div', 'feedback', `<b>Monitoring and safety</b><br>${esc(d.monitoring)}<br><small>${srcLinks(d.sources)}</small>`));
    }
    render();
  };

  // ---- Neuro localizer (one case, choose site)
  window.initNeuro = function (root, data) {
    const box = $(root), c = data.case; let wrong = [], done = false;
    function render() {
      box.innerHTML = `<div class="box"><h3>${esc(c.title)}</h3><ul class="clean">${c.findings.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div><p class="hint" style="margin-top:12px">Where is the lesion?</p>`;
      data.regions.forEach((r, ri) => {
        box.appendChild(el('div', 'tag', esc(r)));
        const o = el('div', 'opts'); o.style.margin = '6px 0 12px';
        data.sites.filter(s => s.region === ri).forEach(s => {
          const b = el('button', 'opt' + (wrong.includes(s.id) ? ' no' : '') + (done && s.id === c.site ? ' ok' : ''), `${esc(s.name)}<br><small style="font-weight:400;color:var(--soft)">${esc(s.note)}</small>`);
          b.disabled = done || wrong.includes(s.id);
          b.onclick = () => { if (s.id === c.site) done = true; else wrong.push(s.id); render(); }; o.appendChild(b);
        }); box.appendChild(o);
      });
      const last = wrong[wrong.length - 1];
      if (!done && last) box.appendChild(el('div', 'feedback', '💡 ' + esc(c.wrong[last] || 'That site would not produce this pattern of findings.')));
      if (done) box.appendChild(el('div', 'feedback', `<b>${esc(c.diagnosis)}</b><br>${esc(c.explain)}<br><small>${srcLinks(c.sources)}</small>`));
    }
    render();
  };

  // ---- Nephron navigator
  window.initNephron = function (root, data) {
    const box = $(root); let qi = 0, wrong = [], done = false; const qs = shuffle(data.questions).slice(0, 5);
    function render() {
      const q = qs[qi % qs.length];
      box.innerHTML = `<p class="serif" style="font-size:19px;margin:0 0 8px"><b>${esc(q.stem)}</b></p>` + data.svg + '<div class="feedback" hidden></div>';
      const svg = $('svg', box);
      data.segments.forEach(s => { const g = svg.querySelector(`[data-id="${s.id}"]`); if (!g) return;
        if (wrong.includes(s.id)) g.style.stroke = 'var(--bad)'; if (done && s.id === q.answer) g.style.stroke = 'var(--good)';
        g.onclick = () => { if (done) return; if (s.id === q.answer) done = true; else wrong.push(s.id); render(); }; });
      const f = $('.feedback', box);
      if (done) { f.hidden = false; f.innerHTML = `<b>${esc(data.names[q.answer])}</b><br>${esc(q.why)}<br><small>${srcLinks(q.sources)}</small><br><br><button class="btn">Next question</button>`; $('.btn', f).onclick = () => { qi++; wrong = []; done = false; render(); }; }
      else if (wrong.length) { f.hidden = false; f.textContent = 'Not ' + wrong.map(w => data.names[w]).join(', ') + '. Try again.'; }
    }
    render();
  };

  // ---- Trauma bay (one case, branching decisions)
  window.initTrauma = function (root, data) {
    const box = $(root), c = data.case; let si = 0, stab = 100, chosen = null, dead = false;
    const opts0 = c.steps.map(st => shuffle(st.options));
    function render() {
      const st = c.steps[si];
      const col = stab > 60 ? 'var(--good)' : stab > 30 ? '#E0922B' : 'var(--bad)';
      let h = `<p class="serif" style="font-size:17px;margin:0 0 8px">${esc(c.brief)}</p><div class="tag" style="color:var(--soft)">Patient stability <b style="color:${col}">${stab}</b></div><div style="height:8px;background:var(--rule);border-radius:9px;margin:4px 0 12px"><div style="height:8px;width:${stab}%;background:${col};border-radius:9px"></div></div>`;
      if (dead || si >= c.steps.length) {
        h += `<div class="feedback"><b>${dead ? 'The patient arrested' : 'Patient stabilised'}</b> ${'★'.repeat(dead ? 0 : stab >= 90 ? 3 : stab >= 60 ? 2 : 1)}<ul class="clean">${c.teaching.map(t => `<li>${esc(t)}</li>`).join('')}</ul><small>${srcLinks(c.sources)}</small><br><br><button class="btn" id="again">Play again</button></div>`;
        box.innerHTML = h; $('#again', box).onclick = () => { si = 0; stab = 100; chosen = null; dead = false; render(); }; return;
      }
      h += `<div class="tag" style="color:var(--accent)">${st.phase} · ${esc(data.phases[st.phase])} · step ${si + 1} of ${c.steps.length}</div>`;
      h += `<div class="ticket" style="grid-template-columns:repeat(4,1fr)"><div><b>${st.status.hr}</b><span>HR</span></div><div><b>${esc(st.status.bp)}</b><span>BP</span></div><div><b>${st.status.spo2}%</b><span>SpO2</span></div><div><b>${st.status.gcs}</b><span>GCS</span></div></div>`;
      h += `<ul class="clean">${st.findings.map(f => `<li>${esc(f)}</li>`).join('')}</ul><p class="serif" style="font-size:17px;margin:10px 0 0"><b>${esc(st.prompt)}</b></p><div class="opts" id="o"></div><div id="n"></div>`;
      box.innerHTML = h; const o = $('#o', box);
      opts0[si].forEach(op => {
        const b = el('button', 'opt' + (chosen ? (op.rating === 'best' ? ' ok' : op === chosen ? ' no' : '') : ''), esc(op.text));
        if (chosen && (op === chosen || op.rating === 'best')) b.innerHTML += `<br><small style="font-weight:400">${op.rating === 'best' ? 'Best choice. ' : op.rating === 'dangerous' ? 'Dangerous. ' : 'Poor choice. '}${esc(op.feedback)}</small>`;
        b.disabled = !!chosen && op !== chosen && op.rating !== 'best';
        b.onclick = () => { if (chosen) return; chosen = op; stab = Math.max(0, stab - (data.penalty[op.rating] || 0)); if (!stab) dead = true; render(); };
        o.appendChild(b);
      });
      if (chosen) { const nb = el('button', 'btn', dead ? 'See what happened' : si + 1 >= c.steps.length ? 'Finish' : 'Next step'); nb.style.marginTop = '12px'; nb.onclick = () => { chosen = null; if (!dead) si++; render(); }; $('#n', box).appendChild(nb); }
    }
    render();
  };

  // ---- Spirometry lab (loop + 4 steps)
  const spExp = (shape, pef, x) => { const rise = shape === 'fixed_upper' ? 0.08 : 0.10; if (x <= rise) return pef * x / rise; const t = (x - rise) / (1 - rise);
    return shape === 'obstructive' ? pef * Math.pow(1 - t, 2.4) : shape === 'restrictive' ? pef * Math.pow(1 - t, 0.9) : shape === 'fixed_upper' ? pef * Math.min(1, (1 - t) / 0.15) : pef * (1 - t); };
  const spIns = (shape, pif, x) => shape === 'fixed_upper' ? -pif * Math.min(1, 6 * Math.min(x, 1 - x)) : -pif * Math.sqrt(Math.max(0, 4 * x * (1 - x)));
  const spPts = (l, n = 60) => { const o = []; for (let i = 0; i <= n; i++) { const x = i / n; o.push([x * l.fvc, spExp(l.shape, l.pef, x)]); } for (let i = 0; i <= n; i++) { const x = 1 - i / n; o.push([x * l.fvc, spIns(l.shape, l.pif, x)]); } return o; };
  window.initSpiro = function (root, data) {
    const box = $(root); let ci = 0, step = 0, wrong = [], notes = [];
    function solve(c) { const v = c.values, ratio = v.fev1 / v.fvc; const pattern = c.loop.shape === 'fixed_upper' ? 'fixedUpper' : ratio < 0.7 ? 'obstructive' : v.fvcpct < 80 ? 'restrictive' : 'normal';
      let rev = 'notTested'; if (v.postFev1 != null) { const d = v.postFev1 - v.fev1; rev = (d >= 0.2 && d / v.fev1 * 100 >= 12) ? 'yes' : 'no'; }
      return { ratio, pattern, rev, dlco: v.dlcopct == null ? 'notMeasured' : v.dlcopct < 80 ? 'low' : 'normal' }; }
    function svg(c) {
      const v = c.values, fp = v.fvc / (v.fvcpct / 100), pred = { shape: 'normal', fvc: fp, pef: 9.5 * fp / 4, pif: 5.2 * fp / 4 };
      const maxV = Math.max(c.loop.fvc, pred.fvc) * 1.08, maxF = Math.max(c.loop.pef, pred.pef) * 1.12, minF = -Math.max(c.loop.pif, pred.pif) * 1.15, W = 520, H = 250;
      const P = ([a, b]) => `${(a / maxV * W).toFixed(1)} ${((maxF - b) / (maxF - minF) * H).toFixed(1)}`;
      const path = l => 'M' + spPts(l).map(P).join('L');
      return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:560px;display:block;margin:0 auto;border:1px solid var(--rule);border-radius:12px;background:var(--paper)"><path d="M0 ${((maxF) / (maxF - minF) * H).toFixed(1)}H${W}" stroke="var(--soft)" fill="none"/><path d="${path(pred)}" fill="none" stroke="var(--soft)" stroke-dasharray="6 5" stroke-width="1.6"/><path d="${path(c.loop)}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/></svg>`;
    }
    function choices(c, s) {
      const sol = solve(c);
      if (s === 0) return [['normal', 'Normal'], ['obstructive', 'Obstructive'], ['restrictive', 'Restrictive'], ['fixedUpper', 'Fixed upper airway obstruction (flat-topped loop)']].map(([k, t]) => [t, k === sol.pattern]);
      if (s === 1) return [['yes', 'Significant (FEV1 up 12% and 200 mL or more)'], ['no', 'Not significant'], ['notTested', 'Not tested']].map(([k, t]) => [t, k === sol.rev]);
      if (s === 2) return [['low', 'Reduced (below 80% predicted)'], ['normal', 'Normal'], ['notMeasured', 'Not measured']].map(([k, t]) => [t, k === sol.dlco]);
      const others = shuffle(data.cases.filter(x => x.id !== c.id)).slice(0, 3).map(x => x.cause); return shuffle([c.cause].concat(others)).map(t => [t, t === c.cause]);
    }
    const titles = ['1 · Pattern', '2 · Bronchodilator response', '3 · Gas transfer (DLCO)', '4 · Diagnosis'];
    const explain = (c, s) => { const sol = solve(c), v = c.values; if (s === 0) return `FEV1/FVC = ${v.fev1.toFixed(2)} / ${v.fvc.toFixed(2)} = ${sol.ratio.toFixed(2)}; FVC ${v.fvcpct}% predicted. Pattern: ${sol.pattern === 'fixedUpper' ? 'fixed upper airway obstruction (flat-topped loop, very low peak flow)' : sol.pattern}.`;
      if (s === 1) return v.postFev1 != null ? `FEV1 changed by ${(v.postFev1 - v.fev1).toFixed(2)} L (${((v.postFev1 - v.fev1) / v.fev1 * 100).toFixed(0)}%): ${sol.rev === 'yes' ? 'significant' : 'not significant'}.` : 'No post-bronchodilator test was done.';
      if (s === 2) return v.dlcopct != null ? `DLCO ${v.dlcopct}% of predicted: ${sol.dlco === 'low' ? 'reduced' : 'normal'}.` : 'DLCO was not measured.'; return c.teaching; };
    function render() {
      const c = data.cases[ci];
      let h = `<div class="opts" style="grid-auto-flow:column;grid-auto-columns:max-content;overflow:auto;margin-bottom:10px" id="pick"></div><p class="serif" style="font-size:17px;margin:6px 0 10px">${esc(c.vignette)}</p>${svg(c)}`;
      const v = c.values; h += `<div class="ticket" style="grid-template-columns:repeat(3,1fr)"><div><b>${v.fev1.toFixed(2)}</b><span>FEV1 L (${v.fevpct || v.fev1pct}%)</span></div><div><b>${v.fvc.toFixed(2)}</b><span>FVC L (${v.fvcpct}%)</span></div><div><b>${(v.fev1 / v.fvc).toFixed(2)}</b><span>FEV1/FVC</span></div><div><b>${v.postFev1 != null ? v.postFev1.toFixed(2) : 'n/a'}</b><span>post-BD FEV1</span></div><div><b>${v.dlcopct != null ? v.dlcopct + '%' : 'n/a'}</b><span>DLCO</span></div><div><b>${v.tlcpct != null ? v.tlcpct + '%' : 'n/a'}</b><span>TLC</span></div></div>`;
      notes.forEach(n => h += `<div class="feedback" style="border-color:var(--good)"><b style="color:var(--good)">✓ ${titles[n[0]]}</b><br>${esc(n[1])}</div>`);
      if (step < 4) h += `<p class="serif" style="font-size:18px;margin:12px 0 0"><b>${titles[step]}</b></p><div class="opts" id="o"></div>`;
      else h += `<div class="feedback"><b>${esc(c.cause)}</b><br><small>${srcLinks(c.sources)}</small></div>`;
      box.innerHTML = h;
      const pk = $('#pick', box); data.cases.forEach((x, i) => { const b = el('button', 'opt', esc(x.title)); b.style.whiteSpace = 'nowrap'; if (i === ci) b.classList.add('ok'); b.onclick = () => { ci = i; step = 0; wrong = []; notes = []; render(); }; pk.appendChild(b); });
      if (step < 4) { const o = $('#o', box); choices(c, step).forEach(([t, ok]) => { const b = el('button', 'opt' + (wrong.includes(t) ? ' no' : ''), esc(t)); b.disabled = wrong.includes(t);
        b.onclick = () => { if (ok) { notes.push([step, explain(c, step)]); step++; wrong = []; } else wrong.push(t); render(); }; o.appendChild(b); }); }
    }
    render();
  };
})();
