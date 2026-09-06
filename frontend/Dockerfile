# build context = جذر المشروع عشان يوصل لـ shared package
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/package.json
COPY shared ./shared
RUN npm install --workspace=frontend --workspace=shared --include-workspace-root
COPY frontend ./frontend
RUN npm run build --workspace=frontend

FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/frontend/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
