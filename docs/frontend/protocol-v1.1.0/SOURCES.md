# Основание и источники

Продуктовые решения: исходный чат «Промпты для хакатона», conversationId 6ae59792-4cc8-83ed-a9c2-02ded3f9ee81; прочитан при подготовке. Сохранены два разработчика, Rust/Axum/PostgreSQL 18, JavaScript/Three.js, Windows Docker, офлайн LAN, авторитетный сервер, 2–5 игроков и консервативный лимит кеша. Точные endpoint, схемы, TTL, тикрейт и ограничения очередей спроектированы для этого выпуска и не выдаются за ранее согласованный код.

Проверенные первичные технические источники (31 октября 2026):

- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12 — диалект и поведение схем; format проверяется явно валидатором.
- OpenAPI 3.1.1: https://spec.openapis.org/oas/v3.1.1.html — HTTP description и JSON Schema совместимость.
- AsyncAPI 3.0.0: https://www.asyncapi.com/docs/reference/specification/v3.0.0 — send/receive с точки зрения приложения и multi-format schemas.
- Axum WebSocketUpgrade: https://docs.rs/axum/latest/axum/extract/struct.WebSocketUpgrade.html — features ws, ограничения размера и выбор subprotocol. Реализация должна закрепить Cargo.lock; спецификация не требует плавающий latest.
- PostgreSQL 18: https://www.postgresql.org/docs/18/ — целевой major. Patch не выбран в этом комплекте.
- Docker WSL 2 backend: https://docs.docker.com/desktop/features/wsl/ — Windows с Linux containers.
- Caddy tls: https://caddyserver.com/docs/caddyfile/directives/tls — offline сертификаты и internal CA.

Тексты стандартов и документаций в архив не скопированы; для работы валидатора ссылки не нужны. Диалекты версий выбраны явно, независимо от того, какой latest выпущен после даты подготовки.


Version 1.1 is based on the subsequent user requirements in this chat: first-person gameplay, teacher/examiner NPCs, fixed learning modules, quizzes, player competition table and aura stakes. The accepted combined developer prompt supplies the defaults: 5 questions, pass score 4, 20-second competitive rounds, initial aura 100 and refund-all on a tied best score. No new third-party APIs or dependencies were added.
