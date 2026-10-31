# AUTH — 2.0

Текущие маршруты/форматы заданы openapi.yaml и asyncapi.yaml; поведение в FRONTEND.md, BACKEND.md, GAMEPLAY_V2.md и MIGRATION_2.0.md. Стабильные требования auth, HTTPS/WSS, Windows Docker и streaming сохранены из предыдущего выпуска. Подробный исходный документ — legacy-v1.1/AUTH.md; устаревшие игровые правила оттуда не применяются.

Transport: authenticated upgrade before101, short-lived single-use ticket30s, bearer3600s, Origin allowlist, text JSON64KiB, seq1.. perconnection, hello5s, heartbeat10/30s, reconnect fullsync, no secrets in logs.
