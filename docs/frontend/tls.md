# HTTPS и WSS для Discovery

TLS завершает обратный прокси перед Rust. Браузер открывает один адрес:
`https://discovery.home.arpa` в LAN или `https://game.<ваш-домен>` снаружи.
Статику отдаёт прокси, `/api/v2/*` и `/health/*` направляются на `127.0.0.1:8080`.
Клиент сам выбирает `wss://` для HTTPS-страницы. Отдельный сертификат для
WebSocket не нужен. Caddy поддерживает WebSocket Upgrade в `reverse_proxy`.
[Документация Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Это примеры конфигурации, а не выполненная установка. Сертификаты,
системные хранилища доверия, DNS, firewall и Docker не изменялись.
Сначала устраните блокеры из [проверки backend](backend-readiness-2026-11-01.md):
HTTPS шифрует канал, но не исправляет отсутствие проверки пароля.

## Подготовка клиента и процесса Rust

Из `apps/client`:

```sh
npm ci
npm run check:release
```

Публикуется `apps/client/dist`, собранный в режиме real. `dist-mock` остаётся
отдельным демонстрационным вариантом. API использует тот же origin, поэтому
в браузер не записываются адрес Rust, ключи или пароли БД.

Rust должен слушать loopback: `HOST=127.0.0.1`, `PORT=8080`. Значения
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` настраивает владелец
backend. Корневой `run.py` принудительно выставляет `HOST=0.0.0.0` и может
пропустить пересборку клиента; для публичного сервера используйте отдельный
запуск процесса с нужными переменными. Порт 8080 не публикуйте наружу.

## LAN без интернета

1. Установите Caddy на компьютере-сервере по [официальной инструкции](https://caddyserver.com/docs/install).
   На macOS с Homebrew: `brew install caddy`.
2. Закрепите LAN IP сервера. В локальном DNS или hosts каждого участника
   свяжите `discovery.home.arpa` с этим IP.
3. Задайте абсолютный путь к real-сборке и проверьте пример:

```sh
export DISCOVERY_CLIENT_ROOT=/absolute/path/to/HACK-31.10-RPO/apps/client/dist
caddy validate --config docs/frontend/deploy/Caddyfile.lan --adapter caddyfile
caddy run --config docs/frontend/deploy/Caddyfile.lan --adapter caddyfile
```

Команды Caddy выполняются из корня репозитория. Доступ к порту 443 и права
запуска системного сервиса настраиваются отдельно для ОС сервера.

4. `tls internal` выпускает сертификат от локального CA Caddy. На каждом
   компьютере участника установите **только корневой сертификат** этого CA
   (`pki/authorities/local/root.crt` внутри каталога данных Caddy) в доверенные
   центры сертификации. На Windows — доверенные корневые центры, на macOS —
   системная связка ключей. Проверьте доверие Firefox отдельно, если он
   использует собственное хранилище. Закрытые ключи CA не копируйте.
5. Открывайте именно `https://discovery.home.arpa`, а не IP: имя должно
   соответствовать сертификату. В DevTools соединение — `wss://…/api/v2/ws`.

Локальный CA позволяет играть без внешнего центра сертификации и интернета.
Доверие необходимо настроить на всех клиентах; его нельзя заменить отключением
проверки сертификатов. [Локальный TLS](https://caddyserver.com/docs/caddyfile/directives/tls),
[управление доверием](https://caddyserver.com/docs/automatic-https#local-https).

## Публичный домен

1. Направьте DNS домена на сервер и установите Caddy.
2. Разрешите входящие TCP 80/443 к Caddy, сохранив 8080 только локальным.
3. Используйте `deploy/Caddyfile.public`:

```sh
export DISCOVERY_DOMAIN=game.your-real-domain.ru
export DISCOVERY_CLIENT_ROOT=/srv/discovery/apps/client/dist
caddy validate --config docs/frontend/deploy/Caddyfile.public --adapter caddyfile
caddy run --config docs/frontend/deploy/Caddyfile.public --adapter caddyfile
```

Caddy автоматически получает и продлевает публичный сертификат для доступного
домена. Сохраните его каталог данных между перезапусками.
[Automatic HTTPS](https://caddyserver.com/docs/automatic-https).
Для HTTP-01 нужна доступность порта 80; при невозможности открыть его
рассмотрите DNS-01 либо TLS-ALPN-01 на 443.
[Let’s Encrypt](https://letsencrypt.org/docs/allow-port-80/).

## Проверка

Откройте страницу без предупреждений сертификата и mixed content. Проверьте
вход, создание/присоединение комнаты, Upgrade 101 с `discovery.v2`, welcome,
interest, загрузку ресурсов и snapshot. После потери сети нужен новый ticket
и восстановление прежней комнаты. Затем проверьте выход и отзыв токена.

Для Node-проверки внутреннего CA задайте `NODE_EXTRA_CA_CERTS` путём к его
корневому сертификату и `DISCOVERY_AUDIT_URL=https://discovery.home.arpa`.
Пароль выделенного тестового аккаунта передаётся через
`DISCOVERY_AUDIT_PASSWORD`; запускается `npm run check:backend` из `apps/client`.
Не используйте `NODE_TLS_REJECT_UNAUTHORIZED=0`.

Установка TLS и проверка с двумя физическими компьютерами ещё не выполнены.
