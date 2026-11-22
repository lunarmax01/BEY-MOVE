# BEY MOVI — boshlang‘ich full-stack loyiha

BEY MOVI V3.0 spetsifikatsiyasi bo‘yicha **qisman amalga oshirilgan** loyiha. Bu versiya yakuniy enterprise platforma emas.

## Talablar
- Node.js 20+ va npm
- MongoDB Community Server (mahalliy xizmat ishlayotgan bo‘lishi kerak)

## Windows 11 da ishga tushirish
1. Loyiha papkasida terminal oching.
2. `npm install`
3. `server/.env.example` faylidan `server/.env` nusxa yarating.
4. `.env` da `SESSION_SECRET` uchun kamida 32 ta tasodifiy belgi belgilang va MongoDB URL ni tekshiring.
5. `npm run dev` ni bajaring.
6. Sayt: http://localhost:5173 ; API: http://localhost:5000/api/health

## Super Admin yaratish
`server/.env` faylida `ADMIN_EMAIL`, `ADMIN_PASSWORD` (kamida 12 belgi) va `ADMIN_PHONE` (foydalanilmagan raqam) ni kiriting. Keyin loyiha asosiy papkasida `npm run seed:admin` ni bajaring. Admin email/paroli hech qachon kodga yozilmaydi. Admin oddiy `/signin` dan kiradi, so‘ng `/admin` ni ochadi.

## Hozir kodda mavjud
- Qora-qizil, responsive React dizayn, 10 soniyalik intro va Skip, animatsiyali logo
- Bosh sahifa, bo‘limlar, qidiruv, kino tafsilotlari
- MongoDB: foydalanuvchilar, filmlar va kategoriyalar modellari
- Sessiya asosida signup/signin/logout, BEY ID, profil va ID nusxalash
- Adminni CLI orqali yaratish, admin dashboard (asosiy sonlar), kino qoralamasi yaratish/nashr qilish
- Ommaviy katalogda faqat e’lon qilingan va yosh cheklovi bo‘lmagan filmlar
- Autentifikatsiya, Premium va yosh chegarasini serverda tekshiradigan mahalliy MP4 Range stream kodi

## Hali ishlanmagan / yakunlanmagan
- Video yuklash interfeysi va media-faylni DBga biriktirish
- To‘liq yoshni tasdiqlash, serial epizodlari va HLS
- Izohlar, reytinglar, layklar, tomosha tarixi, notification
- Telegram botdagi interaktiv tasdiqlash, avtomatik bank to‘lovlari (lekin chek yuborish va admin paneldagi tasdiqlash V3.1 da qo‘shildi)
- Keng admin boshqaruvi, grafiklar, vizual sahifa muharriri, testlar
- CSRF himoyasini ishlab chiqarish darajasiga yetkazish, kuchli production security audit

**Ogohlantirish:** `npm install` va real MongoDB bilan runtime testi bu muhitte amalga oshirilmadi. To‘liq integratsiya testlaridan oldin production serverga chiqarmang. Videoni faqat qonuniy ruxsat bilan tarqating.

## V3.1 yangilanish — chek orqali Premium va animatsiyalar

**Qo‘shildi:** Profil ichida narxli 7 kun / 1 oy / 3 oy / 1 yil tariflari, administrator boshqaradigan UZCARD/HUMO raqam va karta egasi, karta raqamini nusxalash, JPG/PNG/WEBP/PDF chek yuklash (5 MB), MongoDB saqlanadigan PENDING so‘rov, Telegram botga chek yuborishga urinish, admin uchun cheklar ro‘yxati va shaxsiy chekni ko‘rish, tasdiqlash/rad etish, tasdiqlanganda Premium muddatini hisoblash, audit yozuvi. Har bir sahifa uchun fade / y-slide / blur bilan kirish-chiqish animatsiyalari; reduced motion rejimi hisobga olinadi.

### Birinchi marta sozlash
1. Eski loyihangizdagi `server/.env` faylini saqlab qoling. Yangi ZIP dan fayllarni almashtiring, lekin shaxsiy `.env` ma'lumotlarni yangisi bilan ustidan yozmang.
2. `.env` ichiga `RECEIPT_DIR=./server-private-receipts` qo‘shing (server papkadan tashqariga ochiq URL berilmaydi).
3. Ixtiyoriy Telegram bildirishnomalari uchun `TELEGRAM_BOT_TOKEN` va `TELEGRAM_ADMIN_CHAT_ID` to‘ldiring. Botga administrator avval `/start` yuborishi kerak. Bot faol bo‘lmasa ham Premium so‘rovi admin panelida saqlanadi. Botni tasdiqlash tugmalari orqali avtomatik faollashtirish amalga oshirilmagan: xavfsizlik uchun administrator sayt admin panelidan tekshiradi.
4. `npm install`, `npm run dev`. `npm run seed:admin` faqat oldin admin yaratilmagan bo‘lsa ishlatiladi.
5. Admin bo‘lib kiring → `/admin` → "Premium va to‘lov sozlamalari" → karta va tarif narxlarini kiriting → saqlang.
6. Oddiy foydalanuvchi `/profile` sahifasida tarifni tanlaydi, kartaga pul o‘tkazadi, chek yuklaydi.
7. Admin `/admin` → "To‘lov so‘rovlari" bo‘limida chekni ko‘radi, **bank ilovasida pul kelganini mustaqil tekshiradi** va tasdiqlaydi yoki rad etadi.

To‘lovlar avtomatik olinmaydi; karta raqami ko‘rsatish bank to‘lov integratsiyasi emas. Telegram bot sozlanmagan yoki xabar yuborilmagan bo‘lsa chek admin panelida saqlanadi. **Chek haqiqiy to‘lovni isbotlamaydi.** Tasdiqlashdan oldin bankdan tekshiring.

### Cheklovlar
- Dasturiy kod tekshirildi, ammo bu muhitda npm paketlarini o‘rnatish tugamadi va to‘liq React build / MongoDB + Telegram bilan integratsion sinovlar bajarilmadi. Mahalliy serverda sinab ko‘ring.
- Production darajasidagi atomik Premium tranzaksiyalar va to‘lovni qayta ishlash uchun MongoDB transaction / reconciliation mexanizmlari kerak; bu versiya sinov uchun, haqiqiy mijozlarga ochishdan oldin security audit talab qilinadi.
- Oldingi starterdagi hali ishlanmagan izoh, reyting, vizual muharrir va video upload funksiyalari ham bu iteratsiyada qo‘shilmadi.
- `SESSION_SECRET` chatda ulashilgan bo‘lsa uni almashtiring. `.env` ni hech qachon Gitga yuklamang.
