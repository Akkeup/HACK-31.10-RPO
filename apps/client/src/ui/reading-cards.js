// Content is never truncated. Layout uses the same font/width as the visible card.
export function wrapLines(text, measure, width) {
  const lines = [];
  let line = "";
  for (const word of String(text).trim().split(/\s+/).filter(Boolean)) {
    if (line && measure(line + " " + word) <= width) {
      line += " " + word;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    if (measure(word) <= width) {
      line = word;
      continue;
    }
    for (const letter of Array.from(word)) {
      if (line && measure(line + letter) > width) {
        lines.push(line);
        line = "";
      }
      line += letter;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
export function readingCards(blocks, measure, width, rows = 4) {
  return blocks.flatMap((block) => {
    const lines = wrapLines(block.text, measure, Math.max(1, width)),
      cards = [];
    for (let i = 0; i < lines.length; i += rows)
      cards.push({ heading: block.heading, lines: lines.slice(i, i + rows) });
    return cards;
  });
}
export function lessonBlocks(material) {
  // Repeated summaries are common in content packs. Keep the first copy only.
  const seen = new Set();
  const unique = (items) =>
    items.filter((text) => {
      const key = text
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("ru");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const blocks = material.sections.map((section) => ({
    heading: section.heading,
    text: section.text,
  }));
  for (const [heading, items] of [
    ["Примеры", material.examples],
    ["Главное", material.keyPoints],
  ]) {
    const texts = unique(items);
    if (texts.length)
      blocks.push({
        heading,
        text: texts.map((t, i) => `${i + 1}. ${t}`).join(" "),
      });
  }
  return blocks;
}
