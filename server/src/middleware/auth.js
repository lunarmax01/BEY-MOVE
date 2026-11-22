import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    if (!req.session?.userId) return res.status(401).json({ error: 'Davom etish uchun tizimga kiring' });
    const user = await User.findById(req.session.userId);
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'Sessiya yaroqsiz' });
    req.user = user;
    next();
  } catch (error) { next(error); }
}

export function requireAdmin(req, res, next) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)) return res.status(403).json({ error: 'Ruxsat yo‘q' });
  next();
}

export function publicUser(user) {
  return {
    id: user._id, publicId: user.publicId, name: user.name,
    email: user.email, phone: user.phone, role: user.role,
    createdAt: user.createdAt, premiumUntil: user.premiumUntil,
    dateOfBirth: user.dateOfBirth, avatar: user.avatar || '',
    lastProfileEditAt: user.lastProfileEditAt || null,
  };
}

export function isAdult(user) {
  if (!user?.dateOfBirth) return false;
  const now = new Date();
  const birth = new Date(user.dateOfBirth);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 18;
}
