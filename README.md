# ديلفري أبو الذوذ (AbuElZoz Delivery)

MVP قابل للتوسع لتطبيق توصيل طلبات (مطاعم/متاجر ← عملاء عبر سائقين).

## هيكل النظام (Architecture)

```
┌─────────────────┐         ┌──────────────────────────┐
│  React Frontend  │◄──────►│   Express API             │
│  (Customer/Rest./│  REST + │   routes → services       │
│   Driver views)  │ Socket  │   (order/driver/auth)     │
└─────────────────┘  .io    └─────────┬────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
             │ PostgreSQL  │    │    Redis    │    │ Socket.io   │
             │ (Prisma ORM)│    │ GEO + cache │    │(live track.)│
             │             │    │ + refresh   │    │             │
             │             │    │   tokens    │    │             │
             └─────────────┘    └─────────────┘    └─────────────┘
```

المشروع npm workspace فيه 3 حزم:

- **`backend/`** — Express API (routes رفيعة → services فيها منطق الأعمال)
- **`frontend/`** — React + Vite + Tailwind
- **`shared/`** — مصدر واحد للحقيقة: enum حالات الطلب، الـ state machine، وأنواع الـ DTOs المشتركة بين الطرفين

**لماذا modular monolith مش microservices؟** الحمل المتوقع في البداية محدود، وأي module (auth, orders, drivers) منظم بشكل يسهل فصله لخدمة مستقلة لاحقًا لو احتاج الأمر.

## تدفق الطلب وstate machine

الانتقال بين حالات الطلب مش حر — كل حالة محددلها مين يقدر ينقلها لأنهي حالة تالية
(`shared/src/orderStatus.ts` → `ALLOWED_TRANSITIONS`). مثلاً DRIVER مش يقدر يرجّع طلب
لـ `PENDING`، وRESTAURANT مش يقدر يقفز من `PREPARING` لـ `DELIVERED` مباشرة. أي محاولة
مخالفة بترجع `422` من `order.service.ts`.

عند وصول الحالة لـ `READY_FOR_PICKUP`، السيرفر بيدوّر تلقائيًا عن أقرب سائق متاح عبر
**Redis GEO** (`GEOSEARCH`) بدل ما يعمل scan كامل لكل السائقين في Postgres.

## نقاط الأداء والصيانة اللي اتصلحت

| المشكلة الأصلية | الحل |
|---|---|
| scan كامل للسائقين على كل طلب | Redis GEO (`GEOADD`/`GEOSEARCH`) — O(log n) |
| مفيش pagination على القوائم | `page`/`pageSize` على `/restaurants` و`/orders` |
| مفيش indexes على أعمدة بتتفلتر باستمرار | `@@index` على status/customerId/isAvailable/city |
| Redis متوفر ومش مستخدم | caching لقائمة المطاعم (TTL قابل للتهيئة) |
| تحديثات موقع السائق بتغرق الـ socket | throttling كل 2 ثانية لكل طلب |
| refresh tokens ما بتتلغيش عند logout | تخزينها في Redis + إبطال فعلي + rotation |
| console.log بدل logging منظم | `pino` + `pino-http` |
| مفيش تحقق من متغيرات البيئة عند الإقلاع | `validateEnv()` بيوقف السيرفر فورًا لو ناقص secret |
| صفر اختبارات | Vitest — state machine + auth utils |
| Dockerfile مش multi-stage | صورة إنتاج أصغر، devDependencies مش متضمنة |
| عنوان توصيل هارد-كودد في الكود | `addresses.routes.ts` + صفحة إضافة عنوان حقيقية |
| صلاحيات الـ frontend بتتحقق من تسجيل الدخول بس | `ProtectedRoute` بيتحقق من الـ role كمان |

## التشغيل محليًا

```bash
# 1. انسخ متغيرات البيئة
cp backend/.env.example backend/.env

# 2. ثبّت الحزم (من الجذر — workspace واحد لكل الحزم التلاتة)
npm install

# 3. شغّل قواعد البيانات
docker-compose up postgres redis -d

# 4. جهّز قاعدة البيانات
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
npm run seed --workspace=backend
# بيانات تجريبية: owner@abuelzoz.com / driver@abuelzoz.com / customer@abuelzoz.com (password123)

# 5. شغّل الباك اند والفرونت اند
npm run dev:backend
npm run dev:frontend   # في تيرمينال تاني
```

- Backend: http://localhost:4000
- Frontend: http://localhost:5173

### تشغيل الاختبارات

```bash
npm run test:backend
```

### تشغيل كل حاجة بـ Docker

```bash
docker-compose up --build
```

## اللي لسه محتاج شغل قبل الإنتاج الفعلي

- [ ] بوابة دفع حقيقية (حاليًا الطلب بيتقبل بدون دفع فعلي)
- [ ] رفع صور المنتجات (S3/Cloudinary) بدل imageUrl كنص
- [ ] خرائط فعلية (Google Maps/Mapbox) بدل إحداثيات ثابتة في `AddAddress.tsx`
- [ ] Redis Streams/Pub-Sub adapter لـ Socket.io لو شغّلت أكتر من instance للباك اند
- [ ] CI/CD pipeline
- [ ] اختبارات integration (مش unit بس) تحتاج قاعدة بيانات test فعلية
- [ ] جدول تسعير ديناميكي بدل `DELIVERY_BASE_FEE` الثابت
