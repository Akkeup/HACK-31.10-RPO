# Ошибки

Единый error.schema.json: code, безопасное message≤300, retryable, requestId UUID/null, details[{path,reason}], опциональный retryAfterMs≤60000. path — JSON Pointer или пустая строка для запроса целиком. Клиент ветвится по code, а не по тексту. Не раскрывать SQL, stack trace, токены, пароли, чужую память. Для WS объект лежит в server.error.payload; requestId команды повторяется и во внешнем сообщении, и в payload.

HTTP соответствия:

- 400 INVALID_REQUEST: JSON/schema/параметры, неверный ready.
- 401 UNAUTHORIZED / TOKEN_EXPIRED: отсутствующий, неверный, отозванный/просроченный access token или ticket. Обычно retryable=false; требуется новый login/ticket.
- 403 FORBIDDEN / OUT_OF_INTEREST: нет роли/прав, неверный Origin, запрос ресурса вне интереса. Не повторять без изменения условий.
- 404 NOT_FOUND: неизвестный мир/комната/файл или чужой приватный interaction.
- 409 CONFLICT / SESSION_FULL / ALREADY_IN_SESSION / VERSION_UNSUPPORTED / STALE_INTEREST / RESOURCE_TOO_LARGE / RESTART_REQUIRED / REQUEST_ID_REUSED: конкретная причина конфликтующего состояния. STALE_INTEREST требует принять последний interest; SESSION_FULL не даёт бесконечных повторов.
- 412 CONFIG_CONFLICT: If-Match устарел. 428 CONFIG_CONFLICT: If-Match отсутствует.
- 413 INVALID_REQUEST: размер тела. 415 INVALID_REQUEST: Content-Type. 422 INVALID_REQUEST: межполевое нарушение config. 426 VERSION_UNSUPPORTED: subprotocol/upgrade.
- 429 RATE_LIMITED: повтор после Retry-After, retryable=true. NPC_BUSY в WS также retryable=true, retryAfterMs обычно 2000.
- 500 INTERNAL_ERROR: неожиданная ошибка, retryable=false по умолчанию, показать requestId для диагностики. 503 SERVICE_UNAVAILABLE: временная неготовность, retryable=true и Retry-After.

Только WebSocket/NPC: OUT_OF_RANGE (повтор после приближения), NPC_BUSY, NPC_TIMEOUT, CANCELLED (если операция представляется ошибкой вне terminal cancelled). Для NPC failed.error NPC_TIMEOUT retryable=true, но повтор того же requestId всегда возвращает сохранённый результат; новая попытка создаётся пользователем с новым UUID. Ошибки аутентификации перед upgrade возвращаются HTTP; после upgrade token expiry закрывает 4003 и может предваряться server.error. Полный список code замкнут схемой.

Production WS close codes: 1000 normal/session.closed, 1003 binary, 1007 encoding, 1008 policy, 1009 size, 1011 unrecoverable internal, 1013 overload/ready timeout, 4000 heartbeat, 4001 replaced, 4002 hello timeout, 4003 auth expiry/revoke. Браузерные 1006/1015 — локальные признаки разрыва/ошибки TLS, сервер не отправляет их как close frames. При 4003 login; 4001 прекратить старый клиент; при 1013 backoff; при 1008/1009 исправить клиент. Close reason короткий, без секретов.
