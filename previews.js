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
          f.innerHTML = `<b>${esc(q.name)}</b> (${esc(q.rate)})<ul class="clean">${q.findings.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${q.note ? `<p><b>${esc(q.note)}</b></p>` : ''}<i class="serif">${esc(q.pearl)}</i>${q.next ? `<p><small>WHAT TO DO NEXT</small><br>${esc(q.next)}</p>` : ''}<br><small>${srcLinks(q.sources)}</small><br><br><button class="btn">Next strip</button>`;
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

  // ---- Endocrine Axes: feedback-loop predictor (same qualitative model as the apps: BFS from the forced node)
  window.initEndo = function (root, data) {
    const box = $(root), L = ['low', 'normal', 'high'], V = { low: -1, normal: 0, high: 1 }, AR = { low: '↓', normal: '→', high: '↑' };
    let ci = 0, pred = {}, revealed = false, step = 0, timer = null;
    const axisOf = c => data.axes.find(a => a.id === c.axis);
    const propagate = (axis, forced) => {
      const lv = {}; axis.nodes.forEach(n => lv[n.id] = 0);
      const seen = Object.keys(forced); seen.forEach(k => lv[k] = V[forced[k]]);
      const q = seen.slice(), tr = [];
      while (q.length) { const u = q.shift(); axis.edges.forEach(e => { if (e.from === u && !seen.includes(e.to)) { lv[e.to] = (e.sign === '+' ? 1 : -1) * lv[u]; seen.push(e.to); q.push(e.to); tr.push({ from: e.from, to: e.to, level: lv[e.to] }); } }); }
      return { lv, tr };
    };
    const word = v => v > 0 ? 'high' : v < 0 ? 'low' : 'normal';
    function svg(c, axis, shown, lit) {
      const W = 400, H = axis.nodes.every(n => n.y >= .4 && n.y <= .65) ? 210 : 276, nw = 96, nh = 50, P = n => [n.x * W, n.y * H];
      const node = id => axis.nodes.find(n => n.id === id);
      const clip = (dx, dy) => { const len = Math.hypot(dx, dy) || 1e-4, ux = dx / len, uy = dy / len, tx = Math.abs(ux) < 1e-4 ? 1e9 : (nw / 2 + 3) / Math.abs(ux), ty = Math.abs(uy) < 1e-4 ? 1e9 : (nh / 2 + 3) / Math.abs(uy), t = Math.min(tx, ty); return [ux * t, uy * t]; };
      let out = `<svg viewBox="0 0 ${W} ${H}" class="endo" role="img" aria-label="${esc(axis.name + ': ' + axis.edges.map(e => node(e.from).label + (e.sign === '+' ? ' stimulates ' : ' inhibits ') + node(e.to).label).join('. '))}"><rect width="${W}" height="${H}" rx="14" fill="none"/>`;
      axis.edges.forEach((e, i) => {
        const a = P(node(e.from)), b = P(node(e.to)), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-4;
        const ctl = [(a[0] + b[0]) / 2 + (-dy / len) * e.curve * H, (a[1] + b[1]) / 2 + (dx / len) * e.curve * H];
        const s0 = clip(ctl[0] - a[0], ctl[1] - a[1]), e0 = clip(ctl[0] - b[0], ctl[1] - b[1]), s = [a[0] + s0[0], a[1] + s0[1]], t = [b[0] + e0[0], b[1] + e0[1]];
        const on = lit.has(i), col = on ? '#178a5e' : '#5b6b62', tx = t[0] - ctl[0], ty = t[1] - ctl[1], tl = Math.hypot(tx, ty) || 1e-4, ux = tx / tl, uy = ty / tl;
        out += `<path d="M${s[0]},${s[1]} Q${ctl[0]},${ctl[1]} ${t[0]},${t[1]}" fill="none" stroke="${col}" stroke-width="${on ? 3.4 : 1.8}" ${e.kind === 'feedback' ? 'stroke-dasharray="6 5"' : ''} stroke-linecap="round"/>`;
        out += e.sign === '+' ? `<path d="M${t[0]},${t[1]} L${t[0] - ux * 11 - uy * 6},${t[1] - uy * 11 + ux * 6} L${t[0] - ux * 11 + uy * 6},${t[1] - uy * 11 - ux * 6}Z" fill="${col}"/>` : `<path d="M${t[0] - uy * 8},${t[1] + ux * 8} L${t[0] + uy * 8},${t[1] - ux * 8}" stroke="${col}" stroke-width="3.4" stroke-linecap="round"/>`;
        const m = [.25 * s[0] + .5 * ctl[0] + .25 * t[0], .25 * s[1] + .5 * ctl[1] + .25 * t[1]];
        out += `<circle cx="${m[0]}" cy="${m[1]}" r="9" fill="#fff" stroke="${col}"/><text x="${m[0]}" y="${m[1] + 4.5}" text-anchor="middle" font-size="13" font-weight="800" fill="#12211b">${e.sign === '+' ? '+' : '−'}</text>`;
      });
      axis.nodes.forEach(n => {
        const p = P(n), lv = shown ? shown[n.id] : null, show = lv != null && !n.hidden, col = !show ? '#14684c' : lv > 0 ? '#b45309' : lv < 0 ? '#1268b3' : '#14684c';
        out += `<rect x="${p[0] - nw / 2}" y="${p[1] - nh / 2}" width="${nw}" height="${nh}" rx="12" fill="${n.hidden ? '#f4faf7' : '#fff'}" stroke="${show ? col : '#dcebe3'}" stroke-width="1.8" ${n.hidden ? 'stroke-dasharray="4 3"' : ''}/>`;
        out += `<text x="${p[0]}" y="${p[1] + (show ? -2 : 5)}" text-anchor="middle" font-size="14" font-weight="800" fill="#12211b">${esc(n.short)}</text>`;
        if (show) out += `<text x="${p[0]}" y="${p[1] + 16}" text-anchor="middle" font-size="13.5" font-weight="700" fill="${col}">${AR[word(lv)]} ${word(lv)}</text>`;
        const f = c.perturbation.forced[n.id];
        if (f && shown) out += `<rect x="${p[0] - 46}" y="${p[1] - nh / 2 - 22}" width="92" height="19" rx="9.5" fill="${f === 'high' ? '#b45309' : '#1268b3'}"/><text x="${p[0]}" y="${p[1] - nh / 2 - 8.5}" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">forced ${f} ${AR[f]}</text>`;
      });
      return out + '</svg>';
    }
    function render() {
      const c = data.cases[ci], axis = axisOf(c), measured = axis.nodes.filter(n => c.expected[n.id]);
      let shown = null, lit = new Set();
      if (revealed) {
        shown = {}; axis.nodes.forEach(n => shown[n.id] = 0); Object.keys(c.perturbation.forced).forEach(k => shown[k] = V[c.perturbation.forced[k]]);
        c.trace.slice(0, step).forEach(s => shown[s.to] = V[s.result]);
        if (step > 0 && step <= c.trace.length) { const s = c.trace[step - 1]; axis.edges.forEach((e, i) => { if (e.from === s.from && e.to === s.to) lit.add(i); }); }
      }
      const done = revealed && step >= c.trace.length;
      let h = `<label class="hint" for="endo-case">Case</label> <select id="endo-case" class="opt" style="display:inline-block;width:auto;padding:8px 12px">${data.cases.map((k, i) => `<option value="${i}" ${i === ci ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>`;
      h += `<p style="margin:10px 0 6px"><b>${esc(c.vignette)}</b></p><div class="plate">${svg(c, axis, shown, lit)}</div><p class="hint">${esc(c.perturbation.note)}</p>`;
      if (!revealed) {
        h += measured.map(n => `<div style="margin:8px 0"><b>${esc(n.label)}</b><div class="opts" style="grid-template-columns:repeat(3,1fr)">${L.map(l => `<button class="opt ${pred[n.id] === l ? 'ok' : ''}" data-n="${n.id}" data-l="${l}">${AR[l]} ${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</div></div>`).join('');
        h += `<button class="btn" id="endo-check" ${measured.every(n => pred[n.id]) ? '' : 'disabled'}>Check</button>`;
      } else {
        h += measured.map(n => { const ok = pred[n.id] === c.expected[n.id]; return `<div class="feedback"><b>${esc(n.label)}</b>: ${ok ? 'correct, ' : 'you said ' + pred[n.id] + '; it is '}${c.expected[n.id]} ${AR[c.expected[n.id]]}</div>`; }).join('');
        if (done) h += `<div class="feedback"><p>${esc(c.why)}</p>${c.caveat ? `<p><i>${esc(c.caveat)}</i></p>` : ''}<small>${srcLinks(c.sources)}</small></div>`;
      }
      box.innerHTML = h;
      $('#endo-case', box).onchange = e => { clearInterval(timer); ci = +e.target.value; pred = {}; revealed = false; step = 0; render(); };
      box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { pred[b.dataset.n] = b.dataset.l; render(); });
      const chk = $('#endo-check', box);
      if (chk) chk.onclick = () => {
        revealed = true; step = 0; render();
        const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { step = c.trace.length; render(); return; }
        timer = setInterval(() => { step++; render(); if (step >= c.trace.length) clearInterval(timer); }, 800);
      };
    }
    render();
  };

  // ---- Outbreak Desk: read the curve, fill the 2x2 from the line list, calculate the relative risk
  window.initOutbreak = function (root, data) {
    const box = $(root); let step = 0, tries = 0, pts = 0, sel = null;
    const cv = data.curve, mx = Math.max.apply(null, cv.counts), top = Math.max(2, Math.ceil(mx / 2) * 2);
    const bars = () => `<div class="obbars" role="group" aria-label="${esc(cv.title)}">` + cv.counts.map((n, i) =>
      `<button class="obbar${sel === i ? ' on' : ''}" data-i="${i}" aria-label="${esc(cv.labels[i])}: ${n} cases"><span class="obn">${n || ''}</span><span class="obfill" style="height:${Math.round(n / top * 140)}px"></span><span class="obl">${esc(cv.labels[i])}</span></button>`).join('') + '</div>';
    const cells = data.table.columns, tIdx = cells.findIndex(c => c.id === 'tiramisu'), iIdx = cells.findIndex(c => c.id === 'ill');
    function line() {
      const body = data.table.rows.slice(0, 12).map(r => `<tr>${r.map((v, j) => cells[j].type === 'bool' ? `<td>${v === 1 ? '\u25CF' : ''}</td>` : `<td>${esc(v == null ? '\u2013' : v)}</td>`).join('')}</tr>`).join('');
      return `<details class="oblist"><summary>Open the line list (first 12 of ${data.table.rows.length} guests)</summary><div class="obscroll"><table class="pr"><thead><tr>${cells.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div><small>Count all ${data.table.rows.length} rows in the app. Here the answer is revealed by the worked solution.</small></details>`;
    }
    function done(ok, q) { return `<div class="feedback"><b>${ok ? 'Correct' : 'Not this time'}.</b> ${esc(q.why)}<br><small>${srcLinks(q.sources)}</small><br><button class="btn soft next" style="margin-top:8px">Next</button></div>`; }
    function render() {
      if (step === 0) {
        box.innerHTML = `<p>${esc(data.setting)}</p><p><b>${esc(data.peak.stem)}</b></p>${bars()}<p class="hint">Tap a bar, then Check.</p><button class="btn check" ${sel == null ? 'disabled' : ''}>Check</button><div class="out"></div><p class="hint">${esc(data.disclaimer)}</p>`;
        box.querySelectorAll('.obbar').forEach(b => b.onclick = () => { sel = +b.dataset.i; render(); });
        const c = $('.check', box); if (c) c.onclick = () => { const ok = data.peak.answer.indexOf(sel) >= 0; pts += ok ? 10 : 0; $('.out', box).innerHTML = done(ok, data.peak); $('.next', box).onclick = () => { step = 1; render(); }; c.disabled = true; };
      } else if (step === 1) {
        const q = data.twoByTwo;
        box.innerHTML = `<p><b>${esc(q.stem)}</b></p>${line()}<table class="pr ob22"><thead><tr><th>${esc(q.exposure)}</th><th>${esc(q.colLabels[0])}</th><th>${esc(q.colLabels[1])}</th></tr></thead><tbody>` +
          [0, 1].map(r => `<tr><td>${esc(q.rowLabels[r])}</td>${[0, 1].map(c => `<td><input class="ob-in" inputmode="numeric" maxlength="3" aria-label="${esc(q.rowLabels[r])}, ${esc(q.colLabels[c])}" data-k="${'abcd'[r * 2 + c]}"></td>`).join('')}</tr>`).join('') +
          `</tbody></table><button class="btn check">Check</button><div class="out"></div>`;
        $('.check', box).onclick = () => { const ins = [...box.querySelectorAll('.ob-in')]; const ok = ins.every(i => +i.value === q.answer[i.dataset.k]); ins.forEach(i => i.style.borderColor = (+i.value === q.answer[i.dataset.k]) ? '' : '#d97706'); if (ok) pts += 10; $('.out', box).innerHTML = done(ok, q); $('.next', box).onclick = () => { step = 2; render(); }; };
      } else if (step === 2) {
        const q = data.number;
        box.innerHTML = `<p><b>${esc(q.stem)}</b></p><input class="ob-in" id="obnum" inputmode="decimal" aria-label="Your answer" placeholder="Your answer"> <button class="btn check">Check</button><div class="out"></div>`;
        $('.check', box).onclick = () => { const x = parseFloat(String($('#obnum', box).value).replace(',', '.')); const ok = Math.abs(x - q.answer) <= q.tolerance; if (ok) pts += 10; $('.out', box).innerHTML = done(ok, q); $('.next', box).onclick = () => { step = 3; render(); }; };
      } else {
        box.innerHTML = `<h3 class="serif">Sample complete</h3><p>${pts} of 30 points. The full case file has six questions, plus four more case files and twelve concept checks in the app.</p><button class="btn soft again">Try again</button>`;
        $('.again', box).onclick = () => { step = 0; pts = 0; sel = null; render(); };
      }
    }
    render();
  };

  // ---- GI tract tour: tap-to-place station sort (same rules as the apps: first miss hints, second miss reveals)
  window.initGi = function (root, data) {
    const box = $(root); let n = 0, score = 0, tries = 0, done = false, order = data.cards.slice();
    const W = 300, H = Math.round(W / data.tract.aspect);
    const P = (a) => ({ x: a[0] * W, y: a[1] * H });
    const smooth = pts => { let d = `M${P(pts[0]).x},${P(pts[0]).y}`; for (let i = 1; i < pts.length - 1; i++) { const c = P(pts[i]), m = P([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]); d += ` Q${c.x},${c.y} ${m.x},${m.y}`; } const l = P(pts[pts.length - 1]); return d + ` L${l.x},${l.y}`; };
    const byId = {}; data.stations.forEach(s => byId[s.id] = s);
    function svg(flash) {
      let g = `<svg viewBox="0 0 ${W + 110} ${H}" class="gi-map" role="group" aria-label="Digestive tract map">`;
      g += `<path d="${smooth(data.tract.path)}" fill="none" stroke="#5F8A3A" stroke-opacity=".22" stroke-width="20" stroke-linecap="round"/><path d="${smooth(data.tract.path)}" fill="none" stroke="#5F8A3A" stroke-opacity=".6" stroke-width="2.5"/>`;
      g += `<path d="${smooth(data.tract.branch.path)}" fill="none" stroke="#5F8A3A" stroke-opacity=".7" stroke-width="2.5" stroke-dasharray="6 5"/>`;
      data.stations.forEach(s => {
        const c = P([s.hit.cx, s.hit.cy]), r = s.hit.r * W, f = flash && flash[s.id], acc = s.id === data.tract.branch.to;
        const col = f || '#5F8A3A';
        const lx = acc ? c.x + r + 5 : (s.label === 'left' ? c.x - r - 6 : c.x + r + 6), anchor = (!acc && s.label === 'left') ? 'end' : 'start', ly = c.y + 5 + (s.id === data.tract.branch.from ? 18 : 0);
        g += `<g class="gi-st" data-id="${s.id}" tabindex="0" role="button" aria-label="Station: ${esc(s.name)}"><circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${f ? f + '33' : '#fff'}" stroke="${col}" stroke-width="3" ${acc ? 'stroke-dasharray="5 4"' : ''}/><circle cx="${c.x}" cy="${c.y}" r="${r * .28}" fill="${col}"/>`;
        const lines = acc ? s.short.split(', ') : [s.short], y0 = acc ? ly - 14 : ly;
        g += `<text x="${lx}" text-anchor="${anchor}" style="font:700 13px Inter,sans-serif;fill:var(--ink);paint-order:stroke;stroke:#fff;stroke-width:3px">${lines.map((t, i) => `<tspan x="${lx}" y="${y0 + i * 15}">${esc(t)}${acc && i < lines.length - 1 ? ',' : ''}</tspan>`).join('')}</text></g>`;
      });
      return g + '</svg>';
    }
    function show(flash, fb) {
      if (n >= order.length) { box.innerHTML = `<div class="feedback"><b>Level 1 complete: ${score} points.</b> The apps add 2 more levels, 6 clinical cases and a review mode.</div><button class="btn" id="gi-again">Play again</button>`; $('#gi-again', box).onclick = () => { n = 0; score = 0; show(); }; return; }
      const c = order[n];
      box.innerHTML = `<div class="gi-card"><span class="tag">${esc(c.id.toUpperCase())}</span><h4 class="serif" style="margin:4px 0">${esc(c.text)}</h4><p>${esc(c.clue)}</p><p><b>${esc(c.ask)}</b> <span class="hint">Click a station.</span></p></div><p class="hint">Card ${n + 1} of ${order.length} · Score <b>${score}</b></p>${svg(flash)}<div class="feedback"${fb ? '' : ' hidden'}>${fb || ''}</div>`;
      box.querySelectorAll('.gi-st').forEach(el => { const go = () => place(el.dataset.id); el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
      const nb = $('#gi-next', box); if (nb) nb.onclick = () => { n++; tries = 0; done = false; show(); };
    }
    function place(id) {
      if (done) return; const c = order[n];
      if (id === c.station) { score += tries === 0 ? 10 : 5; done = true; show({ [id]: '#178A5E' }, `<b>${esc(byId[id].name)}: correct.</b> ${esc(c.why)}<br><small>${srcLinks(c.sources)}</small><br><button class="btn" id="gi-next" style="margin-top:8px">${n + 1 >= order.length ? 'Finish' : 'Next'}</button>`); return; }
      tries++;
      if (tries >= 2) { done = true; show({ [c.station]: '#D97706' }, `<b>It belongs at ${esc(byId[c.station].name)}.</b> ${esc(c.why)}<br><small>${srcLinks(c.sources)}</small><br><button class="btn" id="gi-next" style="margin-top:8px">Next</button>`); return; }
      show({ [id]: '#DC2626' }, `Not there. ${esc(c.ask)} Think about the station that does this: ${esc(byId[c.station].blurb.charAt(0).toLowerCase() + byId[c.station].blurb.slice(1))}`);
    }
    show();
  };
  // ---- Dose and Interaction Drill (one calculation bench, one interaction round)
  window.initDosing = function (root, data) {
    const box = $(root), c = data.calc, e = c.entry, it = data.item, sc = data.scoring;
    let tab = 'calc', value = e.min, unit = data.units[0], hint = false, stepsUsed = false, revealed = 0, solved = false, fb = null;
    let mechDone = false, actDone = false, wrongM = [], wrongA = [], lastMech = null;
    const fmtN = v => Number(v.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: 4 });
    const fmtF = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    const clamp = v => Math.min(e.max, Math.max(e.min, Math.round(v * 1e6) / 1e6));
    const points = () => stepsUsed ? sc.calcAfterSteps : hint ? sc.calcAfterHint : sc.calcFirstTry;
    const sevColor = { contraindicated: 'var(--bad)', avoid: '#D97706', adjust: 'var(--accent)', monitor: 'var(--good)' };
    const sevMark = { contraindicated: '⛔', avoid: '⚠', adjust: '⇅', monitor: '👁' };

    function check() {
      const a = c.answer, numOk = Math.abs(value - a.value) <= a.tolerance + 1e-9;
      if (numOk) return unit === a.unit ? ['ok', `Correct. +${points()} points.`] : ['warn', `Right number, wrong unit. Units matter: ${unit} is not the unit of this answer. Pick the unit the result is expressed in.`];
      for (const w of c.whyWrong) if (Math.abs(value - w.value) <= Math.max(a.tolerance, 0.02 * Math.abs(w.value)) + 1e-9) return ['no', w.text];
      if (a.value !== 0) {
        if (Math.abs(value - a.value * 10) <= 0.02 * Math.abs(a.value * 10) + 1e-9) return ['no', 'Off by a factor of ten: that is ten times too large. Recheck the decimal point.'];
        if (Math.abs(value - a.value / 10) <= 0.02 * Math.abs(a.value / 10) + 1e-9) return ['no', 'Off by a factor of ten: that is ten times too small. Recheck the decimal point.'];
      }
      return ['no', 'Not quite. Try again, or use the hint.'];
    }

    function render() {
      box.innerHTML = `<div class="opts" style="grid-template-columns:1fr 1fr;margin-bottom:10px"><button class="opt ${tab === 'calc' ? 'ok' : ''}" data-tab="calc">1 · Calculation</button><button class="opt ${tab === 'int' ? 'ok' : ''}" data-tab="int">2 · Interaction</button></div><div id="dz"></div><p class="fine" style="margin-top:12px">${esc(data.note)}</p>`;
      box.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
      const z = $('#dz', box); tab === 'calc' ? calc(z) : inter(z);
    }

    function calc(z) {
      const rows = c.given.map(g => `<tr><td><b>${esc(g.label)}</b></td><td class="mono" style="text-align:right">${esc(typeof g.value === 'number' ? fmtN(g.value) : g.value)} ${esc(g.unit)}</td></tr>`).join('');
      z.innerHTML = `<div class="box"><span class="tag" style="color:var(--accent)">${esc(c.topic.toUpperCase())}</span><h3 style="margin:.3rem 0">${esc(c.title)}</h3><p>${esc(c.stem)}</p><table class="given" aria-label="Label card">${rows}</table></div>
<div class="box" style="margin-top:10px"><span class="tag" style="color:var(--accent)">YOUR ANSWER</span><div class="dval" id="val" role="status" aria-live="polite"></div><div class="stepper" id="st"></div><div class="opts" id="un" style="grid-auto-flow:column;grid-auto-columns:1fr;margin-top:8px"></div><div id="act" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"></div><div id="fb"></div><div id="steps"></div></div>`;
      const val = $('#val', z), showVal = () => { val.innerHTML = `${esc(fmtF(value, c.answer.decimals))} <small>${esc(unit)}</small>`; };
      showVal();
      const apply = d => { if (solved) return; value = clamp(value + d); showVal(); };
      [[-e.coarse, `−${fmtN(e.coarse)}`], [-e.fine, `−${fmtN(e.fine)}`], [e.fine, `+${fmtN(e.fine)}`], [e.coarse, `+${fmtN(e.coarse)}`]].forEach(([d, label]) => {
        const b = el('button', '', label); b.type = 'button'; b.setAttribute('aria-label', `${d < 0 ? 'Decrease' : 'Increase'} by ${fmtN(Math.abs(d))}`);
        let t, iv; const stop = () => { clearTimeout(t); clearInterval(iv); };
        b.addEventListener('pointerdown', ev => { ev.preventDefault(); apply(d); t = setTimeout(() => { iv = setInterval(() => apply(d), 90); }, 450); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, stop));
        b.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); apply(d); } });
        $('#st', z).appendChild(b);
      });
      data.units.forEach(u => { const b = el('button', 'opt' + (u === unit ? ' ok' : ''), esc(u)); b.type = 'button'; b.onclick = () => { if (solved) return; unit = u; calc(z); }; $('#un', z).appendChild(b); });
      const act = $('#act', z);
      if (!solved) {
        const chk = el('button', 'btn', 'Check'); chk.onclick = () => { fb = check(); if (fb[0] === 'ok') solved = true; calc(z); }; act.appendChild(chk);
        const h = el('button', 'btn soft', 'Hint'); h.disabled = hint || stepsUsed; h.onclick = () => { hint = true; revealed = Math.max(revealed, 1); calc(z); }; act.appendChild(h);
        const s = el('button', 'btn soft', 'Show steps'); s.disabled = revealed >= c.steps.length; s.onclick = () => { stepsUsed = true; revealed = Math.min(c.steps.length, revealed + 1); calc(z); }; act.appendChild(s);
      }
      if (fb) $('#fb', z).innerHTML = `<div class="feedback" style="border-color:${fb[0] === 'ok' ? 'var(--good)' : fb[0] === 'warn' ? '#D97706' : 'var(--bad)'}" role="status"><b>${fb[0] === 'ok' ? '✓' : fb[0] === 'warn' ? '⚠' : '✕'}</b> ${esc(fb[1])}</div>`;
      const shown = solved ? c.steps.length : revealed;
      if (shown) $('#steps', z).innerHTML = `<div class="feedback"><b>Worked solution</b><ol class="clean" style="margin:.4rem 0 0">${c.steps.slice(0, shown).map(x => `<li>${esc(x)}</li>`).join('')}</ol>${solved ? `<p><i>${esc(c.pearl)}</i></p><small>${srcLinks(c.sources)}</small>` : ''}</div>`;
    }

    function inter(z) {
      let h = `<div class="box"><span class="tag" style="color:var(--accent)">INTERACTION</span><h3 style="margin:.3rem 0">${esc(it.title)}</h3><p>${esc(it.scenario)}</p><p>${it.drugs.map(d => `<span class="pillw" style="background:var(--accent);color:#fff;font-weight:700">${esc(d)}</span>`).join(' + ')}</p></div>`;
      h += `<div class="box" style="margin-top:10px"><span class="tag" style="color:var(--accent)">STEP 1 · WHAT EXPLAINS THIS?</span><div class="opts" id="m"></div><div id="mh"></div></div>`;
      if (mechDone) h += `<div class="box" style="margin-top:10px"><span class="tag" style="color:var(--accent)">STEP 2 · WHAT DO YOU DO?</span><div class="opts" id="a"></div></div>`;
      if (actDone) h += `<div class="feedback" style="border-color:${sevColor[it.severity]}"><b>${sevMark[it.severity]} Severity: ${esc(data.severity.name)}</b><br>${esc(data.severity.hint)}</div><div class="feedback"><b>+${sc.interactionMechanism + sc.interactionAction} points. Why</b><br>${esc(it.why)}<br><small>${srcLinks(it.sources)}</small></div>`;
      z.innerHTML = h;
      const m = $('#m', z);
      data.mechOptions.forEach(o => {
        const right = mechDone && o.id === it.mechanism, wrong = wrongM.includes(o.id);
        const b = el('button', 'opt' + (right ? ' ok' : wrong ? ' no' : ''), `${right ? '✓ ' : wrong ? '✕ ' : '○ '}${esc(o.name)}`); b.type = 'button'; b.disabled = mechDone || wrong;
        b.onclick = () => { lastMech = o; if (o.id === it.mechanism) mechDone = true; else wrongM.push(o.id); inter(z); }; m.appendChild(b);
      });
      if (lastMech) $('#mh', z).innerHTML = `<p class="hint" style="margin-top:8px">${esc(lastMech.hint)}</p>`;
      if (mechDone) {
        const a = $('#a', z);
        data.actionOptions.forEach(t => {
          const right = actDone && t === it.action, wrong = wrongA.includes(t);
          const b = el('button', 'opt' + (right ? ' ok' : wrong ? ' no' : ''), `${right ? '✓ ' : wrong ? '✕ ' : '○ '}${esc(t)}`); b.type = 'button'; b.disabled = actDone || wrong;
          b.onclick = () => { if (t === it.action) actDone = true; else wrongA.push(t); inter(z); }; a.appendChild(b);
        });
      }
    }
    render();
  };
})();
