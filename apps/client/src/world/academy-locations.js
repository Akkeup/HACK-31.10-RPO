// Local academy layout. Room metadata is deliberately outside strict Protocol 2.0.0 payloads.
export const ACADEMY_HUB = "reading-room-main";

// Four pupil desks, in two equal rows/columns. Only the front-right desk
// carries the notebook; the teacher's existing demonstration table is separate.
const STUDENT_DESKS = [
  { x: 1.15, z: -1.1, study: true },
  { x: -1.15, z: -1.1, study: false },
  { x: -1.15, z: 1.2, study: false },
  { x: 1.15, z: 1.2, study: false },
];

export const ACADEMY_ROOMS = [
  {
    roomId: "room-mathematics",
    teacherId: "teacher-mathematics",
    examinerId: "examiner-mathematics",
    moduleId: "math-basics",
    title: "Кабинет математики",
    subject: "Математика",
    teacherName: "Алексей · преподаватель математики",
    number: "01",
    accent: 0x54799a,
    boardText: "a² + b² = c²     ∠ABC = 90°",
    wallCaption: "ГЕОМЕТРИЯ · АЛГЕБРА",
    exhibit: "geometry",
    lighting: { ambient: 1.35, sun: 0.85 },
    center: { x: 69, z: 58.7 },
    door: { x: 69, y: 0, z: 65.5 },
  },
  {
    roomId: "room-informatics",
    teacherId: "teacher-informatics",
    examinerId: "examiner-informatics",
    moduleId: "informatics-basics",
    title: "Кабинет информатики",
    subject: "Информатика",
    teacherName: "Атлас · преподаватель информатики",
    number: "02",
    accent: 0x368c8b,
    boardText: "for (let i = 0; i < n; i++)",
    wallCaption: "АЛГОРИТМЫ · ДАННЫЕ",
    exhibit: "computers",
    lighting: { ambient: 1.2, sun: 0.7 },
    center: { x: 76, z: 58.7 },
    door: { x: 76, y: 0, z: 65.5 },
  },
  {
    roomId: "room-history",
    teacherId: "teacher-history",
    examinerId: "examiner-history",
    moduleId: "history-basics",
    title: "Кабинет истории",
    subject: "История",
    teacherName: "Михаил · преподаватель истории",
    number: "03",
    accent: 0xa77953,
    boardText: "ЛЕНТА ВРЕМЕНИ  •  ИСТОЧНИКИ",
    wallCaption: "АНТИЧНОСТЬ → НОВОЕ ВРЕМЯ",
    exhibit: "archive",
    lighting: { ambient: 1.4, sun: 0.8 },
    center: { x: 83, z: 58.7 },
    door: { x: 83, y: 0, z: 65.5 },
  },
  {
    roomId: "room-geography",
    teacherId: "teacher-flags",
    examinerId: "examiner-flags",
    moduleId: "flags-demo",
    title: "Кабинет географии",
    subject: "Страны и флаги",
    teacherName: "Арина · преподаватель географии",
    number: "04",
    accent: 0x72935d,
    boardText: "МИР  •  СТРАНЫ  •  ФЛАГИ",
    wallCaption: "СЕВЕР  ·  ЮГ  ·  ВОСТОК  ·  ЗАПАД",
    exhibit: "globe",
    lighting: { ambient: 1.4, sun: 0.85 },
    center: { x: 90, z: 58.7 },
    door: { x: 90, y: 0, z: 65.5 },
  },
].map((room) => ({
  ...room,
  // Each compact room is physically behind its matching north-wall door.
  // No room is swapped into the scene or placed dozens of metres away.
  size: { width: 6.6, depth: 13.6 },
  entry: { x: room.center.x, y: 0, z: 65.2 },
  exit: { x: room.center.x, y: 0, z: 65.6 },
  hubReturn: { x: room.door.x, y: 0, z: 66.7 },
  teacherPosition: { x: room.center.x + 2.3, y: 0, z: 55.5 },
  examinerPosition: { x: room.center.x + 2.3, y: 0, z: 57.5 },
  examinerSeat: {
    seatId: `seat-${room.moduleId}`,
    position: { x: room.center.x + 2.05, y: 0, z: 59.0 },
    yawRad: Math.PI,
    exitPosition: { x: room.center.x + 2.05, y: 0, z: 60.3 },
  },
  notebook: {
    x: room.center.x + STUDENT_DESKS.find((desk) => desk.study).x,
    y: 0.9,
    z: room.center.z + STUDENT_DESKS.find((desk) => desk.study).z,
  },
  bounds: {
    minX: room.center.x - 3.05,
    maxX: room.center.x + 3.05,
    minZ: 52.1,
    maxZ: 65.55,
  },
  objects: [
    { kind: "desk", x: -1.35, z: -3.15, width: 1.8 },
    ...STUDENT_DESKS.map((desk) => ({
      kind: "desk",
      width: 1.55,
      student: true,
      ...desk,
    })),
    { kind: "shelf", x: -2.35, z: 1.1 },
    { kind: "lamp", x: -2.25, z: -3.15, y: 0.9 },
  ],
  // Patrol through the middle aisle, away from pupil desks, chairs and shelves.
  teacherRoute: [
    [2.15, -2.5],
    [2.35, -2.5],
    [2.35, 2.0],
    [2.15, 2.0],
  ],
  examinerRoute: [
    [2.2, -1.8],
    [2.4, -1.8],
    [2.4, -3.7],
    [2.15, -3.7],
    [2.15, -1.8],
  ],
  colliders: [
    { x: room.center.x - 0.675, z: 54.85, hx: 0.65, hz: 0.85 },
    ...STUDENT_DESKS.map((desk) => ({
      x: room.center.x + desk.x,
      z: room.center.z + desk.z,
      hx: 0.55,
      hz: 0.85,
    })),
    { x: room.center.x - 1.175, z: 59.1, hx: 0.65, hz: 0.6 },
  ],
}));

export const roomById = (id) =>
  ACADEMY_ROOMS.find((room) => room.roomId === id);

export const roomByPosition = ({ x, z }) =>
  ACADEMY_ROOMS.find(
    (room) =>
      x >= room.bounds.minX &&
      x <= room.bounds.maxX &&
      z >= room.bounds.minZ &&
      z <= room.bounds.maxZ,
  );
