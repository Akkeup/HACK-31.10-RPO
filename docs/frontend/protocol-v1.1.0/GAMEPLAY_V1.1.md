# Discovery 1.1: нормативная игровая логика

Этот документ дополняет базовый транспорт 1.0 и является источником правил новых активностей. Имена событий и формы payload заданы schemas/v1.1.0; пути чтения/восстановления — openapi.yaml. Все новые команды идут через аутентифицированный WSS, все чтения — через HTTP с bearer. События отправляются после commit, не до него.

## Персонаж, NPC и места

player.activity содержит mode: exploring | learning | seated_quiz | seated_competition, targetId и seatId. В exploring оба nullable-поля null; в learning targetId=teacherId, seatId=null; в seated_quiz targetId=examinerId; в seated_competition targetId=tableId. Сидящие состояния имеют действительный seatId. GET /api/v1/activity/me дополнительно возвращает приватные lessonId/attemptId/matchId/lobbyId и revision; неприменимые ID равны null.

На игрока допускается одна активность и одно занятое место. Занятие места атомарно с созданием/присоединением активности. Проверяются connected/ready, разрешённый interest, серверное расстояние, проходимость и состояние комнаты. NPC distance берётся из character.interactionRadiusM, table — из table.interactionRadiusM. Новые активности требуют active комнаты; выход и чтения доступны и в paused. Уже начатые соревнования продолжаются по таймерам при paused/отключениях, обычная симуляция перемещения остаётся на паузе. При закрытии комнаты матч отменяется с возвратом.

Public NPC имеет role teacher/examiner и moduleId. Для каждой из трёх тем есть оба NPC. Их положение и учебный стул заданы gameplay.education.stations. У соревновательного стола 5 уникальных seatId и безопасные exitPosition. Материалы, коллизии столов/стульев и изображения не обходят chunk interest и бюджет ресурсов. Public table-снимок содержит занятость, тему, ставку и ID лобби/матча, без балансов.

## Фиксированное обучение

subjects wire: mathematics, informatics, history. moduleId и contentVersion — непрозрачные ID, не локализованные названия. Учебный пакет связывает teacher, examiner, material и банк вопросов. Примеры содержат 3 согласованных пакета по 5 вопросов, текст материала покрывает все вопросы. Пакеты устанавливает оператор/backend; публичного upload endpoint нет. Перед publish проверяются уникальные ID, 4 уникальных optionId, ровно один correctOptionId из вариантов и достаточный банк для настроенного questionCount. Неизвестная contentVersion — CONTENT_VERSION_UNAVAILABLE.

lesson.open {npcId} разрешён только teacher и возвращает lesson.opened {lessonId,material}, затем activity.changed(mode=learning). Просмотр разделов/примеров локальный, контент фиксирован. lesson.close {lessonId} сохраняет viewed=true и возвращает exploring через activity.changed; education.progress.updated отправляется при изменении прогресса. viewed — факт просмотра, не прохождение проверки. Получение материала HTTP не выдаёт достижений и не занимает NPC. Повторное посещение разрешено.

quiz.start {npcId} разрешён examiner, не требует viewed. Сервер занимает его учебный стул, создаёт attemptId, закрепляет contentVersion и случайную последовательность из questionCount различных вопросов без повторов, возвращает quiz.state(active) и activity.changed(seated_quiz). MVP questionCount=5/passScore=4. Вопрос содержит prompt и ровно 4 optionId/text, без ключа правильности. Официальные вопросы/оценивание детерминированы банком, LLM их не меняет.

quiz.answer {attemptId,questionId,optionId}: принять только ответ владельца на текущий вопрос. Переход active→feedback атомарно фиксирует ответ и score, quiz.state содержит question=null и feedback с selectedOptionId, correctOptionId, correct и explanation. Новая команда с тем же принятым вопросом и тем же вариантом возвращает фактическое текущее состояние без нового балла; другой вариант — ANSWER_ALREADY_ACCEPTED. Точный повтор requestId обрабатывается общим кэшем команд.

quiz.next {attemptId,expectedRevision} разрешён из feedback: открыть следующий вопрос либо завершить после feedback последнего вопроса. На последнем next вычислить passed=(score>=passScore), result, reviewTopics и commit education progress. completed: question=null, feedback=null, result заполнен; игрок остаётся сидеть до quiz.leave. interrupted: question/feedback/result=null, interruptionReason заполнен. active: question заполнен, feedback/result=null; feedback: question=null, feedback заполнен, result=null. ordinal 1…questionCount; score≤ordinal≤questionCount; passScore≤questionCount. completed.result согласован с score и questionCount.

quiz.leave прерывает незавершённую попытку или закрывает уже завершённую, освобождает место и отправляет activity.changed(exploring). Повторная проверка — новый attemptId после выхода/нового quiz.start. Прогресс модулей отделён от старого learning_progress знаний и результатов соревнования; лучший результат сравнивается для одинаковых moduleId/contentVersion и questionCount. При изменении длины проверки новая попытка учитывается отдельной когортой; public progress отражает текущие настроенные questionCount/contentVersion, история не теряется.

Legacy npc.interact/accepted/result остаются необязательным общим диалогом из 1.0, не заменяют lesson/quiz и не начисляют прохождение учебного модуля. Для examiner generic npc.interact возвращает INVALID_REQUEST; для teacher дополнительный ответ ограничивается его темой/фиксированными знаниями. Никакая генеративная реплика не служит ключом ответа.

## Соревновательное лобби

Стол — отдельная сущность внутри комнаты, предназначенная только игрокам. competition.join {tableId} при свободном столе создаёт lobbyId, занимает стул, переводит игрока в seated_competition. В новом лобби тема mathematics, ставка minStakeAura; создатель ownerPlayerId, ready=false. Присоединение другого игрока не снимает уже подтверждённые ставки, но увеличивает revision. В running новые join запрещены MATCH_STARTED.

competition.configure {tableId,lobbyId,expectedRevision,subject,stakeAura} разрешён только владельцу в lobby. Изменение условий атомарно снимает ready всех, освобождает все резервы, увеличивает revision и объявляет competition.state; wallet.updated получают только владельцы изменённых кошельков. Даже owner должен отдельно подтвердить готовность.

competition.ready {tableId,lobbyId,expectedRevision,ready}: true резервирует ставку, false освобождает. Свободный остаток проверяется под блокировкой кошелька. Повтор подтверждения без изменения ready не создаёт нового резерва. expectedRevision устарел — LOBBY_CHANGED, клиент загружает актуальное состояние и не повторяет финансовое подтверждение вслепую.

competition.start {tableId,lobbyId,expectedRevision} — только owner. Атомарно проверить 2–5 участников, connected=true, все ready и имеют точные резервы; перевести ставки в escrow, создать matchId, зафиксировать состав, тему, moduleId/contentVersion и question sequence, pot=N*stake, открыть первый раунд. Не хватает готовности — NOT_READY. Все переходы под общей блокировкой лобби/стола и транзакцией кошельков в стабильном порядке userId. Старт и выход/изменение условий не могут частично пересечься.

В lobby потери соединения снимают ready и освобождают резерв сразу, стул держится до 60с. По истечении grace участник удаляется. Уход owner до старта передаёт владение самому раннему оставшемуся участнику; пустое лобби закрывается. После terminal матча новый join создаёт новый lobbyId с новой готовностью. Ни один старый резерв автоматически не переносится.

## Раунды и приватность

MVP: 5 вопросов, по 20с, одинаковая зафиксированная последовательность для всех, 1 балл за правильный ответ, бонуса за скорость нет. questionCount и roundSeconds конфигурируемы. До старта ни вопросы, ни ключи не выдаются. Current round.question появляется в competition.state одновременно для участников. deadlineAt UTC используется для UI, backend определяет срок по монотонным часам с привязкой к времени открытия; ответ, пришедший в момент deadline или позже, отклоняется QUESTION_CLOSED.

competition.answer {matchId,questionId,optionId}: один принятый ответ на вопрос. Отправителю competition.answer.accepted возвращает его optionId; остальным виден только answeredPlayerIds, не выбранные варианты. Тот же optionId при повторе возвращает подтверждение, иной — ANSWER_ALREADY_ACCEPTED. Пропущенный вопрос/просрочка =0. Закрытие раунда происходит после всех ответов или timeout, под той же блокировкой, что и приём ответов.

competition.round.closed раскрывает correctOptionId, explanation и обновлённые scores. До закрытия score участников относится только к прошлым раундам. Участники не получают чужие выбранные optionId даже после закрытия. Между раундами пауза 3с для чтения; nextRoundStartsAt показывает начало следующего, в последний раз null. competition.state после закрытия имеет round=null до следующего раунда. Записанные варианты и закрытые результаты восстанавливаются из БД; не предполагать точность локального таймера.

competition.leave до старта освобождает резерв и стул. После старта помечает left=true, освобождает стул/возвращает exploring, ставка остаётся в банке. Уже принятые ответы и баллы сохраняются, остальные вопросы дают 0; вернуться в тот же матч после добровольного выхода нельзя. Место не выдаётся новому участнику текущего running матча. При разрыве связи без leave таймеры идут, место держится до 60с; reconnect до expiry восстанавливает участие. После expiry считается автоматическим leave, расчёт сохраняется. Если все покинули матч, раунды могут закрываться сразу как пропущенные и выполняется обычный итог; один оставшийся не получает автоматическую победу.

## Аура и расчёт

Валюта aura — целочисленная, отрицательные остатки и дробные ставки запрещены. Новый аккаунт получает initialBalanceAura=100 однократно, не при каждом login. balanceAura — весь собственный баланс, reservedAura — его заблокированная часть, availableAura=balanceAura-reservedAura. Резервы не увеличивают баланс. По умолчанию stake 1…1000, maxBalanceAura=1e9.

Проводки: initial (+100 balance); reserve (+stake reserved); release (−stake reserved); start/stake (−stake balance, −stake reserved и +stake escrow); payout/refund (+amount balance, −amount escrow). После каждой операции 0≤reserved≤balance≤maxBalance. Ledger entries имеют signed amountAura/reservedDeltaAura и after-поля, отдаются только владельцу. GET ledger сортируется от новых к старым; limit по умолчанию 50, максимум100, cursor opaque, стабильный по createdAt/entryId.

Единственный лидер получает весь pot, остальные 0. Если максимум score разделяют хотя бы два участника — draw, каждому возвращается исходная stake, включая игроков с меньшим score. cancelled также возвращает всем stake и содержит reason. Сумма payouts всегда равна pot; никаких комиссий/создания денег. Терминальная settlementId уникальна для matchId. Завершение, результаты, payout/refund, журнал и outbox — одна транзакция; повтор не платит дважды. Отключившийся победитель получает средства на аккаунт.

Перед резервом проверить headroom: balance+stake*(maxPlayers-1)≤maxBalance, чтобы потенциальная выплата помещалась; во время резерва/матча не разрешать другие начисления, нарушающие этот резерв headroom. Иначе вернуть INSUFFICIENT_AURA с details о лимите. Начальный grant имеет уникальный ключ userId, settlement — matchId, каждый hold — lobbyId/userId. Сверять total wallet+escrow до/после всех операций; исключение только initial grant.

## Идемпотентность, восстановление, ошибки

Все мутирующие команды новых активностей используют requestId UUID. Backend хранит ключ (userId,requestId), type+канонический payload hash, результат и связанные entity revision не менее24ч, включая reserve/start/answer/leave. Повтор идентичной команды не исполняется снова, возвращает результат; иной payload с тем же ID — REQUEST_ID_REUSED. CAS expectedRevision проверяется после поиска повторной команды, чтобы успешный retry не стал конфликтом. Наряду с этим доменные уникальные ограничения не дают повторно начислить ответ или settlement после истечения command-cache.

Direct replies повторяют requestId; broadcasts competition.state/round.closed/settled и wallet.updated/education.progress.updated/activity.changed имеют requestId=null. quiz.state может быть direct (команда) или null (timeout/recovery change). На каждую успешную lobby mutation отправляется direct competition.state с requestId инициатору и отдельный broadcast той же revision остальным; инициатор не получает дубликат. При join ответ содержит созданный lobbyId. Успешный leave завершается direct activity.changed c requestId, прочие изменения — null. lesson.close и quiz.leave аналогичны. server.error сохраняет requestId внутри/снаружи payload. События и баланс не публикуются до commit.

При reconnect сначала welcome/interest/ready, затем GET activity/me и, по приватным ID, attempt/lobby/match/me, wallet/me. HTTP recovery не повторяет команду. Terminal результаты доступны владельцу минимум24ч, история и ledger сохраняются долговременно. Match recovery показывает selectedOptionId/answerAccepted только текущего раунда владельцу; если round=null, оба null/false. Чужие attempt/match recovery —404, lobby state доступен только членам той же игровой комнаты; bank/keys/чужие wallets не выдаются.

Незавершённый quiz после restart становится interrupted(server_restart), места освобождаются. Незавершённый running match отменяется и возвращает ставки атомарно, лобби releases выполняются идемпотентно. Уже committed settlement никогда не отменяется и не выплачивается снова. При DB outage новые ставки/ответы с долговременным результатом не подтверждать; комнату безопасно остановить, после восстановления отменить незавершённый матч с возвратом. Durable outbox сообщает terminal изменения после commit.

Новые error code: SEAT_OCCUPIED, ACTIVITY_CONFLICT, INSUFFICIENT_AURA, LOBBY_CHANGED, NOT_READY, MATCH_STARTED, ANSWER_ALREADY_ACCEPTED, QUESTION_CLOSED, CONTENT_VERSION_UNAVAILABLE. Для HTTP конфликтов 409; неизвестные/чужие сущности404; отсутствие прав403; invalid payload400; межполевой invalid config422. В WS те же code в server.error. Ошибки средств/готовности не повторять автоматически без нового действия игрока.

## Конфиг и публикация

Public config добавляет firstPersonDefaults и gameplay. Admin добавляет economy; правильные ответы/полные пакеты в config не включаются. default-счётчики 5/4/20, баланс100 и лимиты ставок — проектные значения, меняются admin CAS в пределах schema. passScore≤questionCount, minStake≤maxStake, достаточно уникальных вопросов, minPitch<maxPitch; seats, NPC и модули уникальны/разрешимы, exit безопасны. Snapshot шлёт tables и player.activity.

Визуальные настройки горячие; правила questionCount/passScore/roundSeconds/stakes применяются только к новым попыткам/лобби, текущие закрепляют прежний configRevision. initialBalance меняет только будущие аккаунты. Изменение расположения/состава мест, NPC, table или contentVersion — структурная публикация по базовым правилам с остановленными комнатами и новым content release. Схемы не разрешают менять minPlayers=2/maxPlayers=5/tiePolicy=refund_all в 1.1.


Privacy clarification: once a match starts, full lobby/match state is available only to its participants. Other room members receive only the table summary, never current questions or private recovery data.
