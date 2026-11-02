# Offline LAN, Windows Docker, HTTPS/WSS

Целевая схема: браузеры 2–5 устройств → HTTPS:443 Windows LAN host → Caddy → Rust Axum по внутреннему HTTP; PostgreSQL 18 во внутренней Docker network, Ollama опционально. Docker Desktop работает в режиме Linux containers с WSL 2. Публикуется только 443; 5432, внутренний Axum и Ollama не открываются в LAN. Статическая сборка Vite обслуживается Caddy с того же origin. LAN host имеет постоянный адрес/reservation; имя discovery.lan настраивается локальным DNS либо hosts каждого устройства.

До отключения интернета backend-разработчик подготавливает и фиксирует:

- Проверенный Docker Desktop/WSL 2, Node.js и браузеры на целевой Windows/клиентах, требуемые лицензии/компоненты.
- Образы server, Caddy, PostgreSQL 18 с конкретными tag+digest и архитектурой Windows host CPU. `docker save` → переносимый tar и `docker load` офлайн; Apple Silicon arm64-образ не считается проверенным amd64-образом.
- Собранный frontend, Three.js, glTF decoders (Draco/KTX2/Meshopt если используются), шрифты, JS/CSS и все модели локально; никаких CDN, analytics, облачных auth и внешних texture URI. Vite dev server не production-сервер.
- Vendor/lock зависимостей Rust/JS, если нужна пересборка офлайн. Предпочтительно заранее собрать серверный image, чтобы Docker не тянул base/build layers в LAN. В Compose при офлайн-старте запретить pull/build, использовать заранее загруженные образы.
- Локальный TLS CA/cert с SAN нужного DNS/IP; сертификат/ключ монтируются в Caddy read-only. Альтернатива `tls internal` требует сохранить Caddy data volume и заранее распространить его root CA на все клиенты. В контейнере автоматическая установка доверия на клиентские ноутбуки не происходит.
- При использовании Ollama заранее загрузить веса, проверить локальную доступность и timeout/fallback; rules provider обязателен без них.

Persistent named volumes: PostgreSQL, опубликованный content и Caddy CA/data. Не использовать временный volume для базы. Перед обновлением сделать backup/restore rehearsal. PostgreSQL official image major 18 использует версионную структуру данных; mount/PGDATA проверить по документации выбранного образа, не копировать вслепую старый mount major 17. Секреты не коммитить в .env.example, передавать отдельно через local secrets/read-only файлы. Этот ZIP не содержит production-секретов, сертификатов и Compose для ещё не реализованного приложения.

На Windows проверить Private network профиль и разрешение TCP 443 в firewall для LAN, отсутствие Wi-Fi client isolation, совпадение адреса с SAN, доверие CA в каждом браузере и корректные часы клиентов. Не открывать все порты и не отключать firewall целиком. Docker published port должен слушать LAN-интерфейс, а backend внутренний порт — только контейнерную сеть. Caddy корректно проксирует Upgrade/Connection; idle timeout выше heartbeat. Для /api/v1/worlds/*/chunks/* и assets/* выключить response compression и сохранить Content-Length/no-store. На /api/v1/ws исключить query из логов.

Проверка готовности: GET /health/live сообщает живой процесс, /health/ready проверяет БД, миграции, конфиги, обязательные assets. DB healthcheck обязателен; один depends_on без readiness не подтверждает доступность. Пробовать TLS с двух внешних устройств, затем WSS, затем полный сценарий пяти игроков. Отключить WAN физически/на маршрутизаторе и перезапустить с холодным браузерным кешем: мир, login, NPC, config и reconnect должны работать. Для доказательства офлайн-работы отдельно проверить вкладку Network на внешние запросы.

Статус этого комплекта: схемы/fixtures/mock проверяются локально; реальная Windows Docker/сертификаты/БД/LAN/GPU остаются обязательной приёмкой реализации. Запуск npm test не доказывает готовность этих компонентов.
