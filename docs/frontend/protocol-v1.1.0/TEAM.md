# Работа двух разработчиков — 1.1

Backend владеет apps/server, services/ai, infra, миграциями, закрытыми учебными пакетами и docs/backend. Реализует auth, симуляцию, атомарные места, teacher material, quiz attempts, competition lobbies/rounds, aura/escrow/ledger, recovery и PostgreSQL. Frontend владеет apps/client, визуальными ассетами и docs/frontend: первое лицо, Pointer Lock, seating camera, обучающие панели, quiz/competition UI, приватный кошелёк, общий адаптер, Three.js ресурсы. Каждый сохраняет существующую структуру своей части.

Общие схемы, OpenAPI/AsyncAPI и версия согласуются обоими. Параллельные этапы: (1) backend публикует контракты/пакеты, frontend подключает mock и камеру; (2) backend lesson/quiz/seat, frontend две роли NPC и проверка; (3) backend aura/lobby/round/settlement, frontend стол/готовность/ответы/итог; (4) совместно reconnect, гонки, Windows HTTPS/WSS и офлайн LAN 2–5 клиентов.

Backend не генерирует случайный учебный текст вместо зафиксированного материала. Frontend не решает правильность/баллы/выплаты, не включает ключи в build и не занимает место до подтверждения. Приёмка разделяет mock, backend runtime, браузер/GPU и LAN. Этот комплект не меняет репозиторий.
