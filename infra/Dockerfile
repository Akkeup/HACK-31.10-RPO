# infra/Dockerfile: Production offline Linux container for Discovery Server
FROM postgres:latest AS builder
USER root
RUN sed -i 's|http://deb.debian.org/debian|http://mirror.yandex.ru/debian|g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends rustc
WORKDIR /build
COPY apps/ apps/
COPY services/ services/
COPY assets/ assets/
RUN rustc --edition 2021 --crate-type bin -O -o discovery-server apps/server/src/main.rs

FROM postgres:latest
USER root
WORKDIR /app
COPY --from=builder /build/discovery-server /app/discovery-server
COPY assets/ /app/assets/
EXPOSE 8080
ENTRYPOINT ["/app/discovery-server"]
