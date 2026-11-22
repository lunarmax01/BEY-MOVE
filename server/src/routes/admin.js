import { Router } from 'express';

import multer from 'multer';

import crypto from 'node:crypto';

import path from 'node:path';

import { mkdirSync, promises as fs } from 'node:fs';

const mediaRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

const mediaDir = path.join(mediaRoot, 'movie-media');

const tempDir = path.join(mediaRoot, '.incoming');

mkdirSync(mediaDir, { recursive: true });

mkdirSync(tempDir, { recursive: true });

// MP4 uchun maksimum 5 GiB. .env: MAX_UPLOAD_MB=5120
const MAX_UPLOAD_MB = Math.min(Math.max(Number(process.env.MAX_UPLOAD_MB) || 5120, 1), 5120);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const upload = multer({

  storage: multer.diskStorage({

    destination: (_req, _file, cb) => cb(null, tempDir),

      filename: (_req, _file, cb) => cb(null, crypto.randomUUID() + '.tmp'),

  }),

limits: { fileSize: MAX_UPLOAD_BYTES, files: 3 },

}).fields([{ name: 'poster', maxCount: 1 }, { name: 'banner', maxCount: 1 }, { name: 'video', maxCount: 1 }]);

async function safeDelete(file) {

  if (file?.path) await fs.unlink(file.path).catch(() => { });

}

async function cleanup(req) {

  await Promise.all(Object.values(req.files || {}).flat().map(safeDelete));

}

async function verify(file, kind) {

  if (!file) return null;

  const fd = await fs.open(file.path, 'r');

  let bytes;

  try {

    bytes = Buffer.alloc(16);

    await fd.read(bytes, 0, bytes.length, 0);

  } finally { await fd.close(); }

  let ext;

  if (kind === 'video') {

    if (!['video/mp4', 'application/mp4'].includes(file.mimetype) || bytes.toString('ascii', 4, 8) !== 'ftyp') throw new Error('Video haqiqiy MP4 bo‘lishi kerak');

    ext = '.mp4';

  } else if (file.mimetype === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ext = '.jpg';

  else if (file.mimetype === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ext = '.png';

  else if (file.mimetype === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') ext = '.webp';

  else throw new Error('Rasm JPG, PNG yoki WEBP formatida bo‘lishi kerak');

  if (kind !== 'video' && file.size > 10 * 1024 * 1024) throw new Error('Rasm 10 MB dan oshmasin');

  const filename = crypto.randomUUID() + ext;

  await fs.rename(file.path, path.join(mediaDir, filename));

  return { filename, storedPath: path.join(mediaDir, filename) };

}

function parseFlag(value) { return value === true || value === 'true' || value === 'on'; }

function uploadMiddleware(req, res, next) {

  upload(req, res, error => {

    if (!error) return next();

    cleanup(req).finally(() => res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Fayl hajmi belgilangan limitdan oshdi' : 'Fayl yuklashda xatolik' }));

  });

}

import Movie from '../models/Movie.js';

import HomeSlider from '../models/HomeSlider.js'; import User from '../models/User.js'; import Category from '../models/Category.js'; import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router(); router.use(requireAuth, requireAdmin);

const slugify = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

router.get('/dashboard', async (req, res, next) => { try { const [users, movies, premiumUsers] = await Promise.all([User.countDocuments(), Movie.countDocuments(), User.countDocuments({ premiumUntil: { $gt: new Date() } })]); res.json({ users, movies, premiumUsers }) } catch (e) { next(e) } });

router.get('/movies', async (req, res, next) => { try { res.json({ movies: await Movie.find().select('-videoPath -episodes.videoPath').sort({ createdAt: -1 }).limit(100) }) } catch (e) { next(e) } });

router.post('/movies', uploadMiddleware, async (req, res, next) => {

  const moved = [];

  try {

    const { title, category, description, genre, year } = req.body || {};

    if (typeof title !== 'string' || title.trim().length < 2 || !['kino', 'serial', 'anime', 'multfilm', 'kattalar'].includes(category)) {

      await cleanup(req);

      return res.status(400).json({ error: 'Kino nomi yoki bo‘lim noto‘g‘ri' });

    }

    if (!req.files?.poster?.[0] || (category !== 'serial' && !req.files?.video?.[0])) {

      await cleanup(req);

      return res.status(400).json({ error: category === 'serial' ? 'Poster fayli majburiy' : 'Poster va MP4 video fayl majburiy' });

    }

    const files = {};

    for (const field of ['poster', 'banner', 'video']) {

      if (req.files?.[field]?.[0]) {

        const file = await verify(req.files[field][0], field);

        moved.push(file.storedPath);

        files[field] = file.filename;

      }

    }

    const rawYear = year === '' || year == null ? undefined : Number(year);

    if (rawYear !== undefined && (!Number.isInteger(rawYear) || rawYear < 1888 || rawYear > 2100)) {

      throw new Error('Yil noto‘g‘ri');

    }

    const movie = await Movie.create({

      title: title.trim(),

      slug: (slugify(title) || 'film') + '-' + crypto.randomBytes(5).toString('hex'),

      category,

      description: String(description || '').slice(0, 5000),

      genre: String(genre || '').slice(0, 120),

      year: rawYear,

      poster: `/api/movies/assets/${files.poster}`,

      banner: files.banner ? `/api/movies/assets/${files.banner}` : '',

      videoPath: files.video ? `movie-media/${files.video}` : '',

      premium: parseFlag(req.body.premium),

      featured: parseFlag(req.body.featured),

      ageRestricted: category === 'kattalar',

      published: false,

      createdBy: req.user._id,

    });

    return res.status(201).json({ movie: { ...movie.toObject(), videoPath: undefined, episodes: movie.episodes?.map(e => ({ ...e.toObject(), videoPath: undefined })) } });

  } catch (error) {

    await Promise.all(moved.map(f => fs.unlink(f).catch(() => {})));

    await cleanup(req);

    if (/MP4|Rasm|Yil/.test(error.message)) return res.status(400).json({error:error.message});

    next(error);

  }

});

router.patch('/movies/:id',async(req,res,next)=>{try{const keys=['title','description','genre','year','poster','banner','premium','featured','published'];const patch=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>keys.includes(k)));if(patch.published===true){const current=await Movie.findById(req.params.id).select('+episodes.videoPath');if(!current?.videoPath && !(current?.category === 'serial' && current.episodes?.some(e => e.published && e.videoPath)))return res.status(400).json({error:'Nashr qilishdan oldin kino videosini yoki kamida bitta nashr qilingan serial qismini yuklang'});}const movie=await Movie.findByIdAndUpdate(req.params.id,{$set:patch},{new:true,runValidators:true}).select('-videoPath -episodes.videoPath');if(!movie)return res.sendStatus(404);res.json({movie})}catch(e){next(e)}});

router.post('/categories',async(req,res,next)=>{try{const slug=slugify(req.body?.slug||req.body?.name);if(!slug||slug.length>64)return res.status(400).json({error:'Slug noto‘g‘ri'});const category=await Category.create({name:String(req.body.name).trim(),slug,description:String(req.body.description||'')});res.status(201).json({category})}catch(e){next(e)}});

router.get('/users',async(req,res,next)=>{try{res.json({users:await User.find().select('name publicId email phone role premiumUntil createdAt').limit(100)})}catch(e){next(e)}});

router.post('/premium/grant',async(req,res,next)=>{try{const user=await User.findOne({publicId:String(req.body.publicId||'')});const days=Number(req.body.days);if(!user)return res.sendStatus(404);if(!Number.isInteger(days)||days<1||days>366)return res.status(400).json({error:'Muddat 1–366 kun bo‘lishi kerak'});const from=user.premiumUntil>new Date()?user.premiumUntil:new Date();user.premiumUntil=new Date(from.getTime()+days*86400000);await user.save();res.json({publicId:user.publicId,premiumUntil:user.premiumUntil})}catch(e){next(e)}});

// ---- Safe administration of movies and their locally uploaded media ----

function localMediaPath(reference) {

  if (typeof reference !== 'string') return null;

  const file = reference.startsWith('/api/movies/assets/')

    ? reference.split('/').at(-1) : reference.startsWith('movie-media/') ? reference.slice('movie-media/'.length) : '';

  if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp|mp4)$/.test(file)) return null;

  return path.join(mediaDir, file);

}

async function deleteLocalMedia(movie) {

  const refs = [movie.poster, movie.banner, movie.videoPath, ...(movie.episodes || []).map(e => e.videoPath)];

  await Promise.all(refs.map(async ref => {

    const file = localMediaPath(ref);

    if (file) await fs.unlink(file).catch(err => { if (err.code !== 'ENOENT') console.error('Media cleanup:', err.message); });

  }));

}

router.delete('/movies/:id', async (req, res, next) => {

  try {

    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');

    if (!movie) return res.status(404).json({ error: 'Kino topilmadi' });

    await Movie.deleteOne({ _id: movie._id });

    await deleteLocalMedia(movie);

    return res.json({ message: 'Kino o‘chirildi' });

  } catch (err) { next(err); }

});

// Replacement of poster/banner/video, with validation and cleanup.

router.patch('/movies/:id/media', uploadMiddleware, async (req, res, next) => {

  const moved = [];

  try {

    const movie = await Movie.findById(req.params.id);

    if (!movie) { await cleanup(req); return res.sendStatus(404); }

    if (!Object.values(req.files || {}).flat().length) return res.status(400).json({error:'Fayl tanlanmagan'});

    const previous = {poster: movie.poster, banner: movie.banner, videoPath: movie.videoPath};

    const changed = {};

    for (const field of ['poster','banner','video']) {

      const input = req.files?.[field]?.[0];

      if (!input) continue;

      const saved = await verify(input, field);

      moved.push(saved.storedPath);

      const key = field === 'video' ? 'videoPath' : field;

      changed[key] = field === 'video' ? `movie-media/${saved.filename}` : `/api/movies/assets/${saved.filename}`;

    }

    Object.assign(movie, changed);

    await movie.save();

    await Promise.all(Object.keys(changed).map(async key => {

      const oldFile = localMediaPath(previous[key]);

      if (oldFile) await fs.unlink(oldFile).catch(() => {});

    }));

    await cleanup(req);

    return res.json({movie: {...movie.toObject(), videoPath: undefined, episodes: movie.episodes?.map(e => ({ ...e.toObject(), videoPath: undefined }))}});

  } catch (err) {

    await Promise.all(moved.map(f => fs.unlink(f).catch(() => {})));

    await cleanup(req);

    if (/MP4|Rasm/.test(err.message)) return res.status(400).json({error:err.message});

    next(err);

  }

});

// ---- Editable pages / safe, whitelist-based content blocks ----

const builtIns = new Set(['kino','serial','anime','multfilm','kattalar']);

const blockTypes = new Set(['text','section','banner','image','button','movieGrid','divider','spacer']);

function safeColor(color, fallback='#141414') {

  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;

}

function safeImageUrl(value) {

  const url=String(value||'').trim();

  if (!url) return '';

  if (url.startsWith('/api/movies/assets/') && /^\/api\/movies\/assets\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(url)) return url;

  try { const parsed=new URL(url); return ['https:','http:'].includes(parsed.protocol) ? url.slice(0,600) : ''; } catch { return ''; }

}

function safeButtonUrl(value) {

  const url=String(value||'').trim();

  if (url.startsWith('/') && !url.startsWith('//')) return url.slice(0,300);

  return '';

}

function safeBlocks(input) {

  if (!Array.isArray(input) || input.length>40) throw new Error('Bloklar soni noto‘g‘ri (maksimal 40)');

  const seen=new Set();

  return input.map((b,i) => {

    if (!b || !blockTypes.has(b.type)) throw new Error('Blok turi noto‘g‘ri');

    const id=typeof b.blockId==='string' && /^[a-zA-Z0-9-]{8,64}$/.test(b.blockId) ? b.blockId : crypto.randomUUID();

    if (seen.has(id)) throw new Error('Blok ID takrorlangan');

    seen.add(id);

    return {

      blockId:id, type:b.type, title:String(b.title||'').slice(0,150),

      content:String(b.content||'').slice(0,3000), imageUrl:safeImageUrl(b.imageUrl),

      buttonLabel:String(b.buttonLabel||'').slice(0,80), buttonUrl:safeButtonUrl(b.buttonUrl),

      background:safeColor(b.background), align:['left','center','right'].includes(b.align)?b.align:'left',

      hidden:b.hidden===true,

      movieIds:Array.isArray(b.movieIds) ? b.movieIds.filter(id => /^[0-9a-fA-F]{24}$/.test(String(id))).slice(0,30) : [],

    };

  });

}

router.get('/pages', async(req,res,next)=>{

  try { res.json({pages:await Category.find().sort({order:1,name:1})}); }

  catch(err){next(err)}

});

router.post('/pages', async(req,res,next)=>{

  try {

    const name=String(req.body?.name||'').trim();

    const slug=slugify(req.body?.slug||name);

    if(name.length<2||name.length>70||slug.length<2||slug.length>64)

      return res.status(400).json({error:'Sahifa nomi yoki slug noto‘g‘ri'});

    if(builtIns.has(slug)) return res.status(409).json({error:'Bunday standart sahifa mavjud'});

    const page=await Category.create({name,slug,description:String(req.body.description||'').slice(0,500),

      navVisible:req.body.navVisible!==false,published:req.body.published!==false,

      background:safeColor(req.body.background,'#070707'),order:Number(req.body.order)||100,

      blocks:safeBlocks(req.body.blocks||[])});

    res.status(201).json({page});

  }catch(err){ if(err.message?.includes('Blok'))return res.status(400).json({error:err.message}); next(err); }

});

router.patch('/pages/:id',async(req,res,next)=>{

  try {

    const page=await Category.findById(req.params.id);

    if(!page)return res.sendStatus(404);

    const b=req.body||{};

    if(b.name!==undefined){const name=String(b.name).trim();if(name.length<2||name.length>70)return res.status(400).json({error:'Nomi 2–70 belgi bo‘lsin'});page.name=name;}

    if(b.description!==undefined)page.description=String(b.description).slice(0,500);

    if(b.navVisible!==undefined)page.navVisible=b.navVisible===true;

    if(b.published!==undefined)page.published=b.published===true;

    if(b.background!==undefined)page.background=safeColor(b.background,'#070707');

    if(b.order!==undefined && Number.isFinite(Number(b.order)))page.order=Number(b.order);

    if(b.blocks!==undefined)page.blocks=safeBlocks(b.blocks);

    await page.save();res.json({page});

  }catch(err){ if(/Blok|blok/.test(err.message))return res.status(400).json({error:err.message});next(err); }

});

router.delete('/pages/:id',async(req,res,next)=>{

  try {

    const page=await Category.findById(req.params.id);

    if(!page)return res.sendStatus(404);

    if(page.builtIn||builtIns.has(page.slug))return res.status(403).json({error:'Standart sahifani o‘chirib bo‘lmaydi, yashirish mumkin'});

    await page.deleteOne();res.json({message:'Sahifa o‘chirildi'});

  }catch(err){next(err)}

});

// Homepage slider: up to seven existing published, non-18+ movies.

router.get('/home-slider', async (req, res, next) => {

  try {

    const settings = await HomeSlider.findById('homepage').lean();

    const all = await Movie.find({ published: true, ageRestricted: false })

      .select('title slug poster banner genre year category premium published ageRestricted')

      .sort({ createdAt: -1 }).limit(500).lean();

    return res.json({ movieIds: (settings?.movieIds || []).map(String), availableMovies: all });

  } catch (error) { next(error); }

});

router.put('/home-slider', async (req, res, next) => {

  try {

    const ids = req.body?.movieIds;

    if (!Array.isArray(ids) || ids.length > 7 ||

        ids.some(id => typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) ||

        new Set(ids.map(id => id.toLowerCase())).size !== ids.length) {

      return res.status(400).json({ error: '1–7 ta takrorlanmagan kino ID tanlang (yoki bo‘sh ro‘yxat).' });

    }

    const count = await Movie.countDocuments({

      _id: { $in: ids }, published: true, ageRestricted: false,

    });

    if (count !== ids.length) {

      return res.status(400).json({ error: 'Faqat nashr qilingan va 18+ bo‘lmagan kinolarni tanlang.' });

    }

    const settings = await HomeSlider.findByIdAndUpdate('homepage', {

      $set: { movieIds: ids, updatedBy: req.user._id },

    }, { upsert: true, new: true, runValidators: true });

    return res.json({ movieIds: settings.movieIds.map(String) });

  } catch (error) { next(error); }

});

// ==========================================

// SERIES STUDIO — ADMIN EPISODE MANAGEMENT

// ==========================================

const episodeUpload = multer({

  storage: multer.diskStorage({

    destination: (_req, _file, cb) => cb(null, tempDir),

    filename: (_req, _file, cb) => cb(null, crypto.randomUUID() + '.tmp'),

  }),

  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },

}).single('video');

function episodeUploadMiddleware(req, res, next) {

  episodeUpload(req, res, error => {

    if (!error) return next();

    if (req.file?.path) fs.unlink(req.file.path).catch(() => {});

    res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'MP4 video hajmi limitdan oshdi' : 'MP4 yuklashda xatolik' });

  });

}

function episodeParams(body = {}) {

  const season = Number(body.season);

  const number = Number(body.number);

  const title = String(body.title || '').trim();

  const duration = body.duration ? Number(body.duration) : null;

  if (!Number.isInteger(season) || season < 1 || season > 100 ||

      !Number.isInteger(number) || number < 1 || number > 999 ||

      title.length < 2 || title.length > 150 ||

      (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1440))) {

    return { error: 'Mavsum, qism raqami, nomi yoki davomiyligi noto‘g‘ri' };

  }

  return { season, number, title, duration, description: String(body.description || '').slice(0, 2000) };

}

function safeSeries(movie) {

  const m = movie.toObject();

  delete m.videoPath;

  m.episodes = (m.episodes || []).map(({ videoPath, ...episode }) => episode);

  return m;

}

router.get('/series/:id/episodes', async (req, res, next) => {

  try {

    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');

    if (!movie || movie.category !== 'serial') return res.status(404).json({ error: 'Serial topilmadi' });

    return res.json({ movie: safeSeries(movie) });

  } catch (error) { next(error); }

});

router.post('/series/:id/episodes', episodeUploadMiddleware, async (req, res, next) => {

  let stored = null;

  try {

    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');

    if (!movie || movie.category !== 'serial') return res.status(404).json({error:'Serial topilmadi'});

    const data = episodeParams(req.body);

    if (data.error) return res.status(400).json({ error: data.error });

    if (movie.episodes.some(e => e.season === data.season && e.number === data.number))

      return res.status(409).json({error:'Bu mavsumda ushbu qism raqami mavjud'});

    if (!req.file) return res.status(400).json({error:'Qismning MP4 videosini tanlang'});

    stored = await verify(req.file, 'video');

    movie.episodes.push({ ...data, videoPath: `movie-media/${stored.filename}`, published: false });

    await movie.save();

    return res.status(201).json({ movie: safeSeries(movie) });

  } catch (error) {

    if (stored) await fs.unlink(stored.storedPath).catch(() => {});

    if (/MP4/.test(error.message)) return res.status(400).json({error:error.message});

    next(error);

  } finally { if (req.file?.path) await fs.unlink(req.file.path).catch(() => {}); }

});

router.patch('/series/:id/episodes/:episodeId', async (req, res, next) => {

  try {

    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');

    if (!movie || movie.category !== 'serial') return res.sendStatus(404);

    const ep = movie.episodes.id(req.params.episodeId);

    if (!ep) return res.status(404).json({error:'Qism topilmadi'});

    const data = episodeParams({ ...ep.toObject(), ...req.body });

    if (data.error) return res.status(400).json({error:data.error});

    if (movie.episodes.some(other => String(other._id) !== String(ep._id) && other.season === data.season && other.number === data.number))

      return res.status(409).json({error:'Qism raqami takrorlangan'});

    Object.assign(ep, data);

    if (req.body.published !== undefined) ep.published = req.body.published === true;

    await movie.save();

    return res.json({movie:safeSeries(movie)});

  } catch (error) { next(error); }

});

router.put('/series/:id/episodes/:episodeId/video', episodeUploadMiddleware, async (req, res, next) => {

  let stored = null;

  try {

    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');

    const ep = movie?.category === 'serial' ? movie.episodes.id(req.params.episodeId) : null;

    if (!ep) return res.sendStatus(404);

    if (!req.file) return res.status(400).json({error:'MP4 video faylini tanlang'});

    stored = await verify(req.file, 'video');

    const old = ep.videoPath;

    ep.videoPath = `movie-media/${stored.filename}`;

    await movie.save();

    const oldPath = localMediaPath(old);

    if (oldPath) await fs.unlink(oldPath).catch(() => {});

    return res.json({movie:safeSeries(movie)});

  } catch (error) {

    if (stored) await fs.unlink(stored.storedPath).catch(() => {});

    if (/MP4/.test(error.message)) return res.status(400).json({error:error.message});

    next(error);

  } finally { if (req.file?.path) await fs.unlink(req.file.path).catch(() => {}); }

});

router.delete('/series/:id/episodes/:episodeId', async (req, res, next) => {

  try {

    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');

    const ep = movie?.category === 'serial' ? movie.episodes.id(req.params.episodeId) : null;

    if (!ep) return res.sendStatus(404);

    const pathToDelete = localMediaPath(ep.videoPath);

    movie.episodes.pull(ep._id);

    await movie.save();

    if (pathToDelete) await fs.unlink(pathToDelete).catch(() => {});

    return res.json({movie:safeSeries(movie)});

  } catch (error) { next(error); }

});

export default router;
