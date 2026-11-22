import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, BookmarkCheck, Star, Send, MessageCircle, CornerDownRight, Trash2, Crown, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import './MovieCommunity.css';

const numberText = number => new Intl.NumberFormat('uz-UZ').format(number || 0);

export function MovieCommunity({ api, movie }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [ratingBurst, setRatingBurst] = useState(0);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const response = await api.get(`/social/movies/${movie._id}`);
      setData(response.data);
      setError('');
    } catch (err) { setError(err.response?.data?.error || 'Muhokama yuklanmadi'); }
  };
  useEffect(() => { setData(null); load(); }, [movie._id]);
  const run = async fn => {
    if (busy) return;
    setBusy(true);
    try { await fn(); await load(); }
    catch (err) { toast.error(err.response?.data?.error || 'So‘rov bajarilmadi'); }
    finally { setBusy(false); }
  };
  const toggleFavorite = () => run(async () => {
    const value = !data.favorite;
    await api.put(`/social/movies/${movie._id}/favorite`, { favorite: value });
    toast.success(value ? 'Sevimlilarga qo‘shildi!' : 'Sevimlilardan olindi');
  });
  const rate = score => run(async () => {
    await api.put(`/social/movies/${movie._id}/rating`, { score });
    setRatingBurst(v => v + 1);
    toast.success('Bahoyingiz saqlandi!');
  });
  const submit = event => {
    event.preventDefault();
    const body = text.trim();
    if (body.length < 2) return;
    run(async () => {
      await api.post(`/social/movies/${movie._id}/comments`, { body, parentId: replyTo });
      setText(''); setReplyTo(null);
      toast.success('Fikringiz joylandi');
    });
  };
  const remove = id => {
    if (!window.confirm('Kommentariyani o‘chirasizmi?')) return;
    run(() => api.delete(`/social/movies/${movie._id}/comments/${id}`));
  };
  return <section className="bey-community" aria-label="Kino reytingi va muhokama">
    <div className="bey-community-top">
      <div><span className="bey-community-kicker">BEY MOVI · COMMUNITY</span><h2>Kino haqidagi fikrlar</h2><p>Sevimlilaringizga saqlang, baholang va boshqalar bilan muhokama qiling.</p></div>
      <button type="button" className={'bey-save-btn ' + (data?.favorite ? 'saved' : '')} disabled={!data || busy} onClick={toggleFavorite}>
        {data?.favorite ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
        {data?.favorite ? 'Sevimlilarda' : 'Keyinroq ko‘raman'}
      </button>
    </div>
    {error && <p className="bey-community-error">{error}</p>}
    {data && <>
      <div className="bey-rating-panel">
        <div className="bey-rating-summary"><strong>{data.rating.average.toFixed(1)}</strong><span>5 dan · {numberText(data.rating.count)} ta baho</span></div>
        <div className="bey-rating-choice"><h3>O‘z bahoyingizni bering</h3><div className="bey-stars" role="group" aria-label="1 dan 5 yulduzgacha baholang">
          {[1,2,3,4,5].map(n => <button type="button" key={n} disabled={busy} onClick={() => rate(n)} aria-label={`${n} yulduz`} aria-pressed={data.userRating === n} className={n <= data.userRating ? 'selected' : ''}><Star size={30} fill={n <= data.userRating ? 'currentColor' : 'none'}/></button>)}
        </div><small>{data.userRating ? `Sizning bahoyingiz: ${data.userRating}/5 · O‘zgartirish mumkin` : 'Baholash uchun yulduzni bosing'}</small></div>
        <AnimatePresence>{ratingBurst > 0 && <motion.div key={ratingBurst} className="bey-rating-celebrate" initial={{opacity:0,scale:.75,y:14}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}} transition={{type:'spring',stiffness:230,damping:16}}><Star fill="currentColor" size={19}/> BEY RATING!</motion.div>}</AnimatePresence>
      </div>
      <div className="bey-comments-head"><h3><MessageCircle size={21}/> Muhokama</h3><span>{numberText(data.comments.length)} ta so‘nggi fikr</span></div>
      {replyTo && <div className="bey-reply-context">Javob yozilmoqda <button type="button" onClick={() => setReplyTo(null)}>Bekor qilish</button></div>}
      <form className="bey-comment-form" onSubmit={submit}><textarea value={text} onChange={e => setText(e.target.value)} maxLength={1200} rows={3} placeholder="Kino haqida fikringizni yozing... (2–1200 belgi)" /><div><span>{text.length}/1200</span><button className="bey-send" disabled={busy || text.trim().length < 2}><Send size={16}/> Kommentariya yuborish</button></div></form>
      <div className="bey-comment-list">{data.comments.length ? data.comments.map(c => <article className={'bey-comment ' + (c.parentId ? 'is-reply' : '')} key={c.id}>
        <div className="bey-comment-avatar">{c.author.avatar ? <img src={c.author.avatar} alt="" loading="lazy"/> : c.author.name?.slice(0,1).toUpperCase()}</div>
        <div className="bey-comment-main"><div className="bey-comment-meta"><strong>{c.author.name}</strong>{c.author.premium && <span className="bey-premium-mini"><Crown size={12}/> PREMIUM</span>}<time>{new Date(c.createdAt).toLocaleDateString('uz-UZ')}</time></div>{c.parentId && <span className="bey-reply-label"><CornerDownRight size={13}/> Javob</span>}<p>{c.body}</p><div className="bey-comment-actions"><button type="button" onClick={() => {setReplyTo(c.id);document.querySelector('.bey-comment-form textarea')?.focus()}}>Javob berish</button>{c.canDelete && <button type="button" onClick={() => remove(c.id)}><Trash2 size={13}/> O‘chirish</button>}</div></div>
      </article>) : <p className="bey-comments-empty">Birinchi bo‘lib ushbu kino haqida fikr bildiring!</p>}</div>
    </>}
  </section>;
}

export function FavoritesPage({ api }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/social/favorites').then(r => setMovies(r.data.movies || []))
      .catch(err => setError(err.response?.data?.error || 'Sevimlilar yuklanmadi'))
      .finally(() => setLoading(false));
  }, []);
  return <main className="content-page bey-favorites-page"><div className="page-banner"><span className="section-kicker">SHAXSIY TO‘PLAM</span><h1>Sevimli kinolarim</h1><p>Keyinroq tomosha qilish uchun saqlangan kinolar.</p></div>
    {error && <p className="bey-community-error">{error}</p>}
    {loading ? <p>Yuklanmoqda...</p> : movies.length ? <div className="bey-favorites-grid">{movies.map(movie => <Link key={movie._id} to={'/movie/' + movie.slug} className="bey-favorite-card"><div>{movie.poster ? <img src={movie.poster} loading="lazy" alt={movie.title}/> : <Film size={45}/>}</div><strong>{movie.title}</strong><small>{movie.year || '—'} · {movie.genre || movie.category}</small></Link>)}</div> : <div className="empty"><Bookmark size={38}/><h3>Hali sevimli kinolar yo‘q</h3><p>Biror kinoning sahifasida «Keyinroq ko‘raman» tugmasini bosing.</p><Link className="btn red tiny" to="/">Kinolarni ko‘rish</Link></div>}
  </main>;
}
