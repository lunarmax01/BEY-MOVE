import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Plus, Trash2, ArrowUp, ArrowDown, Save, Film } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './HomeSlider.css';

const api = axios.create({ baseURL: '/api', withCredentials: true });
const isAdultMovie = m => m.ageRestricted || m.category === 'kattalar';

export function HomeSlider({ fallback = null }) {
    const [movies, setMovies] = useState([]);
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let valid = true;
        api.get('/movies/home-slider')
            .then(({ data }) => { if (valid) setMovies(data.movies || []); })
            .catch(() => { if (valid) setMovies([]); })
            .finally(() => { if (valid) setLoaded(true); });
        return () => { valid = false; };
    }, []);

    useEffect(() => {
        if (paused || movies.length < 2) return undefined;
        const timer = window.setInterval(() => setActive(i => (i + 1) % movies.length), 6000);
        return () => window.clearInterval(timer);
    }, [movies.length, paused]);

    const go = step => setActive(i => (i + step + movies.length) % movies.length);
    if (!loaded) return <section className="bey-slider-loading">Kinolar yuklanmoqda...</section>;
    if (!movies.length) return fallback;
    const movie = movies[active] || movies[0];
    const art = movie.banner || movie.poster;

    return <section className="bey-slider" aria-roledescription="carousel" aria-label="Tanlangan kinolar"
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}>
        <AnimatePresence mode="wait" initial={false}>
            <motion.div key={movie._id} className="bey-slider-slide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .55 }}>
                {art && <img className="bey-slider-image" src={art} alt="" loading={active === 0 ? 'eager' : 'lazy'} />}
                <div className="bey-slider-shade" />
                <div className="bey-slider-inner">
                    <span className="bey-slider-kicker">BEY MOVI · TANLANGAN KINOLAR</span>
                    <h1>{movie.title}</h1>
                    <p className="bey-slider-metadata">{[movie.year, movie.genre, movie.premium ? 'PREMIUM' : null].filter(Boolean).join('  ·  ')}</p>
                    <p className="bey-slider-description">{movie.description || 'Kino haqida batafsil ma’lumot va tomosha qilish uchun o‘ting.'}</p>
                    <Link to={'/movie/' + movie.slug} className="btn red"><Play size={18} fill="currentColor" /> Tomosha qilish</Link>
                </div>
            </motion.div>
        </AnimatePresence>
        {movies.length > 1 && <>
            <button type="button" className="bey-slider-arrow bey-slider-prev" onClick={() => go(-1)} aria-label="Oldingi kino"><ChevronLeft /></button>
            <button type="button" className="bey-slider-arrow bey-slider-next" onClick={() => go(1)} aria-label="Keyingi kino"><ChevronRight /></button>
            <div className="bey-slider-dots" role="group" aria-label="Slaydni tanlash">
                {movies.map((m, i) => <button key={m._id} type="button" aria-label={`${i + 1}-slayd: ${m.title}`} aria-current={i === active ? 'true' : undefined} className={i === active ? 'active' : ''} onClick={() => setActive(i)} />)}
            </div>
        </>}
    </section>;
}

export function SliderManager({ api: adminApi = api }) {
    const [available, setAvailable] = useState([]);
    const [selected, setSelected] = useState([]);
    const [original, setOriginal] = useState([]);
    const [choice, setChoice] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function load() {
        setLoading(true); setError('');
        try {
            const { data } = await adminApi.get('/admin/home-slider');
            setAvailable(data.availableMovies || []);
            setSelected(data.movieIds || []);
            setOriginal(data.movieIds || []);
        } catch (err) { setError(err.response?.data?.error || 'Slider sozlamalari yuklanmadi'); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    function add() {
        if (!choice || selected.includes(choice)) return;
        if (selected.length >= 7) { toast.error('Sliderga maksimal 7 ta kino qo‘shiladi'); return; }
        setSelected(current => [...current, choice]); setChoice('');
    }
    function remove(id) { setSelected(current => current.filter(x => x !== id)); }
    function move(index, offset) {
        const target = index + offset;
        if (target < 0 || target >= selected.length) return;
        setSelected(current => { const next = [...current];[next[index], next[target]] = [next[target], next[index]]; return next; });
    }
    async function save() {
        setSaving(true); setError('');
        try {
            const { data } = await adminApi.put('/admin/home-slider', { movieIds: selected });
            setSelected(data.movieIds); setOriginal(data.movieIds);
            toast.success('Bosh sahifa slideri saqlandi');
        } catch (err) { setError(err.response?.data?.error || 'Slayderni saqlab bo‘lmadi'); }
        finally { setSaving(false); }
    }
    const byId = new Map(available.map(movie => [movie._id, movie]));
    const options = available.filter(movie => !selected.includes(movie._id) && !isAdultMovie(movie));
    const changed = JSON.stringify(selected) !== JSON.stringify(original);

    return <section className="panel bey-slider-manager" id="home-slider-manager">
        <div className="bey-slider-manager-heading">
            <div><span className="section-kicker">BEY MOVI STUDIO</span><h2>Bosh sahifa slideri</h2><p className="muted">Faqat nashr qilingan kinolardan 7 tagacha tanlang. Tepadan pastga ko‘rsatilgan tartibda chiqadi.</p></div>
            <strong className="bey-slider-count">{selected.length}/7</strong>
        </div>
        {loading ? <p className="muted">Yuklanmoqda...</p> : <>
            <div className="bey-slider-select-row">
                <select aria-label="Sliderga kino tanlash" value={choice} onChange={e => setChoice(e.target.value)}>
                    <option value="">Kino tanlang...</option>
                    {options.map(movie => <option value={movie._id} key={movie._id}>{movie.title} ({movie.year || '—'})</option>)}
                </select>
                <button type="button" className="btn red" disabled={!choice || selected.length >= 7} onClick={add}><Plus size={16} /> Qo‘shish</button>
            </div>
            {selected.length === 0 ? <p className="muted">Sliderda hali kino yo‘q. Bosh sahifada standart banner ko‘rsatiladi.</p> :
                <div className="bey-slider-items">{selected.map((id, index) => {
                    const movie = byId.get(id);
                    return <div className="bey-slider-item" key={id}>
                        {movie?.poster || movie?.banner ? <img src={movie.poster || movie.banner} alt="" /> : <Film size={25} />}
                        <div className="bey-slider-item-label"><strong>{movie?.title || 'Kino o‘chirilgan yoki nashrdan olingan'}</strong><small>{index + 1}-slayd · {movie?.category || 'Mavjud emas'}</small></div>
                        <button type="button" aria-label="Yuqoriga" title="Yuqoriga" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
                        <button type="button" aria-label="Pastga" title="Pastga" disabled={index === selected.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
                        <button type="button" className="bey-slider-remove" aria-label="Olib tashlash" title="Olib tashlash" onClick={() => remove(id)}><Trash2 size={16} /></button>
                    </div>;
                })}</div>}
            {error && <div className="error">{error}</div>}
            <button type="button" className="btn red" disabled={saving || !changed} onClick={save}><Save size={17} />{saving ? 'Saqlanmoqda...' : 'Slayderni saqlash'}</button>
        </>}
    </section>;
}
