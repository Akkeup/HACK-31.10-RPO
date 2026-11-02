# Правила версии2.0.0

Точный version2.0.0, /api/v2, discovery.v2. Major выбран намеренно для смены wire answer и семантики незавершённой попытки. PATCH только совместимые исправления документации/инструментов, MINOR новые возможности с явным согласованием версии, MAJOR ломающее изменение. Выпущенные schemas не менять, новая папка рядом. worldRevision/contentVersion/configRevision независимы.

JSON UTF-8 без BOM/дублированных ключей/NaN/Infinity; integer<=2^53−1; UUID строки; UTC RFC3339. Strict additionalProperties=false, единственное расширение x-* в extensions сообщений. Unknown type/version отклоняется. Никаких coerce/defaults/removeAdditional в валидаторе. Межполевые требования проверяет backend отдельно от JSON Schema. Draft2020-12, format assertions через ajv-formats/аналог в Rust. Все refs регистрируются локально; discovery.invalid — namespace, не сетевой ресурс.

Изменение: договор обоих владельцев→schema+fixtures→семантические правила→проверка→новая версия. Mock не определяет production истину и не меняет wire. Локальные ключи допустимы только в demo, не production client build.
