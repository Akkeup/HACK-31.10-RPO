# tools/content_builder/math_data.py: 20 Verified Math Questions and Programmatic Verifier

MODULE_MATH = {
    "moduleId": "math-basics",
    "subject": "mathematics",
    "title": "Математика: основные операции",
    "contentVersion": "v1",
    "teacherId": "teacher-mathematics",
    "examinerId": "examiner-mathematics"
}

MATH_FACTS = [
    {"factId": "math-fact-add", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "addition", "text": "Сложение объединяет два или более чисел в одну общую сумму. Числа при сложении называются слагаемыми.", "sourceIds": ["source-math-arithmetic"], "status": "published"},
    {"factId": "math-fact-sub", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "subtraction", "text": "Вычитание — операция, обратная сложению. Оно находит разность между уменьшаемым и вычитаемым.", "sourceIds": ["source-math-arithmetic"], "status": "published"},
    {"factId": "math-fact-mul", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "multiplication", "text": "Умножение представляет собой сложение одинаковых слагаемых. Числа при умножении называются множителями, результат — произведением.", "sourceIds": ["source-math-arithmetic"], "status": "published"},
    {"factId": "math-fact-div", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "division", "text": "Деление — обратная операция к умножению, разделяющая число на равные части. Делить на ноль невозможно.", "sourceIds": ["source-math-arithmetic"], "status": "published"},
    {"factId": "math-fact-order", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "order-of-operations", "text": "Умножение и деление выполняются раньше сложения и вычитания. Действия в скобках имеют наивысший приоритет.", "sourceIds": ["source-math-arithmetic"], "status": "published"},
    {"factId": "math-fact-comm", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "properties", "text": "От перестановки слагаемых сумма не меняется (переместительное свойство сложения: a + b = b + a).", "sourceIds": ["source-math-arithmetic"], "status": "published"},
    {"factId": "math-fact-zero", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "zero-property", "text": "Прибавление нуля к любому числу не изменяет его. Умножение любого числа на ноль даёт ноль.", "sourceIds": ["source-math-arithmetic"], "status": "published"},
    {"factId": "math-fact-one", "moduleId": "math-basics", "contentVersion": "v1", "conceptId": "one-property", "text": "Умножение любого числа на единицу оставляет число неизменным (1 — нейтральный элемент умножения).", "sourceIds": ["source-math-arithmetic"], "status": "published"}
]

MATH_QUESTIONS = [
    {
        "questionId": "math-q01", "questionFamilyId": "math-fam-add", "conceptId": "addition",
        "prompt": "Чему равна сумма чисел 25 и 17?",
        "options": [{"optionId": "opt-1", "text": "42"}, {"optionId": "opt-2", "text": "32"}, {"optionId": "opt-3", "text": "41"}, {"optionId": "opt-4", "text": "52"}],
        "correctOptionId": "opt-1", "calc": (25, "+", 17, 42),
        "explanation": "Складываем десятки и единицы: 25 + 17 = 20 + 10 + 5 + 7 = 30 + 12 = 42.",
        "factIds": ["math-fact-add"], "difficulty": "basic", "reviewTopic": "Сложение натуральных чисел"
    },
    {
        "questionId": "math-q02", "questionFamilyId": "math-fam-sub", "conceptId": "subtraction",
        "prompt": "Чему равна разность 50 - 18?",
        "options": [{"optionId": "opt-1", "text": "32"}, {"optionId": "opt-2", "text": "38"}, {"optionId": "opt-3", "text": "42"}, {"optionId": "opt-4", "text": "22"}],
        "correctOptionId": "opt-1", "calc": (50, "-", 18, 32),
        "explanation": "Вычитаем из 50 число 18: 50 - 10 = 40, затем 40 - 8 = 32.",
        "factIds": ["math-fact-sub"], "difficulty": "basic", "reviewTopic": "Вычитание натуральных чисел"
    },
    {
        "questionId": "math-q03", "questionFamilyId": "math-fam-mul", "conceptId": "multiplication",
        "prompt": "Чему равно произведение 7 × 8?",
        "options": [{"optionId": "opt-1", "text": "54"}, {"optionId": "opt-2", "text": "56"}, {"optionId": "opt-3", "text": "64"}, {"optionId": "opt-4", "text": "48"}],
        "correctOptionId": "opt-2", "calc": (7, "*", 8, 56),
        "explanation": "По таблице умножения 7 × 8 = 56.",
        "factIds": ["math-fact-mul"], "difficulty": "basic", "reviewTopic": "Таблица умножения"
    },
    {
        "questionId": "math-q04", "questionFamilyId": "math-fam-div", "conceptId": "division",
        "prompt": "Чему равен результат деления 72 : 9?",
        "options": [{"optionId": "opt-1", "text": "7"}, {"optionId": "opt-2", "text": "8"}, {"optionId": "opt-3", "text": "9"}, {"optionId": "opt-4", "text": "6"}],
        "correctOptionId": "opt-2", "calc": (72, "/", 9, 8),
        "explanation": "Деление 72 на 9 даёт 8, так как 8 × 9 = 72.",
        "factIds": ["math-fact-div"], "difficulty": "basic", "reviewTopic": "Деление натуральных чисел"
    }
]
MATH_QUESTIONS.extend([
    {
        "questionId": "math-q05", "questionFamilyId": "math-fam-order", "conceptId": "order-of-operations",
        "prompt": "Вычислите значение выражения: 4 + 3 × 5",
        "options": [{"optionId": "opt-1", "text": "35"}, {"optionId": "opt-2", "text": "19"}, {"optionId": "opt-3", "text": "23"}, {"optionId": "opt-4", "text": "27"}],
        "correctOptionId": "opt-2", "calc": (4, "+", 3 * 5, 19),
        "explanation": "Сначала выполняется умножение: 3 × 5 = 15, затем сложение: 4 + 15 = 19.",
        "factIds": ["math-fact-order"], "difficulty": "basic", "reviewTopic": "Порядок действий"
    },
    {
        "questionId": "math-q06", "questionFamilyId": "math-fam-order-paren", "conceptId": "order-of-operations",
        "prompt": "Вычислите значение выражения со скобками: (6 + 4) × 3",
        "options": [{"optionId": "opt-1", "text": "18"}, {"optionId": "opt-2", "text": "30"}, {"optionId": "opt-3", "text": "24"}, {"optionId": "opt-4", "text": "40"}],
        "correctOptionId": "opt-2", "calc": ((6 + 4), "*", 3, 30),
        "explanation": "Сначала вычисляется значение в скобках: 6 + 4 = 10, затем умножение: 10 × 3 = 30.",
        "factIds": ["math-fact-order"], "difficulty": "basic", "reviewTopic": "Скобки в выражениях"
    },
    {
        "questionId": "math-q07", "questionFamilyId": "math-fam-zero-add", "conceptId": "zero-property",
        "prompt": "Чему равна сумма 148 + 0?",
        "options": [{"optionId": "opt-1", "text": "0"}, {"optionId": "opt-2", "text": "148"}, {"optionId": "opt-3", "text": "1480"}, {"optionId": "opt-4", "text": "1"}],
        "correctOptionId": "opt-2", "calc": (148, "+", 0, 148),
        "explanation": "Прибавление нуля к любому числу не изменяет его значение: 148 + 0 = 148.",
        "factIds": ["math-fact-zero"], "difficulty": "basic", "reviewTopic": "Свойства нуля"
    },
    {
        "questionId": "math-q08", "questionFamilyId": "math-fam-zero-mul", "conceptId": "zero-property",
        "prompt": "Чему равно произведение 45 × 0?",
        "options": [{"optionId": "opt-1", "text": "45"}, {"optionId": "opt-2", "text": "0"}, {"optionId": "opt-3", "text": "1"}, {"optionId": "opt-4", "text": "не определено"}],
        "correctOptionId": "opt-2", "calc": (45, "*", 0, 0),
        "explanation": "Умножение любого числа на ноль даёт ноль.",
        "factIds": ["math-fact-zero"], "difficulty": "basic", "reviewTopic": "Умножение на ноль"
    },
    {
        "questionId": "math-q09", "questionFamilyId": "math-fam-one-mul", "conceptId": "one-property",
        "prompt": "Чему равно произведение 37 × 1?",
        "options": [{"optionId": "opt-1", "text": "1"}, {"optionId": "opt-2", "text": "37"}, {"optionId": "opt-3", "text": "38"}, {"optionId": "opt-4", "text": "0"}],
        "correctOptionId": "opt-2", "calc": (37, "*", 1, 37),
        "explanation": "При умножении любого числа на единицу получается то же самое число.",
        "factIds": ["math-fact-one"], "difficulty": "basic", "reviewTopic": "Свойства единицы"
    },
    {
        "questionId": "math-q10", "questionFamilyId": "math-fam-comm", "conceptId": "properties",
        "prompt": "Какое свойство отражает равенство: 12 + 35 = 35 + 12?",
        "options": [{"optionId": "opt-1", "text": "Переместительное свойство"}, {"optionId": "opt-2", "text": "Сочетательное свойство"}, {"optionId": "opt-3", "text": "Распределительное свойство"}, {"optionId": "opt-4", "text": "Деление с остатком"}],
        "correctOptionId": "opt-1",
        "explanation": "Переместительное свойство сложения гласит: от перестановки слагаемых сумма не меняется.",
        "factIds": ["math-fact-comm"], "difficulty": "basic", "reviewTopic": "Свойства сложения"
    }
])
MATH_QUESTIONS.extend([
    {
        "questionId": "math-q11", "questionFamilyId": "math-fam-div-zero", "conceptId": "division",
        "prompt": "Что происходит при попытке разделить число 15 на 0?",
        "options": [{"optionId": "opt-1", "text": "Получается 0"}, {"optionId": "opt-2", "text": "Получается 15"}, {"optionId": "opt-3", "text": "Деление на ноль невозможно"}, {"optionId": "opt-4", "text": "Получается 1"}],
        "correctOptionId": "opt-3",
        "explanation": "В арифметике деление на ноль не определено, так как нет такого числа, которое при умножении на 0 дало бы 15.",
        "factIds": ["math-fact-div"], "difficulty": "basic", "reviewTopic": "Деление на ноль"
    },
    {
        "questionId": "math-q12", "questionFamilyId": "math-fam-sub-self", "conceptId": "subtraction",
        "prompt": "Чему равна разность 84 - 84?",
        "options": [{"optionId": "opt-1", "text": "0"}, {"optionId": "opt-2", "text": "1"}, {"optionId": "opt-3", "text": "84"}, {"optionId": "opt-4", "text": "-1"}],
        "correctOptionId": "opt-1", "calc": (84, "-", 84, 0),
        "explanation": "При вычитании числа из самого себя результат всегда равен нулю: a - a = 0.",
        "factIds": ["math-fact-sub"], "difficulty": "basic", "reviewTopic": "Вычитание одинаковых чисел"
    },
    {
        "questionId": "math-q13", "questionFamilyId": "math-fam-mul-tens", "conceptId": "multiplication",
        "prompt": "Чему равно произведение 16 × 10?",
        "options": [{"optionId": "opt-1", "text": "106"}, {"optionId": "opt-2", "text": "160"}, {"optionId": "opt-3", "text": "1600"}, {"optionId": "opt-4", "text": "26"}],
        "correctOptionId": "opt-2", "calc": (16, "*", 10, 160),
        "explanation": "При умножении натурального числа на 10 к нему справа приписывается один ноль: 16 × 10 = 160.",
        "factIds": ["math-fact-mul"], "difficulty": "basic", "reviewTopic": "Умножение на 10"
    },
    {
        "questionId": "math-q14", "questionFamilyId": "math-fam-div-tens", "conceptId": "division",
        "prompt": "Чему равен результат деления 240 : 10?",
        "options": [{"optionId": "opt-1", "text": "24"}, {"optionId": "opt-2", "text": "2400"}, {"optionId": "opt-3", "text": "204"}, {"optionId": "opt-4", "text": "2.4"}],
        "correctOptionId": "opt-1", "calc": (240, "/", 10, 24),
        "explanation": "При делении круглого числа на 10 у него убирается один ноль справа: 240 : 10 = 24.",
        "factIds": ["math-fact-div"], "difficulty": "basic", "reviewTopic": "Деление на 10"
    },
    {
        "questionId": "math-q15", "questionFamilyId": "math-fam-order-complex", "conceptId": "order-of-operations",
        "prompt": "Вычислите значение выражения: 20 - 2 × 6 + 4",
        "options": [{"optionId": "opt-1", "text": "112"}, {"optionId": "opt-2", "text": "12"}, {"optionId": "opt-3", "text": "16"}, {"optionId": "opt-4", "text": "4"}],
        "correctOptionId": "opt-2", "calc": (20 - 2 * 6, "+", 4, 12),
        "explanation": "Сначала умножение: 2 × 6 = 12. Затем действия слева направо: 20 - 12 = 8, и 8 + 4 = 12.",
        "factIds": ["math-fact-order"], "difficulty": "basic", "reviewTopic": "Порядок нескольких операций"
    }
])
MATH_QUESTIONS.extend([
    {
        "questionId": "math-q16", "questionFamilyId": "math-fam-add-three", "conceptId": "addition",
        "prompt": "Чему равна сумма трёх чисел: 15 + 28 + 15?",
        "options": [{"optionId": "opt-1", "text": "48"}, {"optionId": "opt-2", "text": "58"}, {"optionId": "opt-3", "text": "68"}, {"optionId": "opt-4", "text": "55"}],
        "correctOptionId": "opt-2", "calc": (15 + 15, "+", 28, 58),
        "explanation": "Удобно сложить сначала 15 + 15 = 30, а затем 30 + 28 = 58.",
        "factIds": ["math-fact-add", "math-fact-comm"], "difficulty": "basic", "reviewTopic": "Группировка слагаемых"
    },
    {
        "questionId": "math-q17", "questionFamilyId": "math-fam-div-rem", "conceptId": "division",
        "prompt": "Чему равен остаток при делении 23 на 4?",
        "options": [{"optionId": "opt-1", "text": "1"}, {"optionId": "opt-2", "text": "2"}, {"optionId": "opt-3", "text": "3"}, {"optionId": "opt-4", "text": "4"}],
        "correctOptionId": "opt-3", "calc": (23, "%", 4, 3),
        "explanation": "23 = 4 × 5 + 3. Неполное частное равно 5, а остаток равен 3.",
        "factIds": ["math-fact-div"], "difficulty": "basic", "reviewTopic": "Деление с остатком"
    },
    {
        "questionId": "math-q18", "questionFamilyId": "math-fam-mul-square", "conceptId": "multiplication",
        "prompt": "Чему равен квадрат числа 9 (то есть 9 × 9)?",
        "options": [{"optionId": "opt-1", "text": "72"}, {"optionId": "opt-2", "text": "81"}, {"optionId": "opt-3", "text": "90"}, {"optionId": "opt-4", "text": "99"}],
        "correctOptionId": "opt-2", "calc": (9, "*", 9, 81),
        "explanation": "Квадрат числа — это его умножение на самого себя: 9 × 9 = 81.",
        "factIds": ["math-fact-mul"], "difficulty": "basic", "reviewTopic": "Квадрат числа"
    },
    {
        "questionId": "math-q19", "questionFamilyId": "math-fam-sub-paren", "conceptId": "order-of-operations",
        "prompt": "Вычислите: 50 - (20 + 15)",
        "options": [{"optionId": "opt-1", "text": "45"}, {"optionId": "opt-2", "text": "15"}, {"optionId": "opt-3", "text": "25"}, {"optionId": "opt-4", "text": "35"}],
        "correctOptionId": "opt-2", "calc": (50, "-", (20 + 15), 15),
        "explanation": "Сначала вычисляем значение в скобках: 20 + 15 = 35. Затем: 50 - 35 = 15.",
        "factIds": ["math-fact-order", "math-fact-sub"], "difficulty": "basic", "reviewTopic": "Вычитание суммы"
    },
    {
        "questionId": "math-q20", "questionFamilyId": "math-fam-mul-assoc", "conceptId": "properties",
        "prompt": "Вычислите удобным способом: 5 × 17 × 2",
        "options": [{"optionId": "opt-1", "text": "170"}, {"optionId": "opt-2", "text": "85"}, {"optionId": "opt-3", "text": "340"}, {"optionId": "opt-4", "text": "150"}],
        "correctOptionId": "opt-1", "calc": (5 * 2, "*", 17, 170),
        "explanation": "Удобно сгруппировать 5 × 2 = 10, а затем умножить на 17: 10 × 17 = 170.",
        "factIds": ["math-fact-mul", "math-fact-comm"], "difficulty": "basic", "reviewTopic": "Сочетательное свойство умножения"
    }
])

def verify_math_questions():
    ops = {"+": lambda a, b: a + b, "-": lambda a, b: a - b, "*": lambda a, b: a * b, "/": lambda a, b: a // b, "%": lambda a, b: a % b}
    for q in MATH_QUESTIONS:
        if "calc" in q:
            a, op, b, expected = q["calc"]
            computed = ops[op](a, b)
            assert computed == expected, f"Calculation mismatch in {q['questionId']}: {a} {op} {b} = {computed} != {expected}"
            correct_opt = next(o for o in q["options"] if o["optionId"] == q["correctOptionId"])
            assert str(expected) == correct_opt["text"], f"Correct option text {correct_opt['text']} != computed {expected}"
    return True
