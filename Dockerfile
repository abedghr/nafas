# Nafas — single image = Express API + Expo web (PWA), served together.
# Host-agnostic. Build with the public URL baked into the web bundle:
#   docker build --build-arg EXPO_PUBLIC_API_URL=https://<your-domain> -t nafas .
# (or just `docker compose -f docker-compose.prod.yml up -d --build`)

# ---- deps (all deps; devDeps needed for expo export + esbuild + one-off drizzle) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
COPY patches ./patches
RUN npm ci --no-audit --no-fund

# ---- build: web export (PWA) + server bundle ----
FROM deps AS build
WORKDIR /app
COPY . .
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
# Expo web SPA → dist/, then inject PWA manifest + iOS home-screen meta
RUN npx expo export -p web --output-dir dist && node scripts/pwa-postexport.js
# Bundle the server (ESM); mark output as an ES module for node
RUN npm run server:build && printf '{"type":"module"}' > server_dist/package.json

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5001
COPY --from=deps  /app/node_modules      ./node_modules
COPY --from=build /app/dist              ./dist
COPY --from=build /app/server_dist       ./server_dist
COPY --from=build /app/assets            ./assets
COPY --from=build /app/migrations        ./migrations
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/server/templates  ./server/templates
COPY package*.json ./
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p uploads
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["./entrypoint.sh"]
