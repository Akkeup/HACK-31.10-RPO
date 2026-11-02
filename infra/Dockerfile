# Reproducible offline runtime image. Network access is required only while
# pulling base images/installing the frontend dependencies; the final service
# serves all browser assets and talks only to the private PostgreSQL/LLM hosts.
FROM node:22-bookworm-slim AS frontend
WORKDIR /build/apps/client
COPY apps/client/package.json apps/client/package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/client/ ./
RUN npm run build:real

FROM rust:1.85-slim-bookworm AS server-builder
WORKDIR /build
COPY apps/server/ apps/server/
COPY assets/ assets/
RUN rustc --edition 2021 -C debuginfo=0 -O -o discovery-server apps/server/src/main.rs

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=server-builder /build/discovery-server /app/discovery-server
COPY assets/ /app/assets/
COPY --from=frontend /build/apps/client/dist /app/apps/client/dist
EXPOSE 8080
ENTRYPOINT ["/app/discovery-server"]
