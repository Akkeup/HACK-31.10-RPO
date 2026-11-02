# Приёмка2.0

Комплект: npm test, официальные OpenAPI/AsyncAPI release validators и ZIP checksums. Это не доказательство работающей игры.

Frontend prototype: cold start без backend/auth; первый-person WASD/mouse/Pointer Lock; книги4тем, teacher3–4sentences, typed answer no movement while typing; seat confirmed through mock;5вопросов, leave/resume same ID/current unanswered, solved не повторяются; syntheticflag сохраняет aspect ratio и не выдаёт ответ; соревнование с пометкой demo; loading/errors/занятость/недостаток средств. Все ресурсы локальны, GLB replacements через config, Three.js dispose, budget demo label.

Backend: published-only packs, reject duplicate family/unknown source/missing keys/invalidcountry, actual dataset read-only adapter, schema+semantic; ответа kind match, exact numeric/aliases rules, no LLM aura scoring; attempt suspend/resume seat lease60s отдельны, restart не теряет прогресс; UNIQUE active/suspended attempt; current content pinned; command retry и races не дублируют ответ/балл/seat.

Competition2–5: ready reservations, configure refunds, start race, deadline boundary, private choices, single settlement; winner/draw/cancel conservation, initial grant once, disconnect/restart recovery; realDB failure до/после commit. Production frontend не содержит closed keys/fullpack и не доверяет localStorage/mock balances.

Integration: trusted HTTPS/WSS Windows Docker и2–5LAN devices без WAN, холодный кеш, без CDN. Manifest/hash/interest checks, C+R<=B и реальная RAM/VRAM измерены, art/content sets соответствуют seats/collisions. Отчёт разделяет specification/mock/backend/browser/DB/LAN.
