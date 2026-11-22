import 'dotenv/config';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
import 'dotenv/config'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs'; import { randomBytes } from 'node:crypto'; import User from '../models/User.js';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(), password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12 || password === 'REPLACE_WITH_STRONG_PASSWORD') throw new Error('ADMIN_EMAIL va kuchli ADMIN_PASSWORD (.env) kiriting');
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bey_movi');
try { if (await User.exists({ email })) throw new Error('Bu email mavjud. Xavfsizlik uchun mavjud akkaunt roli avtomatik o‘zgartirilmaydi'); const user = await User.create({ publicId: 'BEY-' + randomBytes(5).toString('hex').toUpperCase(), name: 'BEY MOVI Admin', email, phone: process.env.ADMIN_PHONE || '+998900000001', passwordHash: await bcrypt.hash(password, 12), role: 'SUPER_ADMIN' }); console.log('Super admin yaratildi:', user.email) } finally { await mongoose.disconnect() }
