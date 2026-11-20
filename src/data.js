// Data & helper waktu penyelesaian / downtime (prototype, data contoh lokal)
export const TODAY = '2026-11-19';
const MON = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export const pad = (n, l = 2) => String(n).padStart(l, '0');
export const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
export const fmtShort = iso => `${+iso.slice(8)} ${MON[+iso.slice(5, 7) - 1]}`;
export const fmtID = iso => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
export const fmtDur = m => {
  m = Math.round(m || 0);
  if (m <= 0) return '0 mnt';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h} j ${r} mnt` : `${h} j`) : `${r} mnt`;
};
export const fmtCompact = m => (m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0).replace('.', ',')}j` : `${m}m`);

// ---------- Rentang waktu ----------
export const PRESETS = [
  { k: '7', l: '7 hari terakhir' },
  { k: '14', l: '14 hari terakhir' },
  { k: '30', l: '30 hari terakhir' },
  { k: '60', l: '60 hari terakhir' },
  { k: 'month', l: 'Bulan ini' },
  { k: 'lastmonth', l: 'Bulan lalu' },
  { k: 'custom', l: 'Pilih tanggal sendiri…' },
];
export const defaultRange = (preset = '14') => ({ preset, from: addDays(TODAY, -13), to: TODAY });
export function getRange(r) {
  if (r.preset === 'custom') {
    const a = r.from || TODAY, b = r.to || TODAY;
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  }
  if (r.preset === 'month') return { from: TODAY.slice(0, 8) + '01', to: TODAY };
  if (r.preset === 'lastmonth') {
    const first = TODAY.slice(0, 8) + '01';
    const to = addDays(first, -1);
    return { from: to.slice(0, 8) + '01', to };
  }
  const n = +r.preset || 14;
  return { from: addDays(TODAY, -(n - 1)), to: TODAY };
}
function buildBuckets({ from, to }) {
  const n = diffDays(from, to) + 1, step = n > 31 ? 7 : 1, out = [];
  for (let i = 0; i < n; i += step) {
    const start = addDays(from, i), end = addDays(from, Math.min(i + step - 1, n - 1));
    out.push({ start, end, label: fmtShort(start), tip: step === 1 ? fmtID(start) : `${fmtID(start)} – ${fmtID(end)}` });
  }
  return { buckets: out, step };
}
const inRange = (iso, a, b) => !!iso && iso >= a && iso <= b;
const byPlant = (list, plant) => list.filter(t => !plant || plant === 'Semua Plant' || t.plant === plant);

// kind: 'trend' (masuk vs selesai) | 'dur' (menit penyelesaian) | 'down' (menit downtime)
export function series(tickets, range, plant, kind) {
  const r = getRange(range), { buckets, step } = buildBuckets(r), list = byPlant(tickets, plant);
  const pts = buckets.map(b => {
    const resolved = list.filter(t => t.status === 'Resolved' && inRange(t.resolvedISO, b.start, b.end));
    if (kind === 'trend') return { ...b, v: list.filter(t => inRange(t.dateISO, b.start, b.end)).length, v2: resolved.length };
    const v = resolved.reduce((a, t) => a + ((kind === 'dur' ? t.resolveMin : t.downMin) || 0), 0);
    return { ...b, v, count: resolved.length };
  });
  return { ...r, step, pts };
}
export function summarize(tickets, range, plant) {
  const { from, to } = getRange(range), list = byPlant(tickets, plant);
  const rs = list.filter(t => t.status === 'Resolved' && inRange(t.resolvedISO, from, to));
  const totalDur = rs.reduce((a, t) => a + (t.resolveMin || 0), 0);
  const totalDown = rs.reduce((a, t) => a + (t.downMin || 0), 0);
  const withDown = rs.filter(t => t.downMin > 0);
  return {
    from, to, rs, count: rs.length, totalDur, avgDur: rs.length ? totalDur / rs.length : 0,
    totalDown, downCount: withDown.length, maxDown: withDown.reduce((a, t) => Math.max(a, t.downMin), 0),
    incoming: list.filter(t => inRange(t.dateISO, from, to)).length,
  };
}

export const PIC_LIST = ['Mnafik', 'Rio', 'Danny'];
export const LOKASI = ['Office', 'Production', 'Outdoor'];
export const KATEGORI = ['Network', 'Aplikasi', 'Printer', 'CCTV', 'Hardware / PC', 'Email', 'Lainnya'];
const KAT_BY_TITLE = { 'Jaringan lambat': 'Network', 'Printer tidak terdeteksi': 'Printer', 'MES tidak bisa diakses': 'Aplikasi', 'CCTV offline': 'CCTV', 'PC tidak bisa login': 'Hardware / PC', 'Email Outlook error': 'Email', 'WiFi putus-putus': 'Network', 'SAP tidak bisa dibuka': 'Aplikasi', 'Switch area loading mati': 'Network', 'HISS lambat': 'Aplikasi', 'CCTV area loading': 'CCTV', 'Printer Finance tidak terdeteksi': 'Printer', 'Network lambat di area produksi': 'Network' };
export const DEPT_CODES = { Produksi: 'PRD', Warehouse: 'WH', Finance: 'FIN', HRD: 'HRD', Purchasing: 'PUR', Security: 'SEC', QC: 'QC', Maintenance: 'MNT', IT: 'IT', Umum: 'GEN' };
export const DEPARTMENTS = ['Produksi', 'Warehouse', 'Finance', 'HRD', 'Purchasing', 'Security', 'QC', 'Maintenance', 'IT', 'Umum'];
const LOK_BY_DEPT = { Produksi: 'Production', Warehouse: 'Production', Maintenance: 'Production', QC: 'Production', Security: 'Outdoor' };

// ---------- Data contoh ----------
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ISSUES = [
  ['Jaringan lambat', 'Produksi'], ['Printer tidak terdeteksi', 'Finance'], ['MES tidak bisa diakses', 'Produksi'],
  ['CCTV offline', 'Security'], ['PC tidak bisa login', 'HRD'], ['Email Outlook error', 'Purchasing'],
  ['WiFi putus-putus', 'Warehouse'], ['SAP tidak bisa dibuka', 'Finance'], ['Switch area loading mati', 'Warehouse'], ['HISS lambat', 'Produksi'],
];
const DURS = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 480];
export function makeTickets() {
  const r = rng(2026), list = [];
  for (let off = 75; off >= 3; off--) {
    const d = addDays(TODAY, -off), dow = new Date(d + 'T00:00:00Z').getUTCDay();
    const n = dow === 0 || dow === 6 ? (r() < 0.3 ? 1 : 0) : Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const [title, dept] = ISSUES[Math.floor(r() * ISSUES.length)];
      const priority = r() < 0.25 ? 'High' : r() < 0.6 ? 'Medium' : 'Low';
      const hi = priority === 'High' ? DURS.length : priority === 'Medium' ? 8 : 5;
      const resolveMin = DURS[Math.floor(r() * hi)];
      const downMin = r() < 0.55 ? Math.max(5, Math.round(resolveMin * (0.3 + r() * 0.7) / 5) * 5) : 0;
      const lag = r() < 0.75 ? 0 : 1 + Math.floor(r() * 2);
      list.push({ title, dept, priority, plant: r() < 0.5 ? 'Plant 1' : 'Plant 2', status: 'Resolved', owner: PIC_LIST[Math.floor(r() * 3)], lokasi: LOK_BY_DEPT[dept] || 'Office', dateISO: d, resolvedISO: addDays(d, lag), resolveMin, downMin });
    }
  }
  const N = list.length;
  const all = list.map((t, i) => ({ ...t, id: `IT-2026-${pad(i + 1, 5)}` }));
  all.push(
    { id: `IT-2026-${pad(N + 1, 5)}`, title: 'CCTV area loading', plant: 'Plant 2', dept: 'Security', lokasi: 'Outdoor', priority: 'Medium', status: 'Resolved', owner: 'Danny', dateISO: addDays(TODAY, -3), resolvedISO: addDays(TODAY, -3), resolveMin: 120, downMin: 90 },
    { id: `IT-2026-${pad(N + 2, 5)}`, title: 'MES tidak bisa diakses', plant: 'Plant 1', dept: 'Produksi', lokasi: 'Production', priority: 'High', status: 'Resolved', owner: 'Rio', dateISO: addDays(TODAY, -2), resolvedISO: addDays(TODAY, -2), resolveMin: 45, downMin: 30 },
    { id: `IT-2026-${pad(N + 3, 5)}`, title: 'Printer Finance tidak terdeteksi', plant: 'Plant 2', dept: 'Finance', lokasi: 'Office', priority: 'Medium', status: 'In Progress', owner: 'Mnafik', dateISO: addDays(TODAY, -1), resolvedISO: null, resolveMin: null, downMin: null },
    { id: `IT-2026-${pad(N + 4, 5)}`, title: 'Network lambat di area produksi', plant: 'Plant 1', dept: 'Produksi', lokasi: 'Production', priority: 'High', status: 'Open', owner: 'Belum ditugaskan', dateISO: TODAY, resolvedISO: null, resolveMin: null, downMin: null },
  );
  all.forEach(t => { t.kategori = KAT_BY_TITLE[t.title] || 'Lainnya'; });
  return all.reverse();
}

// metric: 'count' (tiket masuk) | 'dur' (menit penyelesaian) | 'down' (menit downtime)
export function lokasiBreakdown(tickets, range, plant, metric) {
  const { from, to } = getRange(range), list = byPlant(tickets, plant);
  return LOKASI.map(name => {
    const mine = list.filter(t => t.lokasi === name);
    const rs = mine.filter(t => t.status === 'Resolved' && inRange(t.resolvedISO, from, to));
    const created = mine.filter(t => inRange(t.dateISO, from, to)).length;
    const v = metric === 'count' ? created : rs.reduce((a, t) => a + ((metric === 'dur' ? t.resolveMin : t.downMin) || 0), 0);
    return { name, v, created, resolved: rs.length, dur: rs.reduce((a, t) => a + (t.resolveMin || 0), 0), down: rs.reduce((a, t) => a + (t.downMin || 0), 0) };
  });
}
