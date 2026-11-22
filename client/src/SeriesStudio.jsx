import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clapperboard, Play, Plus, Trash2, Pencil, Crown, Upload, Check, LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import './SeriesStudio.css';

function message(error, fallback='Xatolik yuz berdi') {
  return error?.response?.data?.error || fallback;
}

export function SeriesAdmin({ api }) {
  const [serials, setSerials] = useState([]);
  const [chosen, setChosen] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ season: '1', number: '1', title: '', description: '', duration: '' });
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const uploadInput = useRef(null);

  async function refreshList() {
    try {
      const response = await api.get('/admin/movies');
      const list = (response.data.movies || []).filter(m => m.category === 'serial');
      setSerials(list);
      setChosen(prev => list.some(m => m._id === prev) ? prev : list[0]?._id || '');
    } catch (error) { toast.error(message(error, 'Seriallar olinmadi')); }
  }
  useEffect(() => { refreshList(); }, []);
  async function refreshSeries(id) {
    if (!id) { setSelected(null); return; }
    try {
      const response = await api.get(`/admin/series/${id}/episodes`);
      setSelected(response.data.movie);
    } catch (error) { setSelected(null); toast.error(message(error)); }
  }
  useEffect(() => { refreshSeries(chosen); }, [chosen]);
  const ordered = useMemo(() => [...(selected?.episodes || [])].sort((a,b) => a.season-b.season || a.number-b.number), [selected]);

  async function addEpisode(event) {
    event.preventDefault();
    if (!video) return toast.error('MP4 fayl tanlang');
    setLoading(true); setProgress(0);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key,val]) => data.append(key,val));
      data.append('video',video);
      await api.post(`/admin/series/${chosen}/episodes`, data, {
        onUploadProgress: e => { if (e.total) setProgress(Math.min(99, Math.round(e.loaded / e.total * 100))); },
      });
      toast.success('Yangi qism saqlandi. Endi uni nashr qiling.');
      setForm(prev => ({...prev, number: String(Number(prev.number)+1),title:'',description:'',duration:''}));
      setVideo(null);
      if (uploadInput.current) uploadInput.current.value = '';
      await refreshSeries(chosen);
    } catch (error) { toast.error(message(error, 'Qism yuklanmadi')); }
    finally { setLoading(false); setProgress(0); }
  }
  async function updateEpisode(ep, patch) {
    try {
      await api.patch(`/admin/series/${chosen}/episodes/${ep._id}`, patch);
      await refreshSeries(chosen);
      toast.success('Qism yangilandi');
    } catch (error) { toast.error(message(error)); }
  }
  function editEpisode(ep) {
    const title = window.prompt('Qismning yangi nomi', ep.title);
    if (title === null) return;
    const description = window.prompt('Qism haqida tavsif', ep.description || '');
    if (description === null) return;
    updateEpisode(ep,{title,description});
  }
  async function replaceVideo(ep, file) {
    if (!file) return;
    const data = new FormData(); data.append('video',file);
    try {
      setLoading(true);
      await api.put(`/admin/series/${chosen}/episodes/${ep._id}/video`,data);
      toast.success('MP4 video almashtirildi'); await refreshSeries(chosen);
    } catch (error) { toast.error(message(error)); }
    finally { setLoading(false); }
  }
  async function removeEpisode(ep) {
    if (!window.confirm(`${ep.season}-mavsum, ${ep.number}-qismni video fayli bilan butunlay o‘chirasizmi?`)) return;
    try {
      await api.delete(`/admin/series/${chosen}/episodes/${ep._id}`);
      toast.success('Qism o‘chirildi'); await refreshSeries(chosen);
    } catch (error) { toast.error(message(error)); }
  }
  return <section className="series-manager panel" id="series-manager">
    <div className="series-manager-title"><div><span className="section-kicker">BEY MOVI · SERIES STUDIO</span><h2>Serial va qismlar boshqaruvi</h2><p className="muted">Avval yuqorida "Serial" bo‘limida poster bilan serial yarating, so‘ng qismlarini shu yerdan yuklang.</p></div><Clapperboard size={32}/></div>
    {serials.length ? <>
      <label className="field"><span>Serialni tanlang</span><select value={chosen} onChange={e => setChosen(e.target.value)}>{serials.map(s => <option value={s._id} key={s._id}>{s.title}</option>)}</select></label>
      <div className="series-admin-grid">
        <form className="series-editor" onSubmit={addEpisode}>
          <h3><Plus size={18}/> Yangi qism yuklash</h3>
          <div className="series-pair"><label className="field"><span>Mavsum</span><input type="number" min="1" max="100" required value={form.season} onChange={e => setForm(f => ({...f,season:e.target.value}))}/></label><label className="field"><span>Qism raqami</span><input type="number" min="1" max="999" required value={form.number} onChange={e => setForm(f => ({...f,number:e.target.value}))}/></label></div>
          <label className="field"><span>Qism nomi</span><input required minLength="2" maxLength="150" value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} placeholder="1-qism: Yangi boshlanish"/></label>
          <label className="field"><span>Tavsif</span><textarea maxLength="2000" value={form.description} onChange={e => setForm(f => ({...f,description:e.target.value}))}/></label>
          <label className="field"><span>Davomiyligi (daqiqa, ixtiyoriy)</span><input type="number" min="1" max="1440" value={form.duration} onChange={e => setForm(f => ({...f,duration:e.target.value}))}/></label>
          <label className="series-upload"><Upload size={24}/><strong>{video?.name || 'MP4 qism videosini tanlang'}</strong><span>Kompyuterdan yuklash · mavjud MAX_UPLOAD_MB limiti</span><input ref={uploadInput} type="file" accept="video/mp4,.mp4" required onChange={e => setVideo(e.target.files?.[0] || null)}/></label>
          {loading && <div className="series-progress"><div style={{width:`${progress}%`}}/></div>}
          <button className="btn red wide" disabled={loading || !video}>{loading ? 'Yuklanmoqda...' : 'Qismni saqlash'}</button>
        </form>
        <div className="series-admin-episodes"><h3>Mavjud qismlar <span>{ordered.length}</span></h3>
          {ordered.length ? ordered.map(ep => <div className="series-admin-episode" key={ep._id}><div className="series-episode-index">S{ep.season} E{ep.number}</div><div className="series-episode-details"><strong>{ep.title}</strong><small>{ep.published ? 'Nashr qilingan' : 'Qoralama'} · {ep.duration ? `${ep.duration} daqiqa` : 'Davomiylik kiritilmagan'}</small></div><div className="series-admin-episode-actions">
            <button type="button" title="Tahrirlash" onClick={() => editEpisode(ep)}><Pencil size={15}/></button>
            <label className="series-replace" title="Videoni almashtirish"><Upload size={15}/><input type="file" accept="video/mp4,.mp4" disabled={loading} onChange={e => {replaceVideo(ep,e.target.files?.[0]);e.target.value='';}}/></label>
            <button type="button" title={ep.published?'Yashirish':'Nashr qilish'} onClick={() => updateEpisode(ep,{published:!ep.published})}>{ep.published?<LockKeyhole size={15}/>:<Check size={15}/>}</button>
            <button type="button" title="O‘chirish" className="series-danger" onClick={() => removeEpisode(ep)}><Trash2 size={15}/></button>
          </div></div>) : <p className="muted">Hozircha qismlar yo‘q.</p>}
        </div>
      </div>
    </> : <p className="muted">Avval "Serial" kategoriyasida yangi serial yarating.</p>}
  </section>;
}

export function SeriesPlayer({ api, movie, userId }) {
  const [episodes,setEpisodes] = useState([]);
  const [season,setSeason] = useState(1);
  const [active,setActive] = useState(null);
  const [src,setSrc] = useState('');
  const [error,setError] = useState('');
  const player = useRef(null);
  const resumeAt = useRef(0);
  const persistAt = useRef(0);
  const storageKey = `bey-series:${userId || 'guest'}:${movie._id}`;
  useEffect(() => {
    let alive = true;
    api.get(`/movies/${movie._id}/episodes`).then(({data})=>{
      if (!alive) return;
      const list = data.episodes || [];
      setEpisodes(list);
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const current = list.find(e => e._id === saved.episodeId) || list[0];
        setActive(current || null);
        if (current) setSeason(current.season);
      } catch {setActive(list[0] || null); if (list[0]) setSeason(list[0].season);}
    }).catch(err => { if(alive)setError(message(err,'Qismlar yuklanmadi')); });
    return ()=>{alive=false};
  },[movie._id,storageKey]);
  const seasons = [...new Set(episodes.map(e=>e.season))].sort((a,b)=>a-b);
  const visible = episodes.filter(e=>e.season === season);
  const position = episodes.findIndex(e=>e._id === active?._id);
  const next = episodes[position + 1];
  async function openEpisode(ep, autoplay=true) {
    if (!ep) return;
    setError(''); setSrc('');setActive(ep);setSeason(ep.season);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      resumeAt.current = saved.episodeId === ep._id ? Number(saved.seconds)||0 : 0;
    } catch { resumeAt.current = 0; }
    try {
      const { data } = await api.post(`/movies/${movie._id}/episodes/${ep._id}/playback-session`);
      setSrc(data.streamUrl);
      if (autoplay) setTimeout(()=>player.current?.play()?.catch(()=>{}),100);
    } catch(err) {setError(message(err,'Videoni ochib bo‘lmadi'));}
  }
  function saveProgress(force=false) {
    if (!player.current || !active) return;
    const now = Date.now();
    if (!force && now-persistAt.current < 4500) return;
    persistAt.current = now;
    try {localStorage.setItem(storageKey, JSON.stringify({episodeId:active._id,seconds:Math.floor(player.current.currentTime),updatedAt:now}));}catch{}
  }
  return <section className="series-watch"><div className="series-watch-heading"><span className="section-kicker">BEY MOVI · SERIAL</span><h2>Tomosha qilish</h2><p>Qismni tanlang va tomoshani davom ettiring.</p></div>
    <div className="series-player-layout"><div className="series-player-col">
      <div className="series-screen">{src ? <video key={src} ref={player} src={src} controls playsInline onLoadedMetadata={()=>{if(resumeAt.current>0 && resumeAt.current<player.current.duration-10)player.current.currentTime=resumeAt.current;}} onTimeUpdate={()=>saveProgress()} onPause={()=>saveProgress(true)} onEnded={()=>{saveProgress(true);if(next)openEpisode(next);}}/> : <div className="series-screen-poster" style={{backgroundImage: movie.banner?`linear-gradient(0deg,#090909dd,#09090944),url(${movie.banner})`:undefined}}><Clapperboard size={45}/><strong>{active ? `${active.season}-mavsum · ${active.number}-qism` : 'Qismlar hali mavjud emas'}</strong><button className="btn red" disabled={!active} onClick={()=>openEpisode(active)}><Play size={16}/> Tomosha qilish</button></div>}</div>
      {error && <p className="series-error">{error}</p>}
      {active && <div className="series-playing-meta"><small>S{active.season} · E{active.number} {active.duration?`· ${active.duration} daqiqa`:''}</small><h3>{active.title}</h3><p>{active.description || movie.description}</p><button disabled={!next} className="btn outline tiny" onClick={()=>openEpisode(next)}>Keyingi qism <ChevronRight size={16}/></button></div>}
    </div><aside className="series-side"><div className="series-side-top"><div><strong>Qismlar</strong><span>{episodes.length} ta qism</span></div><select value={season} onChange={e=>setSeason(Number(e.target.value))} aria-label="Mavsum tanlash">{seasons.map(s=><option value={s} key={s}>{s}-mavsum</option>)}</select></div><div className="series-list"><AnimatePresence mode="popLayout">{visible.map(ep=><motion.button layout key={ep._id} className={'series-episode-card '+(ep._id===active?._id?'chosen':'')} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} onClick={()=>openEpisode(ep)}><div className="series-episode-number">{String(ep.number).padStart(2,'0')}</div><div><strong>{ep.title}</strong><small>{ep.duration?`${ep.duration} daqiqa`:'Serial qismi'}</small><p>{ep.description||'Tomosha qilish uchun bosing'}</p></div><Play size={18}/></motion.button>)}</AnimatePresence>{!visible.length && <p className="muted">Bu mavsum uchun nashr qilingan qismlar yo‘q.</p>}</div></aside></div>
  </section>;
}
