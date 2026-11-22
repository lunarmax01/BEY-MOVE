import { MovieCommunity, FavoritesPage } from './MovieCommunity.jsx';
import { SeriesAdmin, SeriesPlayer } from './SeriesStudio.jsx';
import { HomeSlider, SliderManager } from './HomeSlider.jsx';
import './Profile.css';
import { PageManager, PageBlocks, MovieActions } from './AdminStudio.jsx';
import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; import { Search, Menu, X, UserRound, LogOut, Play, Clapperboard, Copy, Plus, ArrowRight, ShieldCheck, Film, Star, LockKeyhole, Crown, Camera, Pencil, Bookmark } from 'lucide-react'; import axios from 'axios'; import toast from 'react-hot-toast';
const api = axios.create({ baseURL: '/api', withCredentials: true }); const Auth = createContext(null); const Pages = createContext({ pages: [], refreshPages: () => { } }); const cats = [['kino', 'Kino'], ['serial', 'Serial'], ['anime', 'Anime'], ['multfilm', 'Multfilm'], ['kattalar', 'Kattalar (18+)']];
const words = ['Eng sara kinolar', 'Unutilmas hikoyalar', 'Cheksiz kino olami'];
function ErrorMessage({ error }) { return error ? <div className="error">{error}</div> : null }
function useAuth() { return useContext(Auth) }
function Logo() { return <Link className="logo" to="/" aria-label="BEY MOVI bosh sahifa">{'BEY MOVI'.split('').map((c, i) => <motion.span key={i} animate={{ opacity: [1, .45, 1], y: [0, -3, 0] }} transition={{ duration: .45, delay: i * .08, repeat: Infinity, repeatDelay: 15 }}>{c === ' ' ? ' ' : c}</motion.span>)}</Link> }
function Navbar() { const { user, logout } = useAuth(); const { pages } = useContext(Pages); const [menu, setMenu] = useState(false); const [search, setSearch] = useState(''); const navigate = useNavigate(); const location = useLocation(); useEffect(() => setMenu(false), [location.pathname]); const go = (slug) => { if (!user) { toast('Davom etish uchun tizimga kiring'); navigate('/signin', { state: { from: '/category/' + slug } }) } else navigate('/category/' + slug) }; return <header className="navbar"><div className="nav-inner"><Logo /><nav className={'nav-links ' + (menu ? 'open' : '')}><Link to="/">Bosh sahifa</Link>{pages.filter(page => page.navVisible && page.published).map(page => <button key={page.slug} onClick={() => go(page.slug)}>{page.name}</button>)}{user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role) && <Link className="admin-link" to="/admin"><Plus size={16} /> Boshqaruv</Link>}</nav><div className="nav-actions"><form className="search" onSubmit={e => { e.preventDefault(); navigate('/search?q=' + encodeURIComponent(search)) }}><Search size={17} /><input aria-label="Kino qidirish" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} /></form>{user ? <Link className="icon-button" aria-label="Profil" to="/profile"><UserRound size={21} /></Link> : <><Link className="signin-link" to="/signin">Kirish</Link><Link className="btn red tiny" to="/signup">Ro‘yxatdan o‘tish</Link></>}<button className="icon-button mobile-menu" aria-label="Menyu" onClick={() => setMenu(v => !v)}>{menu ? <X /> : <Menu />}</button></div></div></header> }
function Intro() { const [shown, setShown] = useState(() => !sessionStorage.getItem('beyIntro') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches); useEffect(() => { if (!shown) return; const t = setTimeout(() => finish(), 10000); return () => clearTimeout(t) }, [shown]); function finish() { sessionStorage.setItem('beyIntro', '1'); setShown(false) } return <AnimatePresence>{shown && <motion.div className="intro" exit={{ opacity: 0 }} transition={{ duration: .6 }}><div className="intro-glow" /><motion.h1 initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 3 }}>{'BEY MOVI'.split('').map((c, i) => <motion.span initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 + i * .32 }} key={i}>{c === ' ' ? ' ' : c}</motion.span>)}</motion.h1><motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5 }}>Kino olamiga xush kelibsiz</motion.p><button className="skip" onClick={finish}>O‘tkazib yuborish →</button></motion.div>}</AnimatePresence> }
function Hero() { const { user } = useAuth(); const navigate = useNavigate(); return <section className="hero"><div className="hero-decor"><div className="hero-ring" /><Clapperboard size={180} strokeWidth={.5} /></div><div className="hero-copy"><span className="eyebrow"><span className="dot" /> BEY MOVI ORIGINAL</span><h1>Kino olami <span className="red-text">yangi darajada.</span></h1><p>Sevimli kinolar, seriallar, animelar va multfilmlar — barchasi bir joyda. Sifatli tomosha, yangi taassurotlar.</p><div className="hero-buttons"><Link className="btn red" to={user ? '/category/kino' : '/signup'}><Play size={18} fill="currentColor" /> {user ? 'Tomosha qilish' : 'Boshlash'}</Link><Link className="btn outline" to={user ? '/category/anime' : '/signin'}>Batafsil <ArrowRight size={18} /></Link></div><div className="hero-metrics"><span><strong>4K</strong> Yuqori sifat</span><span><strong>24/7</strong> Kino olami</span><span><strong>BEY</strong> Original dizayn</span></div></div></section> }
function MovieCard({ movie }) { return <Link className="movie-card" to={'/movie/' + movie.slug}><div className="poster">{movie.poster ? <img src={movie.poster} loading="lazy" alt={movie.title} /> : <div className="poster-empty"><Film size={40} /><span>BEY MOVI</span></div>}{movie.premium && <span className="premium-chip">PREMIUM</span>}<div className="poster-overlay"><Play size={27} fill="white" /></div></div><h3>{movie.title}</h3><p>{movie.year || '—'} · {movie.genre || 'Kino'} {movie.ageRestricted ? '· 18+' : ''}</p></Link> }
function MovieGrid({ movies, title, empty = 'Bu bo‘limga hali kino qo‘shilmagan.' }) { const { user } = useAuth(); const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role); return <section className="section"><div className="section-heading"><div><span className="section-kicker">BEY MOVI TO‘PLAMI</span><h2>{title}</h2></div></div>{movies?.length ? <div className="movie-grid">{movies.map(m => <div className="movie-grid-entry" key={m._id}><MovieCard movie={m} />{isAdmin && <MovieActions api={api} movie={m} reload={() => window.location.reload()} />}</div>)}</div> : <div className="empty"><Film size={35} /><h3>Hozircha kontent yo‘q</h3><p>{empty}</p></div>}</section> }
function Home() { const [movies, setMovies] = useState([]); useEffect(() => { api.get('/movies').then(r => setMovies(r.data.movies)).catch(() => { }) }, []); return <><HomeSlider fallback={<Hero />} /><MovieGrid title="So‘nggi qo‘shilganlar" movies={movies} /><section className="cta"><div><span className="eyebrow">PREMIUM TAJRIBA</span><h2>Har bir kadrda yangi olam</h2><p>Premium tariflar va barcha imtiyozlarni profilingizda ko‘ring.</p></div><Link className="btn red" to="/profile">Premium tariflar <ArrowRight size={18} /></Link></section></> }
function Field({ label, ...props }) { return <label className="field"><span>{label}</span><input {...props} /></label> }
function AuthPage({ mode }) { const nav = useNavigate(), loc = useLocation(), { setUser } = useAuth(); const [form, setForm] = useState({ name: '', email: '', phone: '', identifier: '', password: '', confirmPassword: '', rememberMe: false }); const [loading, setLoading] = useState(false), [error, setError] = useState(''); function change(k, v) { setForm(f => ({ ...f, [k]: v })) } async function submit(e) { e.preventDefault(); setLoading(true); setError(''); try { const r = await api.post('/auth/' + mode, form); setUser(r.data.user); toast.success('Xush kelibsiz!'); nav(loc.state?.from || '/profile') } catch (e) { setError(e.response?.data?.error || 'Server bilan bog‘lanib bo‘lmadi') } finally { setLoading(false) } } return <main className="auth-page"><motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="auth-card" onSubmit={submit}><div className="auth-icon"><Clapperboard size={28} /></div><span className="section-kicker">BEY MOVI HISOBI</span><h1>{mode === 'signup' ? 'Akkaunt yaratish' : 'Xush kelibsiz'}</h1><p className="muted">{mode === 'signup' ? 'Kino olamiga qo‘shiling' : 'Akkauntingizga xavfsiz kiring'}</p>{mode === 'signup' ? <><Field label="Ism" required value={form.name} onChange={e => change('name', e.target.value)} /><Field label="Telefon (+998...)" required type="tel" value={form.phone} onChange={e => change('phone', e.target.value)} /><Field label="Email" type="email" required value={form.email} onChange={e => change('email', e.target.value)} /></> : <Field label="Email yoki telefon" required value={form.identifier} onChange={e => change('identifier', e.target.value)} />}<Field label="Parol" type="password" required minLength={mode === 'signup' ? 10 : undefined} value={form.password} onChange={e => change('password', e.target.value)} />{mode === 'signup' ? <><Field label="Parolni takrorlang" type="password" required value={form.confirmPassword} onChange={e => change('confirmPassword', e.target.value)} /><p className="form-note">Kamida 10 belgili parol yarating. 18+ bo‘limga kirish yosh chekloviga ega.</p></> : <label className="check"><input type="checkbox" checked={form.rememberMe} onChange={e => change('rememberMe', e.target.checked)} /> Meni eslab qol</label>}<ErrorMessage error={error} /><button className="btn red wide" disabled={loading}>{loading ? 'Tekshirilmoqda...' : mode === 'signup' ? 'Ro‘yxatdan o‘tish' : 'Kirish'} <ArrowRight size={18} /></button><p className="auth-bottom">{mode === 'signup' ? 'Akkauntingiz bormi?' : 'Hali akkauntingiz yo‘qmi?'} <Link to={mode === 'signup' ? '/signin' : '/signup'}>{mode === 'signup' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}</Link></p></motion.form></main> }
function Protected({ children }) { const { user, loading } = useAuth(); const loc = useLocation(); if (loading) return <div className="page-spinner">Yuklanmoqda...</div>; return user ? children : <Navigate to="/signin" state={{ from: loc.pathname }} replace /> }
function hasAdultBirthdate(dateOfBirth) {
    if (!dateOfBirth) return false;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getUTCFullYear() - dob.getUTCFullYear();
    if (today.getUTCMonth() < dob.getUTCMonth() ||
        (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate())) {
        age -= 1;
    }
    return age >= 18;
}

function CategoryPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { pages } = useContext(Pages);
    const [movies, setMovies] = useState([]);
    const [listError, setListError] = useState('');
    const admin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
    const isRestricted = slug === 'kattalar';
    const adult = hasAdultBirthdate(user?.dateOfBirth);
    const page = pages.find(p => p.slug === slug);
    const category = cats.find(c => c[0] === slug);
    const builtIn = Boolean(category);

    useEffect(() => {
        let canceled = false;
        if (isRestricted && !adult) {
            setMovies([]);
            setListError('');
            return;
        }
        setListError('');
        api.get('/movies', { params: builtIn ? { category: slug } : {} })
            .then(response => { if (!canceled) setMovies(response.data.movies || []); })
            .catch(error => {
                if (!canceled) {
                    setMovies([]);
                    setListError(error.response?.data?.error || 'Kinolarni yuklab bo‘lmadi');
                }
            });
        return () => { canceled = true; };
    }, [slug, isRestricted, adult, builtIn]);

    if (isRestricted && !adult) {
        return <main className="content-page"><div className="age-warning">
            <LockKeyhole size={42} />
            <h1>Yoshga oid cheklov</h1>
            <p>Ushbu bo‘lim 18 yoshga to‘lgan foydalanuvchilar uchun.</p>
            <p>Tug‘ilgan sanangizni profil sozlamalaridan kiriting. Ma’lumotlar serverda ham tekshiriladi.</p>
            <Link className="btn outline tiny" to="/profile">Profilga o‘tish</Link>
        </div></main>;
    }

    if (!page || !page.published) {
        return <main className="content-page"><div className="empty"><h2>Sahifa topilmadi</h2><p>Sahifani admin paneldan nashr qiling.</p></div></main>;
    }

    return <main className="content-page">
        <div className="page-banner">
            <span className="section-kicker">BEY MOVI KATALOGI</span>
            <h1>{page.name}</h1>
            <p>{page.description || `${page.name} to‘plamimizni kashf eting.`}</p>
            {admin && <Link className="btn outline tiny" to={`/admin?page=${slug}#pages`}><Plus size={15} /> Sahifani sozlash</Link>}
        </div>
        <PageBlocks page={page} movies={movies} canEdit={admin} onEdit={id => navigate(`/admin?page=${slug}&block=${id}#pages`)} />
        {listError && <ErrorMessage error={listError} />}
        {builtIn && <MovieGrid title={page.name + ' to‘plami'} movies={movies} />}
    </main>;
}

function SearchPage() { const q = new URLSearchParams(useLocation().search).get('q') || ''; const [movies, setMovies] = useState([]); useEffect(() => { api.get('/movies', { params: { search: q } }).then(r => setMovies(r.data.movies)).catch(() => { }) }, [q]); return <main className="content-page"><MovieGrid title={'Qidiruv: ' + q} movies={movies} empty="Qidiruv bo‘yicha hech narsa topilmadi." /></main> }
function MovieDetails() {
    const { user } = useAuth(); const { slug } = useParams(); const [movie, setMovie] = useState(null), [src, setSrc] = useState(''), [error, setError] = useState(''); useEffect(() => { setMovie(null); setSrc(''); api.get('/movies/' + slug).then(r => setMovie(r.data.movie)).catch(() => setError('Kino topilmadi')) }, [slug]); async function play() { try { const r = await api.post('/movies/' + movie._id + '/playback-session'); setSrc(r.data.streamUrl) } catch (e) { toast.error(e.response?.data?.error || 'Video ochilmadi') } } if (error) return <main className="content-page"><div className="empty">{error}</div></main>; if (!movie) return <main className="content-page"><div className="page-spinner">Yuklanmoqda...</div></main>; return <main className="content-page"><div className="detail-hero" style={movie.banner ? { backgroundImage: `linear-gradient(90deg,#080808,rgba(8,8,8,.55)),url(${movie.banner})` } : {}}><span className="section-kicker">BEY MOVI TAQDIM ETADI</span><h1>{movie.title}</h1><p>{movie.year} · {movie.genre} {movie.premium ? '· Premium' : ''}</p><p className="detail-description">{movie.description}</p>{movie.category !== 'serial' && <button className="btn red" onClick={play}><Play size={18} /> Tomosha qilish</button>}</div>{movie.category === 'serial' && <SeriesPlayer api={api} movie={movie} userId={user?.publicId} />}{src && <div className="player-area"><video
        src={src}
        controls
        autoPlay
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(event) => event.preventDefault()}
        onError={() => toast.error('Video oqimida xatolik')}
    /></div>}<MovieCommunity api={api} movie={movie} /></main>
}
function PremiumCheckout() { const [settings, setSettings] = useState(null), [plan, setPlan] = useState('month'), [receipt, setReceipt] = useState(null), [sending, setSending] = useState(false), [orders, setOrders] = useState([]); const [error, setError] = useState(''); const load = () => api.get('/premium/my-orders').then(r => setOrders(r.data.orders)).catch(() => { }); useEffect(() => { api.get('/premium/settings').then(r => setSettings(r.data.settings)).catch(() => setError('To‘lov sozlamalarini yuklab bo‘lmadi')); load() }, []); const selected = settings?.plans?.find(p => p.code === plan); async function submit(e) { e.preventDefault(); if (!receipt) { setError('To‘lov chekini tanlang'); return } setError(''); setSending(true); try { const fd = new FormData(); fd.set('plan', plan); fd.set('receipt', receipt); const r = await api.post('/premium/orders', fd); toast.success(r.data.message); setReceipt(null); e.target.reset(); load() } catch (e) { setError(e.response?.data?.error || 'Chek yuborilmadi') } finally { setSending(false) } } return <section className="section premium-section" id="premium"><span className="section-kicker">BEY MOVI PREMIUM</span><h2>Premium olamiga kiring</h2><p className="muted">Tarifni tanlang, kartaga pul o‘tkazing va chekingizni yuboring. Premium faqat admin bankdagi tushumni tekshirgach yoqiladi.</p>{!settings ? <p>Tariflar yuklanmoqda...</p> : <><div className="plans">{settings.plans.map(p => <button type="button" className={'plan plan-choice ' + (plan === p.code ? 'selected' : '')} onClick={() => setPlan(p.code)} key={p.code}><ShieldCheck size={27} /><h3>{p.label}</h3><strong>{p.price > 0 ? p.price.toLocaleString('uz-UZ') + ' so‘m' : 'Belgilanmagan'}</strong><p>{plan === p.code ? 'Tanlangan tarif' : 'Tanlash uchun bosing'}</p></button>)}</div><motion.div layout className="pay-panel panel" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><h2>To‘lov ma’lumotlari</h2>{settings.cardNumber && settings.holder ? <><div className="payment-card"><span>{settings.bank}</span><strong>{settings.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}</strong><p>{settings.holder}</p><button className="btn outline tiny" onClick={() => navigator.clipboard.writeText(settings.cardNumber).then(() => toast.success('Karta raqami nusxalandi!')).catch(() => toast.error('Nusxalab bo‘lmadi'))}><Copy size={16} /> Raqamni nusxalash</button></div><div className="payment-instructions"><strong>To‘lanadigan summa: {selected?.price?.toLocaleString('uz-UZ')} so‘m</strong><p>Bank ilovasi orqali ko‘rsatilgan kartaga pul o‘tkazing. To‘lov chekini rasm yoki PDF shaklida saqlab, quyida yuklang.</p></div><form onSubmit={submit}><label className="field"><span>To‘lov cheki (JPG, PNG, WEBP, PDF — 5 MB gacha)</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={e => setReceipt(e.target.files?.[0] || null)} /></label><ErrorMessage error={error} /><button className="btn red" disabled={sending || !selected?.price || !receipt}>{sending ? 'Yuborilmoqda...' : 'Chekni adminga yuborish'} <ArrowRight size={18} /></button></form></> : <p className="muted">Admin hali karta ma’lumotlarini sozlamagan. To‘lov vaqtincha mavjud emas.</p>}</motion.div></>}{orders.length > 0 && <div className="panel order-history"><h2>Mening to‘lov so‘rovlarim</h2>{orders.map(o => <div className="profile-row" key={o._id}><span>{o.plan.label} · {o.plan.price.toLocaleString('uz-UZ')} so‘m</span><strong>{o.status === 'APPROVED' ? 'Tasdiqlangan' : o.status === 'REJECTED' ? 'Rad etilgan' : 'Tekshirilmoqda'}</strong></div>)}</div>}</section> }
function AdminPayments() { const [settings, setSettings] = useState(null), [orders, setOrders] = useState([]), [busy, setBusy] = useState(false); const [error, setError] = useState(''); const load = () => { api.get('/premium/admin/settings').then(r => setSettings(r.data.settings)).catch(() => { }); api.get('/premium/admin/orders').then(r => setOrders(r.data.orders)).catch(() => { }) }; useEffect(load, []); const upd = (key, value) => setSettings(x => ({ ...x, [key]: value })); async function save(e) { e.preventDefault(); setBusy(true); setError(''); try { await api.put('/premium/admin/settings', { ...settings, plans: settings.plans.map(p => ({ ...p, price: Number(p.price) })) }); toast.success('Karta va tariflar saqlandi'); load() } catch (e) { setError(e.response?.data?.error || 'Saqlashda xatolik') } finally { setBusy(false) } } async function review(o, decision) { if (!window.confirm(`So‘rovni ${decision === 'APPROVED' ? 'tasdiqlaysizmi? Bank tushumini tekshirdingizmi?' : 'rad etasizmi?'}`)) return; try { await api.post(`/premium/admin/orders/${o._id}/review`, { decision }); toast.success('So‘rov yangilandi'); load() } catch (e) { toast.error(e.response?.data?.error || 'Xatolik') } } async function openReceipt(id) { try { const r = await api.get(`/premium/admin/orders/${id}/receipt`, { responseType: 'blob' }); const u = URL.createObjectURL(r.data); window.open(u, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(u), 60000) } catch { toast.error('Chek ochilmadi') } } return <section className="admin-payments" id="admin-payments"><h2>Premium va to‘lov sozlamalari</h2>{settings ? <form className="panel" onSubmit={save}><h3>Bank kartangiz</h3><label className="field"><span>Karta turi</span><select value={settings.bank} onChange={e => upd('bank', e.target.value)}><option>UZCARD</option><option>HUMO</option></select></label><Field label="Karta raqami (16 raqam)" value={settings.cardNumber} onChange={e => upd('cardNumber', e.target.value)} required /><Field label="Karta egasining ismi" value={settings.holder} onChange={e => upd('holder', e.target.value)} required /><h3>Premium tariflar (so‘m)</h3><div className="price-grid">{settings.plans.map((p, i) => <Field key={p.code} label={p.label} type="number" min="0" required value={p.price} onChange={e => upd('plans', settings.plans.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} />)}</div><ErrorMessage error={error} /><button className="btn red" disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Karta va narxlarni saqlash'}</button></form> : <p>Sozlamalar yuklanmoqda...</p>}<div className="panel"><h3>To‘lov so‘rovlari</h3>{orders.length === 0 ? <p className="muted">Hali to‘lov so‘rovi yo‘q.</p> : orders.map(o => <div className="payment-order" key={o._id}><div><strong>{o.user?.name || o.publicId}</strong><p>{o.publicId} · {o.plan.label} · {o.plan.price.toLocaleString('uz-UZ')} so‘m</p><span className={'status ' + o.status.toLowerCase()}>{o.status === 'PENDING' ? 'Tekshirilmoqda' : o.status === 'APPROVED' ? 'Tasdiqlangan' : 'Rad etilgan'}</span></div><div className="order-actions"><button className="btn outline tiny" onClick={() => openReceipt(o._id)}>Chekni ochish</button>{o.status === 'PENDING' && <><button className="btn red tiny" onClick={() => review(o, 'APPROVED')}>Tasdiqlash</button><button className="btn outline tiny" onClick={() => review(o, 'REJECTED')}>Rad etish</button></>}</div></div>)}</div></section> }
function Profile() {
    const { user, setUser, logout } = useAuth();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [error, setError] = useState('');
    const [profileForm, setProfileForm] = useState({ name: '', phone: '', dateOfBirth: '' });
    const avatarPicker = useRef(null);
    useEffect(() => {
        if (!user) return;
        const birth = user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '';
        setProfileForm({ name: user.name || '', phone: user.phone || '', dateOfBirth: birth });
    }, [user]);
    if (!user) return null;

    const premium = Boolean(user.premiumUntil && new Date(user.premiumUntil) > new Date());
    const nextEditAt = user.lastProfileEditAt ? new Date(new Date(user.lastProfileEditAt).getTime() + 30 * 86400000) : null;
    const canEdit = !nextEditAt || nextEditAt <= new Date();
    const age = user.dateOfBirth ? (() => {
        const birth = new Date(user.dateOfBirth);
        const today = new Date();
        let years = today.getUTCFullYear() - birth.getUTCFullYear();
        if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) years--;
        return years;
    })() : null;

    async function saveProfile(event) {
        event.preventDefault();
        if (!canEdit || busy) return;
        setBusy(true); setError('');
        try {
            const response = await api.patch('/auth/profile', profileForm);
            setUser(response.data.user);
            setEditing(false);
            toast.success('Profil ma’lumotlari yangilandi');
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Profilni saqlab bo‘lmadi');
        } finally { setBusy(false); }
    }

    async function changeAvatar(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || avatarBusy) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            toast.error('JPG, PNG yoki WebP (5 MB gacha) rasm tanlang');
            return;
        }
        const form = new FormData();
        form.append('avatar', file);
        setAvatarBusy(true);
        try {
            const response = await api.post('/auth/avatar', form);
            setUser(response.data.user);
            toast.success('Profil rasmi yangilandi');
        } catch (requestError) {
            toast.error(requestError.response?.data?.error || 'Profil rasmi yuklanmadi');
        } finally { setAvatarBusy(false); }
    }

    return <main className="content-page">
        <div className="profile-head profile-head-enhanced">
            <div className={'profile-avatar-shell ' + (premium ? 'premium-avatar-shell' : '')}>
                <div className="profile-avatar-image">
                    {user.avatar ? <img key={user.avatar} src={user.avatar} alt="Profil rasmi" /> : <UserRound size={44} />}
                </div>
                {premium && <span className="premium-avatar-crown" title="Premium a’zo"><Crown size={17} /></span>}
                <button type="button" className="avatar-edit-btn" onClick={() => avatarPicker.current?.click()} disabled={avatarBusy} title="Profil rasmini almashtirish" aria-label="Profil rasmini almashtirish"><Camera size={17} /></button>
                <input ref={avatarPicker} className="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} />
            </div>
            <div>
                <span className="section-kicker">SHAXSIY KABINET</span>
                <h1>{user.name}</h1>
                {premium && <span className="profile-premium-label"><Crown size={15} /> PREMIUM</span>}
                <div className="id-line"><code>{user.publicId}</code><button type="button" className="icon-button" title="ID nusxalash" onClick={() => navigator.clipboard.writeText(user.publicId).then(() => toast.success('ID nusxalandi!')).catch(() => toast.error('Nusxalab bo‘lmadi'))}><Copy size={18} /></button></div>
                <p className="muted profile-avatar-hint">{avatarBusy ? 'Rasm yuklanmoqda...' : 'Profil rasmini istalgan vaqtda almashtirishingiz mumkin'}</p>
            </div>
        </div>
        <div className="profile-grid">
            <div className="panel">
                <h2>Shaxsiy ma’lumotlar</h2>
                <div className="profile-row"><span>Email</span><strong>{user.email}</strong></div>
                <div className="profile-row"><span>Telefon</span><strong>{user.phone}</strong></div>
                <div className="profile-row"><span>Tug‘ilgan sana</span><strong>{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('uz-UZ', { timeZone: 'UTC' }) : 'Kiritilmagan'}</strong></div>
                <div className="profile-row"><span>Yosh</span><strong>{age === null ? '—' : `${age} yosh`}</strong></div>
                <div className="profile-row"><span>Holat</span><strong>{user.role}</strong></div>
                <div className="profile-row"><span>A’zo bo‘lgan sana</span><strong>{new Date(user.createdAt).toLocaleDateString('uz-UZ')}</strong></div>
                <p className="profile-edit-status">{canEdit ? 'Ma’lumotlarni hozir tahrirlashingiz mumkin.' : `Keyingi tahrir: ${nextEditAt.toLocaleDateString('uz-UZ')} (30 kunlik cheklov)`}</p>
                <button type="button" className="btn outline" disabled={!canEdit} onClick={() => { setEditing(value => !value); setError(''); }}><Pencil size={17} /> {editing ? 'Yopish' : 'Profilni tahrirlash'}</button>
                <button type="button" className="btn outline" onClick={logout}><LogOut size={18} /> Chiqish</button>
                {editing && canEdit && <motion.form className="profile-edit-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={saveProfile}>
                    <h3>Ma’lumotlarni yangilash</h3>
                    <Field label="Ism" required minLength={2} maxLength={100} value={profileForm.name} onChange={event => setProfileForm(previous => ({ ...previous, name: event.target.value }))} />
                    <Field label="Telefon" required type="tel" value={profileForm.phone} onChange={event => setProfileForm(previous => ({ ...previous, phone: event.target.value }))} />
                    <Field label="Tug‘ilgan sana" type="date" max={new Date().toISOString().slice(0, 10)} value={profileForm.dateOfBirth} onChange={event => setProfileForm(previous => ({ ...previous, dateOfBirth: event.target.value }))} />
                    <p className="muted">Saqlaganingizdan keyin ma’lumotlarni 30 kun davomida qayta o‘zgartira olmaysiz. Avatar bundan mustasno.</p>
                    <ErrorMessage error={error} />
                    <button className="btn red" disabled={busy}>{busy ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}</button>
                </motion.form>}
            </div>
            <div className="panel">
                <h2>Premium obuna</h2>
                <div className="premium-icon"><ShieldCheck size={48} /></div>
                <h3>{premium ? 'Premium faol' : 'Bepul akkaunt'}</h3>
                <p>{premium ? 'Obuna muddati: ' + new Date(user.premiumUntil).toLocaleDateString('uz-UZ') : 'Premium kinolarni tomosha qilish uchun tarifni tanlang.'}</p>
            </div>
        </div>
        <Link className="bey-profile-favorites" to="/favorites"><Bookmark size={20} /> Sevimli kinolarim <ArrowRight size={16}/></Link>
        <PremiumCheckout />
    </main>;
}

function Admin() {
    // Sahifalar yangilanganda navbar ham darhol yangilansin.
    const { refreshPages } = useContext(Pages);
    const [stats, setStats] = useState(null);
    const [movies, setMovies] = useState([]);
    const [form, setForm] = useState({ title: '', category: 'kino', description: '', genre: '', year: '', premium: false, featured: false });
    const [poster, setPoster] = useState(null);
    const [banner, setBanner] = useState(null);
    const [video, setVideo] = useState(null);
    const [preview, setPreview] = useState('');
    const [progress, setProgress] = useState(0);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const reload = () => {
        api.get('/admin/dashboard').then(r => setStats(r.data)).catch(e => setError(e.response?.data?.error || 'Statistika yuklanmadi'));
        api.get('/admin/movies').then(r => setMovies(r.data.movies)).catch(e => setError(e.response?.data?.error || 'Kinolar ro‘yxati yuklanmadi'));
    };
    useEffect(reload, []);
    useEffect(() => {
        if (!poster) { setPreview(''); return; }
        const url = URL.createObjectURL(poster);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [poster]);
    async function add(e) {
        e.preventDefault();
        if (!poster || (form.category !== 'serial' && !video)) { setError(form.category === 'serial' ? 'Poster majburiy' : 'Poster va video fayllari majburiy'); return; }
        if (video && !video.name.toLowerCase().endsWith('.mp4')) { setError('MP4 video tanlang'); return; }
        setError(''); setSending(true); setProgress(0);
        const data = new FormData();
        for (const [key, value] of Object.entries(form)) data.append(key, String(value));
        data.append('poster', poster);
        if (banner) data.append('banner', banner);
        if (video) data.append('video', video);
        try {
            await api.post('/admin/movies', data, {
                onUploadProgress: event => { if (event.total) setProgress(Math.min(99, Math.round(event.loaded / event.total * 100))); }
            });
            setProgress(100);
            toast.success('Kino va fayllar qoralamaga saqlandi');
            setForm({ title: '', category: 'kino', description: '', genre: '', year: '', premium: false, featured: false });
            setPoster(null); setBanner(null); setVideo(null);
            e.target.reset(); reload();
        } catch (err) { setError(err.response?.data?.error || 'Yuklashda xatolik. Serverni tekshiring.'); }
        finally { setSending(false); }
    }
    async function publish(movie) {
        try { await api.patch('/admin/movies/' + movie._id, { published: !movie.published }); toast.success('Holat yangilandi'); reload(); }
        catch (err) { toast.error(err.response?.data?.error || 'Nashr qilib bo‘lmadi'); }
    }
    return <main className="content-page">
        <div className="page-banner"><span className="section-kicker">ADMIN PANEL</span><h1>Boshqaruv markazi</h1><p>Kinolar va premium tizimi</p></div>
        <div className="stats-grid">{[['Foydalanuvchilar', stats?.users], ['Kinolar', stats?.movies], ['Premium', stats?.premiumUsers]].map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value ?? '...'}</strong></div>)}</div>
        <div className="admin-columns">
            <motion.form className="panel movie-upload-form" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={add}>
                <h2>Yangi kino qo‘shish</h2><p className="muted">Poster, banner va MP4 videoni kompyuterdan yuklang.</p>
                <Field label="Kino nomi" required minLength={2} maxLength={150} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <label className="field"><span>Bo‘lim</span><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{cats.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
                <div className="upload-two"><Field label="Janr" value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} /><Field label="Yil" type="number" min="1888" max="2100" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
                <label className="field"><span>Tavsif</span><textarea maxLength={5000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
                <div className="upload-two">
                    <label className="upload-target"><span>Poster (majburiy)</span><input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => setPoster(e.target.files?.[0] || null)} />{preview ? <img className="upload-preview" src={preview} alt="Poster ko‘rinishi" /> : <><Film size={30} /><small>JPG / PNG / WEBP · 10 MB</small></>}</label>
                    <label className="upload-target"><span>Banner (ixtiyoriy)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setBanner(e.target.files?.[0] || null)} /><Film size={30} /><small>{banner?.name || 'Rasm tanlash · 10 MB'}</small></label>
                </div>
                <label className="upload-target upload-video"><span>{form.category === 'serial' ? 'Boshlang‘ich video (ixtiyoriy) — qismlar quyida qo‘shiladi' : 'Kino videosi (majburiy)'}</span><input type="file" accept="video/mp4,.mp4" required={form.category !== 'serial'} onChange={e => setVideo(e.target.files?.[0] || null)} /><Play size={28} /><small>{video ? `${video.name} — ${(video.size / 1024 / 1024).toFixed(1)} MB` : 'MP4 fayl tanlash'}</small></label>
                <div className="upload-two"><label className="check"><input type="checkbox" checked={form.premium} onChange={e => setForm({ ...form, premium: e.target.checked })} /> Premium</label><label className="check"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /> Tavsiya etilgan</label></div>
                {sending && <div className="upload-progress" aria-label="Yuklanish"><div style={{ width: `${progress}%` }} /><span>{progress}%</span></div>}
                <ErrorMessage error={error} />
                <button className="btn red wide" disabled={sending}><Plus size={18} />{sending ? 'Yuklanmoqda...' : 'Kino va fayllarni saqlash'}</button>
            </motion.form>
            <div className="panel"><h2>Kino boshqaruvi</h2>{movies.length === 0 ? <p className="muted">Hali kino yo‘q.</p> : movies.map(movie => <div className="admin-movie" key={movie._id}><div><strong>{movie.title}</strong><p>{movie.published ? 'Nashr qilingan' : 'Qoralama'} · {movie.category}</p></div><MovieActions api={api} movie={movie} reload={reload} /></div>)}</div>
        </div><SeriesAdmin api={api} /><SliderManager api={api} /><PageManager api={api} onChanged={refreshPages} /><AdminPayments />
    </main>;
}
function AdminGate() { const { user } = useAuth(); return ['ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? <Admin /> : <Navigate to="/" /> }
function NotFound() { return <main className="content-page"><div className="empty"><h1>404</h1><p>Sahifa topilmadi</p><Link className="btn red" to="/">Bosh sahifaga qaytish</Link></div></main> }
function Footer() { return <footer><Logo /><p>© {new Date().getFullYear()} BEY MOVI. Barcha huquqlar himoyalangan.</p><span>Kinoni yangicha his eting.</span></footer> }
export default function App() { const [user, setUser] = useState(null), [loading, setLoading] = useState(true); const [pages, setPages] = useState([]); const refreshPages = () => api.get('/categories').then(r => setPages(r.data.categories)).catch(() => { }); useEffect(() => { refreshPages() }, []); useEffect(() => { api.get('/auth/me').then(r => setUser(r.data.user)).catch(() => { }).finally(() => setLoading(false)) }, []); async function logout() { try { await api.post('/auth/logout'); setUser(null); toast.success('Akkauntdan chiqildi'); window.location.href = '/' } catch { toast.error('Chiqishda xatolik') } } return <Auth.Provider value={{ user, setUser, loading, logout }}><Pages.Provider value={{ pages, refreshPages }}><Intro /><Navbar /><AnimatedRoutes /><Footer /></Pages.Provider></Auth.Provider> }
function AnimatedRoutes() { const location = useLocation(); const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; return <AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname + location.search} initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduce ? {} : { opacity: 0, y: -14, filter: "blur(6px)" }} transition={{ duration: reduce ? 0 : .32, ease: [.22, 1, .36, 1] }}><Routes location={location}><Route path="/" element={<Home />} /><Route path="/signup" element={<AuthPage mode="signup" />} /><Route path="/signin" element={<AuthPage mode="signin" />} /><Route path="/category/:slug" element={<Protected><CategoryPage /></Protected>} /><Route path="/search" element={<SearchPage />} /><Route path="/movie/:slug" element={<MovieDetails />} /><Route path="/favorites" element={<Protected><FavoritesPage api={api} /></Protected>} /><Route path="/profile" element={<Protected><Profile /></Protected>} /><Route path="/admin" element={<Protected><AdminGate /></Protected>} /><Route path="*" element={<NotFound />} /></Routes></motion.div></AnimatePresence> }
