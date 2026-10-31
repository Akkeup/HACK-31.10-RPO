# Переход1.1→2.0

Major2: меняется quiz.answer/competition.answer с optionId на answer:{kind,value}; question становится discriminated union; feedback и round.closed имеют expectedAnswer; quiz.leave теперь suspended, resume/abandon отдельные. Old clients несовместимы, автоматического downgrade нет.

HTTP /api/v2 и X-Discovery-Protocol:2.0.0 кроме bootstrap/WS/health. Bootstrap protocolVersions=[2.0.0], ws-ticket protocolVersion2.0.0, WSS subprotocol discovery.v2, каждое message2.0.0. Health остаётся /health/live и /health/ready. Миграция существующего сервера не включает поддержку v1 без отдельных обработчиков.

Старые schemas/fixtures1.0 и1.1 immutable. Текущие schemas/v2.0.0 и fixtures/v2.0.0. Старые docs archived в legacy-v1.1, текущие FRONTEND/BACKEND/GAMEPLAY_V2 имеют приоритет. Добавить geography_flags во все subject selectors/валидацию, readingRoom в config, source/fact/book/country records, kind/value, scored count, suspended state/resumeState/current question persistence.

Frontend первым этапом только mock: без обязательной auth/network зависимости, библиотека/flags synthetic. Backend развивается независимо по тем же схемам. Реальный датасет не изменять. После интеграции переключить adapter, убрать mock/private keys из build, доверять серверному attempt и балансу. Все localStorage mock сохранения имеют отдельный namespace/version и в network-mode игнорируются.
