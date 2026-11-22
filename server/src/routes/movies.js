import { Router } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import Movie from '../models/Movie.js';
import HomeSlider from '../models/HomeSlider.js';
import User from '../models/User.js';
import { requireAuth, isAdult } from '../middleware/auth.js';

const router = Router();
const categories = ['kino', 'serial', 'anime', 'multfilm', 'kattalar'];
const adminRoles = ['ADMIN', 'SUPER_ADMIN'];

async function sessionUser(req) {
  if (!req.session?.userId) return null;
  const user = await User.findById(req.session.userId);
  return user?.status === 'ACTIVE' ? user : null;
}
function canSeeRestricted(user) {
  return !!user && isAdult(user);
}
function hasPremium(user) {
  return !!user?.premiumUntil && new Date(user.premiumUntil) > new Date();
}
function noAccess(res) {
  return res.status(403).json({ error: 'Ushbu kontent faqat 18 yoshdan kattalar uchun' });
}

router.get('/assets/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(filename)) return res.sendStatus(404);
    const url = `/api/movies/assets/${filename}`;
    const movie = await Movie.findOne({ $or: [{ poster: url }, { banner: url }] })
      .select('published ageRestricted');
    if (!movie) return res.sendStatus(404);
    const user = await sessionUser(req);
    const admin = adminRoles.includes(user?.role);
    if ((!movie.published && !admin) || (movie.ageRestricted && !canSeeRestricted(user) && !admin)) {
      return res.sendStatus(404);
    }
    const filepath = path.join(path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'), 'movie-media', filename);
    if (!existsSync(filepath)) return res.sendStatus(404);
    res.set('Cache-Control', 'private, max-age=120');
    return res.sendFile(filepath);
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const user = await sessionUser(req);
    const category = String(req.query.category || '');
    if (category && !categories.includes(category)) return res.status(400).json({ error: 'Noto‘g‘ri kategoriya' });
    if (category === 'kattalar' && !canSeeRestricted(user)) return noAccess(res);
    const query = { published: true };
    if (category) query.category = category;
    // 18+ kontentni umumiy ro‘yxat va qidiruvda voyaga yetmaganlarga ko‘rsatmaymiz.
    if (!canSeeRestricted(user)) query.ageRestricted = false;
    const search = String(req.query.search || '').slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (search) query.title = { $regex: search, $options: 'i' };
    const movies = await Movie.find(query).select('-videoPath -episodes').sort({ createdAt: -1 }).limit(60);
    return res.json({ movies });
  } catch (error) { next(error); }
});

// Public homepage slider; preserve admin-defined order, never expose restricted movies.
router.get('/home-slider', async (_req, res, next) => {
  try {
    const settings = await HomeSlider.findById('homepage').lean();
    const ids = (settings?.movieIds || []).slice(0, 7);
    if (!ids.length) return res.json({ movies: [] });
    const movies = await Movie.find({
      _id: { $in: ids }, published: true, ageRestricted: false,
    }).select('-videoPath -episodes -createdBy').lean();
    const byId = new Map(movies.map(movie => [String(movie._id), movie]));
    return res.json({ movies: ids.map(id => byId.get(String(id))).filter(Boolean) });
  } catch (error) { next(error); }
});


// Public episode metadata — never expose stored file paths.
router.get('/:id/episodes', async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id)
      .select('-videoPath -episodes.videoPath');
    if (!movie || !movie.published || movie.category !== 'serial') return res.sendStatus(404);
    if (movie.ageRestricted && !canSeeRestricted(await sessionUser(req))) return noAccess(res);
    const episodes = (movie.episodes || []).filter(e => e.published)
      .sort((a,b) => a.season - b.season || a.number - b.number);
    res.json({ episodes });
  } catch (error) { next(error); }
});
router.post('/:id/episodes/:episodeId/playback-session', requireAuth, async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');
    if (!movie || movie.category !== 'serial' || !movie.published) return res.sendStatus(404);
    if (movie.ageRestricted && !canSeeRestricted(req.user)) return noAccess(res);
    if (movie.premium && !hasPremium(req.user)) return res.status(403).json({ error: 'Premium talab qilinadi' });
    const ep = movie.episodes.id(req.params.episodeId);
    if (!ep || !ep.published || !ep.videoPath) return res.sendStatus(404);
    res.json({ streamUrl: `/api/movies/${movie._id}/episodes/${ep._id}/stream` });
  } catch (error) { next(error); }
});
router.get('/:id/episodes/:episodeId/stream', requireAuth, async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id).select('+episodes.videoPath');
    if (!movie || movie.category !== 'serial' || !movie.published) return res.sendStatus(404);
    if (movie.ageRestricted && !canSeeRestricted(req.user)) return res.sendStatus(403);
    if (movie.premium && !hasPremium(req.user)) return res.sendStatus(403);
    const ep = movie.episodes.id(req.params.episodeId);
    if (!ep?.published || !ep.videoPath) return res.sendStatus(404);
    return streamMp4(req, res, ep.videoPath);
  } catch (error) { next(error); }
});
function streamMp4(req, res, relativeFile) {
  const base = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  const filepath = path.resolve(base, relativeFile);
  if (!filepath.startsWith(base + path.sep) || !existsSync(filepath)) return res.sendStatus(404);
  const size = statSync(filepath).size;
  const range = req.headers.range;
  res.set({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store' });
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return res.status(416).set('Content-Range', `bytes */${size}`).end();
    let start = match[1] ? Number(match[1]) : 0;
    let end = match[2] ? Number(match[2]) : size - 1;
    if (!match[1]) { start = Math.max(0, size - Number(match[2])); end = size - 1; }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || end >= size) {
      return res.status(416).set('Content-Range', `bytes */${size}`).end();
    }
    res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    return createReadStream(filepath, { start, end }).pipe(res);
  }
  res.set('Content-Length', size);
  return createReadStream(filepath).pipe(res);
}

router.get('/:slug', async (req, res, next) => {
  try {
    const movie = await Movie.findOne({ slug: req.params.slug, published: true }).select('-videoPath -episodes.videoPath');
    if (!movie) return res.status(404).json({ error: 'Kino topilmadi' });
    if (movie.ageRestricted && !canSeeRestricted(await sessionUser(req))) return noAccess(res);
    const safeMovie = movie.toObject();
    if (safeMovie.category === 'serial') safeMovie.episodes = (safeMovie.episodes || []).filter(ep => ep.published);
    delete safeMovie.createdBy;
    return res.json({ movie: safeMovie });
  } catch (error) { next(error); }
});

router.post('/:id/playback-session', requireAuth, async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie?.published) return res.sendStatus(404);
    if (movie.category === 'serial') return res.status(400).json({error:'Serial qismini tanlang'});
    if (movie.ageRestricted && !canSeeRestricted(req.user)) return noAccess(res);
    if (movie.premium && !hasPremium(req.user)) return res.status(403).json({ error: 'Bu video Premium foydalanuvchilar uchun' });
    if (!movie.videoPath) return res.status(404).json({ error: 'Video yuklanmagan' });
    return res.json({ streamUrl: `/api/movies/${movie._id}/stream` });
  } catch (error) { next(error); }
});

router.get('/:id/stream', requireAuth, async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie?.published) return res.sendStatus(404);
    if (movie.category === 'serial') return res.status(400).json({error:'Serial qismini tanlang'});
    if (movie.ageRestricted && !canSeeRestricted(req.user)) return res.sendStatus(403);
    if (movie.premium && !hasPremium(req.user)) return res.sendStatus(403);
    if (!movie.videoPath) return res.sendStatus(404);
    const base = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
    const filepath = path.resolve(base, movie.videoPath);
    if (!filepath.startsWith(base + path.sep) || !existsSync(filepath)) return res.sendStatus(404);
    const size = statSync(filepath).size;
    const range = req.headers.range;
    res.set({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store' });
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return res.status(416).set('Content-Range', `bytes */${size}`).end();
      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : size - 1;
      if (!match[1]) { start = Math.max(0, size - Number(match[2])); end = size - 1; }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || end >= size) {
        return res.status(416).set('Content-Range', `bytes */${size}`).end();
      }
      res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      return createReadStream(filepath, { start, end }).pipe(res);
    }
    res.set('Content-Length', size);
    return createReadStream(filepath).pipe(res);
  } catch (error) { next(error); }
});

export default router;
