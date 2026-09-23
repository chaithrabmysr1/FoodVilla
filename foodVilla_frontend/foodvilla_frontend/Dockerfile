# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
# Vite inlines VITE_* vars at build time — must be a browser-reachable URL,
# never a Docker-internal hostname (see docker-compose.yml's "web" service).
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine
COPY --from=build /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
