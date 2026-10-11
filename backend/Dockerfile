FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared ./shared
COPY backend ./backend

RUN npm ci
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

EXPOSE 5000
CMD ["npm", "run", "start", "--workspace=backend"]
