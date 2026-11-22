# BEY MOVI V3.7 — Vercel + VPS ishlab chiqarish konfiguratsiyasi

## ZIP tekshiruv natijasi

Manba arxivda React/Vite client, Express/MongoDB server, User/Movie/Comment/Review modellari, auth/admin/premium/social routes va npm workspaces bor. `client/vercel.json` yo‘q edi. `server/src/server.js` Nginx ortida HTTPS uchun `trust proxy` ishlatmagan. Bu paket **shu ikki kamchilikni tuzatadi**, `.env.example`ni amaldagi port va 5 GB limitga moslashtiradi; `.git/` va maxfiy fayllarni ZIPga qo‘shmaydi.

## 1. Frontend Vercel — HOZIRDAN

- GitHub repoga fayllarni yuboring.
- Vercel loyiha Settings -> Build & Deployment -> Root Directory: `client`. Framework: `Vite`; Build Command: `npm run build`; Output Directory: `dist`.
- `client/vercel.json` BrowserRouter uchun `/signup`, `/profile`, `/movie/...` deep link 404 xatosini tuzatadi.
- Vercel Deployments -> Redeploy yoki Git push orqali qayta deploy qiling.
- **Bu bosqichda `/api` hali ishlamaydi**: frontend kodi `/api`ga murojaat qiladi, VPS bilan proxy sozlash majburiy.

## 2. VPS'da Express backend

- Ubuntu VPS'da Node.js 22+, nginx, certbot va PM2 o‘rnating; foydalanuvchiga tegishli loyihani `/var/www/bey-movi` ga joylashtiring.
- Loyiha ildizida `npm ci`; `server/.env`ga `deploy/backend.env.template` namunasi bo‘yicha HAQIQIY qiymatlarni yozing. `.env`ni hech qachon GitHubga yubormang.
- Atlas Network Access: VPS public IP; Atlas connection string Atlas Connect -> Drivers oynasidan oling.
- `UPLOAD_DIR=./uploads` va `RECEIPT_DIR=./server-private-receipts` diskda yoziladigan, zaxiralanadigan papkalar bo‘lishi kerak. MongoDB Atlas video fayllarni avtomatik saqlamaydi.
- `node src/server.js` ni **server papkasi ichida** ishga tushirib test qiling. So‘ng PM2 ishlating; `deploy/ecosystem.config.cjs` ichidagi `cwd`ni moslang.
- `deploy/nginx-api.example.conf` ni Nginxga moslab (domain bilan) ko‘chiring. HTTPS uchun certbot bilan sertifikat oling. `https://api.YOURDOMAIN/api/health` JSON qaytarishini tekshiring.
- Productionda `NODE_ENV=production`: `server/src/server.js` `trust proxy` sozlamasini qo‘yadi va `secure` session cookie ishlaydi; `X-Forwarded-Proto` Nginx tomonidan uzatiladi.

## 3. Vercel `/api` ni VPSga ulash — backend tayyor bo‘lgandan KEYIN

- `deploy/vercel-with-backend.example.json` namunasidagi `api.YOUR-DOMAIN.example`ni real HTTPS backend domeniga almashtiring.
- Shu fayl tarkibini `client/vercel.json` ichiga qo‘ying (namuna faylning o‘zini Vercel avtomatik ishlatmaydi).
- Rewrite ketma-ketligi muhim: `/api/:path*` birinchi, SPA `/(.*)` ikkinchi.
- GitHubga push -> Vercel redeploy.
- `https://bey-move.vercel.app/api/health` javobi JSON `{ "ok": true, "database": "connected" }` bo‘lishi kerak. HTML qaytsa `/api` proxy ishlamayapti.
- Brauzerda `/signup`, `/signin`, `/profile`, `/movie/...`, `/favorites`, Premium, comment/ratinglarni sinab ko‘ring.

## 4. Katta MP4 haqida

- Bu loyiha videoni server lokal diskiga yozadi. 5 GB upload uchun Nginx va Multer limiti, disk bo‘sh joyi va timeoutlar mos bo‘lishi kerak.
- 5 GB fayllarni Vercel rewrite orqali o‘tkazish platforma/network cheklovlaridan o‘tadi deb kafolatlab bo‘lmaydi. Katta videolar uchun VPSga bevosita admin upload yoki multipart/object-storage yechimi tavsiya etiladi.

## 5. Nima *qilinmagan*

- Haqiqiy VPS domeni, GitHub/Vercel credential va maxfiy environment qiymatlari siz taqdim etmaganingiz uchun live deploy bajarilmagan.
- MongoDBda real sign-up, video upload, payment cheklari bo‘yicha end-to-end test qilinmagan.
- `.git` tarixini tozalash qilinmagan; ZIPdan `.git` chiqarib tashlangan. Ilgari oshkor bo‘lgan tokenlarni yangilang.

## Tekshiruv komandalar

```powershell
cd C:\Users\001\Desktop\bey-movi
node --check .\server\src\server.js
npm run build
git status --short
git add .
git commit -m "Fix Vercel SPA routing and VPS session proxy"
git push origin main
```
