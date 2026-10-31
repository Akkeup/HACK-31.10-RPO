# tools/content_builder/informatics_data.py: 20 Verified Informatics Questions (CS Unplugged)

MODULE_INFORMATICS = {
    "moduleId": "informatics-basics",
    "subject": "informatics",
    "title": "Информатика: данные и алгоритмы",
    "contentVersion": "v1",
    "teacherId": "teacher-informatics",
    "examinerId": "examiner-informatics"
}

INFORMATICS_FACTS = [
    {"factId": "cs-fact-binary-base", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "binary-system", "text": "Компьютеры представляют все данные с помощью нулей и единиц (бит). Бит — наименьшая единица информации.", "sourceIds": ["source-cs-unplugged"], "status": "published"},
    {"factId": "cs-fact-binary-weights", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "binary-system", "text": "В двоичной системе каждый следующий разряд справа налево весит вдвое больше предыдущего: 1, 2, 4, 8, 16.", "sourceIds": ["source-cs-unplugged"], "status": "published"},
    {"factId": "cs-fact-byte", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "data-units", "text": "Байт состоит из 8 бит и может кодировать 256 различных значений (от 0 до 255).", "sourceIds": ["source-cs-unplugged"], "status": "published"},
    {"factId": "cs-fact-parity", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "error-detection", "text": "Бит чётности добавляется к данным, чтобы сделать общее количество единиц чётным, что позволяет обнаружить ошибку.", "sourceIds": ["source-cs-unplugged"], "status": "published"},
    {"factId": "cs-fact-binary-search", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "search-algorithms", "text": "Бинарный поиск делит упорядоченный список пополам на каждом шаге, быстро находя нужный элемент.", "sourceIds": ["source-cs-unplugged"], "status": "published"},
    {"factId": "cs-fact-sorting", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "sorting", "text": "Сети сортировки и алгоритмы упорядочивания элементов используют попарные сравнения.", "sourceIds": ["source-cs-unplugged"], "status": "published"},
    {"factId": "cs-fact-rle", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "compression", "text": "Сжатие серий (RLE) заменяет повторяющиеся одинаковые символы на символ и число его повторений.", "sourceIds": ["source-cs-unplugged"], "status": "published"},
    {"factId": "cs-fact-algorithm", "moduleId": "informatics-basics", "contentVersion": "v1", "conceptId": "algorithm-definition", "text": "Алгоритм — это точная и понятная пошаговая инструкция для решения конкретной задачи за конечное число шагов.", "sourceIds": ["source-cs-unplugged"], "status": "published"}
]

INFORMATICS_QUESTIONS = [
    {
        "questionId": "info-q01", "questionFamilyId": "info-fam-bit", "conceptId": "binary-system",
        "prompt": "Как называется наименьшая единица информации в компьютере, принимающая значение 0 или 1?",
        "options": [{"optionId": "opt-1", "text": "Бит"}, {"optionId": "opt-2", "text": "Байт"}, {"optionId": "opt-3", "text": "Пиксель"}, {"optionId": "opt-4", "text": "Слово"}],
        "correctOptionId": "opt-1",
        "explanation": "Бит (от англ. binary digit — двоичный знак) является минимальной единицей измерения информации в компьютере.",
        "factIds": ["cs-fact-binary-base"], "difficulty": "basic", "reviewTopic": "Единицы информации"
    },
    {
        "questionId": "info-q02", "questionFamilyId": "info-fam-byte", "conceptId": "data-units",
        "prompt": "Сколько бит содержится в одном байте?",
        "options": [{"optionId": "opt-1", "text": "4"}, {"optionId": "opt-2", "text": "8"}, {"optionId": "opt-3", "text": "16"}, {"optionId": "opt-4", "text": "10"}],
        "correctOptionId": "opt-2",
        "explanation": "В одном байте содержится ровно 8 бит. С помощью одного байта можно закодировать 256 различных состояний.",
        "factIds": ["cs-fact-byte"], "difficulty": "basic", "reviewTopic": "Байты и биты"
    },
    {
        "questionId": "info-q03", "questionFamilyId": "info-fam-bin-val", "conceptId": "binary-system",
        "prompt": "Какое десятичное число записано в двоичной системе как 101?",
        "options": [{"optionId": "opt-1", "text": "3"}, {"optionId": "opt-2", "text": "5"}, {"optionId": "opt-3", "text": "6"}, {"optionId": "opt-4", "text": "7"}],
        "correctOptionId": "opt-2",
        "explanation": "В двоичном числе 101 крайняя единица весит 4, ноль весит 2, правая единица весит 1: 4 + 0 + 1 = 5.",
        "factIds": ["cs-fact-binary-weights"], "difficulty": "basic", "reviewTopic": "Перевод из двоичной системы"
    },
    {
        "questionId": "info-q04", "questionFamilyId": "info-fam-bin-four", "conceptId": "binary-system",
        "prompt": "Как записывается десятичное число 4 в двоичной системе счисления?",
        "options": [{"optionId": "opt-1", "text": "11"}, {"optionId": "opt-2", "text": "100"}, {"optionId": "opt-3", "text": "101"}, {"optionId": "opt-4", "text": "110"}],
        "correctOptionId": "opt-2",
        "explanation": "Веса разрядов: 4, 2, 1. Для числа 4 берём единицу в разряде четвёрок и нули в остальных: 100₂ = 4.",
        "factIds": ["cs-fact-binary-weights"], "difficulty": "basic", "reviewTopic": "Двоичная запись чисел"
    }
]
INFORMATICS_QUESTIONS.extend([
    {
        "questionId": "info-q05", "questionFamilyId": "info-fam-parity-concept", "conceptId": "error-detection",
        "prompt": "Для чего в информатике используется дополнительный бит чётности (parity bit)?",
        "options": [{"optionId": "opt-1", "text": "Для ускорения передачи данных"}, {"optionId": "opt-2", "text": "Для обнаружения ошибок при передаче данных"}, {"optionId": "opt-3", "text": "Для шифрования паролей"}, {"optionId": "opt-4", "text": "Для сжатия изображений"}],
        "correctOptionId": "opt-2",
        "explanation": "Бит чётности позволяет проверить, не исказился ли отдельный бит данных во время передачи по каналу связи.",
        "factIds": ["cs-fact-parity"], "difficulty": "basic", "reviewTopic": "Обнаружение ошибок и чётность"
    },
    {
        "questionId": "info-q06", "questionFamilyId": "info-fam-binary-search", "conceptId": "search-algorithms",
        "prompt": "Какое главное условие необходимо для применения алгоритма бинарного поиска?",
        "options": [{"optionId": "opt-1", "text": "Список должен быть отсортирован"}, {"optionId": "opt-2", "text": "Все числа должны быть чётными"}, {"optionId": "opt-3", "text": "Список должен быть очень коротким"}, {"optionId": "opt-4", "text": "Данные должны быть зашифрованы"}],
        "correctOptionId": "opt-1",
        "explanation": "Бинарный поиск работает только на отсортированных данных, поскольку на каждом шаге отсекает ровно половину неподходящих вариантов.",
        "factIds": ["cs-fact-binary-search"], "difficulty": "basic", "reviewTopic": "Бинарный поиск"
    },
    {
        "questionId": "info-q07", "questionFamilyId": "info-fam-algorithm-def", "conceptId": "algorithm-definition",
        "prompt": "Что в информатике называют алгоритмом?",
        "options": [{"optionId": "opt-1", "text": "Любую случайную последовательность чисел"}, {"optionId": "opt-2", "text": "Точную пошаговую последовательность инструкций для решения задачи"}, {"optionId": "opt-3", "text": "Компьютерную микросхему"}, {"optionId": "opt-4", "text": "Сетевой кабель"}],
        "correctOptionId": "opt-2",
        "explanation": "Алгоритм — это упорядоченный набор чётких правил или действий, приводящих к решению поставленной задачи.",
        "factIds": ["cs-fact-algorithm"], "difficulty": "basic", "reviewTopic": "Понятие алгоритма"
    },
    {
        "questionId": "info-q08", "questionFamilyId": "info-fam-rle-compress", "conceptId": "compression",
        "prompt": "Как алгоритм сжатия серий (RLE) сожмёт строку 'AAAAABBB'?",
        "options": [{"optionId": "opt-1", "text": "5A3B"}, {"optionId": "opt-2", "text": "A5B3"}, {"optionId": "opt-3", "text": "AB8"}, {"optionId": "opt-4", "text": "AABB"}],
        "correctOptionId": "opt-1",
        "explanation": "Алгоритм RLE заменяет непрерывную серию повторяющихся символов на их количество и сам символ: 5 букв A и 3 буквы B дают '5A3B'.",
        "factIds": ["cs-fact-rle"], "difficulty": "basic", "reviewTopic": "Сжатие данных"
    },
    {
        "questionId": "info-q09", "questionFamilyId": "info-fam-bubble-sort", "conceptId": "sorting",
        "prompt": "На каком базовом действии основана сортировка методом пузырька (Bubble Sort)?",
        "options": [{"optionId": "opt-1", "text": "Попарное сравнение соседних элементов и обмен местами"}, {"optionId": "opt-2", "text": "Случайная перестановка всех элементов"}, {"optionId": "opt-3", "text": "Удаление всех нечётных чисел"}, {"optionId": "opt-4", "text": "Перевод всех чисел в двоичный вид"}],
        "correctOptionId": "opt-1",
        "explanation": "Сортировка пузырьком последовательно сравнивает соседние элементы и меняет их местами, если они расположены в неправильном порядке.",
        "factIds": ["cs-fact-sorting"], "difficulty": "basic", "reviewTopic": "Алгоритмы сортировки"
    },
    {
        "questionId": "info-q10", "questionFamilyId": "info-fam-bin-eight", "conceptId": "binary-system",
        "prompt": "Сколько различных значений можно закодировать цепочкой из 3 бит?",
        "options": [{"optionId": "opt-1", "text": "3"}, {"optionId": "opt-2", "text": "6"}, {"optionId": "opt-3", "text": "8"}, {"optionId": "opt-4", "text": "16"}],
        "correctOptionId": "opt-3",
        "explanation": "Каждый бит имеет 2 возможных состояния. Три бита дают 2³ = 2 × 2 × 2 = 8 различных комбинаций (от 000 до 111).",
        "factIds": ["cs-fact-binary-weights"], "difficulty": "basic", "reviewTopic": "Комбинаторика битов"
    }
])
INFORMATICS_QUESTIONS.extend([
    {
        "questionId": "info-q11", "questionFamilyId": "info-fam-pixel", "conceptId": "data-units",
        "prompt": "Как называется мельчайшая неделимая точка растрового цифрового изображения?",
        "options": [{"optionId": "opt-1", "text": "Пиксель"}, {"optionId": "opt-2", "text": "Вектор"}, {"optionId": "opt-3", "text": "Дюйм"}, {"optionId": "opt-4", "text": "Бит"}],
        "correctOptionId": "opt-1",
        "explanation": "Пиксель (от англ. picture element) — это наименьший элемент матрицы цифрового дисплея или растрового рисунка.",
        "factIds": ["cs-fact-binary-base"], "difficulty": "basic", "reviewTopic": "Представление графики"
    },
    {
        "questionId": "info-q12", "questionFamilyId": "info-fam-linear-search", "conceptId": "search-algorithms",
        "prompt": "Сколько сравнений в худшем случае потребуется линейному поиску в неотсортированном списке из N элементов?",
        "options": [{"optionId": "opt-1", "text": "1"}, {"optionId": "opt-2", "text": "N"}, {"optionId": "opt-3", "text": "N / 2"}, {"optionId": "opt-4", "text": "N²"}],
        "correctOptionId": "opt-2",
        "explanation": "В худшем случае искомый элемент находится на самом последнем месте или отсутствует, поэтому придётся проверить все N элементов.",
        "factIds": ["cs-fact-binary-search"], "difficulty": "basic", "reviewTopic": "Линейный поиск"
    },
    {
        "questionId": "info-q13", "questionFamilyId": "info-fam-parity-odd", "conceptId": "error-detection",
        "prompt": "В цепочке данных 1 0 1 1 0 количество единиц нечётно (три единицы). Какой бит чётности нужно добавить для схемы чётной проверки?",
        "options": [{"optionId": "opt-1", "text": "0"}, {"optionId": "opt-2", "text": "1"}, {"optionId": "opt-3", "text": "Любой"}, {"optionId": "opt-4", "text": "2"}],
        "correctOptionId": "opt-2",
        "explanation": "Чтобы общее число единиц стало чётным (четыре), бит чётности должен быть равен 1: 3 + 1 = 4.",
        "factIds": ["cs-fact-parity"], "difficulty": "basic", "reviewTopic": "Расчёт бита чётности"
    },
    {
        "questionId": "info-q14", "questionFamilyId": "info-fam-ascii", "conceptId": "data-units",
        "prompt": "Как компьютеры хранят текстовые буквы и знаки в своей памяти?",
        "options": [{"optionId": "opt-1", "text": "В виде числовых кодов по таблице кодировки (например, ASCII или Unicode)"}, {"optionId": "opt-2", "text": "Как маленькие фотографии каждой буквы"}, {"optionId": "opt-3", "text": "Только с помощью звуковых волн"}, {"optionId": "opt-4", "text": "Текст сохраняется без изменений как краска на экране"}],
        "correctOptionId": "opt-1",
        "explanation": "Каждому символу алфавита ставится в соответствие числовой код (например, 'A' = 65), который затем сохраняется в двоичном виде.",
        "factIds": ["cs-fact-byte"], "difficulty": "basic", "reviewTopic": "Кодирование текста"
    },
    {
        "questionId": "info-q15", "questionFamilyId": "info-fam-bin-two", "conceptId": "binary-system",
        "prompt": "Чему равно значение двоичного числа 10 в десятичной системе?",
        "options": [{"optionId": "opt-1", "text": "10"}, {"optionId": "opt-2", "text": "2"}, {"optionId": "opt-3", "text": "1"}, {"optionId": "opt-4", "text": "0"}],
        "correctOptionId": "opt-2",
        "explanation": "В числе 10₂ в разряде двоек стоит 1, а в разряде единиц — 0. Получаем 1 × 2 + 0 × 1 = 2.",
        "factIds": ["cs-fact-binary-weights"], "difficulty": "basic", "reviewTopic": "Двоичное число два"
    }
])
INFORMATICS_QUESTIONS.extend([
    {
        "questionId": "info-q16", "questionFamilyId": "info-fam-graph-net", "conceptId": "algorithm-definition",
        "prompt": "Из каких двух главных элементов состоит математический граф (компьютерная сеть)?",
        "options": [{"optionId": "opt-1", "text": "Вершины (узлы) и рёбра (связи между ними)"}, {"optionId": "opt-2", "text": "Пиксели и байты"}, {"optionId": "opt-3", "text": "Числитель и знаменатель"}, {"optionId": "opt-4", "text": "Процессор и монитор"}],
        "correctOptionId": "opt-1",
        "explanation": "Граф состоит из множества вершин (узлов сети или городов) и соединяющих их рёбер (каналов связи или дорог).",
        "factIds": ["cs-fact-algorithm"], "difficulty": "basic", "reviewTopic": "Теория графов и сети"
    },
    {
        "questionId": "info-q17", "questionFamilyId": "info-fam-lossless", "conceptId": "compression",
        "prompt": "Как называется сжатие данных, при котором исходную информацию можно восстановить абсолютно без потерь?",
        "options": [{"optionId": "opt-1", "text": "Сжатие без потерь (lossless)"}, {"optionId": "opt-2", "text": "Сжатие с потерями (lossy)"}, {"optionId": "opt-3", "text": "Удаление данных"}, {"optionId": "opt-4", "text": "Форматирование"}],
        "correctOptionId": "opt-1",
        "explanation": "При сжатии без потерь (lossless, например алгоритмы ZIP или PNG) исходный файл после распаковки бит-в-бит совпадает с оригиналом.",
        "factIds": ["cs-fact-rle"], "difficulty": "basic", "reviewTopic": "Сжатие без потерь"
    },
    {
        "questionId": "info-q18", "questionFamilyId": "info-fam-bin-fifteen", "conceptId": "binary-system",
        "prompt": "Какое максимальное десятичное число можно записать с помощью 4 бит?",
        "options": [{"optionId": "opt-1", "text": "4"}, {"optionId": "opt-2", "text": "8"}, {"optionId": "opt-3", "text": "15"}, {"optionId": "opt-4", "text": "16"}],
        "correctOptionId": "opt-3",
        "explanation": "Четыре единицы 1111₂ равны 8 + 4 + 2 + 1 = 15. Всего комбинаций 16 (от 0 до 15).",
        "factIds": ["cs-fact-binary-weights"], "difficulty": "basic", "reviewTopic": "Диапазон чисел"
    },
    {
        "questionId": "info-q19", "questionFamilyId": "info-fam-sort-net", "conceptId": "sorting",
        "prompt": "Что делает элемент-компаратор в сети сортировки?",
        "options": [{"optionId": "opt-1", "text": "Сравнивает два числа и направляет меньшее по одному каналу, а большее — по другому"}, {"optionId": "opt-2", "text": "Умножает число на 2"}, {"optionId": "opt-3", "text": "Стирает нечётные числа"}, {"optionId": "opt-4", "text": "Перезагружает компьютер"}],
        "correctOptionId": "opt-1",
        "explanation": "Компаратор сравнивает два значения на входе и упорядочивает их на выходе (меньшее наверх, большее вниз).",
        "factIds": ["cs-fact-sorting"], "difficulty": "basic", "reviewTopic": "Сети сортировки"
    },
    {
        "questionId": "info-q20", "questionFamilyId": "info-fam-loop", "conceptId": "algorithm-definition",
        "prompt": "Как в алгоритмах называется конструкция, повторяющая выполнение одних и тех же действий, пока выполняется условие?",
        "options": [{"optionId": "opt-1", "text": "Ветвление"}, {"optionId": "opt-2", "text": "Цикл"}, {"optionId": "opt-3", "text": "Присваивание"}, {"optionId": "opt-4", "text": "Комментарий"}],
        "correctOptionId": "opt-2",
        "explanation": "Цикл позволяет многократно выполнять блок инструкций заданное число раз или до достижения определённого условия.",
        "factIds": ["cs-fact-algorithm"], "difficulty": "basic", "reviewTopic": "Управляющие конструкции"
    }
])
