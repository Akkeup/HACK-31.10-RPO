// DEMO ONLY: private sample keys and fixed feedback. Never import from scene/UI.
import math from "./material-math-basics.json" with { type: "json" };
import cs from "./material-informatics-basics.json" with { type: "json" };
import history from "./material-history-basics.json" with { type: "json" };
import flags from "./material-flags-demo.json" with { type: "json" };
export const materials = [math, cs, history, flags];
export function makePacks(flag) {
  const q = (id, kind, prompt, expectedAnswer, explanation, options) => ({
    question: {
      questionId: id,
      kind,
      prompt,
      ...(options
        ? {
            options: options.map((text, i) => ({
              optionId: "option-" + (i + 1),
              text,
            })),
          }
        : {}),
    },
    expectedAnswer,
    explanation,
  });
  const banks = [
    [
      q(
        "math-written-1",
        "numeric",
        "Сколько получится: 3 × 4?",
        "12",
        "Три группы по четыре — двенадцать.",
      ),
      q(
        "math-written-2",
        "single_choice",
        "Какое действие выполняется первым в 2 + 3 × 4?",
        "option-2",
        "Умножение выполняется раньше сложения.",
        ["Сложение", "Умножение", "Оба одновременно", "Ни одно"],
      ),
      q(
        "math-written-3",
        "short_text",
        "Как называется результат сложения?",
        "сумма",
        "Результат сложения называется суммой.",
      ),
      q(
        "math-written-4",
        "explanation",
        "Своими словами объясните, почему 3 × 4 = 4 + 4 + 4.",
        null,
        "Демо-обратная связь: сравните своё объяснение с тремя равными группами по четыре. Этот ответ не оценивается и не приносит балл.",
      ),
      q(
        "math-written-5",
        "numeric",
        "Разделите единицу на четыре. Запишите десятичную дробь.",
        "0.25",
        "Одна четверть равна 0,25.",
      ),
    ],
    [
      q(
        "cs-written-1",
        "short_text",
        "Как называется последовательность шагов решения задачи?",
        "алгоритм",
        "Последовательность понятных шагов — алгоритм.",
      ),
      q(
        "cs-written-2",
        "numeric",
        "Сколько бит в одном байте?",
        "8",
        "Один байт содержит восемь бит.",
      ),
      q(
        "cs-written-3",
        "single_choice",
        "Что повторяет действие?",
        "option-3",
        "Цикл повторяет действия.",
        ["Бит", "Условие", "Цикл", "Байт"],
      ),
      q(
        "cs-written-4",
        "explanation",
        "Приведите свой пример алгоритма из повседневной жизни.",
        null,
        "Демо-обратная связь: проверьте, указан ли порядок понятных действий и результат. Автоматическая интеллектуальная оценка не выполняется.",
      ),
      q(
        "cs-written-5",
        "short_text",
        "Как называется выбор действия по условию?",
        "ветвление",
        "Ветвление выбирает действие в зависимости от условия.",
      ),
    ],
    [
      q(
        "history-written-1",
        "numeric",
        "Каким годом начинается XVIII век?",
        "1701",
        "XVIII век начинается в 1701 году.",
      ),
      q(
        "history-written-2",
        "short_text",
        "Как называется наука об упорядочивании событий во времени?",
        "хронология",
        "Хронология упорядочивает события во времени.",
      ),
      q(
        "history-written-3",
        "single_choice",
        "Какой источник является вещественным?",
        "option-1",
        "Монета — вещественный исторический источник.",
        ["Монета", "Устный рассказ", "Легенда", "Песня"],
      ),
      q(
        "history-written-4",
        "explanation",
        "Почему полезно сравнивать несколько исторических источников?",
        null,
        "Демо-обратная связь: сопоставление источников помогает проверить сведения и заметить различия. Ответ не оценивается.",
      ),
      q(
        "history-written-5",
        "numeric",
        "Какой год завершает XVIII век?",
        "1800",
        "XVIII век завершается в 1800 году.",
      ),
    ],
    Array.from({ length: 5 }, (_, i) => ({
      ...q(
        "flag-demo-" + (i + 1),
        "flag_country",
        "Демо: назовите вымышленную страну с учебной карточки.",
        "Демо-страна А",
        "Это вымышленная Демо-страна А. Повторение одного флага служит только демонстрации интерфейса; это не опубликованный банк проверки.",
      ),
      question: {
        questionId: "flag-demo-" + (i + 1),
        kind: "flag_country",
        prompt: "Демо: какой вымышленной стране принадлежит этот учебный флаг?",
        image: {
          assetId: flag.resourceId,
          sha256: flag.sha256,
          byteSize: flag.byteSize,
          url: flag.url,
          mediaType: flag.mediaType,
          width: 240,
          height: 160,
          alt: "Флаг страны для вопроса",
        },
      },
    })),
  ];
  return Object.fromEntries(
    materials.map((material, i) => [
      material.module.moduleId,
      { module: material.module, material, questions: banks[i] },
    ]),
  );
}
export function grade(key, answer) {
  if (answer.kind !== key.question.kind)
    throw Object.assign(Error("Тип ответа не совпадает с вопросом"), {
      code: "INVALID_REQUEST",
    });
  if (answer.kind === "explanation")
    return { correct: null, evaluationStatus: "feedback_only" };
  let correct;
  if (answer.kind === "numeric") {
    const value = answer.value.trim().replace(",", ".");
    correct =
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) &&
      Number.isFinite(Number(value)) &&
      Math.abs(Number(value) - Number(key.expectedAnswer)) < 1e-9;
  } else
    correct =
      answer.value
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("ru") ===
      key.expectedAnswer
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("ru");
  return { correct, evaluationStatus: correct ? "correct" : "incorrect" };
}
