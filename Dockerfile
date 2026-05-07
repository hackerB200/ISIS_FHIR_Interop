# ============================================================
# STAGE 1 — Build Angular
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npx ng build --configuration=production

# ============================================================
# STAGE 2 — Serve avec Nginx
# ============================================================
FROM nginx:alpine

# Config Nginx pour Angular (SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie du build
COPY --from=builder /app/dist/grey-sloan-rh/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
