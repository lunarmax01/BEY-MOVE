import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import MovieReview from '../models/MovieReview.js';
import MovieComment from '../models/MovieComment.js';
import { requireAuth, isAdult } from '../middleware/auth.js';

const router = Router();
const admins = new Set(['ADMIN', 'SUPER_ADMIN']);
const limited = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false });
const idOk = id => mongoose.isValidObjectId(id);

async function visibleMovie(req, res) {
  if (!idOk(req.params.movieId)) { res.status(400).json({ error: 'Kino ID noto‘g‘ri' }); return null; }
  const movie = await Movie.findById(req.params.movieId).select('title slug poster year genre category ageRestricted published premium');
  if (!movie || !movie.published) { res.status(404).json({ error: 'Kino topilmadi' }); return null; }
  if (movie.ageRestricted && !isAdult(req.user)) {
    res.status(403).json({ error: 'Yoshga oid cheklov' }); return null;
  }
  return movie;
}

// Faqat login qilgan foydalanuvchilarning shaxsiy ro‘yxati.
router.use(requireAuth);

router.get('/favorites', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('favorites').lean();
    const ids = user?.favorites || [];
    const allowed = { _id: { $in: ids }, published: true };
    if (!isAdult(req.user)) allowed.ageRestricted = false;
    const movies = await Movie.find(allowed).select('title slug poster year genre category premium ageRestricted').lean();
    const index = new Map(movies.map(movie => [String(movie._id), movie]));
    res.json({ movies: ids.map(id => index.get(String(id))).filter(Boolean) });
  } catch (error) { next(error); }
});

router.get('/movies/:movieId', async (req, res, next) => {
  try {
    const movie = await visibleMovie(req, res);
    if (!movie) return;
    const [ratings, comments, userRating, user] = await Promise.all([
      MovieReview.aggregate([
        { $match: { movie: movie._id } },
        { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$score' } } },
      ]),
      MovieComment.find({ movie: movie._id })
        .sort({ createdAt: -1 }).limit(100)
        .populate('user', 'name avatar premiumUntil role').lean(),
      MovieReview.findOne({ movie: movie._id, user: req.user._id }).select('score').lean(),
      User.findById(req.user._id).select('favorites').lean(),
    ]);
    const commentsSafe = comments.map(comment => ({
      id: String(comment._id),
      parentId: comment.parentId ? String(comment.parentId) : null,
      body: comment.body,
      createdAt: comment.createdAt,
      author: { name: comment.user?.name || 'Foydalanuvchi', avatar: comment.user?.avatar || '', premium: !!comment.user?.premiumUntil && new Date(comment.user.premiumUntil) > new Date() },
      canDelete: String(comment.user?._id) === String(req.user._id) || admins.has(req.user.role),
    }));
    res.json({
      favorite: (user?.favorites || []).some(id => String(id) === String(movie._id)),
      userRating: userRating?.score || 0,
      rating: { average: Math.round((ratings[0]?.average || 0) * 10) / 10, count: ratings[0]?.count || 0 },
      comments: commentsSafe,
    });
  } catch (error) { next(error); }
});

router.put('/movies/:movieId/favorite', limited, async (req, res, next) => {
  try {
    const movie = await visibleMovie(req, res);
    if (!movie) return;
    const enabled = req.body?.favorite;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'favorite boolean bo‘lishi kerak' });
    const update = enabled
      ? { $addToSet: { favorites: movie._id } }
      : { $pull: { favorites: movie._id } };
    await User.updateOne({ _id: req.user._id }, update);
    res.json({ favorite: enabled });
  } catch (error) { next(error); }
});

router.put('/movies/:movieId/rating', limited, async (req, res, next) => {
  try {
    const movie = await visibleMovie(req, res);
    if (!movie) return;
    const score = req.body?.score;
    if (!Number.isInteger(score) || score < 1 || score > 5)
      return res.status(400).json({ error: 'Baho 1 dan 5 gacha bo‘lsin' });
    await MovieReview.findOneAndUpdate(
      { movie: movie._id, user: req.user._id },
      { $set: { score } }, { upsert: true, new: true, runValidators: true },
    );
    const [summary] = await MovieReview.aggregate([
      { $match: { movie: movie._id } },
      { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$score' } } },
    ]);
    res.json({ userRating: score, rating: { average: Math.round((summary?.average || 0) * 10) / 10, count: summary?.count || 0 } });
  } catch (error) { next(error); }
});

router.post('/movies/:movieId/comments', limited, async (req, res, next) => {
  try {
    const movie = await visibleMovie(req, res);
    if (!movie) return;
    const body = String(req.body?.body || '').trim();
    if (body.length < 2 || body.length > 1200) return res.status(400).json({ error: 'Kommentariya 2–1200 belgidan iborat bo‘lsin' });
    const parent = req.body?.parentId || null;
    if (parent && !idOk(parent)) return res.status(400).json({ error: 'Javob ID noto‘g‘ri' });
    if (parent && !await MovieComment.exists({ _id: parent, movie: movie._id }))
      return res.status(404).json({ error: 'Javob berilayotgan kommentariya topilmadi' });
    await MovieComment.create({ movie: movie._id, user: req.user._id, parentId: parent, body });
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
});

router.delete('/movies/:movieId/comments/:commentId', limited, async (req, res, next) => {
  try {
    const movie = await visibleMovie(req, res);
    if (!movie) return;
    if (!idOk(req.params.commentId)) return res.status(400).json({ error: 'Kommentariya ID noto‘g‘ri' });
    const comment = await MovieComment.findOne({ _id: req.params.commentId, movie: movie._id });
    if (!comment) return res.status(404).json({ error: 'Kommentariya topilmadi' });
    if (String(comment.user) !== String(req.user._id) && !admins.has(req.user.role))
      return res.status(403).json({ error: 'O‘chirishga ruxsat yo‘q' });
    // Thread references must not dangle after a parent is deleted.
    await MovieComment.updateMany({ movie: movie._id, parentId: comment._id }, { $set: { parentId: null } });
    await comment.deleteOne();
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
