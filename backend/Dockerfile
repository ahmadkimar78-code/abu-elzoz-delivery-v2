# ملحوظة: هذا الـ Dockerfile لازم يتبنى بـ build context = جذر المشروع (مش backend/)
# عشان يقدر ياخد الـ shared package. راجع docker-compose.yml لطريقة الاستدعاء الصحيحة.

# ---- مرحلة البناء: فيها devDependencies وأدوات الـ build بس ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/package.json
COPY shared ./shared
RUN npm install --workspace=backend --workspace=shared --include-workspace-root
COPY backend ./backend
RUN npx prisma generate --schema=./backend/prisma/schema.prisma
RUN npm run build --workspace=backend

# ---- مرحلة الإنتاج: production dependencies بس، صورة أصغر بكتير ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/package.json
COPY shared ./shared

RUN npm install --workspace=backend --workspace=shared --omit=dev --include-workspace-root
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/prisma ./backend/prisma
RUN npx prisma generate --schema=./backend/prisma/schema.prisma

EXPOSE 4000
CMD ["node", "backend/dist/index.js"]

