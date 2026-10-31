> Дополнение 1.1: новые активности и их приоритетные правила описаны в [GAMEPLAY_V1.1.md](GAMEPLAY_V1.1.md), выбор версии — в [MIGRATION_1.1.md](MIGRATION_1.1.md). Ниже сохранён базовый транспорт; примеры с 1.0 заменяются соответствующими fixtures/v1.1.0.

# WebSocket lifecycle и события

Транспорт: WSS, HTTP/1.1 upgrade, discovery.v1. Одно text JSON сообщение на сообщение WebSocket, без application batch и binary payload. Ограничить полное собранное сообщение после фрагментации до 64 KiB. Binary закрывается 1003, неверный UTF-8 1007, превышение размера 1009. Невалидный JSON/схема — server.error INVALID_REQUEST; после трёх нарушений за минуту закрыть 1008. WebSocket compression отключена в v1.

Порядок: authenticated upgrade → client.hello не позднее 5с → server.welcome → world.interest → world.ready → world.snapshot. До hello/ready input не исполняется. welcome, interest, snapshot получают последовательно растущий serverSeq начиная с 1. Каждое сообщение сервера содержит serverTime UTC, protocolVersion, type, requestId (UUID/null), payload и опциональный extensions. serverSeq растёт на каждом отправленном приложением событии в пределах connectionId; не является глобальным журналом. Сообщения WS упорядочены TCP, разрыв последовательности приводит к полной ресинхронизации через новое подключение. Снимки, намеренно объединённые сервером до отправки, не расходуют номера.

Все клиентские сообщения имеют requestId UUID, даже input/ping. Ответы команды сохраняют requestId: accepted/result/cancelled/error. Запрос npc.cancel имеет собственный requestId; ответ npc.cancelled содержит этот requestId с targetRequestId внутри interaction.requestId. Broadcast snapshot/interest/config.changed/session.closed/progress.updated используют requestId=null; welcome повторяет requestId hello, pong повторяет ping. Fixture каждого типа — отдельный валидный пример, а не единая последовательность для replay; mock создаёт согласованную последовательность.

Client → server:

- client.hello {clientName}: один раз на соединение; повтор — INVALID_REQUEST.
- player.input {inputSeq,moveX,moveZ,yawRad,running,interestRevision}: максимум 20/с, burst 40. inputSeq начинается с 1 на новом соединении и строго растёт. Повторы/старые seq игнорируются. Вектор X/Z в мировых осях нормализуется сервером до длины ≤1, исключая ускорение по диагонали. Поля координат или client dt не принимаются. running применяется только через серверный runMultiplier.
- world.ready {interestRevision,resourceHashes}: подтверждение точного множества текущих chunk и asset hash. Неполное/лишнее множество — INVALID_REQUEST, старая revision — STALE_INTEREST. Только после валидного ready клиент считается готовым к перемещению; неподтверждённая смена interest замораживает этого игрока. Сервер не полагается на ready для проверки доступности геометрии/коллизий.
- npc.interact {npcId,action,text}: talk/inspect из allowedActions, см. NPC.md. Результат только запрашивающему игроку.
- npc.cancel {targetRequestId}: отмена собственного pending запроса, не меняет уже committed результат.
- client.metrics {residentBytes,reservedBytes,budgetBytes,fps}: максимум 1/с, диагностика. Сервер проверяет declared budget и арифметику, но не считает телеметрию доказательством честности клиента.
- client.ping {nonce}: каждые 10с; server.pong с тем же nonce. Application heartbeat доступен браузеру, в отличие от transport ping/pong.

Server → client:

- server.welcome: connectionId, serverInstanceId, свой playerId, session, configRevision, manifest и интервалы heartbeat.
- world.interest: новый полный набор допустимых chunk/asset метаданных, worldRevision и interestRevision. Не delta. Отозванные URL после смены revision не дают новых загрузок.
- world.snapshot: полное актуальное состояние игроков комнаты и NPC текущего interest, tick, configRevision, interestRevision, sessionStatus. Непришедшие NPC удаляются из сцены; players — весь список ≤5. lastProcessedInputSeq используется для reconciliation. При активном interest snapshot до ready допустим только для обновления UI после первоначальной синхронизации; движение при этом заморожено.
- config.changed: новая публичная конфигурация и effectiveTick. Применяется перед снимком с tick≥effectiveTick. Изменения атомарны на одном тике; первый snapshot после него имеет новый configRevision.
- npc.accepted / npc.result / npc.cancelled: объект interaction; статусы pending / terminal / cancelled соответственно. npc.result может быть completed, failed или ранее завершённым cancelled при повторе. См. правила идемпотентности NPC.md.
- progress.updated: новое полное собственное состояние прогресса, только после commit PostgreSQL.
- server.error: error envelope; по возможности соединение остаётся открытым, ошибка коррелирует с командой.
- session.closed: финальная причина и затем close 1000.

Серверный tick = 50 мс. На каждом тике используется последнее принятое намерение, tick не ускоряется от числа сообщений. После 250 мс без input (или character.maxInputSilenceMs) движение обнуляется. Сервер проверяет границы мира, коллизии, разрешённые области и running. Предыдущее валидное положение сохраняется при запрещённом движении. Если новый interest не готов, у границы чанка остановить движение, выдать interest заранее или при попытке перехода; не ставить игрока внутрь незагруженного чанка. Interest может содержать соседний чанк; если бюджет не позволяет совместную резидентность, сначала выгрузить старый ресурс, загрузить новый и только потом разрешить пересечение. Серверная коллизия существует независимо от загруженности клиента.

Локальный клиент может предсказывать только движение и плавно корректироваться по snapshot. Интерполировать других игроков с задержкой 100–150мс, не экстраполировать больше 250мс. Никакое локальное предсказание не изменяет прогресс/результаты NPC. В waiting/paused inputSeq подтверждается, но позиция не изменяется.

Backpressure: очередь сокета ≤256 KiB, последние неотправленные snapshots можно заменять более свежим до назначения serverSeq. Reliable события не удаляются. Если переполнение не снято за 5с, закрыть 1013; клиент полностью ресинхронизируется. Избыточные input — RATE_LIMITED, длительное злоупотребление 1008. Прочие команды ≤10/с burst 20; NPC отдельно ≤1 запроса/2с/player. Отсутствие client.ping 30с — 4000; отсутствие hello 5с — 4002; token expiry/revoke — 4003; замена сокета — 4001. Неготовность interest более 30с — 1013.

Reconnect: задержка 0.5,1,2,4,8с максимум плюс jitter 0–250мс; получить новый ticket, hello, welcome, public config если revision изменился, interest и ready. serverSeq/inputSeq сбрасываются, нет replay stream. В пределах 60с сохраняется playerId и положение; после expiry членства повторить join и получить серверное сохранение/безопасный spawn. Старые GPU-объекты не использовать без совпадения worldRevision/hash; текущий interest перепроверить. Pending NPC восстановить GET interactions/{requestId}, не выдавать новый requestId ради повтора. При serverInstanceId изменении не предполагать сохранённые тики/соединения.
