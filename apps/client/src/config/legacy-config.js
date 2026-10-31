import { validate } from "../network/legacy-protocol.js";
export const defaults = {
  render: {
    quality: "medium",
    drawDistanceM: 60,
    shadows: true,
    lod: true,
    pixelRatio: 1,
    exposure: 1,
    animationEnabled: true,
  },
  characterVisual: {
    playerModelId: "explorer",
    npcModelId: "explorer",
    modelScale: 1,
    animationRate: 1,
    showNames: true,
    materialStyle: "standard",
    interactionReaction: "nod",
  },
};
export const presets = {
  low: {
    quality: "low",
    pixelRatio: 0.75,
    drawDistanceM: 45,
    shadows: false,
    lod: true,
  },
  medium: {
    quality: "medium",
    pixelRatio: 1,
    drawDistanceM: 65,
    shadows: true,
    lod: true,
  },
  high: {
    quality: "high",
    pixelRatio: 1.5,
    drawDistanceM: 120,
    shadows: true,
    lod: true,
  },
};
export function validateConfig(kind, value) {
  const names = {
    render: "render-config",
    characterVisual: "character-visual-config",
    world: "world-config",
    character: "character-config",
    behavior: "npc-behavior-config",
  };
  if (!names[kind]) throw Error("Неизвестная конфигурация");
  validate(names[kind], value);
  return structuredClone(value);
}
export function loadLocal(storage, serverDefaults = defaults) {
  try {
    const data = JSON.parse(storage.getItem("discovery:visual:v2"));
    return {
      render: validateConfig("render", data.render),
      characterVisual: validateConfig("characterVisual", data.characterVisual),
    };
  } catch {
    return structuredClone(serverDefaults);
  }
}
export function saveLocal(storage, value) {
  try {
    storage.setItem(
      "discovery:visual:v2",
      JSON.stringify({
        render: value.render,
        characterVisual: value.characterVisual,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function validateAdmin(value) {
  validate("config", value, "adminValues");
  const w = value.world;
  if (
    w.grid.minX > w.grid.maxX ||
    w.grid.minZ > w.grid.maxZ ||
    w.chunkSizeM & (w.chunkSizeM - 1)
  )
    throw Error("Неверная сетка/размер чанка");
  if (
    new Set(w.placements.map((x) => x.id)).size !== w.placements.length ||
    new Set(value.npcBehavior.profiles.map((x) => x.npcId)).size !==
      value.npcBehavior.profiles.length
  )
    throw Error("Повторные идентификаторы");
  const fp = value.firstPersonDefaults,
    g = value.gameplay;
  if (
    fp.pitchMinRad >= fp.pitchMaxRad ||
    g.education.passScore > g.education.questionCount ||
    g.competition.minStakeAura > g.competition.maxStakeAura
  )
    throw Error("Несогласованные параметры камеры/игры");
  const ids = [];
  for (const table of g.competition.tables) {
    ids.push(table.tableId);
    for (const seat of table.seats) ids.push(seat.seatId);
  }
  for (const station of g.education.stations)
    ids.push(
      station.teacherId,
      station.examinerId,
      station.examinerSeat.seatId,
    );
  if (new Set(ids).size !== ids.length)
    throw Error("Идентификаторы столов, NPC и мест должны быть уникальны");
  for (const profile of value.npcBehavior.profiles)
    if (profile.provider === "rules" && profile.modelName !== "")
      throw Error("rules требует пустого modelName");
  return structuredClone(value);
}
