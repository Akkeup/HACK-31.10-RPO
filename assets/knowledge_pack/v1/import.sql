BEGIN;

INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ('source-math-arithmetic', 'Arithmetic - Wikibooks', 'https://en.wikibooks.org/wiki/Arithmetic', '2026-10-31T12:00:00Z', 'r4231902', 'CC-BY-SA-4.0', 'sources/math_arithmetic.txt', 'd5e5905c7fb04f60585a6e2b239467a708a7a6b3262937f7f430c849bf143792', 'published', false, 'Whole Numbers and Basic Operations', 'Wikibooks contributors', 'Content licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)')
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;


INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ('source-cs-unplugged', 'CS Unplugged: Computer Science without a computer', 'https://www.csunplugged.org/en/at-home/', '2026-10-31T12:00:00Z', 'v2026.1', 'CC-BY-NC-SA-4.0', 'sources/cs_unplugged.txt', 'c69697077f075c593ee196a2001348a9df75bfd2fa36ea99370c7b423394770a', 'published', false, 'At-Home Computer Science Basics', 'University of Canterbury CS Unplugged Team (Tim Bell et al.)', 'CS Unplugged is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0')
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;


INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ('source-ruwiki-hist-source', 'Исторический источник - Русская Википедия', 'https://ru.wikipedia.org/wiki/Исторический_источник', '2026-10-31T12:00:00Z', 'r139882104', 'CC-BY-SA-4.0', 'sources/ruwiki_hist_source.txt', '1f22be78a1d76deeda6307ac9ae98b77bb5f4317535fe46eaf07b62d305243b7', 'published', false, 'Классификация исторических источников', 'Участники Википедии', 'Материал из Википедии, лицензия CC BY-SA 4.0')
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;


INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ('source-ruwiki-chronology', 'Хронология - Русская Википедия', 'https://ru.wikipedia.org/wiki/Хронология', '2026-10-31T12:00:00Z', 'r138765432', 'CC-BY-SA-4.0', 'sources/ruwiki_chronology.txt', '0061e5a9dac492e8bc9fa2e1179df36a9522f477b905fab0beaca4daaba63056', 'published', false, 'Календарные системы и хронологические эры', 'Участники Википедии', 'Материал из Википедии, лицензия CC BY-SA 4.0')
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;


INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ('source-wikibooks-world-history', 'World History - Wikibooks', 'https://en.wikibooks.org/wiki/World_History', '2026-10-31T12:00:00Z', 'r4190823', 'CC-BY-SA-4.0', 'sources/wikibooks_world_history.txt', '91f2c6fa7a9b27783dc007ce07ce6d89e7ad14a5b22099ce4ed26e9520714581', 'published', false, 'Introduction to World History and Civilizations', 'Wikibooks contributors', 'Content licensed under CC BY-SA 4.0')
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;


INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ('source-wikidata-country-dump', 'Wikidata Database Download and Licensing', 'https://www.wikidata.org/wiki/Wikidata:Database_download', '2026-10-31T12:00:00Z', 'dump-20261025', 'CC0-1.0', 'sources/wikidata_countries.json', '6eb5a7f7cb1c8fcd049e9a1d8dd77d1c6d744c2abbbaebf8f5ba084021b5ceab', 'published', false, 'Entity data: Sovereign states, capitals and identifiers', 'Wikidata contributors', 'Wikidata data is published under Creative Commons Public Domain Dedication (CC0 1.0)')
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;


INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ('source-wikimedia-commons-flags', 'Wikimedia Commons: Reusing content outside Wikimedia', 'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia', '2026-10-31T12:00:00Z', 'commons-flags-2026', 'Public Domain / CC0-1.0', 'sources/commons_flags.txt', '31699fc079ebff285794b0a48777f5256cb4c5c7fd872a8c1b4c7918eec91fa8', 'published', false, 'Official national vector flag assets', 'Wikimedia Commons contributors', 'Official national flags in public domain or CC0 per Wikimedia Commons')
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;


INSERT INTO knowledge_modules (module_id, content_version, subject, title, teacher_id, examiner_id, status)
VALUES ('math-basics', 'v1', 'mathematics', 'Математика: основные операции', 'teacher-mathematics', 'examiner-mathematics', 'published')
ON CONFLICT (module_id, content_version) DO UPDATE SET title = EXCLUDED.title, subject = EXCLUDED.subject;


INSERT INTO knowledge_modules (module_id, content_version, subject, title, teacher_id, examiner_id, status)
VALUES ('informatics-basics', 'v1', 'informatics', 'Информатика: данные и алгоритмы', 'teacher-informatics', 'examiner-informatics', 'published')
ON CONFLICT (module_id, content_version) DO UPDATE SET title = EXCLUDED.title, subject = EXCLUDED.subject;


INSERT INTO knowledge_modules (module_id, content_version, subject, title, teacher_id, examiner_id, status)
VALUES ('history-basics', 'v1', 'history', 'История: источники и хронология', 'teacher-history', 'examiner-history', 'published')
ON CONFLICT (module_id, content_version) DO UPDATE SET title = EXCLUDED.title, subject = EXCLUDED.subject;


INSERT INTO knowledge_modules (module_id, content_version, subject, title, teacher_id, examiner_id, status)
VALUES ('flags-basics', 'v1', 'geography_flags', 'География: страны и флаги', 'teacher-flags', 'examiner-flags', 'published')
ON CONFLICT (module_id, content_version) DO UPDATE SET title = EXCLUDED.title, subject = EXCLUDED.subject;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-add', 'math-basics', 'v1', 'addition', 'Сложение объединяет два или более чисел в одну общую сумму. Числа при сложении называются слагаемыми.', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-sub', 'math-basics', 'v1', 'subtraction', 'Вычитание — операция, обратная сложению. Оно находит разность между уменьшаемым и вычитаемым.', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-mul', 'math-basics', 'v1', 'multiplication', 'Умножение представляет собой сложение одинаковых слагаемых. Числа при умножении называются множителями, результат — произведением.', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-div', 'math-basics', 'v1', 'division', 'Деление — обратная операция к умножению, разделяющая число на равные части. Делить на ноль невозможно.', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-order', 'math-basics', 'v1', 'order-of-operations', 'Умножение и деление выполняются раньше сложения и вычитания. Действия в скобках имеют наивысший приоритет.', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-comm', 'math-basics', 'v1', 'properties', 'От перестановки слагаемых сумма не меняется (переместительное свойство сложения: a + b = b + a).', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-zero', 'math-basics', 'v1', 'zero-property', 'Прибавление нуля к любому числу не изменяет его. Умножение любого числа на ноль даёт ноль.', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('math-fact-one', 'math-basics', 'v1', 'one-property', 'Умножение любого числа на единицу оставляет число неизменным (1 — нейтральный элемент умножения).', '{"source-math-arithmetic"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-binary-base', 'informatics-basics', 'v1', 'binary-system', 'Компьютеры представляют все данные с помощью нулей и единиц (бит). Бит — наименьшая единица информации.', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-binary-weights', 'informatics-basics', 'v1', 'binary-system', 'В двоичной системе каждый следующий разряд справа налево весит вдвое больше предыдущего: 1, 2, 4, 8, 16.', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-byte', 'informatics-basics', 'v1', 'data-units', 'Байт состоит из 8 бит и может кодировать 256 различных значений (от 0 до 255).', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-parity', 'informatics-basics', 'v1', 'error-detection', 'Бит чётности добавляется к данным, чтобы сделать общее количество единиц чётным, что позволяет обнаружить ошибку.', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-binary-search', 'informatics-basics', 'v1', 'search-algorithms', 'Бинарный поиск делит упорядоченный список пополам на каждом шаге, быстро находя нужный элемент.', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-sorting', 'informatics-basics', 'v1', 'sorting', 'Сети сортировки и алгоритмы упорядочивания элементов используют попарные сравнения.', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-rle', 'informatics-basics', 'v1', 'compression', 'Сжатие серий (RLE) заменяет повторяющиеся одинаковые символы на символ и число его повторений.', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('cs-fact-algorithm', 'informatics-basics', 'v1', 'algorithm-definition', 'Алгоритм — это точная и понятная пошаговая инструкция для решения конкретной задачи за конечное число шагов.', '{"source-cs-unplugged"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-sources-def', 'history-basics', 'v1', 'sources-theory', 'Исторический источник — это любой объект или документ, созданный человеком или отражающий исторический процесс и содержащий информацию о прошлом.', '{"source-ruwiki-hist-source"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-types', 'history-basics', 'v1', 'sources-types', 'Источники делятся на вещественные (артефакты, постройки), письменные (летописи, грамоты, законы), устные (былины, предания) и изобразительные.', '{"source-ruwiki-hist-source"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-primary', 'history-basics', 'v1', 'sources-primary', 'Первичный источник создан непосредственным очевидцем или участником событий во время их свершения.', '{"source-ruwiki-hist-source","source-wikibooks-world-history"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-chronology-def', 'history-basics', 'v1', 'chronology-base', 'Хронология — наука об измерении времени и установлении точной последовательности исторических событий.', '{"source-ruwiki-chronology"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-calendars', 'history-basics', 'v1', 'calendars', 'Юлианский календарь (''старый стиль'') был введён Юлием Цезарем в 45 г. до н.э., а более точный григорианский (''новый стиль'') — папой Григорием XIII в 1582 году.', '{"source-ruwiki-chronology"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-dating', 'history-basics', 'v1', 'dating-methods', 'Радиоуглеродный анализ измеряет распад углерода-14 в органических материалах для определения их возраста.', '{"source-wikibooks-world-history"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-century', 'history-basics', 'v1', 'time-units', 'Век равен 100 годам, тысячелетие — 1000 годам. Нулевого года в историческом летосчислении не существует.', '{"source-ruwiki-chronology"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('hist-fact-archaeology', 'history-basics', 'v1', 'archaeology', 'Археология изучает прошлое человечества преимущественно по материальным (вещественным) остаткам жизни и деятельности людей.', '{"source-wikibooks-world-history"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-jp-loc', 'flags-basics', 'v1', 'geography', 'Япония — островное государство в Восточной Азии, расположенное в Тихом океане.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-jp-cap', 'flags-basics', 'v1', 'capital', 'Столицей страны является город Токио.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-jp-geo', 'flags-basics', 'v1', 'geography', 'Территория страны включает более четырнадцати тысяч островов, а высочайшей вершиной служит вулкан Фудзияма.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-jp-flag', 'flags-basics', 'v1', 'flag', 'Государственный флаг представляет собой белое полотнище с красным кругом в центре.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fr-loc', 'flags-basics', 'v1', 'geography', 'Франция — государство в Западной Европе с выходом к Атлантическому океану и Средиземному морю.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fr-cap', 'flags-basics', 'v1', 'capital', 'Её столицей и крупнейшим историческим центром является Париж.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fr-geo', 'flags-basics', 'v1', 'geography', 'На территории страны расположены западные склоны Альп с вершиной Монблан.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fr-flag', 'flags-basics', 'v1', 'flag', 'Флаг страны состоит из трех вертикальных полос синего, белого и красного цвета.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-br-loc', 'flags-basics', 'v1', 'geography', 'Бразилия — крупнейшее государство Южной Америки, занимающее почти половину материка.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-br-cap', 'flags-basics', 'v1', 'capital', 'Официальной столицей государства является город Бразилиа.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-br-geo', 'flags-basics', 'v1', 'geography', 'Здесь протекает река Амазонка и раскинулся крупнейший в мире массив тропических дождевых лесов.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-br-flag', 'flags-basics', 'v1', 'flag', 'Флаг страны имеет зеленое поле с желтым ромбом и синим небесным кругом.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ca-loc', 'flags-basics', 'v1', 'geography', 'Канада — второе по площади государство мира, расположенное в Северной Америке.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ca-cap', 'flags-basics', 'v1', 'capital', 'Столицей страны является город Оттава.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ca-geo', 'flags-basics', 'v1', 'geography', 'Страна обладает самой протяженной береговой линией в мире и омывается тремя океанами.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ca-flag', 'flags-basics', 'v1', 'flag', 'На государственном флаге изображен красный одиннадцатиконечный кленовый лист на белом фоне.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-de-loc', 'flags-basics', 'v1', 'geography', 'Германия — федеративное государство, расположенное в Центральной Европе.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-de-cap', 'flags-basics', 'v1', 'capital', 'Столицей и крупнейшим мегаполисом страны является Берлин.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-de-geo', 'flags-basics', 'v1', 'geography', 'Рельеф повышается с севера на юг от Северо-Германской низменности к отрогам Альп.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-de-flag', 'flags-basics', 'v1', 'flag', 'Флаг представляет собой горизонтальный триколор из черной, красной и золотой полос.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-it-loc', 'flags-basics', 'v1', 'geography', 'Италия — государство на юге Европы, занимающее Апеннинский полуостров и острова Сицилия и Сардиния.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-it-cap', 'flags-basics', 'v1', 'capital', 'Её исторической столицей является Рим.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-it-geo', 'flags-basics', 'v1', 'geography', 'На территории страны расположены действующие вулканы Везувий и Этна.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-it-flag', 'flags-basics', 'v1', 'flag', 'Флаг государства состоит из трех вертикальных полос зеленого, белого и красного цветов.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-in-loc', 'flags-basics', 'v1', 'geography', 'Индия — крупное государство в Южной Азии, занимающее полуостров Индостан.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-in-cap', 'flags-basics', 'v1', 'capital', 'Столицей страны является Нью-Дели.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-in-geo', 'flags-basics', 'v1', 'geography', 'На севере страны возвышаются Гималаи, а по равнинам протекают священные реки Инд и Ганг.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-in-flag', 'flags-basics', 'v1', 'flag', 'Флаг представляет собой триколор с синим колесом из двадцати четырех спиц в центре.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-eg-loc', 'flags-basics', 'v1', 'geography', 'Египет — трансконтинентальное государство на северо-востоке Африки и Синайском полуострове в Азии.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-eg-cap', 'flags-basics', 'v1', 'capital', 'Столицей страны является древний город Каир.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-eg-geo', 'flags-basics', 'v1', 'geography', 'Через всю территорию страны протекает река Нил, оазисы которой окружены пустынями Сахарой и Аравийской.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-eg-flag', 'flags-basics', 'v1', 'flag', 'Флаг состоит из красной, белой и черной полос с золотым орлом в центре.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-au-loc', 'flags-basics', 'v1', 'geography', 'Австралия — государство, занимающее целый одноименный материк в Южном полушарии.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-au-cap', 'flags-basics', 'v1', 'capital', 'Столицей государства является специально построенный город Канберра.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-au-geo', 'flags-basics', 'v1', 'geography', 'Вдоль северо-восточного побережья тянется Большой Барьерный риф, крупнейший коралловый риф планеты.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-au-flag', 'flags-basics', 'v1', 'flag', 'На синем полотнище флага изображен британский флаг в углу и белые звезды Южного Креста.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-gr-loc', 'flags-basics', 'v1', 'geography', 'Греция — государство на юге Балканского полуострова в Южной Европе.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-gr-cap', 'flags-basics', 'v1', 'capital', 'Столицей страны и колыбелью античной демократии являются Афины.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-gr-geo', 'flags-basics', 'v1', 'geography', 'Около двадцати процентов площади страны приходится на многочисленные острова в Эгейском и Ионическом морях.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-gr-flag', 'flags-basics', 'v1', 'flag', 'Флаг состоит из девяти сине-белых полос и белого креста в левом верхнем углу.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ar-loc', 'flags-basics', 'v1', 'geography', 'Аргентина — второе по площади государство Южной Америки, протянувшееся вдоль горной цепи Анд.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ar-cap', 'flags-basics', 'v1', 'capital', 'Её столицей служит портовый город Буэнос-Айрес.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ar-geo', 'flags-basics', 'v1', 'geography', 'На территории страны находится вершина Аконкагуа, высочайшая точка Западного полушария.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ar-flag', 'flags-basics', 'v1', 'flag', 'На флаге между двумя голубыми полосами расположено изображение золотого солнца.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-se-loc', 'flags-basics', 'v1', 'geography', 'Швеция — скандинавское государство на севере Европы, омываемое Балтийским морем.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-se-cap', 'flags-basics', 'v1', 'capital', 'Столицей государства является город Стокгольм, расположенный на четырнадцати островах.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-se-geo', 'flags-basics', 'v1', 'geography', 'Большую часть территории покрывают хвойные таежные леса и тысячи пресноводных озер.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-se-flag', 'flags-basics', 'v1', 'flag', 'Флаг страны синего цвета с характерным желтым скандинавским крестом.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ch-loc', 'flags-basics', 'v1', 'geography', 'Швейцария — альпийское государство в Центральной Европе, не имеющее выхода к морю.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ch-cap', 'flags-basics', 'v1', 'capital', 'Федеральным центром и фактической столицей Конфедерации является город Берн.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ch-geo', 'flags-basics', 'v1', 'geography', 'Значительную часть страны занимают Альпы и Юрские горы с живописными ледниками.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-ch-flag', 'flags-basics', 'v1', 'flag', 'Государственный флаг имеет редкую квадратную форму с белым крестом на красном поле.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-tr-loc', 'flags-basics', 'v1', 'geography', 'Турция — государство, расположенное одновременно в Юго-Западной Азии и Юго-Восточной Европе.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-tr-cap', 'flags-basics', 'v1', 'capital', 'Официальной столицей государства является город Анкара.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-tr-geo', 'flags-basics', 'v1', 'geography', 'Проливы Босфор и Дарданеллы соединяют Черное море со Средиземным через Мраморное море.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-tr-flag', 'flags-basics', 'v1', 'flag', 'Флаг страны красного цвета с белым полумесяцем и пятиконечной звездой.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kr-loc', 'flags-basics', 'v1', 'geography', 'Республика Корея — государство в Восточной Азии, расположенное на юге Корейского полуострова.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kr-cap', 'flags-basics', 'v1', 'capital', 'Её столицей и крупнейшим городом является Сеул.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kr-geo', 'flags-basics', 'v1', 'geography', 'Около семидесяти процентов площади страны занимают живописные горные хребты и возвышенности.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kr-flag', 'flags-basics', 'v1', 'flag', 'На белом фоне флага изображен красно-синий символ гармонии и четыре черные триграммы.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-mx-loc', 'flags-basics', 'v1', 'geography', 'Мексика — государство в южной части Северной Америки, омываемое Тихим океаном и Мексиканским заливом.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-mx-cap', 'flags-basics', 'v1', 'capital', 'Столицей страны является город Мехико, основанный на месте древнего Теночтитлана.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-mx-geo', 'flags-basics', 'v1', 'geography', 'На территории страны протянулись горные цепи Восточной и Западной Сьерра-Мадре с вулканом Орисаба.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-mx-flag', 'flags-basics', 'v1', 'flag', 'Флаг представляет собой зелено-бело-красный триколор с гербовым орлом на белой полосе.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-no-loc', 'flags-basics', 'v1', 'geography', 'Норвегия — северное европейское государство, занимающее западную часть Скандинавского полуострова.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-no-cap', 'flags-basics', 'v1', 'capital', 'Столицей королевства является город Осло на берегу Осло-фьорда.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-no-geo', 'flags-basics', 'v1', 'geography', 'Побережье страны изрезано тысячами глубоких живописных морских фьордов.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-no-flag', 'flags-basics', 'v1', 'flag', 'Флаг имеет красное поле с синим скандинавским крестом в белой окантовке.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fi-loc', 'flags-basics', 'v1', 'geography', 'Финляндия — государство в Северной Европе, омываемое Балтийским морем и его заливами.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fi-cap', 'flags-basics', 'v1', 'capital', 'Столицей государства является приморский город Хельсинки.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fi-geo', 'flags-basics', 'v1', 'geography', 'Страну часто называют краем тысячи озер, ведь на ее территории находится около ста восьмидесяти тысяч водоемов.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-fi-flag', 'flags-basics', 'v1', 'flag', 'Флаг представляет собой белый прямоугольник с синим скандинавским крестом.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-es-loc', 'flags-basics', 'v1', 'geography', 'Испания — государство на юго-западе Европы, занимающее большую часть Пиренейского полуострова.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-es-cap', 'flags-basics', 'v1', 'capital', 'Столицей королевства является город Мадрид, расположенный в самом центре страны.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-es-geo', 'flags-basics', 'v1', 'geography', 'Значительную часть территории занимает обширное плоскогорье Месета и горные цепи Пиренеев.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-es-flag', 'flags-basics', 'v1', 'flag', 'Флаг состоит из красной, широкой желтой и красной полос с гербом со стороны древка.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kz-loc', 'flags-basics', 'v1', 'geography', 'Казахстан — крупнейшее государство Центральной Азии, не имеющее выхода к Мировому океану.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kz-cap', 'flags-basics', 'v1', 'capital', 'Столицей республики является город Астана на реке Ишим.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kz-geo', 'flags-basics', 'v1', 'geography', 'Большую часть территории занимают бескрайние степи, полупустыни и горные цепи Тянь-Шаня.', '{"source-wikidata-country-dump"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ('fact-kz-flag', 'flags-basics', 'v1', 'flag', 'На лазурно-голубом полотнище флага сияет золотое солнце с парящим степным орлом.', '{"source-wikimedia-commons-flags"}'::text[], 'published')
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-01', '3f2a49ee7bb70bb53be2a3c182cd0bb7bff3c2acc6639b74fe8405e39a8565c5', 190, '/api/v2/worlds/discovery-campus/assets/3f2a49ee7bb70bb53be2a3c182cd0bb7bff3c2acc6639b74fe8405e39a8565c5', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/3f2a49ee7bb70bb53be2a3c182cd0bb7bff3c2acc6639b74fe8405e39a8565c5.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-02', 'd9404fa8afc895bde34bd7115971be0388e7f33873bb03c05e966525bb98ed57', 250, '/api/v2/worlds/discovery-campus/assets/d9404fa8afc895bde34bd7115971be0388e7f33873bb03c05e966525bb98ed57', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/d9404fa8afc895bde34bd7115971be0388e7f33873bb03c05e966525bb98ed57.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-03', '2167853db01b687cdb3863a6a15f1d2f2a77ded2987854db6267c47a9f77a47e', 343, '/api/v2/worlds/discovery-campus/assets/2167853db01b687cdb3863a6a15f1d2f2a77ded2987854db6267c47a9f77a47e', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/2167853db01b687cdb3863a6a15f1d2f2a77ded2987854db6267c47a9f77a47e.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-04', '173c3ba072edcada576b6efb737014e4c802482f53f8c8d97085592e0f64172e', 490, '/api/v2/worlds/discovery-campus/assets/173c3ba072edcada576b6efb737014e4c802482f53f8c8d97085592e0f64172e', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/173c3ba072edcada576b6efb737014e4c802482f53f8c8d97085592e0f64172e.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-05', 'eae6c394f845a309c2a43f1cb0286b664edc1a1e5eff8453842db94c87e58d6d', 255, '/api/v2/worlds/discovery-campus/assets/eae6c394f845a309c2a43f1cb0286b664edc1a1e5eff8453842db94c87e58d6d', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/eae6c394f845a309c2a43f1cb0286b664edc1a1e5eff8453842db94c87e58d6d.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-06', '5315104c7b3ffc06483ecee87691ca0a76bbf52cc6a7e64275773f34e5ad9560', 250, '/api/v2/worlds/discovery-campus/assets/5315104c7b3ffc06483ecee87691ca0a76bbf52cc6a7e64275773f34e5ad9560', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/5315104c7b3ffc06483ecee87691ca0a76bbf52cc6a7e64275773f34e5ad9560.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-07', '9ceab9c42e93a1ca1164d173b5c53934d162c89652a7440615d2f65b04e6d110', 379, '/api/v2/worlds/discovery-campus/assets/9ceab9c42e93a1ca1164d173b5c53934d162c89652a7440615d2f65b04e6d110', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/9ceab9c42e93a1ca1164d173b5c53934d162c89652a7440615d2f65b04e6d110.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-08', 'b2c1a17664613eb1b5aefa28f1126f8e49f1614c97ef7ed533ca22fecf984bef', 369, '/api/v2/worlds/discovery-campus/assets/b2c1a17664613eb1b5aefa28f1126f8e49f1614c97ef7ed533ca22fecf984bef', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/b2c1a17664613eb1b5aefa28f1126f8e49f1614c97ef7ed533ca22fecf984bef.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-09', '8565614f50b04698d897fb9304b8b6b78b5c75c9ad44c9be20923877d587b9c1', 549, '/api/v2/worlds/discovery-campus/assets/8565614f50b04698d897fb9304b8b6b78b5c75c9ad44c9be20923877d587b9c1', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/8565614f50b04698d897fb9304b8b6b78b5c75c9ad44c9be20923877d587b9c1.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-10', '118774b08e39aa0abbed4b2a1e6195c3dc4a1ecfcfdebd45f29b48ee17fe59a1', 510, '/api/v2/worlds/discovery-campus/assets/118774b08e39aa0abbed4b2a1e6195c3dc4a1ecfcfdebd45f29b48ee17fe59a1', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/118774b08e39aa0abbed4b2a1e6195c3dc4a1ecfcfdebd45f29b48ee17fe59a1.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-11', '92bcb011cd2d428c6db9d4d2d1b87169d745e92c73884efaec3e86b9b3bc617f', 379, '/api/v2/worlds/discovery-campus/assets/92bcb011cd2d428c6db9d4d2d1b87169d745e92c73884efaec3e86b9b3bc617f', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/92bcb011cd2d428c6db9d4d2d1b87169d745e92c73884efaec3e86b9b3bc617f.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-12', 'a98216b170ccd0870d8de0db187777810a5397eeaf7e7d9e5bf179dbd08b0c58', 250, '/api/v2/worlds/discovery-campus/assets/a98216b170ccd0870d8de0db187777810a5397eeaf7e7d9e5bf179dbd08b0c58', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/a98216b170ccd0870d8de0db187777810a5397eeaf7e7d9e5bf179dbd08b0c58.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-13', 'c04830c64f73b9cb4ec52a408a5803b406ea44688cf5b66ee650f9df9fd80f01', 266, '/api/v2/worlds/discovery-campus/assets/c04830c64f73b9cb4ec52a408a5803b406ea44688cf5b66ee650f9df9fd80f01', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/c04830c64f73b9cb4ec52a408a5803b406ea44688cf5b66ee650f9df9fd80f01.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-14', 'e02391bb00afc7010348b2cb7bf858d9cbac41f307d3b1afc33799ea4256c400', 354, '/api/v2/worlds/discovery-campus/assets/e02391bb00afc7010348b2cb7bf858d9cbac41f307d3b1afc33799ea4256c400', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/e02391bb00afc7010348b2cb7bf858d9cbac41f307d3b1afc33799ea4256c400.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-15', '202bbb25568aafb4f9d48ba3f7c1143326e04063a05b188a835240afa9e05383', 537, '/api/v2/worlds/discovery-campus/assets/202bbb25568aafb4f9d48ba3f7c1143326e04063a05b188a835240afa9e05383', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/202bbb25568aafb4f9d48ba3f7c1143326e04063a05b188a835240afa9e05383.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-16', 'de671998d655b698b4258c7854e4ff60f08995fe0100e6a5cfd04f8c399ac651', 355, '/api/v2/worlds/discovery-campus/assets/de671998d655b698b4258c7854e4ff60f08995fe0100e6a5cfd04f8c399ac651', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/de671998d655b698b4258c7854e4ff60f08995fe0100e6a5cfd04f8c399ac651.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-17', '20fbf778498830a74cbf39e4a5d78b1355b7b0112bd99f78a6258ae6dd2ab30b', 358, '/api/v2/worlds/discovery-campus/assets/20fbf778498830a74cbf39e4a5d78b1355b7b0112bd99f78a6258ae6dd2ab30b', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/20fbf778498830a74cbf39e4a5d78b1355b7b0112bd99f78a6258ae6dd2ab30b.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-18', '2a5e2f37d964cf12179a0296265d0a67563f1c93ad0b3cb4c45782ba0eab1e15', 250, '/api/v2/worlds/discovery-campus/assets/2a5e2f37d964cf12179a0296265d0a67563f1c93ad0b3cb4c45782ba0eab1e15', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/2a5e2f37d964cf12179a0296265d0a67563f1c93ad0b3cb4c45782ba0eab1e15.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-19', 'd624d9de7b8fd886787b2f99ca75b73d56f33bb8a22b728fa821ec3e6109d32e', 360, '/api/v2/worlds/discovery-campus/assets/d624d9de7b8fd886787b2f99ca75b73d56f33bb8a22b728fa821ec3e6109d32e', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/d624d9de7b8fd886787b2f99ca75b73d56f33bb8a22b728fa821ec3e6109d32e.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ('flag-asset-20', 'd7dc002ce7bdbd1fb775fe27f40e629ee03049ab2702d036fdc5b6d153e16456', 319, '/api/v2/worlds/discovery-campus/assets/d7dc002ce7bdbd1fb775fe27f40e629ee03049ab2702d036fdc5b6d153e16456', 'image/svg+xml', 900, 600, 'Флаг страны для вопроса', 'assets/d7dc002ce7bdbd1fb775fe27f40e629ee03049ab2702d036fdc5b6d153e16456.svg', 'source-wikimedia-commons-flags', 'Public Domain / CC0-1.0')
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-jp', 'v1', 'Q17', 'Япония', '{"Япония","Japan","Государство Япония"}'::text[], 'Токио', '["Япония — островное государство в Восточной Азии, расположенное в Тихом океане.", "Столицей страны является город Токио.", "Территория страны включает более четырнадцати тысяч островов, а высочайшей вершиной служит вулкан Фудзияма.", "Государственный флаг представляет собой белое полотнище с красным кругом в центре."]'::jsonb, '{"fact-jp-loc","fact-jp-cap","fact-jp-geo","fact-jp-flag"}'::text[], 'flag-asset-01', 'Белое прямоугольное полотнище с ярко-красным круглым диском в центре.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-fr', 'v1', 'Q142', 'Франция', '{"Франция","France","Французская Республика"}'::text[], 'Париж', '["Франция — государство в Западной Европе с выходом к Атлантическому океану и Средиземному морю.", "Её столицей и крупнейшим историческим центром является Париж.", "На территории страны расположены западные склоны Альп с вершиной Монблан.", "Флаг страны состоит из трех вертикальных полос синего, белого и красного цвета."]'::jsonb, '{"fact-fr-loc","fact-fr-cap","fact-fr-geo","fact-fr-flag"}'::text[], 'flag-asset-02', 'Три вертикальные полосы одинаковой ширины синего, белого и красного цветов.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-br', 'v1', 'Q155', 'Бразилия', '{"Бразилия","Brazil","Федеративная Республика Бразилия"}'::text[], 'Бразилиа', '["Бразилия — крупнейшее государство Южной Америки, занимающее почти половину материка.", "Официальной столицей государства является город Бразилиа.", "Здесь протекает река Амазонка и раскинулся крупнейший в мире массив тропических дождевых лесов.", "Флаг страны имеет зеленое поле с желтым ромбом и синим небесным кругом."]'::jsonb, '{"fact-br-loc","fact-br-cap","fact-br-geo","fact-br-flag"}'::text[], 'flag-asset-03', 'Зелёное полотнище с жёлтым ромбом в центре и синим кругом со звёздами и белой лентой.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-ca', 'v1', 'Q16', 'Канада', '{"Канада","Canada"}'::text[], 'Оттава', '["Канада — второе по площади государство мира, расположенное в Северной Америке.", "Столицей страны является город Оттава.", "Страна обладает самой протяженной береговой линией в мире и омывается тремя океанами.", "На государственном флаге изображен красный одиннадцатиконечный кленовый лист на белом фоне."]'::jsonb, '{"fact-ca-loc","fact-ca-cap","fact-ca-geo","fact-ca-flag"}'::text[], 'flag-asset-04', 'Две красные вертикальные полосы по краям, белый центральный квадрат с красным одиннадцатиконечным кленовым листом.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-de', 'v1', 'Q183', 'Германия', '{"Германия","Germany","Федеративная Республика Германия"}'::text[], 'Берлин', '["Германия — федеративное государство, расположенное в Центральной Европе.", "Столицей и крупнейшим мегаполисом страны является Берлин.", "Рельеф повышается с севера на юг от Северо-Германской низменности к отрогам Альп.", "Флаг представляет собой горизонтальный триколор из черной, красной и золотой полос."]'::jsonb, '{"fact-de-loc","fact-de-cap","fact-de-geo","fact-de-flag"}'::text[], 'flag-asset-05', 'Три горизонтальные равновеликие полосы чёрного, красного и золотистого (жёлтого) цветов.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-it', 'v1', 'Q38', 'Италия', '{"Италия","Italy","Итальянская Республика"}'::text[], 'Рим', '["Италия — государство на юге Европы, занимающее Апеннинский полуостров и острова Сицилия и Сардиния.", "Её исторической столицей является Рим.", "На территории страны расположены действующие вулканы Везувий и Этна.", "Флаг государства состоит из трех вертикальных полос зеленого, белого и красного цветов."]'::jsonb, '{"fact-it-loc","fact-it-cap","fact-it-geo","fact-it-flag"}'::text[], 'flag-asset-06', 'Три вертикальные полосы равной ширины: зелёная у древка, белая в центре и красная у свободного края.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-in', 'v1', 'Q668', 'Индия', '{"Индия","India","Республика Индия"}'::text[], 'Нью-Дели', '["Индия — крупное государство в Южной Азии, занимающее полуостров Индостан.", "Столицей страны является Нью-Дели.", "На севере страны возвышаются Гималаи, а по равнинам протекают священные реки Инд и Ганг.", "Флаг представляет собой триколор с синим колесом из двадцати четырех спиц в центре."]'::jsonb, '{"fact-in-loc","fact-in-cap","fact-in-geo","fact-in-flag"}'::text[], 'flag-asset-07', 'Три горизонтальные полосы шафранового, белого и зелёного цветов с синим колесом Ашока Чакра (24 спицы) в центре.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-eg', 'v1', 'Q79', 'Египет', '{"Египет","Egypt","Арабская Республика Египет"}'::text[], 'Каир', '["Египет — трансконтинентальное государство на северо-востоке Африки и Синайском полуострове в Азии.", "Столицей страны является древний город Каир.", "Через всю территорию страны протекает река Нил, оазисы которой окружены пустынями Сахарой и Аравийской.", "Флаг состоит из красной, белой и черной полос с золотым орлом в центре."]'::jsonb, '{"fact-eg-loc","fact-eg-cap","fact-eg-geo","fact-eg-flag"}'::text[], 'flag-asset-08', 'Три горизонтальные полосы красного, белого и чёрного цветов с золотым орлом Саладина на белой полосе.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-au', 'v1', 'Q408', 'Австралия', '{"Австралия","Australia","Австралийский Союз"}'::text[], 'Канберра', '["Австралия — государство, занимающее целый одноименный материк в Южном полушарии.", "Столицей государства является специально построенный город Канберра.", "Вдоль северо-восточного побережья тянется Большой Барьерный риф, крупнейший коралловый риф планеты.", "На синем полотнище флага изображен британский флаг в углу и белые звезды Южного Креста."]'::jsonb, '{"fact-au-loc","fact-au-cap","fact-au-geo","fact-au-flag"}'::text[], 'flag-asset-09', 'Синее полотнище с флагом Великобритании в левом верхнем углу, большой семиконечной звездой под ним и созвездием Южного Креста справа.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-gr', 'v1', 'Q41', 'Греция', '{"Греция","Greece","Греческая Республика"}'::text[], 'Афины', '["Греция — государство на юге Балканского полуострова в Южной Европе.", "Столицей страны и колыбелью античной демократии являются Афины.", "Около двадцати процентов площади страны приходится на многочисленные острова в Эгейском и Ионическом морях.", "Флаг состоит из девяти сине-белых полос и белого креста в левом верхнем углу."]'::jsonb, '{"fact-gr-loc","fact-gr-cap","fact-gr-geo","fact-gr-flag"}'::text[], 'flag-asset-10', 'Девять чередующихся синих и белых горизонтальных полос с белым равносторонним крестом в синем квадрате у древка.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-ar', 'v1', 'Q414', 'Аргентина', '{"Аргентина","Argentina","Аргентинская Республика"}'::text[], 'Буэнос-Айрес', '["Аргентина — второе по площади государство Южной Америки, протянувшееся вдоль горной цепи Анд.", "Её столицей служит портовый город Буэнос-Айрес.", "На территории страны находится вершина Аконкагуа, высочайшая точка Западного полушария.", "На флаге между двумя голубыми полосами расположено изображение золотого солнца."]'::jsonb, '{"fact-ar-loc","fact-ar-cap","fact-ar-geo","fact-ar-flag"}'::text[], 'flag-asset-11', 'Три горизонтальные полосы: светло-синяя, белая и светло-синяя, с золотистым Майским солнцем в центре белой полосы.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-se', 'v1', 'Q34', 'Швеция', '{"Швеция","Sweden","Королевство Швеция"}'::text[], 'Стокгольм', '["Швеция — скандинавское государство на севере Европы, омываемое Балтийским морем.", "Столицей государства является город Стокгольм, расположенный на четырнадцати островах.", "Большую часть территории покрывают хвойные таежные леса и тысячи пресноводных озер.", "Флаг страны синего цвета с характерным желтым скандинавским крестом."]'::jsonb, '{"fact-se-loc","fact-se-cap","fact-se-geo","fact-se-flag"}'::text[], 'flag-asset-12', 'Синее прямоугольное полотнище со скандинавским жёлтым крестом, смещённым влево к древку.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-ch', 'v1', 'Q39', 'Швейцария', '{"Швейцария","Switzerland","Швейцарская Конфедерация"}'::text[], 'Берн', '["Швейцария — альпийское государство в Центральной Европе, не имеющее выхода к морю.", "Федеральным центром и фактической столицей Конфедерации является город Берн.", "Значительную часть страны занимают Альпы и Юрские горы с живописными ледниками.", "Государственный флаг имеет редкую квадратную форму с белым крестом на красном поле."]'::jsonb, '{"fact-ch-loc","fact-ch-cap","fact-ch-geo","fact-ch-flag"}'::text[], 'flag-asset-13', 'Красное квадратное полотнище с белым прямым равносторонним крестом в центре.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-tr', 'v1', 'Q43', 'Турция', '{"Турция","Turkey","Турецкая Республика"}'::text[], 'Анкара', '["Турция — государство, расположенное одновременно в Юго-Западной Азии и Юго-Восточной Европе.", "Официальной столицей государства является город Анкара.", "Проливы Босфор и Дарданеллы соединяют Черное море со Средиземным через Мраморное море.", "Флаг страны красного цвета с белым полумесяцем и пятиконечной звездой."]'::jsonb, '{"fact-tr-loc","fact-tr-cap","fact-tr-geo","fact-tr-flag"}'::text[], 'flag-asset-14', 'Красное полотнище с белым полумесяцем и белой пятиконечной звездой в центре.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-kr', 'v1', 'Q884', 'Республика Корея', '{"Республика Корея","Южная Корея","South Korea"}'::text[], 'Сеул', '["Республика Корея — государство в Восточной Азии, расположенное на юге Корейского полуострова.", "Её столицей и крупнейшим городом является Сеул.", "Около семидесяти процентов площади страны занимают живописные горные хребты и возвышенности.", "На белом фоне флага изображен красно-синий символ гармонии и четыре черные триграммы."]'::jsonb, '{"fact-kr-loc","fact-kr-cap","fact-kr-geo","fact-kr-flag"}'::text[], 'flag-asset-15', 'Белое полотнище с красно-синим кругом тхэгык в центре и четырьмя чёрными триграммами по углам.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-mx', 'v1', 'Q96', 'Мексика', '{"Мексика","Mexico","Мексиканские Соединённые Штаты"}'::text[], 'Мехико', '["Мексика — государство в южной части Северной Америки, омываемое Тихим океаном и Мексиканским заливом.", "Столицей страны является город Мехико, основанный на месте древнего Теночтитлана.", "На территории страны протянулись горные цепи Восточной и Западной Сьерра-Мадре с вулканом Орисаба.", "Флаг представляет собой зелено-бело-красный триколор с гербовым орлом на белой полосе."]'::jsonb, '{"fact-mx-loc","fact-mx-cap","fact-mx-geo","fact-mx-flag"}'::text[], 'flag-asset-16', 'Три вертикальные полосы: зелёная, белая и красная, с государственным гербом (орёл на кактусе со змеёй) в центре.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-no', 'v1', 'Q20', 'Норвегия', '{"Норвегия","Norway","Королевство Норвегия"}'::text[], 'Осло', '["Норвегия — северное европейское государство, занимающее западную часть Скандинавского полуострова.", "Столицей королевства является город Осло на берегу Осло-фьорда.", "Побережье страны изрезано тысячами глубоких живописных морских фьордов.", "Флаг имеет красное поле с синим скандинавским крестом в белой окантовке."]'::jsonb, '{"fact-no-loc","fact-no-cap","fact-no-geo","fact-no-flag"}'::text[], 'flag-asset-17', 'Красное полотнище с тёмно-синим скандинавским крестом с белой каймой.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-fi', 'v1', 'Q33', 'Финляндия', '{"Финляндия","Finland","Финляндская Республика"}'::text[], 'Хельсинки', '["Финляндия — государство в Северной Европе, омываемое Балтийским морем и его заливами.", "Столицей государства является приморский город Хельсинки.", "Страну часто называют краем тысячи озер, ведь на ее территории находится около ста восьмидесяти тысяч водоемов.", "Флаг представляет собой белый прямоугольник с синим скандинавским крестом."]'::jsonb, '{"fact-fi-loc","fact-fi-cap","fact-fi-geo","fact-fi-flag"}'::text[], 'flag-asset-18', 'Белое прямоугольное полотнище с синим скандинавским крестом.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-es', 'v1', 'Q29', 'Испания', '{"Испания","Spain","Королевство Испания"}'::text[], 'Мадрид', '["Испания — государство на юго-западе Европы, занимающее большую часть Пиренейского полуострова.", "Столицей королевства является город Мадрид, расположенный в самом центре страны.", "Значительную часть территории занимает обширное плоскогорье Месета и горные цепи Пиренеев.", "Флаг состоит из красной, широкой желтой и красной полос с гербом со стороны древка."]'::jsonb, '{"fact-es-loc","fact-es-cap","fact-es-geo","fact-es-flag"}'::text[], 'flag-asset-19', 'Три горизонтальные полосы: красная, жёлтая (двойной ширины) и красная, с государственным гербом у древка.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ('country-kz', 'v1', 'Q232', 'Казахстан', '{"Казахстан","Kazakhstan","Республика Казахстан"}'::text[], 'Астана', '["Казахстан — крупнейшее государство Центральной Азии, не имеющее выхода к Мировому океану.", "Столицей республики является город Астана на реке Ишим.", "Большую часть территории занимают бескрайние степи, полупустыни и горные цепи Тянь-Шаня.", "На лазурно-голубом полотнище флага сияет золотое солнце с парящим степным орлом."]'::jsonb, '{"fact-kz-loc","fact-kz-cap","fact-kz-geo","fact-kz-flag"}'::text[], 'flag-asset-20', 'Лазурно-голубое полотнище с золотым солнцем с 32 лучами, парящим степным беркутом в центре и национальным орнаментом у древка.', '{"source-wikidata-country-dump","source-wikimedia-commons-flags"}'::text[], 'published', false)
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q01', 'math-fam-add', 'math-basics', 'v1', 'single_choice', 'Чему равна сумма чисел 25 и 17?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-add"}'::text[], '{"acceptedValues": ["42"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Складываем десятки и единицы: 25 + 17 = 20 + 10 + 5 + 7 = 30 + 12 = 42.', 'basic', 'Сложение натуральных чисел', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q01', 'v1', 'opt-1', '42', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q01', 'v1', 'opt-2', '32', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q01', 'v1', 'opt-3', '41', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q01', 'v1', 'opt-4', '52', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q02', 'math-fam-sub', 'math-basics', 'v1', 'single_choice', 'Чему равна разность 50 - 18?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-sub"}'::text[], '{"acceptedValues": ["32"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Вычитаем из 50 число 18: 50 - 10 = 40, затем 40 - 8 = 32.', 'basic', 'Вычитание натуральных чисел', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q02', 'v1', 'opt-1', '32', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q02', 'v1', 'opt-2', '38', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q02', 'v1', 'opt-3', '42', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q02', 'v1', 'opt-4', '22', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q03', 'math-fam-mul', 'math-basics', 'v1', 'single_choice', 'Чему равно произведение 7 × 8?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-mul"}'::text[], '{"acceptedValues": ["56"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'По таблице умножения 7 × 8 = 56.', 'basic', 'Таблица умножения', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q03', 'v1', 'opt-1', '54', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q03', 'v1', 'opt-2', '56', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q03', 'v1', 'opt-3', '64', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q03', 'v1', 'opt-4', '48', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q04', 'math-fam-div', 'math-basics', 'v1', 'single_choice', 'Чему равен результат деления 72 : 9?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-div"}'::text[], '{"acceptedValues": ["8"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Деление 72 на 9 даёт 8, так как 8 × 9 = 72.', 'basic', 'Деление натуральных чисел', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q04', 'v1', 'opt-1', '7', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q04', 'v1', 'opt-2', '8', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q04', 'v1', 'opt-3', '9', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q04', 'v1', 'opt-4', '6', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q05', 'math-fam-order', 'math-basics', 'v1', 'single_choice', 'Вычислите значение выражения: 4 + 3 × 5', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-order"}'::text[], '{"acceptedValues": ["19"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Сначала выполняется умножение: 3 × 5 = 15, затем сложение: 4 + 15 = 19.', 'basic', 'Порядок действий', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q05', 'v1', 'opt-1', '35', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q05', 'v1', 'opt-2', '19', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q05', 'v1', 'opt-3', '23', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q05', 'v1', 'opt-4', '27', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q06', 'math-fam-order-paren', 'math-basics', 'v1', 'single_choice', 'Вычислите значение выражения со скобками: (6 + 4) × 3', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-order"}'::text[], '{"acceptedValues": ["30"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Сначала вычисляется значение в скобках: 6 + 4 = 10, затем умножение: 10 × 3 = 30.', 'basic', 'Скобки в выражениях', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q06', 'v1', 'opt-1', '18', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q06', 'v1', 'opt-2', '30', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q06', 'v1', 'opt-3', '24', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q06', 'v1', 'opt-4', '40', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q07', 'math-fam-zero-add', 'math-basics', 'v1', 'single_choice', 'Чему равна сумма 148 + 0?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-zero"}'::text[], '{"acceptedValues": ["148"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Прибавление нуля к любому числу не изменяет его значение: 148 + 0 = 148.', 'basic', 'Свойства нуля', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q07', 'v1', 'opt-1', '0', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q07', 'v1', 'opt-2', '148', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q07', 'v1', 'opt-3', '1480', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q07', 'v1', 'opt-4', '1', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q08', 'math-fam-zero-mul', 'math-basics', 'v1', 'single_choice', 'Чему равно произведение 45 × 0?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-zero"}'::text[], '{"acceptedValues": ["0"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Умножение любого числа на ноль даёт ноль.', 'basic', 'Умножение на ноль', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q08', 'v1', 'opt-1', '45', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q08', 'v1', 'opt-2', '0', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q08', 'v1', 'opt-3', '1', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q08', 'v1', 'opt-4', 'не определено', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q09', 'math-fam-one-mul', 'math-basics', 'v1', 'single_choice', 'Чему равно произведение 37 × 1?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-one"}'::text[], '{"acceptedValues": ["37"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'При умножении любого числа на единицу получается то же самое число.', 'basic', 'Свойства единицы', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q09', 'v1', 'opt-1', '1', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q09', 'v1', 'opt-2', '37', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q09', 'v1', 'opt-3', '38', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q09', 'v1', 'opt-4', '0', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q10', 'math-fam-comm', 'math-basics', 'v1', 'single_choice', 'Какое свойство отражает равенство: 12 + 35 = 35 + 12?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-comm"}'::text[], '{"acceptedValues": ["Переместительное свойство"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Переместительное свойство сложения гласит: от перестановки слагаемых сумма не меняется.', 'basic', 'Свойства сложения', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q10', 'v1', 'opt-1', 'Переместительное свойство', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q10', 'v1', 'opt-2', 'Сочетательное свойство', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q10', 'v1', 'opt-3', 'Распределительное свойство', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q10', 'v1', 'opt-4', 'Деление с остатком', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q11', 'math-fam-div-zero', 'math-basics', 'v1', 'single_choice', 'Что происходит при попытке разделить число 15 на 0?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-div"}'::text[], '{"acceptedValues": ["Деление на ноль невозможно"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-3', 'В арифметике деление на ноль не определено, так как нет такого числа, которое при умножении на 0 дало бы 15.', 'basic', 'Деление на ноль', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q11', 'v1', 'opt-1', 'Получается 0', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q11', 'v1', 'opt-2', 'Получается 15', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q11', 'v1', 'opt-3', 'Деление на ноль невозможно', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q11', 'v1', 'opt-4', 'Получается 1', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q12', 'math-fam-sub-self', 'math-basics', 'v1', 'single_choice', 'Чему равна разность 84 - 84?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-sub"}'::text[], '{"acceptedValues": ["0"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'При вычитании числа из самого себя результат всегда равен нулю: a - a = 0.', 'basic', 'Вычитание одинаковых чисел', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q12', 'v1', 'opt-1', '0', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q12', 'v1', 'opt-2', '1', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q12', 'v1', 'opt-3', '84', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q12', 'v1', 'opt-4', '-1', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q13', 'math-fam-mul-tens', 'math-basics', 'v1', 'single_choice', 'Чему равно произведение 16 × 10?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-mul"}'::text[], '{"acceptedValues": ["160"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'При умножении натурального числа на 10 к нему справа приписывается один ноль: 16 × 10 = 160.', 'basic', 'Умножение на 10', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q13', 'v1', 'opt-1', '106', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q13', 'v1', 'opt-2', '160', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q13', 'v1', 'opt-3', '1600', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q13', 'v1', 'opt-4', '26', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q14', 'math-fam-div-tens', 'math-basics', 'v1', 'single_choice', 'Чему равен результат деления 240 : 10?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-div"}'::text[], '{"acceptedValues": ["24"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'При делении круглого числа на 10 у него убирается один ноль справа: 240 : 10 = 24.', 'basic', 'Деление на 10', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q14', 'v1', 'opt-1', '24', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q14', 'v1', 'opt-2', '2400', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q14', 'v1', 'opt-3', '204', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q14', 'v1', 'opt-4', '2.4', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q15', 'math-fam-order-complex', 'math-basics', 'v1', 'single_choice', 'Вычислите значение выражения: 20 - 2 × 6 + 4', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-order"}'::text[], '{"acceptedValues": ["12"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Сначала умножение: 2 × 6 = 12. Затем действия слева направо: 20 - 12 = 8, и 8 + 4 = 12.', 'basic', 'Порядок нескольких операций', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q15', 'v1', 'opt-1', '112', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q15', 'v1', 'opt-2', '12', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q15', 'v1', 'opt-3', '16', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q15', 'v1', 'opt-4', '4', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q16', 'math-fam-add-three', 'math-basics', 'v1', 'single_choice', 'Чему равна сумма трёх чисел: 15 + 28 + 15?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-add","math-fact-comm"}'::text[], '{"acceptedValues": ["58"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Удобно сложить сначала 15 + 15 = 30, а затем 30 + 28 = 58.', 'basic', 'Группировка слагаемых', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q16', 'v1', 'opt-1', '48', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q16', 'v1', 'opt-2', '58', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q16', 'v1', 'opt-3', '68', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q16', 'v1', 'opt-4', '55', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q17', 'math-fam-div-rem', 'math-basics', 'v1', 'single_choice', 'Чему равен остаток при делении 23 на 4?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-div"}'::text[], '{"acceptedValues": ["3"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-3', '23 = 4 × 5 + 3. Неполное частное равно 5, а остаток равен 3.', 'basic', 'Деление с остатком', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q17', 'v1', 'opt-1', '1', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q17', 'v1', 'opt-2', '2', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q17', 'v1', 'opt-3', '3', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q17', 'v1', 'opt-4', '4', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q18', 'math-fam-mul-square', 'math-basics', 'v1', 'single_choice', 'Чему равен квадрат числа 9 (то есть 9 × 9)?', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-mul"}'::text[], '{"acceptedValues": ["81"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Квадрат числа — это его умножение на самого себя: 9 × 9 = 81.', 'basic', 'Квадрат числа', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q18', 'v1', 'opt-1', '72', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q18', 'v1', 'opt-2', '81', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q18', 'v1', 'opt-3', '90', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q18', 'v1', 'opt-4', '99', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q19', 'math-fam-sub-paren', 'math-basics', 'v1', 'single_choice', 'Вычислите: 50 - (20 + 15)', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-order","math-fact-sub"}'::text[], '{"acceptedValues": ["15"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Сначала вычисляем значение в скобках: 20 + 15 = 35. Затем: 50 - 35 = 15.', 'basic', 'Вычитание суммы', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q19', 'v1', 'opt-1', '45', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q19', 'v1', 'opt-2', '15', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q19', 'v1', 'opt-3', '25', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q19', 'v1', 'opt-4', '35', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('math-q20', 'math-fam-mul-assoc', 'math-basics', 'v1', 'single_choice', 'Вычислите удобным способом: 5 × 17 × 2', NULL, '{"source-math-arithmetic"}'::text[], '{"math-fact-mul","math-fact-comm"}'::text[], '{"acceptedValues": ["170"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Удобно сгруппировать 5 × 2 = 10, а затем умножить на 17: 10 × 17 = 170.', 'basic', 'Сочетательное свойство умножения', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q20', 'v1', 'opt-1', '170', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q20', 'v1', 'opt-2', '85', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q20', 'v1', 'opt-3', '340', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('math-q20', 'v1', 'opt-4', '150', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q01', 'info-fam-bit', 'informatics-basics', 'v1', 'single_choice', 'Как называется наименьшая единица информации в компьютере, принимающая значение 0 или 1?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-base"}'::text[], '{"acceptedValues": ["Бит"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Бит (от англ. binary digit — двоичный знак) является минимальной единицей измерения информации в компьютере.', 'basic', 'Единицы информации', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q01', 'v1', 'opt-1', 'Бит', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q01', 'v1', 'opt-2', 'Байт', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q01', 'v1', 'opt-3', 'Пиксель', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q01', 'v1', 'opt-4', 'Слово', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q02', 'info-fam-byte', 'informatics-basics', 'v1', 'single_choice', 'Сколько бит содержится в одном байте?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-byte"}'::text[], '{"acceptedValues": ["8"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'В одном байте содержится ровно 8 бит. С помощью одного байта можно закодировать 256 различных состояний.', 'basic', 'Байты и биты', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q02', 'v1', 'opt-1', '4', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q02', 'v1', 'opt-2', '8', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q02', 'v1', 'opt-3', '16', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q02', 'v1', 'opt-4', '10', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q03', 'info-fam-bin-val', 'informatics-basics', 'v1', 'single_choice', 'Какое десятичное число записано в двоичной системе как 101?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-weights"}'::text[], '{"acceptedValues": ["5"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'В двоичном числе 101 крайняя единица весит 4, ноль весит 2, правая единица весит 1: 4 + 0 + 1 = 5.', 'basic', 'Перевод из двоичной системы', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q03', 'v1', 'opt-1', '3', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q03', 'v1', 'opt-2', '5', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q03', 'v1', 'opt-3', '6', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q03', 'v1', 'opt-4', '7', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q04', 'info-fam-bin-four', 'informatics-basics', 'v1', 'single_choice', 'Как записывается десятичное число 4 в двоичной системе счисления?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-weights"}'::text[], '{"acceptedValues": ["100"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Веса разрядов: 4, 2, 1. Для числа 4 берём единицу в разряде четвёрок и нули в остальных: 100₂ = 4.', 'basic', 'Двоичная запись чисел', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q04', 'v1', 'opt-1', '11', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q04', 'v1', 'opt-2', '100', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q04', 'v1', 'opt-3', '101', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q04', 'v1', 'opt-4', '110', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q05', 'info-fam-parity-concept', 'informatics-basics', 'v1', 'single_choice', 'Для чего в информатике используется дополнительный бит чётности (parity bit)?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-parity"}'::text[], '{"acceptedValues": ["Для обнаружения ошибок при передаче данных"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Бит чётности позволяет проверить, не исказился ли отдельный бит данных во время передачи по каналу связи.', 'basic', 'Обнаружение ошибок и чётность', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q05', 'v1', 'opt-1', 'Для ускорения передачи данных', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q05', 'v1', 'opt-2', 'Для обнаружения ошибок при передаче данных', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q05', 'v1', 'opt-3', 'Для шифрования паролей', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q05', 'v1', 'opt-4', 'Для сжатия изображений', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q06', 'info-fam-binary-search', 'informatics-basics', 'v1', 'single_choice', 'Какое главное условие необходимо для применения алгоритма бинарного поиска?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-search"}'::text[], '{"acceptedValues": ["Список должен быть отсортирован"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Бинарный поиск работает только на отсортированных данных, поскольку на каждом шаге отсекает ровно половину неподходящих вариантов.', 'basic', 'Бинарный поиск', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q06', 'v1', 'opt-1', 'Список должен быть отсортирован', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q06', 'v1', 'opt-2', 'Все числа должны быть чётными', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q06', 'v1', 'opt-3', 'Список должен быть очень коротким', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q06', 'v1', 'opt-4', 'Данные должны быть зашифрованы', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q07', 'info-fam-algorithm-def', 'informatics-basics', 'v1', 'single_choice', 'Что в информатике называют алгоритмом?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-algorithm"}'::text[], '{"acceptedValues": ["Точную пошаговую последовательность инструкций для решения задачи"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Алгоритм — это упорядоченный набор чётких правил или действий, приводящих к решению поставленной задачи.', 'basic', 'Понятие алгоритма', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q07', 'v1', 'opt-1', 'Любую случайную последовательность чисел', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q07', 'v1', 'opt-2', 'Точную пошаговую последовательность инструкций для решения задачи', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q07', 'v1', 'opt-3', 'Компьютерную микросхему', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q07', 'v1', 'opt-4', 'Сетевой кабель', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q08', 'info-fam-rle-compress', 'informatics-basics', 'v1', 'single_choice', 'Как алгоритм сжатия серий (RLE) сожмёт строку ''AAAAABBB''?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-rle"}'::text[], '{"acceptedValues": ["5A3B"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Алгоритм RLE заменяет непрерывную серию повторяющихся символов на их количество и сам символ: 5 букв A и 3 буквы B дают ''5A3B''.', 'basic', 'Сжатие данных', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q08', 'v1', 'opt-1', '5A3B', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q08', 'v1', 'opt-2', 'A5B3', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q08', 'v1', 'opt-3', 'AB8', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q08', 'v1', 'opt-4', 'AABB', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q09', 'info-fam-bubble-sort', 'informatics-basics', 'v1', 'single_choice', 'На каком базовом действии основана сортировка методом пузырька (Bubble Sort)?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-sorting"}'::text[], '{"acceptedValues": ["Попарное сравнение соседних элементов и обмен местами"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Сортировка пузырьком последовательно сравнивает соседние элементы и меняет их местами, если они расположены в неправильном порядке.', 'basic', 'Алгоритмы сортировки', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q09', 'v1', 'opt-1', 'Попарное сравнение соседних элементов и обмен местами', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q09', 'v1', 'opt-2', 'Случайная перестановка всех элементов', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q09', 'v1', 'opt-3', 'Удаление всех нечётных чисел', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q09', 'v1', 'opt-4', 'Перевод всех чисел в двоичный вид', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q10', 'info-fam-bin-eight', 'informatics-basics', 'v1', 'single_choice', 'Сколько различных значений можно закодировать цепочкой из 3 бит?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-weights"}'::text[], '{"acceptedValues": ["8"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-3', 'Каждый бит имеет 2 возможных состояния. Три бита дают 2³ = 2 × 2 × 2 = 8 различных комбинаций (от 000 до 111).', 'basic', 'Комбинаторика битов', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q10', 'v1', 'opt-1', '3', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q10', 'v1', 'opt-2', '6', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q10', 'v1', 'opt-3', '8', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q10', 'v1', 'opt-4', '16', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q11', 'info-fam-pixel', 'informatics-basics', 'v1', 'single_choice', 'Как называется мельчайшая неделимая точка растрового цифрового изображения?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-base"}'::text[], '{"acceptedValues": ["Пиксель"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Пиксель (от англ. picture element) — это наименьший элемент матрицы цифрового дисплея или растрового рисунка.', 'basic', 'Представление графики', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q11', 'v1', 'opt-1', 'Пиксель', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q11', 'v1', 'opt-2', 'Вектор', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q11', 'v1', 'opt-3', 'Дюйм', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q11', 'v1', 'opt-4', 'Бит', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q12', 'info-fam-linear-search', 'informatics-basics', 'v1', 'single_choice', 'Сколько сравнений в худшем случае потребуется линейному поиску в неотсортированном списке из N элементов?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-search"}'::text[], '{"acceptedValues": ["N"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'В худшем случае искомый элемент находится на самом последнем месте или отсутствует, поэтому придётся проверить все N элементов.', 'basic', 'Линейный поиск', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q12', 'v1', 'opt-1', '1', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q12', 'v1', 'opt-2', 'N', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q12', 'v1', 'opt-3', 'N / 2', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q12', 'v1', 'opt-4', 'N²', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q13', 'info-fam-parity-odd', 'informatics-basics', 'v1', 'single_choice', 'В цепочке данных 1 0 1 1 0 количество единиц нечётно (три единицы). Какой бит чётности нужно добавить для схемы чётной проверки?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-parity"}'::text[], '{"acceptedValues": ["1"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Чтобы общее число единиц стало чётным (четыре), бит чётности должен быть равен 1: 3 + 1 = 4.', 'basic', 'Расчёт бита чётности', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q13', 'v1', 'opt-1', '0', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q13', 'v1', 'opt-2', '1', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q13', 'v1', 'opt-3', 'Любой', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q13', 'v1', 'opt-4', '2', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q14', 'info-fam-ascii', 'informatics-basics', 'v1', 'single_choice', 'Как компьютеры хранят текстовые буквы и знаки в своей памяти?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-byte"}'::text[], '{"acceptedValues": ["В виде числовых кодов по таблице кодировки (например, ASCII или Unicode)"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Каждому символу алфавита ставится в соответствие числовой код (например, ''A'' = 65), который затем сохраняется в двоичном виде.', 'basic', 'Кодирование текста', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q14', 'v1', 'opt-1', 'В виде числовых кодов по таблице кодировки (например, ASCII или Unicode)', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q14', 'v1', 'opt-2', 'Как маленькие фотографии каждой буквы', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q14', 'v1', 'opt-3', 'Только с помощью звуковых волн', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q14', 'v1', 'opt-4', 'Текст сохраняется без изменений как краска на экране', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q15', 'info-fam-bin-two', 'informatics-basics', 'v1', 'single_choice', 'Чему равно значение двоичного числа 10 в десятичной системе?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-weights"}'::text[], '{"acceptedValues": ["2"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'В числе 10₂ в разряде двоек стоит 1, а в разряде единиц — 0. Получаем 1 × 2 + 0 × 1 = 2.', 'basic', 'Двоичное число два', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q15', 'v1', 'opt-1', '10', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q15', 'v1', 'opt-2', '2', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q15', 'v1', 'opt-3', '1', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q15', 'v1', 'opt-4', '0', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q16', 'info-fam-graph-net', 'informatics-basics', 'v1', 'single_choice', 'Из каких двух главных элементов состоит математический граф (компьютерная сеть)?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-algorithm"}'::text[], '{"acceptedValues": ["Вершины (узлы) и рёбра (связи между ними)"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Граф состоит из множества вершин (узлов сети или городов) и соединяющих их рёбер (каналов связи или дорог).', 'basic', 'Теория графов и сети', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q16', 'v1', 'opt-1', 'Вершины (узлы) и рёбра (связи между ними)', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q16', 'v1', 'opt-2', 'Пиксели и байты', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q16', 'v1', 'opt-3', 'Числитель и знаменатель', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q16', 'v1', 'opt-4', 'Процессор и монитор', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q17', 'info-fam-lossless', 'informatics-basics', 'v1', 'single_choice', 'Как называется сжатие данных, при котором исходную информацию можно восстановить абсолютно без потерь?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-rle"}'::text[], '{"acceptedValues": ["Сжатие без потерь (lossless)"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'При сжатии без потерь (lossless, например алгоритмы ZIP или PNG) исходный файл после распаковки бит-в-бит совпадает с оригиналом.', 'basic', 'Сжатие без потерь', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q17', 'v1', 'opt-1', 'Сжатие без потерь (lossless)', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q17', 'v1', 'opt-2', 'Сжатие с потерями (lossy)', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q17', 'v1', 'opt-3', 'Удаление данных', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q17', 'v1', 'opt-4', 'Форматирование', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q18', 'info-fam-bin-fifteen', 'informatics-basics', 'v1', 'single_choice', 'Какое максимальное десятичное число можно записать с помощью 4 бит?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-binary-weights"}'::text[], '{"acceptedValues": ["15"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-3', 'Четыре единицы 1111₂ равны 8 + 4 + 2 + 1 = 15. Всего комбинаций 16 (от 0 до 15).', 'basic', 'Диапазон чисел', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q18', 'v1', 'opt-1', '4', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q18', 'v1', 'opt-2', '8', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q18', 'v1', 'opt-3', '15', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q18', 'v1', 'opt-4', '16', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q19', 'info-fam-sort-net', 'informatics-basics', 'v1', 'single_choice', 'Что делает элемент-компаратор в сети сортировки?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-sorting"}'::text[], '{"acceptedValues": ["Сравнивает два числа и направляет меньшее по одному каналу, а большее — по другому"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Компаратор сравнивает два значения на входе и упорядочивает их на выходе (меньшее наверх, большее вниз).', 'basic', 'Сети сортировки', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q19', 'v1', 'opt-1', 'Сравнивает два числа и направляет меньшее по одному каналу, а большее — по другому', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q19', 'v1', 'opt-2', 'Умножает число на 2', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q19', 'v1', 'opt-3', 'Стирает нечётные числа', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q19', 'v1', 'opt-4', 'Перезагружает компьютер', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('info-q20', 'info-fam-loop', 'informatics-basics', 'v1', 'single_choice', 'Как в алгоритмах называется конструкция, повторяющая выполнение одних и тех же действий, пока выполняется условие?', NULL, '{"source-cs-unplugged"}'::text[], '{"cs-fact-algorithm"}'::text[], '{"acceptedValues": ["Цикл"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Цикл позволяет многократно выполнять блок инструкций заданное число раз или до достижения определённого условия.', 'basic', 'Управляющие конструкции', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q20', 'v1', 'opt-1', 'Ветвление', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q20', 'v1', 'opt-2', 'Цикл', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q20', 'v1', 'opt-3', 'Присваивание', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('info-q20', 'v1', 'opt-4', 'Комментарий', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q01', 'hist-fam-source-def', 'history-basics', 'v1', 'single_choice', 'Что в исторической науке называют историческим источником?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-sources-def"}'::text[], '{"acceptedValues": ["Любой памятник прошлого, созданный человеком и несущий информацию о событиях"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Исторический источник — это свидетельство прошлого, созданное человеком (документ, постройка, предмет быта, предание), по которому изучают историю.', 'basic', 'Понятие исторического источника', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q01', 'v1', 'opt-1', 'Только современные учебники', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q01', 'v1', 'opt-2', 'Любой памятник прошлого, созданный человеком и несущий информацию о событиях', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q01', 'v1', 'opt-3', 'Только старинные монеты', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q01', 'v1', 'opt-4', 'Художественные фильмы о войне', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q02', 'hist-fam-source-written', 'history-basics', 'v1', 'single_choice', 'К какому виду исторических источников относятся древние летописи и указы?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-types"}'::text[], '{"acceptedValues": ["Письменные"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Летописи, грамоты, законы и письма содержат текст, поэтому относятся к письменным историческим источникам.', 'basic', 'Виды источников', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q02', 'v1', 'opt-1', 'Письменные', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q02', 'v1', 'opt-2', 'Вещественные', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q02', 'v1', 'opt-3', 'Устные', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q02', 'v1', 'opt-4', 'Этнографические', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q03', 'hist-fam-source-material', 'history-basics', 'v1', 'single_choice', 'К какому типу источников археологи относят глиняный кувшин, найденный при раскопках?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-types","hist-fact-archaeology"}'::text[], '{"acceptedValues": ["Вещественный"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Предметы быта, посуда, оружие и орудия труда относятся к вещественным (материальным) источникам.', 'basic', 'Вещественные источники', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q03', 'v1', 'opt-1', 'Вещественный', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q03', 'v1', 'opt-2', 'Письменный', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q03', 'v1', 'opt-3', 'Фольклорный', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q03', 'v1', 'opt-4', 'Устный', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q04', 'hist-fam-source-primary', 'history-basics', 'v1', 'single_choice', 'Что отличает первичный исторический источник от вторичного?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-primary"}'::text[], '{"acceptedValues": ["Он создан очевидцем или участником во время происходивших событий"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Первичный источник создаётся современником событий непосредственно в эпоху их свершения, тогда как вторичный — анализ историка спустя время.', 'basic', 'Первичные источники', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q04', 'v1', 'opt-1', 'Он создан очевидцем или участником во время происходивших событий', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q04', 'v1', 'opt-2', 'Он написан обязательно на латинском языке', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q04', 'v1', 'opt-3', 'Он опубликован в журнале в прошлом году', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q04', 'v1', 'opt-4', 'Он обязательно сделан из золота', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q05', 'hist-fam-chrono-def', 'history-basics', 'v1', 'single_choice', 'Какая наука занимается установлением дат и хронологической последовательности событий прошлого?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-chronology-def"}'::text[], '{"acceptedValues": ["Хронология"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Хронология — специальная историческая дисциплина, изучающая системы летосчисления и устанавливающая точные даты событий.', 'basic', 'Хронология', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q05', 'v1', 'opt-1', 'Хронология', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q05', 'v1', 'opt-2', 'Топография', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q05', 'v1', 'opt-3', 'Нумизматика', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q05', 'v1', 'opt-4', 'Геральдика', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q06', 'hist-fam-calendars', 'history-basics', 'v1', 'single_choice', 'Какой календарь был введён в Риме при Юлии Цезаре и стал известен как ''старый стиль''?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-calendars"}'::text[], '{"acceptedValues": ["Юлианский"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'Юлианский календарь был разработан александрийскими астрономами во главе с Созигеном и введён Юлием Цезарем в 45 году до н.э.', 'basic', 'Календарные системы', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q06', 'v1', 'opt-1', 'Григорианский', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q06', 'v1', 'opt-2', 'Юлианский', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q06', 'v1', 'opt-3', 'Лунный', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q06', 'v1', 'opt-4', 'Майя', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q07', 'hist-fam-gregorian', 'history-basics', 'v1', 'single_choice', 'С какой целью в 1582 году папа римский Григорий XIII ввёл новый календарь?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-calendars"}'::text[], '{"acceptedValues": ["Чтобы устранить накопившуюся ошибку в 10 дней и вернуть день весеннего равноденствия на 21 марта"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Григорианский календарь скорректировал накапливавшееся отставание юлианского календаря от астрономического солнечного года.', 'basic', 'Григорианский календарь', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q07', 'v1', 'opt-1', 'Чтобы устранить накопившуюся ошибку в 10 дней и вернуть день весеннего равноденствия на 21 марта', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q07', 'v1', 'opt-2', 'Чтобы сделать в году 10 месяцев', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q07', 'v1', 'opt-3', 'Чтобы отменить високосные годы', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q07', 'v1', 'opt-4', 'Чтобы переименовать дни недели', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q08', 'hist-fam-radiocarbon', 'history-basics', 'v1', 'single_choice', 'Какой научный метод датирования основан на измерении распада изотопа углерода-14 в органических остатках?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-dating"}'::text[], '{"acceptedValues": ["Радиоуглеродный анализ"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Радиоуглеродное датирование измеряет остаточное содержание изотопа ¹⁴C в древесине, костях и других органических находках.', 'basic', 'Методы датирования', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q08', 'v1', 'opt-1', 'Радиоуглеродный анализ', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q08', 'v1', 'opt-2', 'Дендрохронология', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q08', 'v1', 'opt-3', 'Спектральный анализ', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q08', 'v1', 'opt-4', 'Рентгенография', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q09', 'hist-fam-dendro', 'history-basics', 'v1', 'single_choice', 'По какому признаку метод дендрохронологии определяет точный возраст деревянных построек и предметов?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-dating"}'::text[], '{"acceptedValues": ["По годичным кольцам деревьев"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Дендрохронология сопоставляет характерную толщину годичных колец деревьев с эталонной региональной шкалой.', 'basic', 'Дендрохронология', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q09', 'v1', 'opt-1', 'По годичным кольцам деревьев', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q09', 'v1', 'opt-2', 'По цвету древесной коры', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q09', 'v1', 'opt-3', 'По глубине залегания в земле', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q09', 'v1', 'opt-4', 'По весу древесины', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q10', 'hist-fam-century-calc', 'history-basics', 'v1', 'single_choice', 'К какому веку относится 1492 год (год плавания Колумба к берегам Америки)?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-century"}'::text[], '{"acceptedValues": ["XV век"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'XV век длился с 1401 по 1500 год включительно. Следовательно, 1492 год относится к XV веку.', 'basic', 'Определение века по году', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q10', 'v1', 'opt-1', 'XIV век', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q10', 'v1', 'opt-2', 'XV век', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q10', 'v1', 'opt-3', 'XVI век', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q10', 'v1', 'opt-4', 'XVII век', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q11', 'hist-fam-zero-year', 'history-basics', 'v1', 'single_choice', 'Существует ли в традиционной исторической шкале летосчисления (наша эра / до нашей эры) нулевой год?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-century"}'::text[], '{"acceptedValues": ["Нет, после 1 года до н.э. сразу наступает 1 год н.э."], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-2', 'В исторической хронологии нулевого года нет: 1-й год до нашей эры непосредственно сменяется 1-м годом нашей эры.', 'basic', 'Летосчисление и отсутствие нулевого года', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q11', 'v1', 'opt-1', 'Да, между 1 годом до н.э. и 1 годом н.э.', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q11', 'v1', 'opt-2', 'Нет, после 1 года до н.э. сразу наступает 1 год н.э.', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q11', 'v1', 'opt-3', 'Да, нулевой год длился 100 дней', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q11', 'v1', 'opt-4', 'Зависит от времени года', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q12', 'hist-fam-archaeology', 'history-basics', 'v1', 'single_choice', 'Какая дисциплина изучает прошлое человечества путём раскопок вещественных памятников?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-archaeology"}'::text[], '{"acceptedValues": ["Археология"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Археология — наука, открывающая и изучающая материальные следы жизни людей древности (поселения, захоронения, орудия).', 'basic', 'Археология', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q12', 'v1', 'opt-1', 'Археология', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q12', 'v1', 'opt-2', 'Палеография', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q12', 'v1', 'opt-3', 'Геология', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q12', 'v1', 'opt-4', 'Антропология', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q13', 'hist-fam-oral-source', 'history-basics', 'v1', 'single_choice', 'К какому виду исторических источников относятся передаваемые из поколения в поколение народные сказительные былины?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-types"}'::text[], '{"acceptedValues": ["Устные (фольклорные)"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Устные источники сохраняют память о событиях в народных сказаниях, песнях, мифах и пословицах.', 'basic', 'Устные источники', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q13', 'v1', 'opt-1', 'Устные (фольклорные)', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q13', 'v1', 'opt-2', 'Вещественные', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q13', 'v1', 'opt-3', 'Письменные', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q13', 'v1', 'opt-4', 'Архитектурные', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q14', 'hist-fam-numismatics', 'history-basics', 'v1', 'single_choice', 'Как называется специальная историческая дисциплина, изучающая историю монетной чеканки и денежного обращения?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-types"}'::text[], '{"acceptedValues": ["Нумизматика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Нумизматика изучает старинные монеты, медали, клады и историю денежных систем разных эпох.', 'basic', 'Нумизматика', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q14', 'v1', 'opt-1', 'Нумизматика', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q14', 'v1', 'opt-2', 'Сфрагистика', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q14', 'v1', 'opt-3', 'Геральдика', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q14', 'v1', 'opt-4', 'Генеалогия', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q15', 'hist-fam-archives', 'history-basics', 'v1', 'single_choice', 'Как называется специализированное учреждение, где хранятся и исследуются ценные исторические письменные документы?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-sources-def"}'::text[], '{"acceptedValues": ["Архив"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Архивы собирают, систематизируют и надежно сохраняют рукописные и печатные документы государственных органов и граждан.', 'basic', 'Архивы', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q15', 'v1', 'opt-1', 'Архив', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q15', 'v1', 'opt-2', 'Лаборатория', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q15', 'v1', 'opt-3', 'Амфитеатр', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q15', 'v1', 'opt-4', 'Гербарий', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q16', 'hist-fam-criticism', 'history-basics', 'v1', 'single_choice', 'Что включает в себя историческая критика источника перед признанием его данных достоверными?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-sources-def","hist-fact-primary"}'::text[], '{"acceptedValues": ["Установление авторства, времени создания, подлинности и сопоставление с другими свидетельствами"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Критика источников (внешняя и внутренняя) позволяет выявить подделки, определить предвзятость автора и подтвердить достоверность фактов.', 'basic', 'Критика исторических источников', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q16', 'v1', 'opt-1', 'Установление авторства, времени создания, подлинности и сопоставление с другими свидетельствами', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q16', 'v1', 'opt-2', 'Проверку документа на орфографические ошибки', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q16', 'v1', 'opt-3', 'Оценку стоимости продажи документа на аукционе', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q16', 'v1', 'opt-4', 'Перевод текста исключительно на современный сленг', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q17', 'hist-fam-millennium', 'history-basics', 'v1', 'single_choice', 'Сколько лет составляет одно тысячелетие?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-century"}'::text[], '{"acceptedValues": ["1000 лет"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-3', 'Одно тысячелетие (миллениум) равно ровно 10 векам или 1000 календарным годам.', 'basic', 'Единицы измерения времени', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q17', 'v1', 'opt-1', '100 лет', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q17', 'v1', 'opt-2', '500 лет', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q17', 'v1', 'opt-3', '1000 лет', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q17', 'v1', 'opt-4', '10 000 лет', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q18', 'hist-fam-heraldry', 'history-basics', 'v1', 'single_choice', 'Какая вспомогательная историческая дисциплина изучает гербы и государственные символы?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-types"}'::text[], '{"acceptedValues": ["Геральдика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Геральдика — наука о гербах, их происхождении, строении, правилах составления и значении символических элементов.', 'basic', 'Геральдика', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q18', 'v1', 'opt-1', 'Геральдика', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q18', 'v1', 'opt-2', 'Бонистика', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q18', 'v1', 'opt-3', 'Эпиграфика', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q18', 'v1', 'opt-4', 'Топонимика', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q19', 'hist-fam-bce-direction', 'history-basics', 'v1', 'single_choice', 'В каком порядке велся отсчет лет до нашей эры (до н.э.)?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-chronology-def","hist-fact-century"}'::text[], '{"acceptedValues": ["В порядке убывания к 1 году н.э. (например: 500 г. до н.э., затем 499 г. до н.э.)"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'При движении вперед во времени события до нашей эры приближаются к рубежу эр, поэтому число года уменьшается: 100 г. до н.э. был раньше, чем 50 г. до н.э.', 'basic', 'Счёт лет до нашей эры', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q19', 'v1', 'opt-1', 'В порядке убывания к 1 году н.э. (например: 500 г. до н.э., затем 499 г. до н.э.)', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q19', 'v1', 'opt-2', 'В порядке возрастания, как и в нашей эре', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q19', 'v1', 'opt-3', 'Случайным образом по указанию правителей', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q19', 'v1', 'opt-4', 'Отсчет велся только по десятилетиям', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('hist-q20', 'hist-fam-stratigraphy', 'history-basics', 'v1', 'single_choice', 'На каком принципе основан закон стратиграфии в археологии при определении относительного возраста находок?', NULL, '{"source-ruwiki-hist-source","source-ruwiki-chronology"}'::text[], '{"hist-fact-dating","hist-fact-archaeology"}'::text[], '{"acceptedValues": ["При ненарушенном залегании нижние слои почвы образовались раньше верхних"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Закон суперпозиции гласит, что более глубокие геологические и культурные слои откладывались раньше тех, что лежат выше.', 'basic', 'Стратиграфия в археологии', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q20', 'v1', 'opt-1', 'При ненарушенном залегании нижние слои почвы образовались раньше верхних', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q20', 'v1', 'opt-2', 'Чем глубже слой, тем предметы в нем новее', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q20', 'v1', 'opt-3', 'Все слои земли имеют одинаковый возраст', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('hist-q20', 'v1', 'opt-4', 'Возраст определяется исключительно цветом глины', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q01', 'flag-fam-country-jp', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-01', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-jp-loc","fact-jp-cap","fact-jp-geo","fact-jp-flag"}'::text[], '{"acceptedValues": ["Япония", "Japan", "Государство Япония"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Япония. Особенности полотнища: Белое прямоугольное полотнище с ярко-красным круглым диском в центре.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q01', 'v1', 'opt-1', 'Япония', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q01', 'v1', 'opt-2', 'Китай', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q01', 'v1', 'opt-3', 'Республика Корея', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q01', 'v1', 'opt-4', 'Вьетнам', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q02', 'flag-fam-country-fr', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-02', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-fr-loc","fact-fr-cap","fact-fr-geo","fact-fr-flag"}'::text[], '{"acceptedValues": ["Франция", "France", "Французская Республика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Франция. Особенности полотнища: Три вертикальные полосы одинаковой ширины синего, белого и красного цветов.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q02', 'v1', 'opt-1', 'Франция', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q02', 'v1', 'opt-2', 'Италия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q02', 'v1', 'opt-3', 'Нидерланды', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q02', 'v1', 'opt-4', 'Бельгия', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q03', 'flag-fam-country-br', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-03', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-br-loc","fact-br-cap","fact-br-geo","fact-br-flag"}'::text[], '{"acceptedValues": ["Бразилия", "Brazil", "Федеративная Республика Бразилия"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Бразилия. Особенности полотнища: Зелёное полотнище с жёлтым ромбом в центре и синим кругом со звёздами и белой лентой.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q03', 'v1', 'opt-1', 'Бразилия', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q03', 'v1', 'opt-2', 'Аргентина', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q03', 'v1', 'opt-3', 'Колумбия', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q03', 'v1', 'opt-4', 'Перу', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q04', 'flag-fam-country-ca', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-04', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-ca-loc","fact-ca-cap","fact-ca-geo","fact-ca-flag"}'::text[], '{"acceptedValues": ["Канада", "Canada"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Канада. Особенности полотнища: Две красные вертикальные полосы по краям, белый центральный квадрат с красным одиннадцатиконечным кленовым листом.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q04', 'v1', 'opt-1', 'Канада', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q04', 'v1', 'opt-2', 'США', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q04', 'v1', 'opt-3', 'Австралия', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q04', 'v1', 'opt-4', 'Великобритания', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q05', 'flag-fam-country-de', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-05', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-de-loc","fact-de-cap","fact-de-geo","fact-de-flag"}'::text[], '{"acceptedValues": ["Германия", "Germany", "Федеративная Республика Германия"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Германия. Особенности полотнища: Три горизонтальные равновеликие полосы чёрного, красного и золотистого (жёлтого) цветов.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q05', 'v1', 'opt-1', 'Германия', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q05', 'v1', 'opt-2', 'Бельгия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q05', 'v1', 'opt-3', 'Австрия', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q05', 'v1', 'opt-4', 'Польша', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q06', 'flag-fam-country-it', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-06', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-it-loc","fact-it-cap","fact-it-geo","fact-it-flag"}'::text[], '{"acceptedValues": ["Италия", "Italy", "Итальянская Республика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Италия. Особенности полотнища: Три вертикальные полосы равной ширины: зелёная у древка, белая в центре и красная у свободного края.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q06', 'v1', 'opt-1', 'Италия', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q06', 'v1', 'opt-2', 'Мексика', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q06', 'v1', 'opt-3', 'Ирландия', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q06', 'v1', 'opt-4', 'Венгрия', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q07', 'flag-fam-country-in', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-07', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-in-loc","fact-in-cap","fact-in-geo","fact-in-flag"}'::text[], '{"acceptedValues": ["Индия", "India", "Республика Индия"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Индия. Особенности полотнища: Три горизонтальные полосы шафранового, белого и зелёного цветов с синим колесом Ашока Чакра (24 спицы) в центре.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q07', 'v1', 'opt-1', 'Индия', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q07', 'v1', 'opt-2', 'Пакистан', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q07', 'v1', 'opt-3', 'Бангладеш', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q07', 'v1', 'opt-4', 'Непал', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q08', 'flag-fam-country-eg', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-08', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-eg-loc","fact-eg-cap","fact-eg-geo","fact-eg-flag"}'::text[], '{"acceptedValues": ["Египет", "Egypt", "Арабская Республика Египет"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Египет. Особенности полотнища: Три горизонтальные полосы красного, белого и чёрного цветов с золотым орлом Саладина на белой полосе.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q08', 'v1', 'opt-1', 'Египет', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q08', 'v1', 'opt-2', 'Ирак', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q08', 'v1', 'opt-3', 'Сирия', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q08', 'v1', 'opt-4', 'Судан', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q09', 'flag-fam-country-au', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-09', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-au-loc","fact-au-cap","fact-au-geo","fact-au-flag"}'::text[], '{"acceptedValues": ["Австралия", "Australia", "Австралийский Союз"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Австралия. Особенности полотнища: Синее полотнище с флагом Великобритании в левом верхнем углу, большой семиконечной звездой под ним и созвездием Южного Креста справа.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q09', 'v1', 'opt-1', 'Австралия', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q09', 'v1', 'opt-2', 'Новая Зеландия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q09', 'v1', 'opt-3', 'Великобритания', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q09', 'v1', 'opt-4', 'Фиджи', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q10', 'flag-fam-country-gr', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-10', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-gr-loc","fact-gr-cap","fact-gr-geo","fact-gr-flag"}'::text[], '{"acceptedValues": ["Греция", "Greece", "Греческая Республика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Греция. Особенности полотнища: Девять чередующихся синих и белых горизонтальных полос с белым равносторонним крестом в синем квадрате у древка.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q10', 'v1', 'opt-1', 'Греция', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q10', 'v1', 'opt-2', 'Кипр', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q10', 'v1', 'opt-3', 'Финляндия', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q10', 'v1', 'opt-4', 'Израиль', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q11', 'flag-fam-country-ar', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-11', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-ar-loc","fact-ar-cap","fact-ar-geo","fact-ar-flag"}'::text[], '{"acceptedValues": ["Аргентина", "Argentina", "Аргентинская Республика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Аргентина. Особенности полотнища: Три горизонтальные полосы: светло-синяя, белая и светло-синяя, с золотистым Майским солнцем в центре белой полосы.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q11', 'v1', 'opt-1', 'Аргентина', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q11', 'v1', 'opt-2', 'Уругвай', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q11', 'v1', 'opt-3', 'Парагвай', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q11', 'v1', 'opt-4', 'Чили', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q12', 'flag-fam-country-se', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-12', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-se-loc","fact-se-cap","fact-se-geo","fact-se-flag"}'::text[], '{"acceptedValues": ["Швеция", "Sweden", "Королевство Швеция"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Швеция. Особенности полотнища: Синее прямоугольное полотнище со скандинавским жёлтым крестом, смещённым влево к древку.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q12', 'v1', 'opt-1', 'Швеция', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q12', 'v1', 'opt-2', 'Норвегия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q12', 'v1', 'opt-3', 'Финляндия', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q12', 'v1', 'opt-4', 'Дания', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q13', 'flag-fam-country-ch', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-13', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-ch-loc","fact-ch-cap","fact-ch-geo","fact-ch-flag"}'::text[], '{"acceptedValues": ["Швейцария", "Switzerland", "Швейцарская Конфедерация"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Швейцария. Особенности полотнища: Красное квадратное полотнище с белым прямым равносторонним крестом в центре.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q13', 'v1', 'opt-1', 'Швейцария', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q13', 'v1', 'opt-2', 'Австрия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q13', 'v1', 'opt-3', 'Дания', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q13', 'v1', 'opt-4', 'Чехия', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q14', 'flag-fam-country-tr', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-14', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-tr-loc","fact-tr-cap","fact-tr-geo","fact-tr-flag"}'::text[], '{"acceptedValues": ["Турция", "Turkey", "Турецкая Республика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Турция. Особенности полотнища: Красное полотнище с белым полумесяцем и белой пятиконечной звездой в центре.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q14', 'v1', 'opt-1', 'Турция', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q14', 'v1', 'opt-2', 'Азербайджан', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q14', 'v1', 'opt-3', 'Тунис', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q14', 'v1', 'opt-4', 'Греция', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q15', 'flag-fam-country-kr', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-15', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-kr-loc","fact-kr-cap","fact-kr-geo","fact-kr-flag"}'::text[], '{"acceptedValues": ["Республика Корея", "Южная Корея", "South Korea"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Республика Корея. Особенности полотнища: Белое полотнище с красно-синим кругом тхэгык в центре и четырьмя чёрными триграммами по углам.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q15', 'v1', 'opt-1', 'Республика Корея', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q15', 'v1', 'opt-2', 'Япония', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q15', 'v1', 'opt-3', 'Китай', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q15', 'v1', 'opt-4', 'Монголия', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q16', 'flag-fam-country-mx', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-16', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-mx-loc","fact-mx-cap","fact-mx-geo","fact-mx-flag"}'::text[], '{"acceptedValues": ["Мексика", "Mexico", "Мексиканские Соединённые Штаты"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Мексика. Особенности полотнища: Три вертикальные полосы: зелёная, белая и красная, с государственным гербом (орёл на кактусе со змеёй) в центре.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q16', 'v1', 'opt-1', 'Мексика', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q16', 'v1', 'opt-2', 'Италия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q16', 'v1', 'opt-3', 'Гватемала', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q16', 'v1', 'opt-4', 'Испания', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q17', 'flag-fam-country-no', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-17', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-no-loc","fact-no-cap","fact-no-geo","fact-no-flag"}'::text[], '{"acceptedValues": ["Норвегия", "Norway", "Королевство Норвегия"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Норвегия. Особенности полотнища: Красное полотнище с тёмно-синим скандинавским крестом с белой каймой.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q17', 'v1', 'opt-1', 'Норвегия', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q17', 'v1', 'opt-2', 'Исландия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q17', 'v1', 'opt-3', 'Швеция', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q17', 'v1', 'opt-4', 'Дания', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q18', 'flag-fam-country-fi', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-18', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-fi-loc","fact-fi-cap","fact-fi-geo","fact-fi-flag"}'::text[], '{"acceptedValues": ["Финляндия", "Finland", "Финляндская Республика"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Финляндия. Особенности полотнища: Белое прямоугольное полотнище с синим скандинавским крестом.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q18', 'v1', 'opt-1', 'Финляндия', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q18', 'v1', 'opt-2', 'Швеция', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q18', 'v1', 'opt-3', 'Греция', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q18', 'v1', 'opt-4', 'Эстония', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q19', 'flag-fam-country-es', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-19', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-es-loc","fact-es-cap","fact-es-geo","fact-es-flag"}'::text[], '{"acceptedValues": ["Испания", "Spain", "Королевство Испания"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Испания. Особенности полотнища: Три горизонтальные полосы: красная, жёлтая (двойной ширины) и красная, с государственным гербом у древка.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q19', 'v1', 'opt-1', 'Испания', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q19', 'v1', 'opt-2', 'Португалия', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q19', 'v1', 'opt-3', 'Франция', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q19', 'v1', 'opt-4', 'Андорра', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ('flag-q20', 'flag-fam-country-kz', 'flags-basics', 'v1', 'flag_country', 'Какой стране принадлежит этот флаг?', 'flag-asset-20', '{"source-wikimedia-commons-flags","source-wikidata-country-dump"}'::text[], '{"fact-kz-loc","fact-kz-cap","fact-kz-geo","fact-kz-flag"}'::text[], '{"acceptedValues": ["Казахстан", "Kazakhstan", "Республика Казахстан"], "caseSensitive": false, "numericTolerance": 0, "rubricPoints": [], "graded": true}'::jsonb, 'opt-1', 'Этот флаг принадлежит стране Казахстан. Особенности полотнища: Лазурно-голубое полотнище с золотым солнцем с 32 лучами, парящим степным беркутом в центре и национальным орнаментом у древка.', 'basic', 'Флаги государств мира', 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q20', 'v1', 'opt-1', 'Казахстан', 0)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q20', 'v1', 'opt-2', 'Узбекистан', 1)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q20', 'v1', 'opt-3', 'Кыргызстан', 2)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;


INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ('flag-q20', 'v1', 'opt-4', 'Монголия', 3)
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;

COMMIT;