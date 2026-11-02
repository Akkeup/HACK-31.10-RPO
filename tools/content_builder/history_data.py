# tools/content_builder/history_data.py: 20 Verified History Questions

MODULE_HISTORY = {
    "moduleId": "history-basics",
    "subject": "history",
    "title": "История: источники и хронология",
    "contentVersion": "v1",
    "teacherId": "teacher-history",
    "examinerId": "examiner-history"
}

HISTORY_FACTS = [
    {"factId": "hist-fact-sources-def", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "sources-theory", "text": "Исторический источник — это любой объект или документ, созданный человеком или отражающий исторический процесс и содержащий информацию о прошлом.", "sourceIds": ["source-ruwiki-hist-source"], "status": "published"},
    {"factId": "hist-fact-types", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "sources-types", "text": "Источники делятся на вещественные (артефакты, постройки), письменные (летописи, грамоты, законы), устные (былины, предания) и изобразительные.", "sourceIds": ["source-ruwiki-hist-source"], "status": "published"},
    {"factId": "hist-fact-primary", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "sources-primary", "text": "Первичный источник создан непосредственным очевидцем или участником событий во время их свершения.", "sourceIds": ["source-ruwiki-hist-source", "source-wikibooks-world-history"], "status": "published"},
    {"factId": "hist-fact-chronology-def", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "chronology-base", "text": "Хронология — наука об измерении времени и установлении точной последовательности исторических событий.", "sourceIds": ["source-ruwiki-chronology"], "status": "published"},
    {"factId": "hist-fact-calendars", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "calendars", "text": "Юлианский календарь ('старый стиль') был введён Юлием Цезарем в 45 г. до н.э., а более точный григорианский ('новый стиль') — папой Григорием XIII в 1582 году.", "sourceIds": ["source-ruwiki-chronology"], "status": "published"},
    {"factId": "hist-fact-dating", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "dating-methods", "text": "Радиоуглеродный анализ измеряет распад углерода-14 в органических материалах для определения их возраста.", "sourceIds": ["source-wikibooks-world-history"], "status": "published"},
    {"factId": "hist-fact-century", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "time-units", "text": "Век равен 100 годам, тысячелетие — 1000 годам. Нулевого года в историческом летосчислении не существует.", "sourceIds": ["source-ruwiki-chronology"], "status": "published"},
    {"factId": "hist-fact-archaeology", "moduleId": "history-basics", "contentVersion": "v1", "conceptId": "archaeology", "text": "Археология изучает прошлое человечества преимущественно по материальным (вещественным) остаткам жизни и деятельности людей.", "sourceIds": ["source-wikibooks-world-history"], "status": "published"}
]

HISTORY_QUESTIONS = [
    {
        "questionId": "hist-q01", "questionFamilyId": "hist-fam-source-def", "conceptId": "sources-theory",
        "prompt": "Что в исторической науке называют историческим источником?",
        "options": [{"optionId": "opt-1", "text": "Только современные учебники"}, {"optionId": "opt-2", "text": "Любой памятник прошлого, созданный человеком и несущий информацию о событиях"}, {"optionId": "opt-3", "text": "Только старинные монеты"}, {"optionId": "opt-4", "text": "Художественные фильмы о войне"}],
        "correctOptionId": "opt-2",
        "explanation": "Исторический источник — это свидетельство прошлого, созданное человеком (документ, постройка, предмет быта, предание), по которому изучают историю.",
        "factIds": ["hist-fact-sources-def"], "difficulty": "basic", "reviewTopic": "Понятие исторического источника"
    },
    {
        "questionId": "hist-q02", "questionFamilyId": "hist-fam-source-written", "conceptId": "sources-types",
        "prompt": "К какому виду исторических источников относятся древние летописи и указы?",
        "options": [{"optionId": "opt-1", "text": "Письменные"}, {"optionId": "opt-2", "text": "Вещественные"}, {"optionId": "opt-3", "text": "Устные"}, {"optionId": "opt-4", "text": "Этнографические"}],
        "correctOptionId": "opt-1",
        "explanation": "Летописи, грамоты, законы и письма содержат текст, поэтому относятся к письменным историческим источникам.",
        "factIds": ["hist-fact-types"], "difficulty": "basic", "reviewTopic": "Виды источников"
    },
    {
        "questionId": "hist-q03", "questionFamilyId": "hist-fam-source-material", "conceptId": "sources-types",
        "prompt": "К какому типу источников археологи относят глиняный кувшин, найденный при раскопках?",
        "options": [{"optionId": "opt-1", "text": "Вещественный"}, {"optionId": "opt-2", "text": "Письменный"}, {"optionId": "opt-3", "text": "Фольклорный"}, {"optionId": "opt-4", "text": "Устный"}],
        "correctOptionId": "opt-1",
        "explanation": "Предметы быта, посуда, оружие и орудия труда относятся к вещественным (материальным) источникам.",
        "factIds": ["hist-fact-types", "hist-fact-archaeology"], "difficulty": "basic", "reviewTopic": "Вещественные источники"
    },
    {
        "questionId": "hist-q04", "questionFamilyId": "hist-fam-source-primary", "conceptId": "sources-primary",
        "prompt": "Что отличает первичный исторический источник от вторичного?",
        "options": [{"optionId": "opt-1", "text": "Он создан очевидцем или участником во время происходивших событий"}, {"optionId": "opt-2", "text": "Он написан обязательно на латинском языке"}, {"optionId": "opt-3", "text": "Он опубликован в журнале в прошлом году"}, {"optionId": "opt-4", "text": "Он обязательно сделан из золота"}],
        "correctOptionId": "opt-1",
        "explanation": "Первичный источник создаётся современником событий непосредственно в эпоху их свершения, тогда как вторичный — анализ историка спустя время.",
        "factIds": ["hist-fact-primary"], "difficulty": "basic", "reviewTopic": "Первичные источники"
    }
]
HISTORY_QUESTIONS.extend([
    {
        "questionId": "hist-q05", "questionFamilyId": "hist-fam-chrono-def", "conceptId": "chronology-base",
        "prompt": "Какая наука занимается установлением дат и хронологической последовательности событий прошлого?",
        "options": [{"optionId": "opt-1", "text": "Хронология"}, {"optionId": "opt-2", "text": "Топография"}, {"optionId": "opt-3", "text": "Нумизматика"}, {"optionId": "opt-4", "text": "Геральдика"}],
        "correctOptionId": "opt-1",
        "explanation": "Хронология — специальная историческая дисциплина, изучающая системы летосчисления и устанавливающая точные даты событий.",
        "factIds": ["hist-fact-chronology-def"], "difficulty": "basic", "reviewTopic": "Хронология"
    },
    {
        "questionId": "hist-q06", "questionFamilyId": "hist-fam-calendars", "conceptId": "calendars",
        "prompt": "Какой календарь был введён в Риме при Юлии Цезаре и стал известен как 'старый стиль'?",
        "options": [{"optionId": "opt-1", "text": "Григорианский"}, {"optionId": "opt-2", "text": "Юлианский"}, {"optionId": "opt-3", "text": "Лунный"}, {"optionId": "opt-4", "text": "Майя"}],
        "correctOptionId": "opt-2",
        "explanation": "Юлианский календарь был разработан александрийскими астрономами во главе с Созигеном и введён Юлием Цезарем в 45 году до н.э.",
        "factIds": ["hist-fact-calendars"], "difficulty": "basic", "reviewTopic": "Календарные системы"
    },
    {
        "questionId": "hist-q07", "questionFamilyId": "hist-fam-gregorian", "conceptId": "calendars",
        "prompt": "С какой целью в 1582 году папа римский Григорий XIII ввёл новый календарь?",
        "options": [{"optionId": "opt-1", "text": "Чтобы устранить накопившуюся ошибку в 10 дней и вернуть день весеннего равноденствия на 21 марта"}, {"optionId": "opt-2", "text": "Чтобы сделать в году 10 месяцев"}, {"optionId": "opt-3", "text": "Чтобы отменить високосные годы"}, {"optionId": "opt-4", "text": "Чтобы переименовать дни недели"}],
        "correctOptionId": "opt-1",
        "explanation": "Григорианский календарь скорректировал накапливавшееся отставание юлианского календаря от астрономического солнечного года.",
        "factIds": ["hist-fact-calendars"], "difficulty": "basic", "reviewTopic": "Григорианский календарь"
    },
    {
        "questionId": "hist-q08", "questionFamilyId": "hist-fam-radiocarbon", "conceptId": "dating-methods",
        "prompt": "Какой научный метод датирования основан на измерении распада изотопа углерода-14 в органических остатках?",
        "options": [{"optionId": "opt-1", "text": "Радиоуглеродный анализ"}, {"optionId": "opt-2", "text": "Дендрохронология"}, {"optionId": "opt-3", "text": "Спектральный анализ"}, {"optionId": "opt-4", "text": "Рентгенография"}],
        "correctOptionId": "opt-1",
        "explanation": "Радиоуглеродное датирование измеряет остаточное содержание изотопа ¹⁴C в древесине, костях и других органических находках.",
        "factIds": ["hist-fact-dating"], "difficulty": "basic", "reviewTopic": "Методы датирования"
    },
    {
        "questionId": "hist-q09", "questionFamilyId": "hist-fam-dendro", "conceptId": "dating-methods",
        "prompt": "По какому признаку метод дендрохронологии определяет точный возраст деревянных построек и предметов?",
        "options": [{"optionId": "opt-1", "text": "По годичным кольцам деревьев"}, {"optionId": "opt-2", "text": "По цвету древесной коры"}, {"optionId": "opt-3", "text": "По глубине залегания в земле"}, {"optionId": "opt-4", "text": "По весу древесины"}],
        "correctOptionId": "opt-1",
        "explanation": "Дендрохронология сопоставляет характерную толщину годичных колец деревьев с эталонной региональной шкалой.",
        "factIds": ["hist-fact-dating"], "difficulty": "basic", "reviewTopic": "Дендрохронология"
    },
    {
        "questionId": "hist-q10", "questionFamilyId": "hist-fam-century-calc", "conceptId": "time-units",
        "prompt": "К какому веку относится 1492 год (год плавания Колумба к берегам Америки)?",
        "options": [{"optionId": "opt-1", "text": "XIV век"}, {"optionId": "opt-2", "text": "XV век"}, {"optionId": "opt-3", "text": "XVI век"}, {"optionId": "opt-4", "text": "XVII век"}],
        "correctOptionId": "opt-2",
        "explanation": "XV век длился с 1401 по 1500 год включительно. Следовательно, 1492 год относится к XV веку.",
        "factIds": ["hist-fact-century"], "difficulty": "basic", "reviewTopic": "Определение века по году"
    }
])
HISTORY_QUESTIONS.extend([
    {
        "questionId": "hist-q11", "questionFamilyId": "hist-fam-zero-year", "conceptId": "time-units",
        "prompt": "Существует ли в традиционной исторической шкале летосчисления (наша эра / до нашей эры) нулевой год?",
        "options": [{"optionId": "opt-1", "text": "Да, между 1 годом до н.э. и 1 годом н.э."}, {"optionId": "opt-2", "text": "Нет, после 1 года до н.э. сразу наступает 1 год н.э."}, {"optionId": "opt-3", "text": "Да, нулевой год длился 100 дней"}, {"optionId": "opt-4", "text": "Зависит от времени года"}],
        "correctOptionId": "opt-2",
        "explanation": "В исторической хронологии нулевого года нет: 1-й год до нашей эры непосредственно сменяется 1-м годом нашей эры.",
        "factIds": ["hist-fact-century"], "difficulty": "basic", "reviewTopic": "Летосчисление и отсутствие нулевого года"
    },
    {
        "questionId": "hist-q12", "questionFamilyId": "hist-fam-archaeology", "conceptId": "archaeology",
        "prompt": "Какая дисциплина изучает прошлое человечества путём раскопок вещественных памятников?",
        "options": [{"optionId": "opt-1", "text": "Археология"}, {"optionId": "opt-2", "text": "Палеография"}, {"optionId": "opt-3", "text": "Геология"}, {"optionId": "opt-4", "text": "Антропология"}],
        "correctOptionId": "opt-1",
        "explanation": "Археология — наука, открывающая и изучающая материальные следы жизни людей древности (поселения, захоронения, орудия).",
        "factIds": ["hist-fact-archaeology"], "difficulty": "basic", "reviewTopic": "Археология"
    },
    {
        "questionId": "hist-q13", "questionFamilyId": "hist-fam-oral-source", "conceptId": "sources-types",
        "prompt": "К какому виду исторических источников относятся передаваемые из поколения в поколение народные сказительные былины?",
        "options": [{"optionId": "opt-1", "text": "Устные (фольклорные)"}, {"optionId": "opt-2", "text": "Вещественные"}, {"optionId": "opt-3", "text": "Письменные"}, {"optionId": "opt-4", "text": "Архитектурные"}],
        "correctOptionId": "opt-1",
        "explanation": "Устные источники сохраняют память о событиях в народных сказаниях, песнях, мифах и пословицах.",
        "factIds": ["hist-fact-types"], "difficulty": "basic", "reviewTopic": "Устные источники"
    },
    {
        "questionId": "hist-q14", "questionFamilyId": "hist-fam-numismatics", "conceptId": "sources-types",
        "prompt": "Как называется специальная историческая дисциплина, изучающая историю монетной чеканки и денежного обращения?",
        "options": [{"optionId": "opt-1", "text": "Нумизматика"}, {"optionId": "opt-2", "text": "Сфрагистика"}, {"optionId": "opt-3", "text": "Геральдика"}, {"optionId": "opt-4", "text": "Генеалогия"}],
        "correctOptionId": "opt-1",
        "explanation": "Нумизматика изучает старинные монеты, медали, клады и историю денежных систем разных эпох.",
        "factIds": ["hist-fact-types"], "difficulty": "basic", "reviewTopic": "Нумизматика"
    },
    {
        "questionId": "hist-q15", "questionFamilyId": "hist-fam-archives", "conceptId": "sources-theory",
        "prompt": "Как называется специализированное учреждение, где хранятся и исследуются ценные исторические письменные документы?",
        "options": [{"optionId": "opt-1", "text": "Архив"}, {"optionId": "opt-2", "text": "Лаборатория"}, {"optionId": "opt-3", "text": "Амфитеатр"}, {"optionId": "opt-4", "text": "Гербарий"}],
        "correctOptionId": "opt-1",
        "explanation": "Архивы собирают, систематизируют и надежно сохраняют рукописные и печатные документы государственных органов и граждан.",
        "factIds": ["hist-fact-sources-def"], "difficulty": "basic", "reviewTopic": "Архивы"
    }
])
HISTORY_QUESTIONS.extend([
    {
        "questionId": "hist-q16", "questionFamilyId": "hist-fam-criticism", "conceptId": "sources-theory",
        "prompt": "Что включает в себя историческая критика источника перед признанием его данных достоверными?",
        "options": [{"optionId": "opt-1", "text": "Установление авторства, времени создания, подлинности и сопоставление с другими свидетельствами"}, {"optionId": "opt-2", "text": "Проверку документа на орфографические ошибки"}, {"optionId": "opt-3", "text": "Оценку стоимости продажи документа на аукционе"}, {"optionId": "opt-4", "text": "Перевод текста исключительно на современный сленг"}],
        "correctOptionId": "opt-1",
        "explanation": "Критика источников (внешняя и внутренняя) позволяет выявить подделки, определить предвзятость автора и подтвердить достоверность фактов.",
        "factIds": ["hist-fact-sources-def", "hist-fact-primary"], "difficulty": "basic", "reviewTopic": "Критика исторических источников"
    },
    {
        "questionId": "hist-q17", "questionFamilyId": "hist-fam-millennium", "conceptId": "time-units",
        "prompt": "Сколько лет составляет одно тысячелетие?",
        "options": [{"optionId": "opt-1", "text": "100 лет"}, {"optionId": "opt-2", "text": "500 лет"}, {"optionId": "opt-3", "text": "1000 лет"}, {"optionId": "opt-4", "text": "10 000 лет"}],
        "correctOptionId": "opt-3",
        "explanation": "Одно тысячелетие (миллениум) равно ровно 10 векам или 1000 календарным годам.",
        "factIds": ["hist-fact-century"], "difficulty": "basic", "reviewTopic": "Единицы измерения времени"
    },
    {
        "questionId": "hist-q18", "questionFamilyId": "hist-fam-heraldry", "conceptId": "sources-types",
        "prompt": "Какая вспомогательная историческая дисциплина изучает гербы и государственные символы?",
        "options": [{"optionId": "opt-1", "text": "Геральдика"}, {"optionId": "opt-2", "text": "Бонистика"}, {"optionId": "opt-3", "text": "Эпиграфика"}, {"optionId": "opt-4", "text": "Топонимика"}],
        "correctOptionId": "opt-1",
        "explanation": "Геральдика — наука о гербах, их происхождении, строении, правилах составления и значении символических элементов.",
        "factIds": ["hist-fact-types"], "difficulty": "basic", "reviewTopic": "Геральдика"
    },
    {
        "questionId": "hist-q19", "questionFamilyId": "hist-fam-bce-direction", "conceptId": "chronology-base",
        "prompt": "В каком порядке велся отсчет лет до нашей эры (до н.э.)?",
        "options": [{"optionId": "opt-1", "text": "В порядке убывания к 1 году н.э. (например: 500 г. до н.э., затем 499 г. до н.э.)"}, {"optionId": "opt-2", "text": "В порядке возрастания, как и в нашей эре"}, {"optionId": "opt-3", "text": "Случайным образом по указанию правителей"}, {"optionId": "opt-4", "text": "Отсчет велся только по десятилетиям"}],
        "correctOptionId": "opt-1",
        "explanation": "При движении вперед во времени события до нашей эры приближаются к рубежу эр, поэтому число года уменьшается: 100 г. до н.э. был раньше, чем 50 г. до н.э.",
        "factIds": ["hist-fact-chronology-def", "hist-fact-century"], "difficulty": "basic", "reviewTopic": "Счёт лет до нашей эры"
    },
    {
        "questionId": "hist-q20", "questionFamilyId": "hist-fam-stratigraphy", "conceptId": "dating-methods",
        "prompt": "На каком принципе основан закон стратиграфии в археологии при определении относительного возраста находок?",
        "options": [{"optionId": "opt-1", "text": "При ненарушенном залегании нижние слои почвы образовались раньше верхних"}, {"optionId": "opt-2", "text": "Чем глубже слой, тем предметы в нем новее"}, {"optionId": "opt-3", "text": "Все слои земли имеют одинаковый возраст"}, {"optionId": "opt-4", "text": "Возраст определяется исключительно цветом глины"}],
        "correctOptionId": "opt-1",
        "explanation": "Закон суперпозиции гласит, что более глубокие геологические и культурные слои откладывались раньше тех, что лежат выше.",
        "factIds": ["hist-fact-dating", "hist-fact-archaeology"], "difficulty": "basic", "reviewTopic": "Стратиграфия в археологии"
    }
])
