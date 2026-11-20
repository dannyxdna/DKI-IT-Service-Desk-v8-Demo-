import React, { useMemo, useState } from 'react';
import { Download, X, Timer, ServerCrash } from 'lucide-react';
import { PIC_LIST, lokasiBreakdown, getRange as getR, PRESETS, TODAY, defaultRange, series, summarize, fmtDur, fmtCompact, fmtID } from './data.js';

const MIN_STEPS = [5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720, 1440, 2880, 4320, 7200];
function niceScale(max, integer, minutes) {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  let step;
  if (minutes) step = MIN_STEPS.find(x => x * 4 >= max) || Math.ceil(max / 4 / 1440) * 1440;
  else {
    const rough = max / 4, mag = Math.pow(10, Math.floor(Math.log10(rough))), norm = rough / mag;
    step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    if (integer) step = Math.max(1, Math.ceil(step));
  }
  const top = Math.ceil(max / step) * step, ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return { top, ticks };
}
const axisMin = v => (v >= 60 ? `${+(v / 60).toFixed(1)} j`.replace('.', ',') : `${v} mnt`);

export function RangeControls({ range, setRange, plant, setPlant }) {
  return <div className="range-controls">
    <select value={range.preset} onChange={e => setRange({ ...range, preset: e.target.value })} aria-label="Rentang waktu">
      {PRESETS.map(p => <option key={p.k} value={p.k}>{p.l}</option>)}
    </select>
    {range.preset === 'custom' && <>
      <input type="date" value={range.from} max={range.to} onChange={e => e.target.value && setRange({ ...range, from: e.target.value })} aria-label="Dari tanggal" />
      <span>s/d</span>
      <input type="date" value={range.to} min={range.from} max={TODAY} onChange={e => e.target.value && setRange({ ...range, to: e.target.value })} aria-label="Sampai tanggal" />
    </>}
    {setPlant && <select value={plant} onChange={e => setPlant(e.target.value)} aria-label="Plant"><option>Semua Plant</option><option>Plant 1</option><option>Plant 2</option></select>}
  </div>;
}

function BarChart({ pts, color }) {
  const max = Math.max(0, ...pts.map(p => p.v)), { top, ticks } = niceScale(max, false, true);
  const every = Math.ceil(pts.length / 8), empty = max === 0;
  return <>
    <div className="bchart">
      <div className="by">{[...ticks].reverse().map(t => <span key={t}>{axisMin(t)}</span>)}</div>
      <div className="bplot">
        <div className="bgrid">{ticks.map(t => <b key={t} style={{ bottom: `${t / top * 100}%` }} />)}</div>
        <div className="bars">{pts.map((p, i) => <div className="bcol" key={i} title={`${p.tip}: ${fmtDur(p.v)} (${p.count} tiket)`}>
          {pts.length <= 10 && p.v > 0 && <em>{fmtCompact(p.v)}</em>}
          <i style={{ height: `${p.v / top * 100}%`, background: color }} />
        </div>)}</div>
        {empty && <div className="chart-empty">Tidak ada data pada rentang ini</div>}
      </div>
    </div>
    <div className="bx">{pts.map((p, i) => <span key={i}>{i % every === 0 ? p.label : ''}</span>)}</div>
  </>;
}

function LineChart({ pts }) {
  const max = Math.max(0, ...pts.flatMap(p => [p.v, p.v2])), { top, ticks } = niceScale(max, true), n = pts.length;
  const X = i => (n === 1 ? 320 : i / (n - 1) * 640), Y = v => 12 + (1 - v / top) * 159;
  const line = k => pts.map((p, i) => `${X(i)},${Y(p[k])}`).join(' ');
  const every = Math.ceil(n / 8);
  return <>
    <div className="lchart">
      <div className="by">{[...ticks].reverse().map(t => <span key={t}>{t}</span>)}</div>
      <div className="lplot">
        <svg viewBox="0 0 640 190" preserveAspectRatio="none">
          <g className="gridlines"><path d={ticks.map(t => `M0 ${Y(t)}H640`).join(' ')} /></g>
          <polyline points={line('v')} className="line-blue" vectorEffect="non-scaling-stroke" />
          <polyline points={line('v2')} className="line-green" vectorEffect="non-scaling-stroke" />
        </svg>
        {n <= 16 && pts.map((p, i) => <React.Fragment key={i}>
          <i className="dot blue-dot" style={{ left: `${X(i) / 6.4}%`, top: `${Y(p.v) / 1.9}%` }} title={`${p.tip}: ${p.v} masuk`} />
          <i className="dot green-dot" style={{ left: `${X(i) / 6.4}%`, top: `${Y(p.v2) / 1.9}%` }} title={`${p.tip}: ${p.v2} selesai`} />
        </React.Fragment>)}
      </div>
    </div>
    <div className="lx">{pts.map((p, i) => <span key={i} style={{ left: `${X(i) / 6.4}%` }}>{i % every === 0 ? p.label : ''}</span>)}</div>
  </>;
}

const Mini = ({ label, value, sub }) => <div className="mini"><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
const scopeNote = (s, plant) => `${fmtID(s.from)} – ${fmtID(s.to)} · ${s.step === 7 ? 'per minggu' : 'per hari'} · ${plant}`;

function TrendChart({ pts, mode }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(0, ...pts.flatMap(p => [p.v, p.v2])), { top, ticks } = niceScale(max, true), n = pts.length;
  const bars = mode === 'bar';
  const xp = i => (bars ? (i + 0.5) / n * 100 : n === 1 ? 50 : i / (n - 1) * 100);
  const X = i => xp(i) * 6.4, Y = v => 12 + (1 - v / top) * 166;
  const curve = k => {
    const xs = pts.map((_, i) => X(i)), ys = pts.map(p => Y(p[k])), m = [], t = [];
    if (mode === 'line' || n < 3) return pts.map((_, i) => `${i ? 'L' : 'M'}${xs[i]},${ys[i]}`).join(' ');
    for (let i = 0; i < n - 1; i++) m.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) t[i] = 0;
      else { const d0 = xs[i] - xs[i - 1], d1 = xs[i + 1] - xs[i]; t[i] = 3 * (d0 + d1) / ((2 * d1 + d0) / m[i - 1] + (d1 + 2 * d0) / m[i]); }
    }
    let d = `M${xs[0]},${ys[0]}`;
    for (let i = 0; i < n - 1; i++) { const dx = xs[i + 1] - xs[i]; d += ` C${xs[i] + dx / 3},${ys[i] + t[i] * dx / 3} ${xs[i + 1] - dx / 3},${ys[i + 1] - t[i + 1] * dx / 3} ${xs[i + 1]},${ys[i + 1]}`; }
    return d;
  };
  const area = k => `${curve(k)} L${X(n - 1)},${Y(0)} L${X(0)},${Y(0)} Z`;
  const every = Math.ceil(n / 9);
  const onMove = e => { const r = e.currentTarget.getBoundingClientRect(), f = Math.min(0.9999, Math.max(0, (e.clientX - r.left) / r.width)); setHover(bars ? Math.floor(f * n) : Math.round(f * (n - 1))); };
  const hp = hover != null ? pts[hover] : null, hx = hover != null ? xp(hover) : 0;
  return <>
    <div className="lchart tall">
      <div className="by">{[...ticks].reverse().map(t => <span key={t}>{t}</span>)}</div>
      <div className="lplot" onMouseMove={bars ? undefined : onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 640 190" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#348be0" stopOpacity=".32" /><stop offset="100%" stopColor="#348be0" stopOpacity="0" /></linearGradient>
            <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22b77d" stopOpacity=".28" /><stop offset="100%" stopColor="#22b77d" stopOpacity="0" /></linearGradient>
          </defs>
          <g className="gridlines"><path d={ticks.map(t => `M0 ${Y(t)}H640`).join(' ')} /></g>
          {!bars && n > 1 && <>
            {mode === 'area' && <><path d={area('v')} fill="url(#gIn)" /><path d={area('v2')} fill="url(#gOut)" /></>}
            <path d={curve('v')} className="line-blue" vectorEffect="non-scaling-stroke" /><path d={curve('v2')} className="line-green" vectorEffect="non-scaling-stroke" />
          </>}
        </svg>
        {mode === 'line' && n <= 24 && pts.map((p, i) => <React.Fragment key={i}><i className="dot blue-dot" style={{ left: `${xp(i)}%`, top: `${Y(p.v) / 1.9}%` }} /><i className="dot green-dot" style={{ left: `${xp(i)}%`, top: `${Y(p.v2) / 1.9}%` }} /></React.Fragment>)}
        {bars && <div className="bars two">{pts.map((p, i) => <div key={i} className={`bcol ${hover === i ? 'hov' : ''}`} onMouseEnter={() => setHover(i)}>
          <div className="pair"><i style={{ height: `${p.v / top * 100}%`, background: '#348be0' }} /><i style={{ height: `${p.v2 / top * 100}%`, background: '#22b77d' }} /></div></div>)}</div>}
        {hp && <>
          {!bars && <><div className="xline" style={{ left: `${hx}%` }} /><i className="dot blue-dot big" style={{ left: `${hx}%`, top: `${Y(hp.v) / 1.9}%` }} /><i className="dot green-dot big" style={{ left: `${hx}%`, top: `${Y(hp.v2) / 1.9}%` }} /></>}
          <div className="tip" style={{ left: `${Math.min(84, Math.max(16, hx))}%` }}><b>{hp.tip}</b><span><i className="blue-dot" />Masuk <em>{hp.v}</em></span><span><i className="green-dot" />Selesai <em>{hp.v2}</em></span></div>
        </>}
      </div>
    </div>
    <div className="lx">{pts.map((p, i) => <span key={i} style={{ left: `${xp(i)}%` }}>{i % every === 0 ? p.label : ''}</span>)}</div>
  </>;
}

export function TrendCard({ tickets }) {
  const [range, setRange] = useState(defaultRange('14')), [plant, setPlant] = useState('Semua Plant'), [mode, setMode] = useState('area');
  const s = useMemo(() => series(tickets, range, plant, 'trend'), [tickets, range, plant]);
  const inTotal = s.pts.reduce((a, p) => a + p.v, 0), outTotal = s.pts.reduce((a, p) => a + p.v2, 0);
  const rate = inTotal ? Math.round(outTotal / inTotal * 100) : 0;
  return <section className="panel trend">
    <div className="panel-head"><div><b>Ticket Trend</b><small>Perbandingan tiket masuk dan selesai</small></div>
      <div className="seg"><button className={mode === 'area' ? 'on' : ''} onClick={() => setMode('area')}>Area</button><button className={mode === 'line' ? 'on' : ''} onClick={() => setMode('line')}>Garis</button><button className={mode === 'bar' ? 'on' : ''} onClick={() => setMode('bar')}>Batang</button></div></div>
    <RangeControls range={range} setRange={setRange} plant={plant} setPlant={setPlant} />
    <div className="mini-stats"><Mini label="Tiket masuk" value={inTotal} /><Mini label="Tiket selesai" value={outTotal} /><Mini label="Service rate" value={`${rate}%`} sub="selesai ÷ masuk" /></div>
    <div className="chart-legend"><span><i className="blue-dot" />Tiket masuk</span><span><i className="green-dot" />Tiket selesai</span></div>
    <TrendChart pts={s.pts} mode={mode} />
    <div className="range-note">{scopeNote(s, plant)} · arahkan kursor ke grafik untuk melihat detail</div>
  </section>;
}

export function TimeChartCard({ tickets, kind }) {
  const [range, setRange] = useState(defaultRange('14')), [plant, setPlant] = useState('Semua Plant');
  const s = useMemo(() => series(tickets, range, plant, kind), [tickets, range, plant, kind]);
  const m = useMemo(() => summarize(tickets, range, plant), [tickets, range, plant]);
  const dur = kind === 'dur';
  return <section className="panel time-panel">
    <div className="panel-head"><div className="ph-icon"><span className={`stat-icon ${dur ? 'blue' : 'red'}`}>{dur ? <Timer size={18} /> : <ServerCrash size={18} />}</span><div><b>{dur ? 'Waktu Penyelesaian Tiket' : 'Downtime'}</b><small>{dur ? 'Total menit pengerjaan tiket yang selesai' : 'Total menit layanan / perangkat tidak dapat dipakai'}</small></div></div></div>
    <RangeControls range={range} setRange={setRange} plant={plant} setPlant={setPlant} />
    <div className="mini-stats">{dur
      ? <><Mini label="Total waktu" value={fmtDur(m.totalDur)} sub={`${m.totalDur} menit`} /><Mini label="Rata-rata / tiket" value={fmtDur(m.avgDur)} /><Mini label="Tiket selesai" value={m.count} /></>
      : <><Mini label="Total downtime" value={fmtDur(m.totalDown)} sub={`${m.totalDown} menit`} /><Mini label="Tiket dgn downtime" value={`${m.downCount} / ${m.count}`} /><Mini label="Terlama" value={fmtDur(m.maxDown)} /></>}</div>
    <BarChart pts={s.pts} color={dur ? '#348be0' : '#e45d62'} />
    <div className="range-note">{scopeNote(s, plant)} · berdasarkan tanggal selesai</div>
  </section>;
}

export function ReportTimePanel({ tickets }) {
  const [range, setRange] = useState(defaultRange('30')), [plant, setPlant] = useState('Semua Plant');
  const m = useMemo(() => summarize(tickets, range, plant), [tickets, range, plant]);
  const rows = [...m.rs].sort((a, b) => (b.resolvedISO + b.id).localeCompare(a.resolvedISO + a.id));
  const exportCSV = () => {
    const head = ['No Tiket', 'Masalah', 'Plant', 'Lokasi', 'Dept', 'Prioritas', 'PIC', 'Tgl Dibuat', 'Tgl Selesai', 'Waktu Penyelesaian (menit)', 'Downtime (menit)'];
    const body = rows.map(t => [t.id, t.title, t.plant, t.lokasi, t.dept, t.priority, t.owner, fmtID(t.dateISO), fmtID(t.resolvedISO), t.resolveMin ?? 0, t.downMin ?? 0]);
    body.push(['TOTAL', '', '', '', '', '', '', '', '', m.totalDur, m.totalDown]);
    const csv = [head, ...body].map(r => r.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
    a.download = `waktu-penyelesaian-downtime-${m.from}_${m.to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return <div className="panel time-report">
    <div className="panel-head"><div><b>Rekap Waktu Penyelesaian & Downtime</b><small>Pilih rentang waktu dan plant untuk melihat total tiap tiket</small></div><button className="btn secondary" onClick={exportCSV}><Download size={14} /> Export CSV</button></div>
    <RangeControls range={range} setRange={setRange} plant={plant} setPlant={setPlant} />
    <div className="mini-stats four">
      <Mini label="Tiket selesai" value={m.count} sub={`${m.incoming} tiket masuk`} />
      <Mini label="Total waktu penyelesaian" value={fmtDur(m.totalDur)} sub={`rata-rata ${fmtDur(m.avgDur)}`} />
      <Mini label="Total downtime" value={fmtDur(m.totalDown)} sub={`${m.downCount} tiket dgn downtime`} />
      <Mini label="Downtime terlama" value={fmtDur(m.maxDown)} />
    </div>
    <div className="table-panel inner"><table className="ticket-table"><thead><tr><th>NO. TIKET</th><th>MASALAH</th><th>PLANT / LOKASI</th><th>PIC</th><th>SELESAI</th><th>WAKTU PENYELESAIAN</th><th>DOWNTIME</th></tr></thead>
      <tbody>{rows.map(t => <tr key={t.id}><td><b className="ticket-id">{t.id}</b></td><td><b>{t.title}</b><small>{t.dept}</small></td><td>{t.plant}<small>{t.lokasi}</small></td><td>{t.owner}</td><td>{fmtID(t.resolvedISO)}</td><td>{fmtDur(t.resolveMin)}</td><td>{t.downMin > 0 ? fmtDur(t.downMin) : '—'}</td></tr>)}
        {rows.length > 0 && <tr className="total-row"><td colSpan="5"><b>TOTAL ({m.count} tiket)</b></td><td><b>{fmtDur(m.totalDur)}</b></td><td><b>{fmtDur(m.totalDown)}</b></td></tr>}</tbody></table>
      {rows.length === 0 && <div className="empty">Belum ada tiket selesai pada rentang ini.</div>}</div>
  </div>;
}

const PRESET_MIN = [5, 10, 15, 30, 45, 60, 90, 120, 240, 480];
export function DurationInput({ label, hint, value, onChange }) {
  return <div className="dur-field">
    <span className="dur-label">{label}</span>{hint && <small>{hint}</small>}
    <div className="dur-chips">{PRESET_MIN.map(p => <button type="button" key={p} className={value === p ? 'on' : ''} onClick={() => onChange(p)}>{p >= 60 ? `${String(p / 60).replace('.', ',')} jam` : `${p} mnt`}</button>)}</div>
    <div className="dur-input">
      <input type="number" min="0" step="1" inputMode="numeric" value={value ?? ''} placeholder="Atau ketik sendiri" onChange={e => onChange(e.target.value === '' ? null : Math.max(0, Math.round(+e.target.value)))} />
      <b>menit</b>{value != null && value > 0 && <em>≈ {fmtDur(value)}</em>}
    </div>
  </div>;
}

export function TicketEditModal({ ticket, onClose, onSave, pics = PIC_LIST }) {
  const [status, setStatus] = useState(ticket.status), [owner, setOwner] = useState(ticket.owner === 'Belum ditugaskan' ? '' : ticket.owner);
  const [resolvedISO, setResolvedISO] = useState(ticket.resolvedISO || TODAY);
  const [resolveMin, setResolveMin] = useState(ticket.resolveMin ?? null);
  const [hasDown, setHasDown] = useState((ticket.downMin || 0) > 0), [downMin, setDownMin] = useState(ticket.downMin || null);
  const [err, setErr] = useState('');
  const done = status === 'Resolved';
  const submit = () => {
    if (done) {
      if (resolveMin == null || resolveMin <= 0) return setErr('Isi waktu penyelesaian (menit) lebih dari 0.');
      if (resolvedISO < ticket.dateISO || resolvedISO > TODAY) return setErr('Tanggal selesai harus setelah tanggal tiket dibuat dan tidak melebihi hari ini.');
      if (hasDown && (downMin == null || downMin <= 0)) return setErr('Isi lama downtime (menit) atau matikan opsi downtime.');
    }
    onSave({ ...ticket, status, owner: owner || 'Belum ditugaskan', resolvedISO: done ? resolvedISO : null, resolveMin: done ? resolveMin : null, downMin: done ? (hasDown ? downMin : 0) : null });
  };
  return <div className="modal-backdrop"><div className="modal wide">
    <div className="modal-head"><div><b>Update Tiket {ticket.id}</b><small>{ticket.title} · {ticket.plant}</small></div><button className="icon-btn" onClick={onClose}><X /></button></div>
    <label>Status<select value={status} onChange={e => { setStatus(e.target.value); setErr(''); }}>{['Open', 'In Progress', 'Pending', 'Resolved'].map(s => <option key={s}>{s}</option>)}</select></label>
    <label>PIC / Penanggung jawab<select value={owner} onChange={e => setOwner(e.target.value)}><option value="">Belum ditugaskan</option>{[...new Set([...pics, ...(ticket.owner !== 'Belum ditugaskan' ? [ticket.owner] : [])])].map(n => <option key={n}>{n}</option>)}</select></label>
    {done && <>
      <label>Tanggal selesai<input type="date" value={resolvedISO} min={ticket.dateISO} max={TODAY} onChange={e => setResolvedISO(e.target.value)} /></label>
      <DurationInput label="Waktu penyelesaian" hint="Total lama pengerjaan sampai masalah selesai. Pilih cepat atau ketik sendiri." value={resolveMin} onChange={setResolveMin} />
      <label className="check-line"><input type="checkbox" checked={hasDown} onChange={e => setHasDown(e.target.checked)} /> Ada downtime (layanan / perangkat sempat tidak bisa dipakai)</label>
      {hasDown && <DurationInput label="Lama downtime" hint="Total menit layanan terhenti akibat masalah ini." value={downMin} onChange={setDownMin} />}
    </>}
    {err && <div className="form-err">{err}</div>}
    <div className="modal-actions"><button className="btn secondary" onClick={onClose}>Batal</button><button className="btn primary" onClick={submit}>Simpan</button></div>
  </div></div>;
}

const LOK_COLOR = { Office: '#348be0', Production: '#f2a23c', Outdoor: '#22b77d' };
const LOK_METRIC = { count: 'Jumlah tiket', dur: 'Waktu penyelesaian', down: 'Downtime' };
export function LokasiCard({ tickets }) {
  const [range, setRange] = useState(defaultRange('30')), [plant, setPlant] = useState('Semua Plant'), [metric, setMetric] = useState('count');
  const rows = useMemo(() => lokasiBreakdown(tickets, range, plant, metric), [tickets, range, plant, metric]);
  const total = rows.reduce((a, r) => a + r.v, 0);
  const fmt = v => (metric === 'count' ? `${v} tiket` : fmtDur(v));
  let acc = 0;
  const grad = total ? rows.map(r => { const a = acc / total * 100; acc += r.v; return `${LOK_COLOR[r.name]} ${a}% ${acc / total * 100}%`; }).join(',') : '#edf1f6 0 100%';
  return <section className="panel lokasi-card">
    <div className="panel-head"><div><b>Diagram Lokasi</b><small>Sebaran tiket berdasarkan lokasi: Office, Production, Outdoor</small></div></div>
    <div className="lok-controls">
      <select value={metric} onChange={e => setMetric(e.target.value)} aria-label="Data yang ditampilkan">{Object.entries(LOK_METRIC).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <RangeControls range={range} setRange={setRange} plant={plant} setPlant={setPlant} />
    </div>
    <div className="lok-body">
      <div className="lok-donut" style={{ background: `conic-gradient(${grad})` }}><div><b>{fmt(total)}</b><small>Total</small></div></div>
      <div className="lok-rows">{rows.map(r => <div key={r.name}>
        <div className="lok-row-head"><span><i style={{ background: LOK_COLOR[r.name] }} />{r.name}</span><em><b>{fmt(r.v)}</b> · {total ? Math.round(r.v / total * 100) : 0}%</em></div>
        <div className="lok-track"><i style={{ width: `${total ? r.v / total * 100 : 0}%`, background: LOK_COLOR[r.name] }} /></div>
        <div className="lok-sub">{r.created} tiket masuk · {r.resolved} selesai · waktu {fmtDur(r.dur)} · downtime {fmtDur(r.down)}</div>
      </div>)}</div>
    </div>
    <div className="range-note">{fmtID(getR(range).from)} – {fmtID(getR(range).to)} · {plant} · {metric === 'count' ? 'berdasarkan tanggal tiket dibuat' : 'berdasarkan tanggal selesai'}</div>
  </section>;
}
