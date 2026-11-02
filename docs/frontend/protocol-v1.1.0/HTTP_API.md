> Дополнение 1.1: новые активности и их приоритетные правила описаны в [GAMEPLAY_V1.1.md](GAMEPLAY_V1.1.md), выбор версии — в [MIGRATION_1.1.md](MIGRATION_1.1.md). Ниже сохранён базовый транспорт; примеры с 1.0 заменяются соответствующими fixtures/v1.1.0.

# HTTP API

Полный перечень методов, путей, параметров, тел и ответов — openapi.yaml. Base URL примера: https://discovery.lan. Все payload application/json UTF-8; binary assets имеют mediaType из interest. Успешный 204 не имеет тела. Ошибки всегда application/json по error.schema.json, включая ошибки аутентификации перед WSS upgrade. Caddy должен передавать API-ошибки backend без HTML-подмены; ошибки самого прокси вне JSON-контракта клиент трактует как SERVICE_UNAVAILABLE.

Порядок первого запуска клиента:

1. GET /api/v1/bootstrap без auth: 200 с точными версиями и worldIds.
2. POST /api/v1/auth/login с login-request: 200 с bearer token на 3600 секунд.
3. GET /api/v1/worlds/discovery-campus/config и /manifest с bearer: 200 с публичными правилами и суммарным бюджетом. Это метаданные, не полный список чанков.
4. POST /api/v1/sessions с {"worldId":"discovery-campus"}: 201, создатель уже присоединён. Другой игрок GET /sessions, затем PUT /sessions/{id}/members/me без тела: 200. У одного пользователя может быть членство только в одной комнате; повторный PUT в ту же комнату возвращает прежнее членство, в другую — 409 ALREADY_IN_SESSION.
5. POST /api/v1/sessions/{id}/ws-ticket с {"protocolVersion":"1.0.0"}: 200. Создать WSS, отправить client.hello. Дальше см. WEBSOCKET.md.
6. По world.interest скачать только его chunk URL и asset URL с Authorization: Bearer и X-Interest-Revision. После проверки SHA-256 и готовности ресурсов отправить world.ready.
7. DELETE /api/v1/sessions/{id}/members/me: 204, сокет закрывается, слот освобождается. Повторное удаление несуществующего своего членства также 204. POST /auth/logout: 204 отзывает текущий access token и все выданные через него tickets/соединения; не удаляет прогресс.

GET /sessions/{id} и список комнат показывают displayName, публичную позицию и connected, без userId/токенов/приватных данных. Полный player-массив ограничен пятью записями. Членство после потери сокета резервируется 60 секунд, connected=false. Новые входящие join проверяют лимит в одной критической секции/транзакции: пять членов вместе с резервами. Два одновременно подключённых игрока запускают комнату active; при падении числа подключённых ниже двух комната paused (первоначально waiting). В waiting/paused можно загружать мир, input подтверждается, но позиции и новые взаимодействия NPC не меняются. После второго клиента active восстанавливается автоматически. Комната без членов закрывается; новый sessionId создаёт новую комнату. Созданное через HTTP членство без WSS также истекает через 60 секунд.

Один действующий WSS на пользователя и комнату. Новое аутентифицированное соединение заменяет старое кодом 4001; новый connectionId и serverSeq. GET /interactions/{requestId} разрешён только владельцу запроса в этой комнате; чужой requestId возвращает 404. Результаты доступны 24 часа после создания запроса (даже после закрытия комнаты, по прежней авторизации владельца); прогресс не зависит от срока хранения результата.

Ограничения production: JSON HTTP body ≤256 KiB, config PUT ≤1 MiB, chunk ≤256 KiB, одиночный asset ≤1 MiB. Превышение body возвращает 413 INVALID_REQUEST. Неподдерживаемый Content-Type — 415 INVALID_REQUEST. Невалидная схема/JSON — 400 INVALID_REQUEST; межполевой некорректный config — 422 INVALID_REQUEST. Ошибки могут иметь X-Request-Id (UUID); backend генерирует его, если клиент не передал корректный UUID. error.requestId повторяет этот ID; HTTP 204 также может иметь заголовок X-Request-Id.

Защита от повторов: GET и PUT membership идемпотентны; DELETE своего membership идемпотентен. POST createSession не следует автоматически повторять после потери ответа: GET /sessions и найти своё членство через session.players.playerId из ранее известного соединения, либо повторить create и обработать ALREADY_IN_SESSION с details reason, содержащим только свой sessionId. POST ticket можно повторить: выдача нового ticket отзывает предыдущий неиспользованный ticket этого пользователя/комнаты. Admin PUT защищён If-Match. WS команды NPC используют requestId и хранят результат. Движение использует inputSeq. На /api ответы Cache-Control:no-store; клиент хранит ресурсы только в управляемом кеше. HTTP Range/304 не используются в v1; повторная загрузка — полный 200 с резервом бюджета. OPTIONS не нужен для same-origin; backend запрещает произвольный cross-origin CORS.

Rate limits: login 5 неудач/мин/IP, блокировка на 60с; обычные HTTP 120/мин/token; config PUT 10/мин/admin; chunk/asset GET 60/с/token с burst 120; ticket 10/мин/token. 429 RATE_LIMITED содержит Retry-After в секундах и retryAfterMs. Для ожидаемой временной недоступности 503 SERVICE_UNAVAILABLE. Пределы считаются по монотонному серверному времени.
