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
  return [
    ...material.sections.map((section) => ({
      heading: section.heading,
      text: section.text,
    })),
    {
      heading: "Примеры",
      text: material.examples.map((t, i) => `${i + 1}. ${t}`).join(" "),
    },
    {
      heading: "Главное",
      text: material.keyPoints.map((t, i) => `${i + 1}. ${t}`).join(" "),
    },
  ];
}
