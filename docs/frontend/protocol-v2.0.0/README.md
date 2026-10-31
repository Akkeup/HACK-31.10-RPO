# Discovery Protocol 2.0.0 — читальный зал

Комплект согласованных спецификаций для JavaScript/Three.js frontend и Rust/Axum/PostgreSQL18 backend. Окружение: полки и книги, NPC-преподаватели, столы с тетрадями для письменной проверки, центральный круглый стол для соревнований 2–5 игроков с аурой.

Frontend сейчас автономный: локальные заглушки библиотеки, флагов, ответов NPC и виртуальных участников, без backend/LLM/БД. Позже mock заменяется сетевым адаптером тех же сообщений. Имеющийся у команды реальный датасет флагов не скачивается повторно, не изменяется и в этот ZIP не включён.

## Быстрый старт

Нужен установленный Node.js22+. Зависимости включены, npm install и интернет не нужны.

- `npm test` — схемы всех версий, fixtures, семантика и mock replay.
- `node mock/demo.mjs` — демонстрация книги, письменного теста, ухода/возврата, страны и соревнования.
- `node tools/validate.cjs --schema answer --file path/to/answer.json` — отдельное текущее сообщение/объект.

Читать: docs/FRONTEND.md, docs/BACKEND.md, docs/GAMEPLAY_V2.md, docs/MIGRATION_2.0.md. openapi.yaml/json описывает34 HTTP-операции, asyncapi.yaml/json —45 событий. Первичные текущие схемы — schemas/v2.0.0. Старые schemas/v1.0.0 и schemas/v1.1.0 и их fixtures сохранены без изменений; старые тексты — docs/legacy-v1.1 и вложенные архивы.

## Текущее содержимое

- docs/KNOWLEDGE.md: знания/источники/публикация и инструкция учителю по стране.
- docs/ASSETS.md: список моделей, placeholders и замена готовыми GLB.
- docs/HTTP_API.md, WEBSOCKET.md, AUTH.md, CONFIG.md, PERSISTENCE.md: общий контракт.
- docs/ACCEPTANCE.md и VALIDATION.md: приёмка реализации и реально выполненные проверки комплекта.
- fixtures/v2.0.0: текущие примеры, синтетический флаг и вымышленная страна, книги, письменные вопросы, private content, попытки и финансовые исходы.
- mock/core.mjs: единый JS адаптер для Node и браузера; mock/questions.json содержит только демонстрационные ключи, запрещён в production client build.
- SHA256SUMS: контрольные суммы всех файлов.

Версия major2 выбрана из-за нового tagged answer, письменных вопросов и изменения quiz.leave с прерывания на suspended. HTTP /api/v2, WSS discovery.v2, protocolVersion=2.0.0. Игра в LAN остаётся offline, с HTTPS/WSS и Windows Docker; эти сервисы/художественные модели в ZIP не включены. Репозиторий игры не изменялся.
