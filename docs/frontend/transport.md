# Discovery Protocol 1.1.0: интеграция

Источник — переданный пользователем `Discovery-Protocol-v1.1.0.zip`. HTTP `/api/v1`, subprotocol `discovery.v1`, protocolVersion `1.1.0`; каждый HTTP-запрос, кроме bootstrap/health/WS-upgrade, передаёт `X-Discovery-Protocol: 1.1.0`. Wire-форматы совпадают с новым архивом. Неизменённые схемы 1.0.0 сохранены рядом. Схемы в `apps/client/src/protocol/v1.1.0` побайтно совпадают с архивом (проверяются тестом). Копия OpenAPI, AsyncAPI и нормативных документов: [protocol-v1.1.0](protocol-v1.1.0/PROTOCOL_RULES.md).

## Переключение на Rust

Скопировать `.env.example` в `.env.local`:

```dotenv
VITE_TRANSPORT=real
DISCOVERY_BACKEND_URL=http://127.0.0.1:8080
VITE_SESSION_ID=
```

Перезапустить Vite. DISCOVERY_BACKEND_URL используется только dev proxy `/api`, включая WS; в browser bundle этот адрес не включается. У Rust должен быть разрешён фактический Origin локального dev-клиента. Пользователь вводит username/password и при необходимости UUID комнаты в форме; пустая комната создаёт новую. Без второго подключённого игрока production-комната waiting/paused и сервер не разрешает движение/NPC — это ожидаемое правило контракта.

Production: собрать с `VITE_TRANSPORT=real`, раздать `dist` на одном доверенном HTTPS origin вместе с Rust `/api/v1` и WSS. Токен выдаёт только сервер; токен/пароль не сохраняются. Сертификат и LAN CA настраивает владелец инфраструктуры по AUTH.md; клиент не отключает TLS-проверку. Вход OAuth/cookie-auth не добавлялись.

В адаптере реализованы bootstrap, login/logout, session create/list/join/leave, ws-ticket, public config/manifest, admin GET/PUT, interest resources восстановление interactions, activity/me, wallet/me, competition lobby/match recovery, обязательные lesson/quiz события. Все финансовые команды используют существующий WS; нового игрового HTTP-контракта не добавлено. Административный редактор отправляет replacement adminValues, `If-Match: "config-N"`; ответ ожидается adminDocument с ETag. За snapshot/config.changed и SHA-byteSize отвечает тот же код в обоих режимах.

## Локальный mock

`apps/client/mock/server.js` — отдельный Node HTTP/WS-обработчик Vite dev/preview, не часть Rust и не browser bundle. Данные исходного архива использованы как schema-valid стартовые формы; художественный каталог демонстрационный, но wire-схемы те же. Синтетические Мира и Алекс позволяют показать active-комнату. Полный каталог, приватные fixtures и генераторы не раздаются как публичные файлы Vite.

Mock исполняет роли, bearer, одноразовые tickets/Origin/subprotocol, ready/hash set, фиксированное движение, простые коллизии, interest-authorized ресурсы, публичную/закрытую конфигурацию, ETag/CAS, запрет структурных правок активной комнаты, NPC proximity, pending/result/cancel и идемпотентность requestId. Данные эфемерные, правила ответа детерминированы.

Это **не** реализация production persistence, CLI user provisioning, Argon2id, transactional outbox, PostgreSQL progress/memory, всех серверных rate limits/TTL и AI. Mock не используется для доказательства этих серверных требований. Клиент доверяет только подтверждённым серверным координатам/ролям/результатам. UI не обращается к Ollama или внутренним AI-интерфейсам.

## Правило кеша

Временная трактовка «10% от выделенной памяти» удалена после получения архива. Теперь `residentBytes + reservedBytes ≤ cacheBudgetBytes = floor(totalWorldBytes/10)`, уникальные hash учитываются один раз со всеми представлениями. Всё художественное содержимое находится в разрешённых, проверяемых и учитываемых ресурсах. SW кеширует только HTML/JS/CSS оболочки; ресурсы мира в precache отсутствуют.

## Соревнования 1.1.0

Исходящие `competition.join/configure/ready/start/answer/leave` и входящие `competition.state/answer.accepted/round.closed/settled`, `wallet.updated`, `activity.changed` валидируются официальными схемами. Правила находятся в Node mock, браузер хранит только подтверждённые данные. `onReady` — внутренний callback адаптера после отправки `world.ready`, не WS-сообщение.

Reconnect: новый ticket → welcome/interest → загрузка и ready → GET activity/me → GET lobby либо match/me → GET wallet/me. Никаких автоматических повторов reserve/start/answer. CAS-конфликт загружает новое состояние и оставляет кнопку повторного явного подтверждения пользователю. `competition.state.round=null` означает паузу; последний вопрос хранится локально только для показа уже полученного round.closed. При холодном восстановлении без закрытого события интерфейс ждёт следующий раунд и не выдумывает объяснение. Mock повторно присылает последний закрытый результат после world.ready.

Таймер UI использует `deadlineAt` и поправку UTC по welcome и midpoint ping/pong. Серверный mock использует монотонные часы с привязкой к UTC, закрытие вопроса и расчёт не зависят от UI. Успешные команды mock кешируются по `(userId,requestId)` до завершения процесса; повтор проверяется перед CAS. Persistence и сохранение результата между перезапусками mock не реализованы, это задача реального сервера.

`mock/content/` содержит учебные банки только Node-стороны. В браузер поступает материал урока либо текущий вопрос, затем правильный ответ по закрытому событию; полные банки/ledger других игроков не публикуются. Сценарии проверяются в `tests/competition.test.js` и `tests/integration.js`.
