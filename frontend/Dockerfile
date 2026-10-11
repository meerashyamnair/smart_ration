FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared ./shared
COPY frontend ./frontend

RUN npm ci
RUN npm run build --workspace=shared
RUN npm run build --workspace=frontend

FROM nginx:alpine AS runner
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
