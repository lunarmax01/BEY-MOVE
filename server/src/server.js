import 'dotenv/config';

import dns from 'node:dns';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import helmet from 'helmet';

import premium from './routes/premium.js';
import auth from './routes/auth.js';
import movies from './routes/movies.js';
import admin from './routes/admin.js';
import social from './routes/social.js';
import Category from './models/Category.js';

// Atlas SRV DNS kerak bo‘lsa .env orqali DNS resolver sozlanadi.
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map(s => s.trim()));

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bey_movi';
const port = Number(process.env.PORT) || 5001;
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
  throw new Error('SESSION_SECRET kamida 32 belgidan iborat bo‘lishi kerak');

app.disable('x-powered-by');
// VPS reverse proxy (Nginx) ortida HTTPS sessiya cookies uchun.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(session({
  name: 'bey.sid', secret: process.env.SESSION_SECRET,
  resave: false, saveUninitialized: false,
  store: MongoStore.create({ mongoUrl }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400000 },
}));
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== clientUrl) return res.status(403).json({ error: 'So‘rov manbasi ruxsat etilmagan' });
  next();
});
app.use('/api/premium', premium);
app.use('/api/auth', auth);
app.use('/api/movies', movies);
app.use('/api/admin', admin);
app.use('/api/social', social);
app.get('/api/categories', async (_req, res, next) => {
  try { res.json({ categories: await Category.find({ published: true }).sort({ order: 1 }) }); }
  catch (error) { next(error); }
});
app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API topilmadi' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.code === 11000 ? 409 : 500).json({ error: error.code === 11000 ? 'Bu ma’lumot mavjud' : 'Serverda xatolik yuz berdi' });
});
const builtInPages = [['kino', 'Kino'], ['serial', 'Serial'], ['anime', 'Anime'], ['multfilm', 'Multfilm'], ['kattalar', 'Kattalar (18+)']];
async function initializePages() {
  for (let index = 0; index < builtInPages.length; index++) {
    const [slug, name] = builtInPages[index];
    await Category.updateOne({ slug }, { $setOnInsert: { name, slug, builtIn: true, order: index, published: true, navVisible: true } }, { upsert: true });
  }
}
async function startServer() {
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 15000 });
    console.log('MongoDB ulandi');
    await initializePages();
    app.listen(port, () => console.log(`BEY MOVI API http://localhost:${port}`));
  } catch (error) {
    console.error('MongoDB ulanish xatosi:', error.message);
    process.exit(1);
  }
}
startServer();
