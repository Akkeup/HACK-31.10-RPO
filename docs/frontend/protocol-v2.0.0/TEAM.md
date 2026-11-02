# Два разработчика

Frontend: apps/client, visual assets, docs/frontend. Сейчас автономный mock reading room, камера, полки/материалы/NPC/тетради/флаги/соревнование, общий адаптер, загрузка/освобождение. Backend: apps/server, services/ai, infra, migration/private knowledge/docs/backend; реальное auth/seat/questions/suspended/wallet/LLM importer. Изменять свою часть, общие contracts только согласованно.

Frontend не ждёт backend и не подключает реальный flag dataset сейчас. Backend не требует готовой Three.js сцены для проверки fixtures. Схемы2.0 единые; после готовности server заменить adapter в одном месте и пройти общую LAN приёмку. Не утверждать, что prototype ключи/локальный баланс безопасны для production. Существующий репозиторий этим комплектом не менялся.
