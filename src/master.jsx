import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Lock } from 'lucide-react';

const TABS = [
  ['departments', 'Departemen'], ['pics', 'PIC IT Support'], ['kategori', 'Kategori Tiket'],
  ['plants', 'Plant'], ['lokasi', 'Lokasi'], ['items', 'Item Checksheet'],
];
const FIXED = {
  plants: { title: 'Plant', sub: 'Cakupan plant operasional', rows: ['Plant 1', 'Plant 2'] },
  lokasi: { title: 'Lokasi', sub: 'Lokasi masalah pada tiket (tetap 3 lokasi)', rows: ['Office', 'Production', 'Outdoor'] },
};
const META = {
  departments: { title: 'Departemen', sub: 'Dipakai pada form Buat Tiket', ph: 'Nama departemen, mis. Quality Control', code: true, usage: 'dept', unit: 'tiket' },
  pics: { title: 'PIC IT Support', sub: 'Penanggung jawab tiket (muncul di form Update Tiket)', ph: 'Nama PIC, mis. Rio', usage: 'owner', unit: 'tiket' },
  kategori: { title: 'Kategori Tiket', sub: 'Jenis masalah, dipakai pada form Buat Tiket', ph: 'Nama kategori, mis. Jaringan', usage: 'kategori', unit: 'tiket' },
};

function MasterList({ kind, items, tickets, onAdd, onRename, onToggle, onDelete }) {
  const m = META[kind];
  const [name, setName] = useState(''), [code, setCode] = useState(''), [editId, setEditId] = useState(null), [editVal, setEditVal] = useState(''), [err, setErr] = useState('');
  const used = n => tickets.filter(t => t[m.usage] === n).length;
  const add = () => {
    const v = name.trim();
    if (!v) return setErr('Nama tidak boleh kosong.');
    if (items.some(i => i.name.toLowerCase() === v.toLowerCase())) return setErr(`"${v}" sudah ada.`);
    onAdd(v, code.trim().toUpperCase()); setName(''); setCode(''); setErr('');
  };
  const saveEdit = it => {
    const v = editVal.trim();
    if (!v) return setErr('Nama tidak boleh kosong.');
    if (items.some(i => i.id !== it.id && i.name.toLowerCase() === v.toLowerCase())) return setErr(`"${v}" sudah ada.`);
    onRename(it, v); setEditId(null); setErr('');
  };
  return <div className="panel master-panel">
    <div className="panel-head"><div><b>{m.title}</b><small>{m.sub}</small></div><span className="group-count">{items.filter(i => i.active).length} aktif / {items.length}</span></div>
    <div className="master-add">
      <input value={name} onChange={e => { setName(e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && add()} placeholder={m.ph} />
      {m.code && <input className="code" value={code} maxLength={5} onChange={e => setCode(e.target.value)} placeholder="Kode" />}
      <button className="btn primary" onClick={add}><Plus size={15} /> Tambah</button>
    </div>
    {err && <div className="form-err">{err}</div>}
    <div className="table-panel inner"><table className="ticket-table master-table"><thead><tr><th>NAMA</th>{m.code && <th>KODE</th>}<th>DIPAKAI</th><th>STATUS</th><th></th></tr></thead>
      <tbody>{items.map(it => {
        const u = used(it.name), editing = editId === it.id;
        return <tr key={it.id} className={it.active ? '' : 'inactive'}>
          <td>{editing ? <input className="inline-edit" autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(it); if (e.key === 'Escape') setEditId(null); }} /> : <b>{it.name}</b>}</td>
          {m.code && <td>{it.code || '—'}</td>}
          <td>{u} {m.unit}</td>
          <td><button className={`switch ${it.active ? 'on' : ''}`} onClick={() => onToggle(it)} aria-label="Ubah status aktif"><i /></button><span className="sw-label">{it.active ? 'Aktif' : 'Nonaktif'}</span></td>
          <td className="row-actions">{editing
            ? <><button className="icon-sm ok" title="Simpan" onClick={() => saveEdit(it)}><Check size={15} /></button><button className="icon-sm" title="Batal" onClick={() => setEditId(null)}><X size={15} /></button></>
            : <><button className="icon-sm" title="Ubah nama" onClick={() => { setEditId(it.id); setEditVal(it.name); setErr(''); }}><Pencil size={15} /></button>
              <button className="icon-sm del" disabled={u > 0} title={u > 0 ? `Dipakai ${u} tiket, nonaktifkan saja` : 'Hapus'} onClick={() => window.confirm(`Hapus "${it.name}"?`) && onDelete(it)}><Trash2 size={15} /></button></>}</td>
        </tr>;
      })}</tbody></table>
      {items.length === 0 && <div className="empty">Belum ada data.</div>}</div>
    <p className="master-note">Menonaktifkan data menyembunyikannya dari pilihan form baru, tanpa mengubah tiket lama. Data yang sudah dipakai tiket tidak bisa dihapus.</p>
  </div>;
}

export function MasterDataPage({ master, setMaster, tickets, setTickets, items }) {
  const [tab, setTab] = useState('departments');
  const upd = (kind, fn) => setMaster(p => ({ ...p, [kind]: fn(p[kind]) }));
  const ticketKey = { departments: 'dept', pics: 'owner', kategori: 'kategori' }[tab];
  const counts = {};
  items.forEach(i => { counts[i.cat] = (counts[i.cat] || 0) + 1; });
  return <>
    <div className="page-head"><div><div className="eyebrow">CONFIGURATION</div><h1>Master Data</h1><p>Kelola data referensi yang dipakai di form tiket dan checksheet.</p></div></div>
    <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{master[k] && <em>{master[k].length}</em>}{k === 'items' && <em>{items.length}</em>}</button>)}</div>
    {META[tab] && <MasterList key={tab} kind={tab} items={master[tab]} tickets={tickets}
      onAdd={(name, code) => upd(tab, l => [...l, { id: `${tab}-${Date.now()}`, name, code, active: true }])}
      onRename={(it, v) => { upd(tab, l => l.map(x => x.id === it.id ? { ...x, name: v } : x)); setTickets(p => p.map(t => t[ticketKey] === it.name ? { ...t, [ticketKey]: v } : t)); }}
      onToggle={it => upd(tab, l => l.map(x => x.id === it.id ? { ...x, active: !x.active } : x))}
      onDelete={it => upd(tab, l => l.filter(x => x.id !== it.id))} />}
    {FIXED[tab] && <div className="panel master-panel"><div className="panel-head"><div><b>{FIXED[tab].title}</b><small>{FIXED[tab].sub}</small></div><span className="group-count"><Lock size={11} /> Tetap</span></div>
      <div className="table-panel inner"><table className="ticket-table master-table"><thead><tr><th>NAMA</th><th>JUMLAH TIKET</th><th>STATUS</th></tr></thead><tbody>
        {FIXED[tab].rows.map(r => <tr key={r}><td><b>{r}</b></td><td>{tickets.filter(t => t[tab === 'plants' ? 'plant' : 'lokasi'] === r).length} tiket</td><td><span className="ticket-status resolved">Aktif</span></td></tr>)}</tbody></table></div>
      <p className="master-note">Daftar ini bersifat tetap sesuai kebutuhan operasional. Untuk menambah {FIXED[tab].title.toLowerCase()}, perlu perubahan pada aplikasi.</p></div>}
    {tab === 'items' && <div className="panel master-panel"><div className="panel-head"><div><b>Item Checksheet</b><small>Standar DKI-CS-IT-01 Rev. a2 · {items.length} item pemeriksaan</small></div><span className="group-count"><Lock size={11} /> Tetap</span></div>
      <div className="cat-chips">{Object.entries(counts).map(([c, n]) => <span key={c}>{c} <b>{n}</b></span>)}</div>
      <div className="table-panel inner"><table className="ticket-table master-table"><thead><tr><th>NO</th><th>KATEGORI</th><th>ITEM PEMERIKSAAN</th><th>KRITERIA</th></tr></thead><tbody>
        {items.map((it, i) => <tr key={i}><td className="muted">{String(i + 1).padStart(2, '0')}</td><td>{it.cat}</td><td><b>{it.name}</b></td><td>{it.criteria}</td></tr>)}</tbody></table></div>
      <p className="master-note">Item mengikuti form standar DKI-CS-IT-01. Penambahan item checksheet dilakukan setelah aplikasi tersambung ke database.</p></div>}
  </>;
}
