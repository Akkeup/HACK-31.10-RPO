# Игровые состояния 2.0

Мир — читальный зал, 4 направления: mathematics/informatics/history/geography_flags. Публичный player.activity mode: exploring/learning/seated_quiz/seated_competition. Один игрок — одно место/активность. Seats и safe exit авторитетны; камера отображает, не задаёт право посадки. Новые действия только в active комнате/после ready. Уже начавшийся match продолжает timer при paused, иначе остановка/закрытие комнаты отменяет его с refund. Офлайн LAN2–5, тик20Hz/snapshot10Hz, silent input250ms, WSS heartbeat10/30s.

## Книга и NPC

library.open→library.opened {lessonId,material}→activity.changed learning. lesson.open/close остаются для NPC/закрытия книги. country.describe→country.description из3–4 предложений, отдельная карточка страны, не скрытая подсказка к активному экзамену. Country карточки не содержат acceptedNames/ключи. Приватные source/fact/pack/countryPrivate схемы — формат хранилища, не публичные endpoints.

## Тетрадь

quiz.start→quiz.state active + seated activity. quiz.answer {attemptId,questionId,answer:{kind,value}}→feedback. quiz.next→active следующего либо completed после feedback последнего. questionCount включает feedback_only, scoredQuestionCount — только graded; порог учитывает только graded. Нельзя создать attempt, где passScore больше scoredQuestionCount.

active: question заполнен, feedback/result=null. feedback: question=null, feedback заполнен. completed: question/feedback=null, result заполнен. suspended: suspendedAt заполнен, resumeState active/feedback, текущий question либо feedback сохраняется; result=null, игрок exploring и seat свободен. interrupted после abandon: question/feedback/result=null. В остальных статусах suspendedAt/resumeState=null.

quiz.leave→quiz.state suspended и activity.changed exploring; resumeState запоминает предыдущий этап. Если attempt completed, leave только освобождает место. quiz.resume {attemptId,npcId} возвращает тот же этап и занимает стул. quiz.abandon терминально прерывает и освобождает. Истечение60с disconnected seat grace приостанавливает, не удаляет attempt. Reconnect: welcome/interest/ready, activity/me; suspended attempt найти по сохранённому attemptId или own education progress/history (см. recovery ниже). Никогда не запускать новый тест автоматически при потере ответа.

GET /api/v2/education/attempts/{attemptId} — свой snapshot. GET /api/v2/activity/me содержит актуальную приватную activity; при exploring после ухода attemptId допустимо сохранить как resumable ID, это не занятое место. У пользователя может быть несколько suspended по разным module/version, поэтому UI дополнительно запрашивает GET /api/v2/education/attempts/me?status=suspended. Ответы старым attempts сохраняются, старую contentVersion не удалять. solved вопросы не повторяются, current unanswered восстанавливается; это намеренное продолжение, не новый случайный вопрос.

Письменный ответ always string, kind совпадает с текущим question.kind. Numeric parsing/aliases/rubric описаны BACKEND. correct=true/false для оценённых, null для feedback_only. ExpectedAnswer и explanation выдаются только после принятия ответа; причины отклонения не раскрывают ключ.

## Центральный стол

competition.join создаёт лобби, owner выбирает тему/ставку configure(expectedRevision). Ready резервирует, смена условий снимает readiness/holds всех, false/leave до старта release. Start owner после готовности всех атомарно списывает holds в escrow. Состав закреплён, новые join запрещены. Owner leave до старта передаёт роль раннему оставшемуся; empty закрывает. Disconnect lobby снимает ready и освобождает hold, стул держит60с.

Round.question одинаков участникам, deadlineAt UI и monotonic серверный deadline, ответ в deadline/позже отклонён. Accepted ответ один раз, выбранные чужие значения приватны; до close score прошлых раундов. После всех ответов/timeout competition.round.closed с expectedAnswer, explanation, scores, nextRoundStartsAt (пауза3с), затем следующий. Same requestId не дублирует принятие. Другой вариант для принятого вопроса — ANSWER_ALREADY_ACCEPTED. После start leave не возвращает stake, остальные вопросы0; disconnect продолжает таймер, grace60с, потом auto leave. Отключившийся победитель получает выплату на аккаунт.

Settlement winner: один top score получает pot. Draw top tie: stake возвращается всем, включая меньший score. Cancelled: полный refund с reason. Payout sum=pot, один settlementId/matchId, commit итог+ledger+outbox атомарен. Wallet available=balance-reserved,0<=reserved<=balance; initial100 один раз. Headroom потенциального выигрыша проверяется до reserve. GET wallet/ledger только свои. В production клиент не вычисляет балл/средства.

Команды имеют requestId UUID и серверный идемпотентный журнал>=24ч; доменные ограничения действуют и после TTL. Direct replies повторяют requestId, broadcasts null. library.opened/country.description/quiz.state direct; quiz.state timeout null. competition.state direct инициатору lobby команды и broadcast той же revision другим участникам; wallet.updated только владельцу. После успешного leave direct activity.changed, состояние attempt другим событием. Операции объявляются только после commit. HTTP recovery не исполняет команду.

Только участники матча получают вопросы/full state; остальные видят table summary. Нельзя войти в quiz/матч одновременно. Wrong/foreign private IDs404, role403, state conflict409-equivalent WS error. На frontend пока эти переходы моделирует mock, он не доказывает корректность production транзакций.
