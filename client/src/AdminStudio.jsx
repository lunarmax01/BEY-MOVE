import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreVertical, Trash2, Pencil, Eye, EyeOff, ArrowUp, ArrowDown, Save, Image, Type, LayoutGrid, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const freshBlock = (type) => ({
    blockId: crypto.randomUUID(), type, title: type === 'movieGrid' ? 'Kinolar' : '',
    content: '', imageUrl: '', buttonLabel: 'Batafsil', buttonUrl: '/',
    background: '#141414', align: 'left', hidden: false, movieIds: [],
});
const types = [['text', 'Matn'], ['section', 'Div / Bo‘lim'], ['banner', 'Banner'], ['image', 'Rasm'], ['button', 'Tugma'], ['movieGrid', 'Kinolar ro‘yxati'], ['divider', 'Chiziq'], ['spacer', 'Bo‘sh joy']];
const emptyPage = { name: '', slug: '', description: '', published: true, navVisible: true, background: '#070707', order: 100, blocks: [] };

export function PageBlocks({ page, movies = [], canEdit = false, onEdit, isAdmin = false, api }) {
    if (!page) return null;
    return <div className="page-blocks" style={{ background: page.background || '#070707' }}>
        {(page.blocks || []).filter(block => canEdit || !block.hidden).map(block => <motion.section layout key={block.blockId} className="builder-block" style={{ background: block.background || '#141414', textAlign: block.align || 'left', opacity: block.hidden ? .55 : 1 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: block.hidden ? .55 : 1, y: 0 }}>
            {canEdit && <button type="button" className="builder-block-edit" title="Blokni tahrirlash" onClick={() => onEdit?.(block.blockId)}><MoreVertical size={20} /></button>}
            {['text', 'section'].includes(block.type) && <><h2>{block.title}</h2><p className="builder-content">{block.content}</p></>}
            {block.type === 'banner' && <div className="builder-banner" style={block.imageUrl ? { backgroundImage: `linear-gradient(90deg,#110b0eab,#110b0e44),url("${block.imageUrl}")` } : {}}><h2>{block.title}</h2><p>{block.content}</p></div>}
            {block.type === 'image' && <>{block.title && <h2>{block.title}</h2>}{block.imageUrl ? <img className="builder-image" src={block.imageUrl} alt={block.title || 'Sahifa rasmi'} loading="lazy" /> : <p>Rasm URL kiriting</p>}</>}
            {block.type === 'button' && <><h2>{block.title}</h2>{block.content && <p>{block.content}</p>}<Link className="btn red" to={block.buttonUrl || '/'}>{block.buttonLabel || 'Batafsil'} <ExternalLink size={16} /></Link></>}
            {block.type === 'movieGrid' && <><h2>{block.title || 'Kinolar'}</h2><div className="builder-movies">{movies.filter(m => !block.movieIds?.length || block.movieIds.includes(m._id)).slice(0, 12).map(m => <Link className="builder-movie" key={m._id} to={'/movie/' + m.slug}>{m.poster && <img src={m.poster} alt="" loading="lazy" />}<strong>{m.title}</strong></Link>)}</div>{movies.length === 0 && <p className="muted">Hozircha kinolar yo‘q</p>}</>}
            {block.type === 'divider' && <hr />}{block.type === 'spacer' && <div style={{ height: 40 }} />}
        </motion.section>)}
    </div>;
}

export function PageManager({ api, onChanged }) {
    const location = useLocation();
    const [pages, setPages] = useState([]), [draft, setDraft] = useState(null), [active, setActive] = useState(-1), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [previewMovies, setPreviewMovies] = useState([]);
    const load = () => api.get('/admin/pages').then(r => setPages(r.data.pages)).catch(err => setError(err.response?.data?.error || 'Sahifalar yuklanmadi'));
    useEffect(() => {
        api.get('/admin/pages').then(r => {
            setPages(r.data.pages);
            const slug = new URLSearchParams(location.search).get('page');
            const blockId = new URLSearchParams(location.search).get('block');
            const selected = r.data.pages.find(x => x.slug === slug);
            if (selected) { setDraft({ ...selected, blocks: selected.blocks || [] }); setActive(blockId ? (selected.blocks || []).findIndex(b => b.blockId === blockId) : -1); }
        }).catch(err => setError(err.response?.data?.error || 'Sahifalar yuklanmadi'));
        api.get('/movies').then(r => setPreviewMovies(r.data.movies)).catch(() => { });
    }, [location.search]);
    const change = (key, value) => setDraft(p => ({ ...p, [key]: value }));
    const updateBlock = (index, key, value) => setDraft(p => ({ ...p, blocks: p.blocks.map((b, i) => i === index ? { ...b, [key]: value } : b) }));
    const move = (index, step) => setDraft(p => { const blocks = [...p.blocks], target = index + step; if (target < 0 || target >= blocks.length) return p;[blocks[index], blocks[target]] = [blocks[target], blocks[index]]; return { ...p, blocks } });
    async function save() {
        setBusy(true); setError(''); try {
            const response = draft._id ? await api.patch('/admin/pages/' + draft._id, draft) : await api.post('/admin/pages', draft);
            toast.success('Sahifa saqlandi'); await load(); onChanged?.(); setDraft(response.data.page); setActive(-1);
        } catch (err) { setError(err.response?.data?.error || 'Sahifani saqlab bo‘lmadi') } finally { setBusy(false) }
    }
    async function remove() { if (!draft?._id || !window.confirm('Bu sahifani butunlay o‘chirasizmi?')) return; try { await api.delete('/admin/pages/' + draft._id); toast.success('Sahifa o‘chirildi'); setDraft(null); load(); onChanged?.() } catch (err) { setError(err.response?.data?.error || 'O‘chirib bo‘lmadi') } }
    return <section id="pages" className="studio panel">
        <div className="studio-head"><div><span className="section-kicker">BEY MOVI STUDIO</span><h2>Sahifalar muharriri</h2><p className="muted">Navbar sahifalari, matn va bannerlarni boshqaring</p></div><button className="btn red" type="button" onClick={() => { setDraft({ ...emptyPage }); setActive(-1); setError('') }}><Plus size={18} /> Yangi sahifa</button></div>
        <div className="studio-columns"><aside className="studio-list">{pages.map(page => <button key={page._id} className={'studio-page-item ' + (draft?._id === page._id ? 'selected' : '')} onClick={() => { setDraft({ ...page, blocks: page.blocks || [] }); setActive(-1); setError('') }}>{page.name}<small>{page.slug} {page.published ? '' : '· Yashirin'}</small></button>)}</aside>
            <div className="studio-main">{draft ? <><div className="studio-fields"><label className="field">Sahifa nomi<input value={draft.name} onChange={e => change('name', e.target.value)} maxLength={70} /></label>{!draft._id && <label className="field">URL slug (ixtiyoriy)<input value={draft.slug} onChange={e => change('slug', e.target.value)} placeholder="masalan: fantastika" /></label>}<label className="field">Sahifa tavsifi<textarea value={draft.description || ''} onChange={e => change('description', e.target.value)} /></label><label className="field">Fon rangi<input type="color" value={draft.background || '#070707'} onChange={e => change('background', e.target.value)} /></label><label className="field">Navbar tartibi<input type="number" value={draft.order ?? 100} onChange={e => change('order', Number(e.target.value))} /></label><label className="check"><input type="checkbox" checked={!!draft.navVisible} onChange={e => change('navVisible', e.target.checked)} /> Navbar’da ko‘rsatish</label><label className="check"><input type="checkbox" checked={!!draft.published} onChange={e => change('published', e.target.checked)} /> Sahifa nashr qilingan</label></div>
                <h3>Sahifadagi bloklar</h3><div className="studio-add">{types.map(([type, label]) => <button type="button" className="btn outline tiny" key={type} onClick={() => { setDraft(p => ({ ...p, blocks: [...(p.blocks || []), freshBlock(type)] })); setActive(draft.blocks.length) }}><Plus size={14} />{label}</button>)}</div>
                {(draft.blocks || []).map((block, i) => <div className="studio-block" key={block.blockId}><div className="studio-block-top"><strong>{i + 1}. {types.find(t => t[0] === block.type)?.[1]}</strong><div className="studio-block-buttons"><button title="Yuqoriga" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={16} /></button><button title="Pastga" onClick={() => move(i, 1)} disabled={i === draft.blocks.length - 1}><ArrowDown size={16} /></button><button title="Tahrirlash" onClick={() => setActive(active === i ? -1 : i)}><Pencil size={16} /></button><button title="Yashirish" onClick={() => updateBlock(i, 'hidden', !block.hidden)}>{block.hidden ? <EyeOff size={16} /> : <Eye size={16} />}</button><button title="O‘chirish" onClick={() => { if (window.confirm('Blokni o‘chirasizmi?')) setDraft(p => ({ ...p, blocks: p.blocks.filter((_, j) => j !== i) })) }}><Trash2 size={16} /></button></div></div>
                    <AnimatePresence>{active === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="studio-block-form"><label className="field">Sarlavha<input value={block.title || ''} onChange={e => updateBlock(i, 'title', e.target.value)} /></label>{['text', 'section', 'banner', 'button'].includes(block.type) && <label className="field">Matn<textarea value={block.content || ''} onChange={e => updateBlock(i, 'content', e.target.value)} /></label>}{['image', 'banner'].includes(block.type) && <label className="field">Rasm URL (HTTP/HTTPS)<input value={block.imageUrl || ''} onChange={e => updateBlock(i, 'imageUrl', e.target.value)} /></label>}{block.type === 'movieGrid' && <div className="studio-movie-picker"><strong>Ko‘rsatiladigan kinolar</strong><p className="muted">Hech biri tanlanmasa, barcha kinolar chiqadi.</p>{previewMovies.map(movie => <label className="check" key={movie._id}><input type="checkbox" checked={(block.movieIds || []).includes(movie._id)} onChange={e => updateBlock(i, 'movieIds', e.target.checked ? [...(block.movieIds || []), movie._id] : (block.movieIds || []).filter(id => id !== movie._id))} />{movie.title}</label>)}</div>}{block.type === 'button' && <><label className="field">Tugma matni<input value={block.buttonLabel || ''} onChange={e => updateBlock(i, 'buttonLabel', e.target.value)} /></label><label className="field">Ichki sahifaga havola<input value={block.buttonUrl || ''} onChange={e => updateBlock(i, 'buttonUrl', e.target.value)} placeholder="/category/kino" /></label></>}<label className="field">Blok fon rangi<input type="color" value={block.background || '#141414'} onChange={e => updateBlock(i, 'background', e.target.value)} /></label><label className="field">Tekislash<select value={block.align || 'left'} onChange={e => updateBlock(i, 'align', e.target.value)}><option value="left">Chap</option><option value="center">Markaz</option><option value="right">O‘ng</option></select></label></motion.div>}</AnimatePresence></div>)}
                <h3>Sahifa ko‘rinishi</h3><PageBlocks page={draft} movies={previewMovies} canEdit onEdit={id => setActive(draft.blocks.findIndex(b => b.blockId === id))} />
                {error && <div className="error">{error}</div>}<div className="studio-actions"><button className="btn red" disabled={busy} onClick={save}><Save size={17} />{busy ? 'Saqlanmoqda...' : 'Saqlash / Nashr'}</button>{draft._id && !draft.builtIn && !['kino', 'serial', 'anime', 'multfilm', 'kattalar'].includes(draft.slug) && <button className="btn outline" onClick={remove}><Trash2 size={16} /> Sahifani o‘chirish</button>}</div></> : <div className="empty"><LayoutGrid /><h3>Sahifani tanlang</h3><p>Yoki yangi sahifa yarating</p></div>}</div></div>
    </section>;
}

export function MovieActions({ api, movie, reload }) {
    const [open, setOpen] = useState(false), [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [form, setForm] = useState({ title: movie.title, description: movie.description || '', genre: movie.genre || '', year: movie.year || '', premium: movie.premium, featured: movie.featured });
    const [poster, setPoster] = useState(null), [banner, setBanner] = useState(null), [video, setVideo] = useState(null);
    async function save(e) {
        e.preventDefault(); setBusy(true); setError(''); try {
            await api.patch('/admin/movies/' + movie._id, { ...form, year: form.year === '' ? null : Number(form.year) });
            if (poster || banner || video) { const fd = new FormData(); if (poster) fd.append('poster', poster); if (banner) fd.append('banner', banner); if (video) fd.append('video', video); await api.patch('/admin/movies/' + movie._id + '/media', fd); }
            toast.success('Kino yangilandi'); setEditing(false); reload();
        } catch (err) { setError(err.response?.data?.error || 'Kino yangilanmadi') } finally { setBusy(false) }
    }
    async function remove() { if (!window.confirm(`“${movie.title}” ni va yuklangan media fayllarini butunlay o‘chirasizmi?`)) return; try { await api.delete('/admin/movies/' + movie._id); toast.success('Kino o‘chirildi'); reload() } catch (err) { toast.error(err.response?.data?.error || 'O‘chirishda xatolik') } }
    async function toggle() { try { await api.patch('/admin/movies/' + movie._id, { published: !movie.published }); reload(); toast.success('Holat o‘zgardi') } catch (err) { toast.error(err.response?.data?.error || 'Xatolik') } }
    return <div className="movie-menu-wrap"><button className="movie-dots" title="Kino menyusi" aria-label="Kino menyusi" aria-expanded={open} onClick={() => setOpen(x => !x)}><MoreVertical size={21} /></button><AnimatePresence>{open && <motion.div className="movie-dots-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><button onClick={() => { setEditing(true); setOpen(false) }}><Pencil size={15} /> Tahrirlash</button><button onClick={() => { setOpen(false); toggle() }}>{movie.published ? <EyeOff size={15} /> : <Eye size={15} />} {movie.published ? 'Yashirish' : 'Nashr qilish'}</button><button className="danger" onClick={() => { setOpen(false); remove() }}><Trash2 size={15} /> O‘chirish</button></motion.div>}</AnimatePresence>
        {editing && <div className="studio-modal-cover" role="presentation" onClick={() => setEditing(false)}><motion.form onClick={e => e.stopPropagation()} onSubmit={save} className="studio-modal panel" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }}><h2>Kinoni tahrirlash</h2><label className="field">Nomi<input required minLength={2} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label><label className="field">Janr<input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} /></label><label className="field">Yil<input type="number" min="1888" max="2100" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></label><label className="field">Tavsif<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label className="check"><input type="checkbox" checked={!!form.premium} onChange={e => setForm({ ...form, premium: e.target.checked })} /> Premium</label><label className="check"><input type="checkbox" checked={!!form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /> Tavsiya etilgan</label><label className="field">Yangi poster (ixtiyoriy)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPoster(e.target.files?.[0] || null)} /></label><label className="field">Yangi banner (ixtiyoriy)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setBanner(e.target.files?.[0] || null)} /></label><label className="field">Yangi MP4 (ixtiyoriy)<input type="file" accept="video/mp4,.mp4" onChange={e => setVideo(e.target.files?.[0] || null)} /></label>{error && <div className="error">{error}</div>}<div className="studio-actions"><button className="btn red" disabled={busy}>{busy ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}</button><button type="button" className="btn outline" onClick={() => setEditing(false)}>Bekor qilish</button></div></motion.form></div>}
    </div>;
}
