import { Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import { mkdirSync, promises as fs } from 'node:fs';
import User from '../models/User.js';
import { requireAuth, publicUser } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false });
const editLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
const DAY_MS = 24 * 60 * 60 * 1000;
const PROFILE_LOCK_MS = 30 * DAY_MS;
const avatarRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads', 'avatars');
const tempRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads', '.avatar-incoming');
mkdirSync(avatarRoot, { recursive: true });
mkdirSync(tempRoot, { recursive: true });

function normalizePhone(value) {
  let phone = String(value || '').replace(/[^\d+]/g, '');
  if (/^998\d{9}$/.test(phone)) phone = '+' + phone;
  if (/^\d{9}$/.test(phone)) phone = '+998' + phone;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function parseBirthday(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Tug‘ilgan sanani YYYY-MM-DD formatida kiriting');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ||
      date > new Date() || date.getUTCFullYear() < 1900) throw new Error('Tug‘ilgan sana noto‘g‘ri');
  return date;
}

router.post('/signup', limiter, async (req, res, next) => {
  try {
    const { name, password, confirmPassword, dateOfBirth } = req.body || {};
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = normalizePhone(req.body?.phone);
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100 ||
        !validEmail(email) || !phone || typeof password !== 'string' ||
        password.length < 10 || password.length > 128 || password !== confirmPassword) {
      return res.status(400).json({ error: 'Ism, email, telefon va parolni tekshiring (parol kamida 10 belgi)' });
    }
    let birth;
    try { birth = parseBirthday(dateOfBirth); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    if (await User.exists({ $or: [{ email }, { phone }] })) return res.status(409).json({ error: 'Bu email yoki telefon bilan akkaunt mavjud' });
    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        user = await User.create({ publicId: 'BEY-' + randomBytes(5).toString('hex').toUpperCase(),
          name: name.trim(), email, phone, passwordHash, dateOfBirth: birth });
        break;
      } catch (error) {
        if (error.code !== 11000) throw error;
        if (error.keyPattern?.email || error.keyPattern?.phone) return res.status(409).json({ error: 'Bu email yoki telefon band' });
      }
    }
    if (!user) return res.status(500).json({ error: 'ID yaratishda xatolik' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.userId = String(user._id);
      req.session.save(saveError => saveError ? next(saveError) : res.status(201).json({ user: publicUser(user) }));
    });
  } catch (error) { next(error); }
});

router.post('/signin', limiter, async (req, res, next) => {
  try {
    const identifier = String(req.body?.identifier || '').trim().toLowerCase();
    const phone = normalizePhone(identifier);
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: phone || '__none__' }] }).select('+passwordHash');
    const valid = user && await bcrypt.compare(String(req.body?.password || ''), user.passwordHash);
    if (!valid || user.status !== 'ACTIVE') return res.status(401).json({ error: 'Login yoki parol noto‘g‘ri' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.userId = String(user._id);
      req.session.cookie.maxAge = req.body?.rememberMe ? 30 * DAY_MS : DAY_MS;
      req.session.save(saveError => saveError ? next(saveError) : res.json({ user: publicUser(user) }));
    });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.post('/logout', (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('bey.sid');
    res.json({ success: true });
  });
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!await bcrypt.compare(String(req.body?.oldPassword || ''), user.passwordHash)) return res.status(400).json({ error: 'Eski parol noto‘g‘ri' });
    if (typeof req.body?.newPassword !== 'string' || req.body.newPassword.length < 10 || req.body.newPassword.length > 128) {
      return res.status(400).json({ error: 'Yangi parol 10–128 belgidan iborat bo‘lsin' });
    }
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    req.session.regenerate(error => error ? next(error) : res.json({ success: true, signInAgain: true }));
  } catch (error) { next(error); }
});

// Name, phone and birthday may be updated only once every 30 days.
// The restriction is enforced atomically by MongoDB, not only by the UI.
router.patch('/profile', requireAuth, editLimiter, async (req, res, next) => {
  try {
    const keys = Object.keys(req.body || {});
    if (!keys.length || keys.some(key => !['name', 'phone', 'dateOfBirth'].includes(key))) {
      return res.status(400).json({ error: 'Faqat ism, telefon va tug‘ilgan sanani o‘zgartirish mumkin' });
    }
    const patch = {};
    if (Object.hasOwn(req.body, 'name')) {
      if (typeof req.body.name !== 'string' || req.body.name.trim().length < 2 || req.body.name.trim().length > 100) return res.status(400).json({ error: 'Ism 2–100 belgidan iborat bo‘lsin' });
      patch.name = req.body.name.trim();
    }
    if (Object.hasOwn(req.body, 'phone')) {
      const phone = normalizePhone(req.body.phone);
      if (!phone) return res.status(400).json({ error: 'Telefon raqami noto‘g‘ri' });
      patch.phone = phone;
    }
    if (Object.hasOwn(req.body, 'dateOfBirth')) {
      try { patch.dateOfBirth = parseBirthday(req.body.dateOfBirth); }
      catch (error) { return res.status(400).json({ error: error.message }); }
    }
    const now = new Date();
    const cutoff = new Date(now.getTime() - PROFILE_LOCK_MS);
    const user = await User.findOneAndUpdate({
      _id: req.user._id,
      status: 'ACTIVE',
      $or: [{ lastProfileEditAt: null }, { lastProfileEditAt: { $exists: false } }, { lastProfileEditAt: { $lte: cutoff } }],
    }, { $set: { ...patch, lastProfileEditAt: now } }, { new: true, runValidators: true });
    if (!user) {
      const latest = await User.findById(req.user._id).select('lastProfileEditAt');
      return res.status(429).json({ error: 'Profil ma’lumotlarini faqat 30 kunda bir marta o‘zgartirish mumkin',
        nextEditAt: latest?.lastProfileEditAt ? new Date(latest.lastProfileEditAt.getTime() + PROFILE_LOCK_MS) : null });
    }
    res.json({ user: publicUser(user), nextEditAt: new Date(now.getTime() + PROFILE_LOCK_MS) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Bu telefon raqami boshqa akkauntga ulangan' });
    next(error);
  }
});

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempRoot),
    filename: (_req, _file, cb) => cb(null, randomUUID() + '.tmp'),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('avatar');

function getAvatarExtension(buffer, mime) {
  if (mime === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (mime === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (mime === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

router.post('/avatar', requireAuth, editLimiter, (req, res, next) => {
  avatarUpload(req, res, async error => {
    if (error) {
      if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Avatar 5 MB dan oshmasin' : 'Rasmni yuklab bo‘lmadi' });
    }
    if (!req.file) return res.status(400).json({ error: 'Avatar faylini tanlang' });
    let destination;
    try {
      const handle = await fs.open(req.file.path, 'r');
      const buffer = Buffer.alloc(16);
      try { await handle.read(buffer, 0, 16, 0); }
      finally { await handle.close(); }
      const extension = getAvatarExtension(buffer, req.file.mimetype);
      if (!extension) return res.status(400).json({ error: 'Faqat JPG, PNG yoki WebP rasm qabul qilinadi' });
      const filename = randomUUID() + extension;
      destination = path.join(avatarRoot, filename);
      await fs.rename(req.file.path, destination);
      const avatar = `/api/auth/avatars/${filename}`;
      const previous = req.user.avatar;
      const user = await User.findByIdAndUpdate(req.user._id, { $set: { avatar } }, { new: true });
      if (!user) { await fs.unlink(destination).catch(() => {}); return res.status(404).json({ error: 'Akkaunt topilmadi' }); }
      if (previous && previous.startsWith('/api/auth/avatars/')) {
        const oldFile = path.basename(previous);
        if (/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(oldFile) && oldFile !== filename) {
          await fs.unlink(path.join(avatarRoot, oldFile)).catch(() => {});
        }
      }
      res.json({ user: publicUser(user) });
    } catch (uploadError) {
      if (destination) await fs.unlink(destination).catch(() => {});
      next(uploadError);
    } finally { await fs.unlink(req.file.path).catch(() => {}); }
  });
});

// The route exposes only validated, randomly named image files.
router.get('/avatars/:filename', async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(req.params.filename)) return res.sendStatus(404);
    const imagePath = path.join(avatarRoot, req.params.filename);
    await fs.access(imagePath);
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Content-Type-Options', 'nosniff');
    return res.sendFile(imagePath);
  } catch (error) {
    if (error.code === 'ENOENT') return res.sendStatus(404);
    next(error);
  }
});

export default router;
