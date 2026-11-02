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
