// Rendering only: evaluation and expected answers always arrive through the adapter.
export const safe = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function answerControls(
  question,
  { scope, disabled = false, value = "", imageUrl = null } = {},
) {
  const d = disabled ? "disabled" : "";
  const img = imageUrl || question?.image?.url;
  const image =
    question.kind === "flag_country" || question?.image
      ? `<div class="flag-question">${img ? `<img src="${safe(img)}" alt="Флаг страны для вопроса" width="${question.image?.width || 900}" height="${question.image?.height || 600}">` : '<p role="status">Загружаем флаг…</p>'}</div>`
      : "";
  if (question.kind === "single_choice" || (question.options && question.options.length))
    return `${image}<div class="competition-options">${question.options.map((o) => `<button data-${scope}="answer" data-option="${safe(o.optionId)}" ${d}>${safe(o.text)}</button>`).join("")}</div>`;
  return `${image}<label class="written-label">${question.kind === "explanation" ? "Объясните своими словами" : question.kind === "numeric" ? "Числовой ответ" : question.kind === "flag_country" ? "Название страны" : "Ваш ответ"}${question.kind === "explanation" ? `<textarea name="written-answer" data-question="${safe(question.questionId)}" maxlength="2000" rows="3" ${d}>${safe(value)}</textarea>` : `<input name="written-answer" data-question="${safe(question.questionId)}" type="text" ${question.kind === "numeric" ? 'inputmode="decimal"' : ""} maxlength="300" autocomplete="off" value="${safe(value)}" ${d}>`}</label>${question.kind === "explanation" ? '<p class="competition-note">Учебная обратная связь · без балла и автоматической интеллектуальной оценки.</p>' : ""}<button class="primary-btn" data-${scope}="answer" ${d}>Отправить ответ</button>`;
}
