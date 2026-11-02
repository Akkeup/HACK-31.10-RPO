> Дополнение 1.1: новые активности и их приоритетные правила описаны в [GAMEPLAY_V1.1.md](GAMEPLAY_V1.1.md), выбор версии — в [MIGRATION_1.1.md](MIGRATION_1.1.md). Ниже сохранён базовый транспорт; примеры с 1.0 заменяются соответствующими fixtures/v1.1.0.

# Приёмка реализации

Автоматические проверки комплекта: node tools/validate.cjs и node mock/demo.mjs (без отдельного сервера). Первое проверяет все схемы/fixtures, реальные hash/byteSize/10% и ссылки; второе проигрывает welcome, interest, snapshot и взаимодействие NPC в памяти. HTTP/WSS, два клиента, streaming authorization, admin CAS и logout проверяются при реализации настоящего backend. Mock только имитирует систему, production-приёмка выполняется отдельно.

Для настоящего сервера обязательны сценарии:

1. Два клиента с разными аккаунтами запускают active session, видят друг друга, server input нормализован, координаты напрямую отправить нельзя. Пятый join успешен, шестой получает SESSION_FULL даже при гонке, disconnected slot держится 60с. После падения до одного — paused, восстановление active после второго.
2. Игрок не может admin GET/PUT, менять скорость через local render, читать чужой progress/interaction или скачать asset вне interest. Неверный Origin и использованный/просроченный ticket отвергаются до upgrade. Logout отзывает socket/ticket, access expiry требует login.
3. Точные file hashes и byteSize совпадают, Content-Encoding identity, no-store, транзитивные glTF зависимости перечислены. Дублированная модель считается один раз. Во всех пиковых переходах C+R≤floor(W/10), включая AbortController, повтор загрузки и shared refcounts. Проверить загрузку ровно на B и отказ B+1, недостаточный single-chunk набор, отрицательные координаты и границы.
4. Разрыв WSS во время движения останавливает игрока по input silence. Reconnect новым ticket восстанавливает full snapshot, seq сбрасываются, playerId сохраняется в grace period. Старый interest не даёт разрешения на новые файлы; worldRevision change очищает старый мир.
5. Оба admin читают config-1: первый PUT→config-2, второй stale PUT→412. Обычный player→403. Некорректные диапазоны→400/422, structural active change→409 RESTART_REQUIRED; hot change применяется до snapshot effectiveTick. После restart revision сохраняется.
6. NPC вне радиуса→OUT_OF_RANGE; pending→accepted→один terminal; повтор requestId не создаёт новый прогресс. Cancel/result race даёт один terminal. Provider timeout возвращает fallback без ложного достижения. DB interruption до commit не выдаёт успех. Собственный interaction восстанавливается GET после reconnect, чужой→404.
7. После restart PostgreSQL сохраняет пользователей, прогресс, config, NPC history, terminal interactions. Допускается потеря движения ≤5с. Named volume и backup реально проверены.
8. Windows Docker + доверенный HTTPS/WSS с 2–5 LAN-устройств, WAN отключён и кеш браузеров холодный. Нет CDN/облачных зависимостей; локальный NPC работает без Ollama. Измерить FPS и RAM/VRAM на целевых ноутбуках. Проверить 64KiB/256KiB/1MiB limits, heartbeat и slow consumer.

При отчёте разделять: проверка спецификаций, mock, unit/integration backend, браузерная графика, PostgreSQL, реальная Windows/LAN. Приложить дату, версии, наблюдение и фактический результат; не отмечать последний пункт по успешной проверке JSON.


## Дополнительная приёмка 1.1

- WASD/мышь/Pointer Lock, курсор в меню, Escape без прерывания, серверная посадка и безопасный выход, другие игроки сидят визуально.
- Три teacher/examiner пары, fixed materials, quiz active→feedback→next→completed/interrupted, 4/5 проход, никаких ключей до ответа.
- Два игрока гоняются за стулом: один успех. Попытка одновременно quiz/competition отклонена. Двойной ответ даёт один балл.
- 2 и 5 участников, владелец, смена условий сбрасывает ready/резервы, недостаток ауры, повтор ready/start не списывает дважды.
- Общий deadline, ответ на границе отклонён, score не раскрывается до закрытия, выбранные чужие варианты приватны.
- Победитель получает весь банк; ничья возвращает всем stake; сумма выплат=pot; отмена/перезапуск возвращают ставки один раз.
- DB crash до/после settlement commit, retry с тем же requestId, устаревшая lobby revision, reserve/start/leave race, initial grant один на аккаунт.
- Отключение не останавливает матч, leave не возвращает ставку после start, pending/recovery не повторяет списание. Собственные wallet/ledger/attempt приватны.
- Модели столов, стульев и NPC загружаются через чанки под ≤10%, не прячутся в control config. Реальные Windows/LAN/HTTPS/WSS и 2–5 браузеров проверяются отдельно от JSON.
