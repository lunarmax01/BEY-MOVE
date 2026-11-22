# BEY MOVI V3.5 — Home Slider

## O'zgargan / yangi fayllar

- `client/src/App.jsx` — avvalgi App.jsx asosida HomeSlider va SliderManager ulangan.
- `client/src/HomeSlider.jsx` — yangi slayder va admin tanlash interfeysi.
- `client/src/HomeSlider.css` — slayder dizayni, telefon uchun moslashuv.
- `server/src/routes/admin.js` — admin uchun GET va PUT `/api/admin/home-slider`.
- `server/src/routes/movies.js` — barcha foydalanuvchilar uchun GET `/api/movies/home-slider`.
- `server/src/models/HomeSlider.js` — MongoDB'da slayder tartibi.
- `server/src/models/Movie.js` — mavjud model bilan bir xil, o'zgartirish shart emas.

## O'rnatish

1. Eski `bey-movi` loyihasining zaxirasini yarating.
2. ZIP ichidagi `client` va `server` papkalaridagi fayllarni loyiha papkasiga aynan shu yo'llar bilan qo'ying. `server/src/server.js`, `.env`, `uploads`, boshqa route'lar va Premium fayllarini o'chirmang.
3. `cd C:\Users\001\Desktop\bey-movi`
4. `npm install`
5. `npm run dev`
6. Admin sifatida `http://localhost:5173/admin` ni oching va **Bosh sahifa slideri** bo'limiga o'ting.
7. Nashr qilingan 18+ bo'lmagan kinolardan maksimal 7 ta tanlang, tartibini o'zgartiring, **Slayderni saqlash** tugmasini bosing.
8. Bosh sahifani yangilang. Slaydlar 6 soniyada avtomatik almashadi, sichqoncha ustida tursa yoki fokus bo'lsa to'xtaydi.

## Muhim

- Sliderga faqat `published:true` va `ageRestricted:false` bo'lgan kinolar kiradi. Bu bosh sahifada yoshga cheklangan rasmlar ko'rinib qolmasligi uchun.
- Kinoning banneri bo'lmasa, posteri ishlatiladi. Banner uchun 16:9 format tavsiya etiladi.
- Ilgari `featured` belgilangan kinolar avtomatik sliderga qo'shilmaydi; yangi boshqaruv panelida tanlash kerak.
- Sliderga hech kino qo'shilmasa, avvalgi BEY MOVI hero banneri ko'rinadi.
- Admin kirish huquqi mavjud `requireAuth` va `requireAdmin` middleware orqali himoyalangan.
- Yangi kodlar statik sintaksis tekshiruvidan o'tgan, ammo foydalanuvchining lokal MongoDB/React muhiti bilan to'liq jonli sinov o'tkazilmagan.
